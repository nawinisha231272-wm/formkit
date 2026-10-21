import type { CompiledForm } from "@ourform/core";
import type { Expr } from "@ourform/schema";
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
    const key = `ofb.expr.${op}`;
    const caption = t(key, {
      field: describeExpression(args[0] ?? null, form, t),
      value: describeExpression(args[1] ?? null, form, t),
    });
    return caption === key
      ? `${op}(${args.map((arg) => describeExpression(arg, form, t)).join(", ")})`
      : caption;
  }
  if (expr && typeof expr === "object")
    return "ref" in expr
      ? (form.byId[expr.ref]?.node.label ?? expr.ref)
      : expr.path;
  if (expr === true || expr === false) return t(expr ? "ofb.yes" : "ofb.no");
  return String(expr ?? "");
}
