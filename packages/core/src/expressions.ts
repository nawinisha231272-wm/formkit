import { isRecord, inspectJson } from "@ourform/schema";
import type { Diagnostic, Expr } from "@ourform/schema";
import type { FunctionMap, Path } from "./types";
import { parsePath, snapshot } from "./paths";
export interface ExpressionContext {
  getRef: (id: string) => unknown;
  getPath: (path: Path) => unknown;
  mode: "edit" | "readOnly";
}
export interface CompiledExpression {
  dependencies: readonly string[];
  evaluate: (context: ExpressionContext) => unknown;
}
export interface ExpressionBindings {
  byRef: (id: string) => readonly string[] | undefined;
  byPath: (path: Path) => readonly string[] | undefined;
  functions?: FunctionMap;
}
const arities: Record<string, readonly [number, number]> = {
  and: [2, 2000],
  or: [2, 2000],
  not: [1, 1],
  eq: [2, 2],
  neq: [2, 2],
  gt: [2, 2],
  gte: [2, 2],
  lt: [2, 2],
  lte: [2, 2],
  in: [2, 2],
  add: [2, 2000],
  sub: [2, 2],
  mul: [2, 2000],
  div: [2, 2],
  mod: [2, 2],
  if: [3, 3],
  empty: [1, 1],
  len: [1, 1],
  sum: [0, 2000],
  min: [1, 2000],
  max: [1, 2000],
  concat: [0, 2000],
  call: [1, 2000],
};
export function compileExpression(
  input: unknown,
  bindings: ExpressionBindings,
): { expression?: CompiledExpression; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const deps = new Set<string>();
  const paths = new Map<string, Path>();
  let count = 0;
  const fail = (code: string, message: string) =>
    diagnostics.push({ severity: "error", code, message });
  function walk(v: unknown, depth: number): void {
    if (++count > 2000 || depth > 64) {
      if (!diagnostics.some((d) => d.code === "expression-limit"))
        fail("expression-limit", "Expression exceeds 64 depth or 2000 nodes.");
      return;
    }
    if (
      v === null ||
      typeof v === "boolean" ||
      typeof v === "string" ||
      (typeof v === "number" && Number.isFinite(v))
    )
      return;
    if (Array.isArray(v)) {
      const [op, ...args] = v;
      const arity =
        typeof op === "string" && Object.hasOwn(arities, op)
          ? arities[op]
          : undefined;
      if (!arity || args.length < arity[0] || args.length > arity[1]) {
        fail(
          "invalid-expression",
          "Unknown operator or incorrect expression arity.",
        );
        return;
      }
      if (op === "call") {
        const fn =
          typeof args[0] === "string"
            ? bindings.functions?.[args[0]]
            : undefined;
        if (!fn || !fn.pure || !fn.availableInNode)
          fail(
            "unknown-function",
            "Host function must be registered, pure and available in Node.",
          );
      }
      for (const arg of args) walk(arg, depth + 1);
      return;
    }
    if (isRecord(v) && Object.keys(v).length === 1) {
      if (typeof v.ref === "string") {
        const found = bindings.byRef(v.ref);
        if (!found) fail("bad-ref", `Unknown value reference: ${v.ref}`);
        else found.forEach((id) => deps.add(id));
        return;
      }
      if (typeof v.path === "string") {
        if (v.path === "form.mode") return;
        if (!v.path.startsWith("data.")) {
          fail(
            "bad-path",
            "Expression paths must start with data. or be form.mode.",
          );
          return;
        }
        try {
          const path = parsePath(v.path.slice(5));
          paths.set(v.path, path);
          const found = bindings.byPath(path);
          if (!found) fail("bad-path", `Unknown data path: ${v.path}`);
          else found.forEach((id) => deps.add(id));
        } catch {
          fail("unsafe-path", `Invalid or reserved data path: ${v.path}`);
        }
        return;
      }
    }
    fail(
      "invalid-expression",
      "Expected a literal, reference, path or prefix expression.",
    );
  }
  walk(input, 0);
  if (diagnostics.length) return { diagnostics };
  const expr = snapshot(input) as Expr;
  const functions = Object.fromEntries(
    Object.entries(bindings.functions ?? {}).map(([name, fn]) => [
      name,
      Object.freeze({ ...fn }),
    ]),
  );
  function evaluate(v: Expr, ctx: ExpressionContext): unknown {
    if (!Array.isArray(v)) {
      if (v !== null && typeof v === "object")
        return "ref" in v
          ? ctx.getRef(v.ref)
          : v.path === "form.mode"
            ? ctx.mode
            : ctx.getPath(paths.get(v.path)!);
      return v;
    }
    const [op, ...args] = v;
    const get = (i: number) => evaluate(args[i]!, ctx);
    if (op === "if") return get(0) ? get(1) : get(2);
    if (op === "and") return args.every((a) => Boolean(evaluate(a, ctx)));
    if (op === "or") return args.some((a) => Boolean(evaluate(a, ctx)));
    const values = args.map((a) => evaluate(a, ctx));
    const a = values[0],
      b = values[1];
    if (op === "not") return !a;
    if (op === "empty")
      return (
        a == null ||
        (typeof a === "string"
          ? a.trim().length === 0
          : Array.isArray(a)
            ? a.length === 0
            : isRecord(a)
              ? Object.keys(a).length === 0
              : false)
      );
    if (op === "len")
      return typeof a === "string" || Array.isArray(a)
        ? a.length
        : isRecord(a)
          ? Object.keys(a).length
          : null;
    if (op === "in")
      return Array.isArray(b)
        ? b.some((item) => typeof item === typeof a && Object.is(item, a))
        : typeof a === "string" && typeof b === "string"
          ? b.includes(a)
          : false;
    if (["eq", "neq", "gt", "gte", "lt", "lte"].includes(op)) {
      const valueType = (v: unknown): string =>
        v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
      if (
        valueType(a) !== valueType(b) ||
        (typeof a === "number" && !Number.isFinite(a)) ||
        (typeof b === "number" && !Number.isFinite(b))
      )
        return false;
      if (op === "eq" || op === "neq")
        return op === "eq" ? Object.is(a, b) : !Object.is(a, b);
      if (
        !(
          (typeof a === "number" &&
            Number.isFinite(a) &&
            typeof b === "number" &&
            Number.isFinite(b)) ||
          (typeof a === "string" && typeof b === "string")
        )
      )
        return false;
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lt") return a < b;
      return a <= b;
    }
    if (op === "concat")
      return values.every((v) => typeof v === "string")
        ? values.join("")
        : null;
    if (op === "call") {
      try {
        const result = functions[String(a)]!.run(...values.slice(1));
        return inspectJson(result).length ? null : snapshot(result);
      } catch {
        return null;
      }
    }
    const nums =
      ["sum", "min", "max"].includes(op) &&
      values.length === 1 &&
      Array.isArray(a)
        ? a
        : values;
    if (!nums.every((n) => typeof n === "number" && Number.isFinite(n)))
      return null;
    const ns = nums as number[];
    let result: number;
    switch (op) {
      case "add":
      case "sum":
        result = ns.reduce((x, y) => x + y, 0);
        break;
      case "mul":
        result = ns.reduce((x, y) => x * y, 1);
        break;
      case "sub":
        result = ns[0]! - ns[1]!;
        break;
      case "div":
        result = ns[1] === 0 ? NaN : ns[0]! / ns[1]!;
        break;
      case "mod":
        result = ns[1] === 0 ? NaN : ns[0]! % ns[1]!;
        break;
      case "min":
        result = ns.length ? Math.min(...ns) : NaN;
        break;
      case "max":
        result = ns.length ? Math.max(...ns) : NaN;
        break;
      default:
        return null;
    }
    return Number.isFinite(result) ? result : null;
  }
  return {
    diagnostics,
    expression: Object.freeze({
      dependencies: Object.freeze([...deps]),
      evaluate: (context: ExpressionContext) => evaluate(expr, context),
    }),
  };
}
export function fromJsonLogic(input: unknown): {
  expr?: Expr;
  diagnostics: Diagnostic[];
} {
  const errors: Diagnostic[] = [];
  const operators: Record<string, string> = {
    and: "and",
    or: "or",
    "!": "not",
    "===": "eq",
    "!==": "neq",
    ">": "gt",
    ">=": "gte",
    "<": "lt",
    "<=": "lte",
    "+": "add",
    "-": "sub",
    "*": "mul",
    "/": "div",
    "%": "mod",
    if: "if",
    in: "in",
    cat: "concat",
  };
  let count = 0;
  function convert(v: unknown, depth: number): Expr {
    if (++count > 2000 || depth > 64) {
      errors.push({
        severity: "error",
        code: "expression-limit",
        message: "JSONLogic expression limit.",
      });
      return null;
    }
    if (
      v === null ||
      typeof v === "boolean" ||
      typeof v === "string" ||
      typeof v === "number"
    )
      return v;
    if (isRecord(v) && Object.keys(v).length === 1) {
      const [op, args] = Object.entries(v)[0]!;
      if (op === "var" && typeof args === "string")
        return { path: args.startsWith("data.") ? args : `data.${args}` };
      if (Object.hasOwn(operators, op))
        return [
          operators[op],
          ...(Array.isArray(args) ? args : [args]).map((a) =>
            convert(a, depth + 1),
          ),
        ] as Expr;
    }
    errors.push({
      severity: "error",
      code: "unsupported-jsonlogic",
      message: "Unsupported JSONLogic operator or variable fallback.",
    });
    return null;
  }
  const expr = convert(input, 0);
  return errors.length
    ? { diagnostics: errors }
    : { expr, diagnostics: errors };
}
