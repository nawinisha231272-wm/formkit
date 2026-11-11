import { orderGraph } from "../graph";
import { compileCalculations } from "./calculations";
import { snapshot, readPath, writePath, freeze } from "../paths";
import { validateDefinition } from "@ourform/schema";
import type {
  Diagnostic,
  LogicAction,
  LogicRule,
  LogicTrigger,
} from "@ourform/schema";
import type { CompiledExpression } from "../expressions";
import type {
  LogicCompileContext,
  LogicHost,
  LogicProgram,
  LogicRegistration,
  LogicRuntime,
  LogicSession,
  LogicState,
  LogicWorkCounts,
} from "../logic-contract";

type StateKey = "visible" | "disabled" | "readOnly" | "required";
type Action =
  | { kind: "state"; target: string; key: StateKey; value: boolean }
  | {
      kind: "value" | "calculate";
      target: string;
      expression?: CompiledExpression;
    };
interface Writer {
  rule: number;
  active: boolean;
  action: Extract<Action, { kind: "state" }>;
}
interface Rule {
  wire: LogicRule;
  when?: CompiledExpression;
  reads: Set<string>;
  triggers: Set<string>;
  then: Action[];
  otherwise: Action[];
}
const stateActions: Partial<
  Record<LogicAction["action"], [StateKey, boolean]>
> = {
  show: ["visible", true],
  hide: ["visible", false],
  enable: ["disabled", false],
  disable: ["disabled", true],
  require: ["required", true],
  optional: ["required", false],
};

/** Opt-in root-rule prototype. No root-core import or global registry. */
export function createLogic(): LogicRegistration {
  return Object.freeze({ compile: compileLogic });
}

