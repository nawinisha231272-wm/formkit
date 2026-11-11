import type { LogicRule } from "@ourform/schema";
import type { CompiledExpression, ExpressionContext } from "../expressions";
import type {
  LogicProvenance,
  LogicState,
  LogicWorkCounts,
} from "../logic-contract";
import type { CompiledNode } from "../types";
import { freeze, snapshot } from "../paths";

interface CalculationAction {
  kind: "state" | "value" | "calculate";
  target: string;
  expression?: CompiledExpression;
}
interface CalculationRule {
  wire: LogicRule;
  when?: CompiledExpression;
  then: CalculationAction[];
  otherwise: CalculationAction[];
}

/** Position-zero legacy formula plus ordered, derived root contributions. */
export function compileCalculations(
  rules: readonly CalculationRule[],
  byId: Readonly<Record<string, CompiledNode>>,
) {
  const groups = new Map<string, CalculationRule[]>();
  for (const rule of rules)
    for (const action of [...rule.then, ...rule.otherwise])
      if (action.kind === "calculate") {
        if (!groups.has(action.target)) groups.set(action.target, []);
        if (!groups.get(action.target)!.includes(rule))
          groups.get(action.target)!.push(rule);
      }
  return (
    context: () => ExpressionContext,
    counts: () => LogicWorkCounts,
    invalid: (id: string, ruleId: string) => void,
  ) => {
    const owners = new Map<
      string,
      { provenance: LogicProvenance; calculated: boolean; revert: boolean }
    >();
    const states = new Map<string, LogicState>();
    const cleared = new Set<string>();
    for (const [id, contributions] of groups) {
      const entry = byId[id]!;
      const dependencies = [
        ...new Set(
          contributions.flatMap((rule) => [
            ...(rule.when?.dependencies ?? []),
            ...[...rule.then, ...rule.otherwise]
              .filter(
                (action) => action.target === id && action.kind === "calculate",
              )
              .flatMap((action) => action.expression?.dependencies ?? []),
          ]),
        ),
      ];
      states.set(id, {
        get calculate(): CompiledExpression | undefined {
          let selected:
            | { rule: CalculationRule; action: CalculationAction }
            | undefined;
          for (const rule of contributions) {
            if (rule.wire.enabled === false) continue;
            if (rule.when) counts().conditions++;
            const active = !rule.when || Boolean(rule.when.evaluate(context()));
            for (const action of active ? rule.then : rule.otherwise)
              if (action.kind === "calculate" && action.target === id)
                selected = { rule, action };
          }
          const previous = owners.get(id);
          if (
            !selected &&
            !entry.expressions.calculate &&
            !(previous?.calculated && previous.revert)
          ) {
            if (previous?.calculated)
              owners.set(id, {
                provenance: { ...previous.provenance, authoritative: false },
                calculated: false,
                revert: false,
              });
            return undefined;
          }
          return {
            dependencies,
            evaluate(context) {
              if (selected) {
                counts().actionExpressions++;
                let value: unknown;
                try {
                  value = snapshot(
                    entry.model.value!.normalize(
                      selected.action.expression!.evaluate(context),
                    ),
                  );
                } catch {
                  invalid(id, selected.rule.wire.id);
                  return context.getRef(id);
                }
                const authoritative =
                  entry.node.calculate?.allowOverride !== true;
                const old = owners.get(id);
                if (
                  !old?.calculated ||
                  old.provenance.ruleId !== selected.rule.wire.id ||
                  old.provenance.authoritative !== authoritative
                )
                  owners.set(id, {
                    provenance: {
                      ruleId: selected.rule.wire.id,
                      authoritative,
                    },
                    calculated: true,
                    revert:
                      selected.rule.wire.otherwise === undefined ||
                      selected.rule.wire.otherwise === "revert",
                  });
                counts().valueChecks++;
                if (
                  !(entry.model.value!.equals ?? Object.is)(
                    context.getRef(id),
                    value,
                  )
                )
                  counts().writes++;
                return value;
              }
              if (entry.expressions.calculate) {
                owners.delete(id);
                return entry.expressions.calculate.evaluate(context);
              }
              const owner = owners.get(id);
              if (owner?.calculated && owner.revert) {
                owners.delete(id);
                cleared.add(id);
                const empty = snapshot(
                  entry.model.value!.normalize(entry.model.value!.empty()),
                );
                counts().valueChecks++;
                if (
                  !(entry.model.value!.equals ?? Object.is)(
                    context.getRef(id),
                    empty,
                  )
                )
                  counts().writes++;
                return empty;
              }
              return context.getRef(id);
            },
          };
        },
        finalize(state) {
          if (cleared.delete(id)) state.dirty = true;
          const owner = owners.get(id);
          if (owner) state.logic = owner.provenance;
          else delete state.logic;
          return freeze(state);
        },
      });
    }
    return {
      state: (id: string) => states.get(id),
      edited: (id: string) => {
        owners.delete(id);
      },
      written: (id: string, provenance: LogicProvenance) => {
        if (groups.has(id))
          owners.set(id, { provenance, calculated: false, revert: false });
      },
    };
  };
}
