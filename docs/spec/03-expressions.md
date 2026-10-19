# 03 — Expressions

Status: normative (wire format may change by ADR before M1 ends). Package: `@ourform/core`.

## Wire format (compact prefix arrays)

```ts
export type Expr =
  | null
  | boolean
  | number
  | string // literals
  | { ref: string } // value of component by id (same row when inside a repeater)
  | { path: string } // 'data.a.b', 'row.qty', 'form.mode'
  | [op: ExprOp, ...args: Expr[]];

export type ExprOp =
  | "and"
  | "or"
  | "not"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "mod"
  | "if" // ['if', cond, then, else]
  | "empty"
  | "len"
  | "sum"
  | "min"
  | "max"
  | "concat"
  | "call"; // ['call', 'functionName', ...args]
```

Example: show when customer type is business and revenue > 100000

```json
{
  "visibleWhen": [
    "and",
    ["eq", { "ref": "cmp_customer_type" }, "business"],
    ["gt", { "path": "data.revenue" }, 100000]
  ]
}
```

## Evaluator rules

- Pure tree walk over the parsed expression. No `eval`, `new Function`, `with`, or dynamic import.
- Property access only through `ref`/`path` resolution against session data; never reads
  `__proto__`, `constructor`, `prototype`.
- Max depth 64, max nodes 2,000 per expression (compile error beyond).
- Type behaviour is defined and tested: comparisons of mismatched types return false; arithmetic on
  non-numbers returns null; division by zero returns null.
- `call` resolves only functions registered on the engine. A function declares
  `{ pure: boolean, availableInNode: boolean }`. Unknown function = compile error.

## Dependency recording

The compiler walks each expression and records every `ref` and `path` it reads. Inside a repeater,
`{ ref }` to a sibling resolves within the same row; `{ path: 'data.…' }` resolves from the root.
These edges form the dependency graph used by the session.

## Interop

`fromJsonLogic(json) → { expr, diagnostics }` converts the JSONLogic subset used by Form.io simple
conditionals. Unsupported operators produce diagnostics, never silent changes.