function compileLogic(
  context: LogicCompileContext,
): ReturnType<LogicRegistration["compile"]> {
  const diagnostics = validateDefinition(context.definition).filter(
    (d) => d.code !== "bad-ref",
  );
  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };
  const edges: LogicProgram["edges"][number][] = [];
  const ruleIds = new Set<string>();
  const index = new Map<string, Set<number>>();
  const triggerIndex = new Map<string, Set<number>>();
  const phaseIndex = new Map<string, Set<number>>();
  const overrideIndex = new Map<string, Set<number>>();
  const writers = new Map<string, Writer[]>();
  const dependents = Object.fromEntries(
    Object.entries(context.dependents).map(([id, ids]) => [id, [...ids]]),
  );
  const fail = (code: string, message: string, target?: string) =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      ...(target ? { componentId: target } : {}),
    });
  const add = (map: Map<string, Set<number>>, key: string, value: number) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  };
  const rules: Rule[] = (context.definition.logic ?? []).map((wire, number) => {
    if (ruleIds.has(wire.id))
      fail("duplicate-rule-id", `Duplicate logic rule: ${wire.id}.`);
    ruleIds.add(wire.id);
    const reads = new Set<string>();
    const expression = (
      raw: Parameters<LogicCompileContext["expression"]>[0],
    ) => {
      const result = context.expression(raw);
      diagnostics.push(
        ...result.diagnostics.map((d) => ({
          ...d,
          message: `Rule ${wire.id}: ${d.message}`,
        })),
      );
      result.expression?.dependencies.forEach((id) => reads.add(id));
      return result.expression;
    };
    const when = wire.when === undefined ? undefined : expression(wire.when);
    const triggers = new Set<string>();
    if (wire.trigger.on === "change")
      if (wire.trigger.refs === undefined)
        when?.dependencies.forEach((id) => triggers.add(id));
      else
        for (const id of wire.trigger.refs) {
          const compiled = context.expression({ ref: id });
          diagnostics.push(
            ...compiled.diagnostics.map((d) => ({
              ...d,
              message: `Rule ${wire.id}: ${d.message}`,
            })),
          );
          compiled.expression?.dependencies.forEach((ref) => triggers.add(ref));
        }
    const actions = (list: LogicAction[]): Action[] =>
      list.flatMap((action): Action[] => {
        if (
          !("target" in action) ||
          ["setProperty", "refreshOptions", "focus"].includes(action.action)
        ) {
          fail(
            "unsupported-logic-action",
            `Rule ${wire.id}: ${action.action} is not implemented in this runtime prototype.`,
          );
          return [];
        }
        const target = context.byId[action.target];
        if (!target) {
          fail(
            "bad-ref",
            `Rule ${wire.id}: unknown target ${action.target}.`,
            action.target,
          );
          return [];
        }
        const state = stateActions[action.action];
        if (state || action.action === "setReadOnly") {
          const [key, value] = state ?? [
            "readOnly",
            action.action === "setReadOnly" && action.value,
          ];
          if (key === "required" && !target.model.value)
            fail(
              "invalid-logic-target",
              `Rule ${wire.id}: requiredness needs a value field.`,
              action.target,
            );
          return [{ kind: "state", target: action.target, key, value }];
        }
        if (!target.model.value)
          fail(
            "invalid-logic-target",
            `Rule ${wire.id}: value action needs a value field.`,
            action.target,
          );
        if (
          (action.action === "setValue" || action.action === "clear") &&
          target.node.calculate &&
          target.node.calculate.allowOverride !== true
        )
          fail(
            "logic-calculation-conflict",
            `Rule ${wire.id}: ${action.action} cannot write calculated field ${action.target} (allowOverride is false).`,
            action.target,
          );
        if (action.action === "clear")
          return [{ kind: "value", target: action.target }];
        if (action.action === "setValue" || action.action === "calculate") {
          const compiled = expression(
            action.action === "calculate" ? action.expr : action.value,
          );
          return [
            {
              kind: action.action === "calculate" ? "calculate" : "value",
              target: action.target,
              ...(compiled ? { expression: compiled } : {}),
            },
          ];
        }
        fail(
          "unsupported-logic-action",
          `Rule ${wire.id}: ${action.action} is not implemented in this runtime prototype.`,
        );
        return [];
      });
    const then = actions(wire.then),
      otherwise = Array.isArray(wire.otherwise) ? actions(wire.otherwise) : [];
    for (const [active, plans] of [
      [true, then],
      [false, otherwise],
    ] as const)
      for (const action of plans)
        if (action.kind === "state") {
          if (!writers.has(action.target)) writers.set(action.target, []);
          writers.get(action.target)!.push({ rule: number, active, action });
        }
    if (wire.enabled !== false) {
      if (wire.trigger.on !== "change")
        add(
          phaseIndex,
          wire.trigger.on === "event"
            ? `event:${wire.trigger.name}`
            : wire.trigger.on,
          number,
        );
      reads.forEach((id) => add(index, id, number));
      triggers.forEach((id) => add(triggerIndex, id, number));
      for (const action of [...then, ...otherwise]) {
        if (action.kind === "calculate")
          add(overrideIndex, action.target, number);
        const clears =
          action.kind === "state" &&
          action.key === "visible" &&
          context.nodes.some((node) => {
            if (!node.model.value || node.node.clearOnHide === false)
              return false;
            for (
              let ancestor: typeof node | undefined = node;
              ancestor;
              ancestor = ancestor.parentId
                ? context.byId[ancestor.parentId]
                : undefined
            )
              if (ancestor.node.id === action.target) return true;
            return false;
          });
        if (action.kind !== "state" || clears)
          for (const source of new Set([
            ...(when?.dependencies ?? []),
            ...triggers,
            ...(action.kind === "state"
              ? []
              : (action.expression?.dependencies ?? [])),
          ])) {
            edges.push({ source, target: action.target, ruleId: wire.id });
            dependents[source]!.push(action.target);
          }
      }
    }
    return {
      wire,
      ...(when ? { when } : {}),
      reads,
      triggers,
      then,
      otherwise,
    };
  });
  const order = orderGraph(
    context.nodes.map((node) => node.node.id),
    dependents,
  ).order;
  const calculated = new Map<string, string[]>();
  for (const rule of rules)
    if (rule.wire.enabled !== false)
      for (const action of [...rule.then, ...rule.otherwise])
        if (action.kind === "calculate")
          calculated.set(action.target, [
            ...(calculated.get(action.target) ?? []),
            rule.wire.id,
          ]);
  for (const rule of rules)
    for (const action of [...rule.then, ...rule.otherwise])
      if (
        action.kind === "value" &&
        calculated.has(action.target) &&
        context.byId[action.target]!.node.calculate?.allowOverride !== true
      )
        fail(
          "logic-calculation-conflict",
          `Rule ${rule.wire.id}: cannot assign calculated field ${action.target}, owned by rules ${calculated.get(action.target)!.join(", ")}.`,
          action.target,
        );
  const ranks = new Map(order.map((id, rank) => [id, rank]));
  const priorities = rules.map((rule) =>
    Math.max(
      -1,
      ...[...rule.reads, ...rule.triggers].map((id) => ranks.get(id) ?? 0),
    ),
  );
  const conflicts = new Map<string, Map<string, Set<number>>>();
  rules.forEach((rule, number) => {
    for (const action of [...rule.then, ...rule.otherwise]) {
      if (!conflicts.has(action.target))
        conflicts.set(action.target, new Map());
      const properties = conflicts.get(action.target)!;
      const property = action.kind === "state" ? action.key : "value";
      if (!properties.has(property)) properties.set(property, new Set());
      properties.get(property)!.add(number);
    }
  });
  for (const [target, properties] of conflicts)
    for (const [property, members] of properties)
      if (members.size > 1)
        diagnostics.push({
          severity: "warning",
          code: "logic-conflict",
          componentId: target,
          message: `Potential logic writers for ${target}.${property}: ${[...members].map((i) => rules[i]!.wire.id).join(", ")}. Later matching rules win.`,
        });
  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };
  const makeCalculations = compileCalculations(rules, context.byId);
  const create = (submission: boolean) => (session: LogicSession) =>
    createSessionRuntime(
      session,
      submission,
      dependents,
      makeCalculations,
      rules,
      index,
      triggerIndex,
      writers,
      phaseIndex,
      overrideIndex,
      priorities,
    );
  const program: LogicProgram = Object.freeze({
    replay: () => Object.freeze({ ...program, create: create(true) }),
    dependents,
    edges,
    submissionSchema: (
      build: Parameters<LogicProgram["submissionSchema"]>[0],
    ) => {
      const dynamic = new Set<string>();
      const hidden = new Set<string>();
      for (const rule of rules) {
        if (rule.wire.enabled === false) continue;
        for (const action of [
          ...rule.wire.then,
          ...(Array.isArray(rule.wire.otherwise) ? rule.wire.otherwise : []),
        ]) {
          if (!("target" in action)) continue;
          if (action.action === "show" || action.action === "hide")
            hidden.add(action.target);
          if (
            ["require", "optional", "calculate", "setProperty"].includes(
              action.action,
            ) ||
            ((action.action === "setValue" || action.action === "clear") &&
              rule.wire.trigger.on === "submit")
          )
            dynamic.add(action.target);
        }
      }
      const nodes = context.nodes.map((entry) => {
        let visibility = false;
        for (
          let node: typeof entry | undefined = entry;
          node;
          node = node.parentId ? context.byId[node.parentId] : undefined
        )
          if (hidden.has(node.node.id)) {
            visibility = true;
            break;
          }
        return dynamic.has(entry.node.id) || visibility
          ? { ...entry, dynamicValidation: true }
          : entry;
      });
      return {
        ...build({ definition: context.definition, nodes }),
        "x-ourform-logic": context.definition.logic ?? [],
      };
    },
    describeCycle: (members: readonly string[]) =>
      `Dependency cycle: ${members.join(", ")}; rules: ${edges
        .filter(
          (edge) =>
            members.includes(edge.source) && members.includes(edge.target),
        )
        .map((edge) => edge.ruleId)
        .join(", ")}`,
    create: create(false),
  });
  return { diagnostics, program };
}

