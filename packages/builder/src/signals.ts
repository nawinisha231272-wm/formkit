import type { CompiledForm } from "@ourform/core";
import { componentChildren } from "@ourform/schema";
import type { ComponentNode, Expr } from "@ourform/schema";
import type { UI } from "./types";
/** Human captions are derived from the existing compact expression/compiled dependency graph. */
export function describeExpression(
  expr: Expr,
  form: CompiledForm,
  t: UI["t"],
): string {
  if (Array.isArray(expr)) {
    const [op, ...args] = expr;
    if (op === "and" || op === "or")
      return args
        .map((arg) => describeExpression(arg, form, t))
        .join(` ${t(op === "and" ? "ofb.and" : "ofb.or")} `);
    const values = args.map((arg) => describeExpression(arg, form, t));
    const key = `ofb.expr.${op}`;
    const caption = t(key, {
      field: values[0] ?? "",
      value: values[1] ?? "",
    });
    return caption === key ? `${op}(${values.join(", ")})` : caption;
  }
  if (expr && typeof expr === "object")
    return "ref" in expr
      ? (form.byId[expr.ref]?.node.label ?? expr.ref)
      : expr.path;
  if (expr === true || expr === false) return t(expr ? "ofb.yes" : "ofb.no");
  return String(expr ?? "");
}

function choose(when: Expr, yes: Expr, no: Expr, and = false): Expr {
  return when === true
    ? yes
    : when === false
      ? no
      : yes === no
        ? yes
        : yes === true && no === false
          ? when
          : yes === false && no === true
            ? ["not", when]
            : and
              ? ["and", when, yes]
              : ["if", when, yes, no];
}
const summaries = new WeakMap<
  CompiledForm,
  {
    _ofbReaders: Map<string, Set<string>>;
    _ofbCounts: Map<string, number>;
    _ofbVisibility: Map<string, Expr>;
    _ofbConditions: Map<string, Expr>;
  }
>();
function summary(form: CompiledForm) {
  const known = summaries.get(form);
  if (known) return known;
  const readers = new Map<string, Set<string>>(),
    visibility = new Map<string, Expr>();
  for (const rule of form.definition.logic ?? []) {
    if (rule.enabled === false) continue;
    const targets = new Set<string>(),
      branches = new Map<string, [Expr, Expr]>();
    for (const [branch, actions] of [
      [0, rule.then],
      [1, Array.isArray(rule.otherwise) ? rule.otherwise : []],
    ] as const)
      for (const action of actions) {
        if (!("target" in action)) continue;
        const visible = action.action === "show" || action.action === "hide";
        const inherited =
          visible ||
          ["enable", "disable", "setReadOnly"].includes(action.action);
        const visit = (node: ComponentNode) => {
          if (form.byId[node.id]?.model.value) targets.add(node.id);
          if (visible && !visibility.has(node.id))
            visibility.set(node.id, node.visibleWhen ?? true);
          if (inherited) componentChildren(node).forEach(visit);
        };
        visit(form.byId[action.target]!.node);
        if (visible) {
          let contribution = branches.get(action.target);
          if (!contribution)
            branches.set(
              action.target,
              (contribution = [
                visibility.get(action.target)!,
                visibility.get(action.target)!,
              ]),
            );
          contribution[branch] = action.action === "show";
        }
      }
    for (const [id, [yes, no]] of branches)
      visibility.set(id, choose(rule.when ?? true, yes, no));
    for (const id of form.logic?.ruleReads?.[rule.id] ?? []) {
      let fields = readers.get(id);
      if (!fields) readers.set(id, (fields = new Set()));
      for (const target of targets) fields.add(target);
    }
  }
  const value = {
    _ofbReaders: readers,
    _ofbVisibility: visibility,
    _ofbCounts: new Map<string, number>(),
    _ofbConditions: new Map<string, Expr>(),
  };
  summaries.set(form, value);
  return value;
}
/** Static display expression follows position-zero legacy visibility and ordered root contributions. */
export function visibilityCondition(
  form: CompiledForm,
  id: string,
): Expr | undefined {
  const metadata = summary(form);
  const entry = form.byId[id];
  if (!metadata._ofbVisibility.has(id)) return entry?.node.visibleWhen;
  const condition = (target: string): Expr => {
    const known = metadata._ofbConditions.get(target);
    if (known !== undefined) return known;
    const node = form.byId[target]!;
    let value: Expr =
      metadata._ofbVisibility.get(target) ?? node.node.visibleWhen ?? true;
    if (node.parentId)
      value = choose(condition(node.parentId), value, false, true);
    metadata._ofbConditions.set(target, value);
    return value;
  };
  const result = entry ? condition(entry.node.id) : true;
  return result === true ? undefined : result;
}
/** Derived-state/property links are controls, but only data links invalidate downstream values. */
export function controlledFields(form: CompiledForm, id: string): number {
  const metadata = summary(form),
    known = metadata._ofbCounts.get(id);
  if (known !== undefined) return known;
  const graph = form.logic?.dependents ?? form.dependents;
  const controlled = new Set<string>(),
    seen = new Set([id]);
  for (const current of seen) {
    for (const target of graph[current] ?? [])
      if (!seen.has(target)) {
        seen.add(target);
        if (form.byId[target]?.model.value) controlled.add(target);
      }
    for (const target of metadata._ofbReaders.get(current) ?? [])
      controlled.add(target);
  }
  metadata._ofbCounts.set(id, controlled.size);
  return controlled.size;
}
