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

type StateKey = keyof LogicState;
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
  const diagnostics = validateDefinition(context.definition);
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
          for (const source of new Set([...reads, ...triggers])) {
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
  // Fail closed for the scheduler combination intentionally deferred beyond this prototype.
  for (const edge of edges) {
    const seen = new Set<string>(),
      pending = [...(context.dependents[edge.target] ?? [])];
    for (let i = 0; i < pending.length; i++) {
      const id = pending[i]!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (
        context.byId[id]?.expressions.calculate &&
        rules.some((rule) => rule.wire.enabled !== false && rule.reads.has(id))
      ) {
        fail(
          "unsupported-logic-interleave",
          `Rule ${edge.ruleId}: legacy calculation ${id} feeds another rule; interleaved scheduling is not implemented in this prototype.`,
          id,
        );
        break;
      }
      pending.push(...(context.dependents[id] ?? []));
    }
  }
  for (const [target, contributions] of writers) {
    const members = new Set(contributions.map((entry) => entry.rule));
    if (members.size > 1)
      diagnostics.push({
        severity: "warning",
        code: "logic-conflict",
        componentId: target,
        message: `Potential logic writers for ${target}: ${[...members].map((i) => rules[i]!.wire.id).join(", ")}. Later matching rules win.`,
      });
  }
  if (diagnostics.some((d) => d.severity === "error")) return { diagnostics };
  return {
    diagnostics,
    program: Object.freeze({
      dependents,
      edges,
      describeCycle: (members: readonly string[]) =>
        `Dependency cycle: ${members.join(", ")}; rules: ${edges
          .filter(
            (edge) =>
              members.includes(edge.source) && members.includes(edge.target),
          )
          .map((edge) => edge.ruleId)
          .join(", ")}`,
      create: (session: LogicSession) =>
        createSessionRuntime(
          session,
          rules,
          index,
          triggerIndex,
          writers,
          phaseIndex,
          overrideIndex,
        ),
    }),
  };
}

function createRuntime(
  host: LogicHost,
  rules: readonly Rule[],
  index: ReadonlyMap<string, ReadonlySet<number>>,
  triggerIndex: ReadonlyMap<string, ReadonlySet<number>>,
  writers: ReadonlyMap<string, readonly Writer[]>,
  phaseIndex: ReadonlyMap<string, ReadonlySet<number>>,
  overrideIndex: ReadonlyMap<string, ReadonlySet<number>>,
): Omit<LogicRuntime, "diagnostics" | "validationErrors" | "run"> & {
  run(trigger: LogicTrigger, changed?: readonly string[]): void;
} {
  const counts: LogicWorkCounts = {
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
          direct = new Set<string>();
        const write = (
          i: number,
          target: string,
          value: unknown,
          authoritative: boolean,
          dirty = true,
        ) => {
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
          if (result) {
            counts.writes++;
            direct.add(target);
          }
          targets.add(target);
          written.add(target);
          owned.set(target, { rule: i, revision: revisions.get(target) ?? 0 });
        };
        for (const i of [...candidates].sort((a, b) => a - b)) {
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
            if (action.kind === "state") targets.add(action.target);
          if (
            !active &&
            (rule.wire.otherwise === undefined ||
              rule.wire.otherwise === "revert")
          )
            for (const action of rule.then) {
              const owner = owned.get(action.target);
              if (
                action.kind !== "state" &&
                owner?.rule === i &&
                owner.revision === (revisions.get(action.target) ?? 0)
              ) {
                write(
                  i,
                  action.target,
                  host.empty(action.target),
                  rule.wire.trigger.on === "load" ||
                    rule.wire.trigger.on === "submit" ||
                    action.kind === "calculate",
                );
                owned.delete(action.target);
              }
            }
          for (const action of selection(rule, active)) {
            if (action.kind === "state" || (action.kind === "value" && !edge))
              continue;
            if (action.expression) counts.actionExpressions++;
            write(
              i,
              action.target,
              action.expression
                ? action.expression.evaluate(host.context())
                : host.empty(action.target),
              action.kind === "calculate" ||
                rule.wire.trigger.on === "load" ||
                rule.wire.trigger.on === "submit",
              action.kind !== "calculate",
            );
          }
        }
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
        const processed = host.process([...targets], written);
        sources = new Set([...direct, ...processed]);
        if (!sources.size) return;
        counts.cascades++;
      }
    },
  };
}

/** Rule-only store bridge: legacy consumers retain none of normalization/provenance/diagnostics here. */
function createSessionRuntime(
  session: LogicSession,
  ...plans: Parameters<typeof createRuntime> extends [LogicHost, ...infer Plans]
    ? Plans
    : never
): LogicRuntime {
  const diagnostics: Diagnostic[] = [],
    changed = new Set<string>();
  const runtime = createRuntime(
    {
      context: session.context,
      empty: (id) => session.form.byId[id]!.model.value!.empty(),
      diagnostic: (diagnostic) => diagnostics.push(diagnostic),
      write: (id, raw, provenance, dirty) => {
        const entry = session.form.byId[id]!;
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
      process: (ids, written) => {
        const values: string[] = [];
        for (const id of session.affected(ids)) {
          const before = session.states.get(id)!;
          session.process(id, written.has(id));
          const after = session.states.get(id)!;
          if (!Object.is(before.value, after.value)) values.push(id);
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
    edited(id) {
      runtime.edited(id);
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
      runtime.run(trigger, sources);
      return [...changed];
    },
  };
}
