# @ourform/core

Headless M01 compiler and runtime. Zero external runtime dependencies; compiles without DOM types.

```ts
import { createEngine, type ComponentModel } from "@ourform/core";
const text: ComponentModel<string> = {
  type: "text",
  title: "Text",
  value: {
    empty: () => "",
    normalize: (v) => String(v ?? ""),
    isEmpty: (v) => !v.trim(),
  },
};
const engine = createEngine().register(text);
const result = engine.compile({
  $formVersion: "1.0",
  id: "feedback",
  display: "form",
  components: [
    { id: "name", type: "text", key: "name", validation: { required: true } },
  ],
});
if (result.ok) {
  const session = engine.createSession(result.form);
  const unsubscribe = session.subscribe((patch) =>
    console.log(patch.changedFields),
  );
  session.setValue("name", "Ana", { source: "user" });
  console.log(await session.submit()); // { ok: true, data: { name: 'Ana' } }
  unsubscribe();
  session.dispose();
}
```

`compile(unknown)` returns `CompileResult` diagnostics for definition errors. Duplicate model registration
and wrong API usage throw. `Registry` exposes `register`, `get` and `list`; each `Engine` has its own
registry and exposes `register`, `getField`, `listFields`, `compile`, `createSession`.
Compiled forms belong to their engine and snapshot both the definition and registry models.

Sessions expose `getData`, `getValue`, `setValue`, `getFieldState`, `touch`, `validate`, `submit`, `reset`,
`subscribe`, `dispose`, and the transitional `schema`/`definition` accessors. `validate({ paths? })` returns
`Promise<ValidationResult>`; `submit` validates and serializes a captured snapshot without sending it.
`StatePatch` contains `changedFields`, `changedPaths: Path[]` and a frozen data snapshot. `FieldState`
contains visibility, disabled/readOnly, required, dirty/touched, pending and message-key errors.

`parsePath` / `formatPath` support object paths (`customer.city` or `['customer', 'city']`).
Updates copy only objects along that path. Arrays/row paths are diagnosed until M10.
`debug.processorRuns[id]` instruments per-node processing for tests; comparing counters proves unrelated
fields are not processed. Unchanged normalized values do not emit patches.

`compileExpression` validates the prefix-array AST and returns dependency ids plus an evaluator.
`ExpressionBindings` resolve refs/paths; `ExpressionContext` supplies snapshot reads and session mode.
Expressions have depth 64 and node count 2,000 limits, safe paths, fixed arities and short-circuit booleans.
`fromJsonLogic` converts the documented strict subset and returns diagnostics for unsupported operators,
loose equality and variable fallbacks. See ADR-0004 for exact arities/type/aggregate/override semantics.

Host functions are configured with `createEngine({ functions: { name: { pure: true,
availableInNode: true, run: (...args) => result } } })`. They are trusted application code;
only registered pure functions available in Node may be referenced from expressions.

Other public types: `ComponentModel`, `ValueAdapter`, property metadata types, `PathInput`, `FieldError`,
`FieldState`, `StatePatch`, `ValidationResult`, `SubmitResult`, `CompiledForm`, `CompiledNode`,
`CompileResult`, `FunctionMap`, `HostFunction`, `CompiledExpression`, `ExpressionContext`, `ExpressionBindings`.

Custom/async validation, plugins, composites and repeaters remain later milestones. They are explicitly
diagnosed rather than partially executed. Full SDK metadata/value helpers arrive in M02.

## M06 custom and async validation

createEngine({ validators, providers, functions }) owns frozen per-engine registries. Model validators
apply by name; node.validation.custom adds { validator, args? } with expression arguments. Unknown names
return unsupported-validator. The built-in email/options names are reserved. A Validator has
validate(value, context) returning null, FieldError, FieldError[] or a Promise. Context includes frozen
data/config/args, path/componentId, AbortSignal and providers. Empty values skip custom rules; required
handles emptiness. Host failures/malformed results become unavailable errors.

New runs, value/dependency changes, hiding, reset and dispose cancel older async work. pending is true
while waiting; late results cannot write state. Canceled validate/submit waiters settle with aborted
errors. Providers own I/O and timeouts. Core itself never calls a network endpoint.

providers.localization(key, params, locale) may return text or undefined. session.localize uses the
frozen englishMessages/englishMessage catalog as fallback (or a supplied fallback). Locale comes from
form settings. Built-in length rules count Unicode code points, matching JSON Schema. Node types are
build-time only; core still compiles without DOM and runs in both Node 22 and browsers.