function createRuntime(
  host: LogicHost,
  rules: readonly Rule[],
  index: ReadonlyMap<string, ReadonlySet<number>>,
  triggerIndex: ReadonlyMap<string, ReadonlySet<number>>,
  writers: ReadonlyMap<string, readonly Writer[]>,
  phaseIndex: ReadonlyMap<string, ReadonlySet<number>>,
  overrideIndex: ReadonlyMap<string, ReadonlySet<number>>,
  priorities: readonly number[],
): Omit<LogicRuntime, "diagnostics" | "validationErrors" | "run" | "patch"> & {
  run(trigger: LogicTrigger, changed?: readonly string[]): void;
} {
  const counts: LogicWorkCounts = {
    sourceChecks: 0,
    valueChecks: 0,
    overrideInvalidations: 0,
    indexReads: 0,
    triggerReads: 0,
    candidates: 0,
    conditions: 0,
    actionExpressions: 0,
    writers: 0,
    edges: 0,
    writes: 0,
    cascades: 0,
    effects: 0,
  };
  const matches = new Map<number, boolean>();
  const states = new Map<string, LogicState>();
  const revisions = new Map<string, number>();
  const owned = new Map<string, { rule: number; revision: number }>();
  const selection = (rule: Rule, active: boolean) =>
    active ? rule.then : rule.otherwise;
  const isEdge = (
    rule: Rule,
    trigger: LogicTrigger,
    changed: ReadonlySet<string>,
  ) => {
    if (rule.wire.trigger.on !== trigger.on) return false;
    if (trigger.on === "event")
      return (
        rule.wire.trigger.on === "event" &&
        trigger.name === rule.wire.trigger.name
      );
    if (trigger.on !== "change") return true;
    for (const id of changed) {
      counts.triggerReads++;
      if (rule.triggers.has(id)) return true;
    }
    return false;
  };
  return {
    counts,
    state: (id) => states.get(id),
    edited(id) {
      revisions.set(id, (revisions.get(id) ?? 0) + 1);
      owned.delete(id);
    },
    run(trigger, changed) {
      let sources = changed === undefined ? undefined : new Set(changed);
      // Dependencies determine evaluation order; wire order determines competing value priority.
      const claimed = new Map<string, number>();
      for (let depth = 0; depth <= 10; depth++) {
        const candidates = new Set<number>();
        if (sources === undefined)
          rules.forEach((_rule, i) => candidates.add(i));
        else {
          for (const id of sources) {
            counts.indexReads += depth === 0 ? 3 : 2;
            index.get(id)?.forEach((i) => candidates.add(i));
            triggerIndex.get(id)?.forEach((i) => candidates.add(i));
            if (depth === 0)
              overrideIndex.get(id)?.forEach((i) => candidates.add(i));
          }
          if (depth === 0 && trigger.on !== "change") {
            counts.indexReads++;
            phaseIndex
              .get(
                trigger.on === "event" ? `event:${trigger.name}` : trigger.on,
              )
              ?.forEach((i) => candidates.add(i));
          }
        }
        if (!candidates.size) return;
        if (depth === 10) {
          host.diagnostic({
            severity: "error",
            code: "logic-cascade-limit",
            message: "Logic cascade exceeds depth 10.",
          });
          return;
        }
        const targets = new Set<string>(),
          written = new Set<string>(),
          pendingValues = new Set<string>(),
          direct = new Set<string>();
        const beforeValues = new Map<string, unknown>();
        const write = (
          i: number,
          target: string,
          value: unknown,
          authoritative: boolean,
          dirty = true,
          claim = true,
        ) => {
          if ((claimed.get(target) ?? -1) > i) return;
          if (!beforeValues.has(target))
            beforeValues.set(target, host.context().getRef(target));
          const result = host.write(
            target,
            value,
            {
              ruleId: rules[i]!.wire.id,
              authoritative,
            },
            dirty,
          );
          if (result === undefined) return;
          if (claim) claimed.set(target, i);
          if (result) {
            counts.writes++;
            direct.add(target);
            pendingValues.add(target);
          }
          targets.add(target);
          written.add(target);
          owned.set(target, { rule: i, revision: revisions.get(target) ?? 0 });
        };
        const flushTargets = () => {
          if (!targets.size) return;
          for (const target of targets) {
            const state: LogicState = {};
            for (const writer of writers.get(target) ?? []) {
              counts.writers++;
              if (
                rules[writer.rule]!.wire.enabled === false ||
                matches.get(writer.rule) !== writer.active
              )
                continue;
              state[writer.action.key] = writer.action.value;
            }
            states.set(target, state);
          }
          host
            .process([...targets], written, pendingValues)
            .forEach((id) => direct.add(id));
          targets.clear();
          written.clear();
          pendingValues.clear();
        };
        for (const i of [...candidates].sort(
          (a, b) => priorities[a]! - priorities[b]! || a - b,
        )) {
          const rule = rules[i]!;
          if (rule.wire.enabled === false) continue;
          counts.candidates++;
          if (rule.when) counts.conditions++;
          const active = rule.when
            ? Boolean(rule.when.evaluate(host.context()))
            : true;
          matches.set(i, active);
          const edge = isEdge(
            rule,
            depth === 0 ? trigger : { on: "change" },
            sources ?? new Set(),
          );
          if (edge) counts.edges++;
          for (const action of [...rule.then, ...rule.otherwise])
            if (action.kind === "state" || action.kind === "calculate")
              targets.add(action.target);
          if (
            !active &&
            (rule.wire.otherwise === undefined ||
              rule.wire.otherwise === "revert")
          )
            for (const action of rule.then) {
              const owner = owned.get(action.target);
              if (
                action.kind === "value" &&
                !(
                  action.kind === "value" &&
                  host.submission &&
                  rule.wire.trigger.on === "load"
                ) &&
                owner?.rule === i &&
                owner.revision === (revisions.get(action.target) ?? 0)
              ) {
                write(
                  i,
                  action.target,
                  host.empty(action.target),
                  rule.wire.trigger.on === "submit",
                  true,
                  false,
                );
                owned.delete(action.target);
              }
            }
          for (const action of selection(rule, active)) {
            if (
              action.kind === "state" ||
              action.kind === "calculate" ||
              (action.kind === "value" &&
                (!edge || (host.submission && rule.wire.trigger.on === "load")))
            )
              continue;
            if (action.expression) counts.actionExpressions++;
            write(
              i,
              action.target,
              action.expression
                ? action.expression.evaluate(host.context())
                : host.empty(action.target),
              rule.wire.trigger.on === "submit",
            );
            flushTargets();
          }
          flushTargets();
        }
        for (const [id, before] of beforeValues)
          if (host.equal(id, before, host.context().getRef(id)))
            direct.delete(id);
        sources = new Set(direct);
        if (!sources.size) return;
        counts.cascades++;
      }
    },
  };
}

