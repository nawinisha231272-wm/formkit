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

## M01 concrete semantics

ADR-0004 records arities, JSON type comparisons, short-circuit behavior, aggregates, host-function failures
and override lifetime. Expression paths are parsed once during compilation. `form.mode` is supported;
row/index paths are diagnosed until M10. The JSONLogic converter supports strict comparisons (`===`,
`!==`), boolean operations, arithmetic, conditional, membership, concatenation and simple `var` paths
within these typed expression semantics. Loose equality (`==`, `!=`), variable fallbacks and unknown
operators return diagnostics. It is a typed conditional subset, not general JSONLogic emulation.

## M09c root-rule boundary (ADR-0022, accepted 2026-11-10)

Legacy visibleWhen/disabledWhen/calculate retain this evaluator and root-core path, without requiring
core/logic or rewriting their wire expressions. Root-rule conditions/action values use the same safe
expression semantics through explicitly registered @ourform/core/logic. The root entry never pulls
in edge actions/revert/cascade/effects/events/provenance; missing registration produces missing-logic.
Compile reads once into rule/target indexes; no expression parsing or all-rule scan per field edit.

Non-overridable continuous calculations and submit assignments are authoritative. Load setValue/clear
are one-time editable initializers, not replayed by Node (owner correction, 2026-11-11). State-action expressions are always
enforced server-side. Change/event setValue/clear outputs are user-editable, not forged calculations.
Expression call retains its existing purity/synchronous evaluation contract; root-rule **effect call**
is distinct: once per trigger, trusted registration only, immutable snapshot, lifecycle-tracked async
completion, Node availableInNode gate and host timeout default 5 s with diagnostics/destroy cancellation.
No JSON expression gains executable code or permission to make package-owned network calls.

Existing fromJsonLogic behavior remains; **no new Form.io importer or narrow logic conversion helper**
is delivered in M09c. All Form.io import work moves to the post-1.0 importer backlog.