/** Rule-only store bridge: legacy consumers retain none of normalization/provenance/diagnostics here. */
function createSessionRuntime(
  session: LogicSession,
  submission: boolean,
  dependents: LogicProgram["dependents"],
  makeCalculations: ReturnType<typeof compileCalculations>,
  ...plans: Parameters<typeof createRuntime> extends [LogicHost, ...infer Plans]
    ? Plans
    : never
): LogicRuntime {
  if (submission)
    for (const entry of session.form.nodes)
      if (
        entry.node.calculate?.allowOverride &&
        readPath(session.initialData, entry.path) !== undefined
      )
        session.overrides.add(entry.node.id);
  const diagnostics: Diagnostic[] = [],
    changed = new Set<string>();
  const affected = (ids: readonly string[]) => {
    const found = new Set(ids),
      queue = [...ids];
    for (let i = 0; i < queue.length; i++)
      for (const target of dependents[queue[i]!] ?? [])
        if (!found.has(target)) {
          found.add(target);
          queue.push(target);
        }
    return [...found].sort(
      (a, b) => session.form.ranks[a]! - session.form.ranks[b]!,
    );
  };
  const calculations = makeCalculations(
    session.context,
    () => runtime.counts,
    (id, ruleId) =>
      diagnostics.push({
        severity: "error",
        code: "invalid-logic-value",
        componentId: id,
        message: `Rule ${ruleId}: invalid value for ${id}.`,
      }),
  );
  let previousData = session.data();
  const runtime = createRuntime(
    {
      submission,
      context: session.context,
      equal: (id, left, right) => {
        runtime.counts.valueChecks++;
        return (session.form.byId[id]!.model.value?.equals ?? Object.is)(
          left,
          right,
        );
      },
      empty: (id) => session.form.byId[id]!.model.value!.empty(),
      diagnostic: (diagnostic) => diagnostics.push(diagnostic),
      write: (id, raw, provenance, dirty) => {
        const entry = session.form.byId[id]!;
        const editable = entry.node.calculate?.allowOverride === true;
        if (submission && editable) return undefined;
        if (editable) provenance = { ...provenance, authoritative: false };
        let value: unknown;
        try {
          value = snapshot(entry.model.value!.normalize(raw));
        } catch {
          diagnostics.push({
            severity: "error",
            code: "invalid-logic-value",
            componentId: id,
            message: `Rule ${provenance.ruleId}: invalid value for ${id}.`,
          });
          return undefined;
        }
        runtime.counts.valueChecks++;
        if (editable) session.overrides.add(id);
        calculations.written(id, provenance);
        const differs = !(entry.model.value!.equals ?? Object.is)(
          readPath(session.data(), entry.path),
          value,
        );
        if (differs)
          session.updateData(writePath(session.data(), entry.path, value));
        const old = session.states.get(id)!;
        if (
          differs ||
          (dirty && !old.dirty) ||
          old.logic?.ruleId !== provenance.ruleId ||
          old.logic?.authoritative !== provenance.authoritative
        )
          changed.add(id);
        session.states.set(
          id,
          freeze({ ...old, dirty: dirty || old.dirty, logic: provenance }),
        );
        return differs;
      },
      process: (ids, written, changedValues) => {
        const values: string[] = [];
        const invalidated = new Set(affected([...changedValues]));
        const invalidate = (id: string) => {
          runtime.counts.overrideInvalidations++;
          session.overrides.delete(id);
        };
        for (const id of affected(ids)) {
          if (invalidated.has(id) && !written.has(id)) invalidate(id);
          const before = session.states.get(id)!;
          session.process(id, written.has(id));
          const after = session.states.get(id)!;
          if (!Object.is(before.value, after.value)) {
            values.push(id);
            if (!invalidated.has(id))
              for (const target of affected([id])) invalidated.add(target);
            if (
              !after.visible &&
              session.form.byId[id]!.node.clearOnHide !== false
            )
              invalidate(id);
          }
          if (session.stateChanged(before, after)) changed.add(id);
        }
        return values;
      },
    },
    ...plans,
  );
  return {
    ...runtime,
    diagnostics,
    state(id) {
      const calculation = calculations.state(id);
      return calculation
        ? { ...runtime.state(id), ...calculation }
        : runtime.state(id);
    },
    patch: () => (diagnostics.length ? { diagnostics: [...diagnostics] } : {}),
    edited(id) {
      runtime.edited(id);
      calculations.edited(id);
      const state = { ...session.states.get(id)! };
      delete state.logic;
      session.states.set(id, freeze(state));
    },
    validationErrors: () =>
      diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => ({
          path: [],
          componentId: d.componentId ?? session.form.definition.id,
          error: { code: d.code, messageKey: `of.logic.${d.code}` },
        })),
    run(trigger, sources) {
      changed.clear();
      if (trigger.on !== "submit") diagnostics.length = 0;
      const actual = sources?.filter((id) => {
        runtime.counts.sourceChecks++;
        const entry = session.form.byId[id]!;
        return !(entry.model.value?.equals ?? Object.is)(
          readPath(previousData, entry.path),
          readPath(session.data(), entry.path),
        );
      });
      const edited = new Set(actual);
      for (const id of affected(actual ?? []))
        if (!edited.has(id)) {
          runtime.counts.overrideInvalidations++;
          session.overrides.delete(id);
        }
      runtime.run(trigger, actual);
      previousData = session.data();
      return [...changed];
    },
  };
}
