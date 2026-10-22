# @ourform/core

Headless compiler and runtime; compiles without DOM types. Uses pinned semver for plugin compatibility.

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

Custom/async validation and plugin/composite contracts are documented below. Repeater/array scopes
remain M10 and are explicitly diagnosed rather than partially executed. SDK metadata/value helpers
are available through @ourform/sdk.

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

## M08 extensions

`createEngine({plugins:[...]})` accepts structural PluginRegistration descriptors, validates npm semver
against exported coreVersion and all dependencies, and rejects conflicting registered names.
Functions/validators and providers.dataSources are per engine. Hosts pass views/themes separately;
core does not retain them. Changing the plugin set requires another engine. Forms with absent or
incompatible plugin requirements return missing-plugin diagnostics.
ComponentModel.expand is a trusted headless composite callback returning safe JSON children. Compile
validates expanded definitions and rejects recursion, malformed output, id/key/ref collisions, and
limits above 64 levels / 10,000 expanded nodes. The original wire definition is retained. SDK
defineComposite handles stable instance ids and local reference rebasing. See spec 04 and ADR-0003.
The pinned semver runtime dependency implements the standard npm range grammar; no custom parser or
network request is used.

Protected user-sourced setValue now emits a refresh-only StatePatch for that field: changedPaths=[],
unchanged data/state and no normalization/validation/dependent processing. Renderers restore the live
control from stored state. Default/API writes continue normally; equal API writes still emit nothing.
See ADR-0012. Read-only is a session/host mode; disabled comes from disabledWhen (including parents).

## Declarative child slots (M09)

`ComponentModel.slots` accepts readonly `{name,label,accepts,max?}[]` or a pure per-node resolver.
`resolveSlots(model,node)` returns frozen JSON snapshots, validates at most64 safe unique names and
nonnegative capacities, and supplies legacy layouts' default `children` slot. Accepts entries are model
kinds (`field`, `layout`, `composite`) or exact type names. Empty accepts refuses every type. Optional
`builder.rootOnly` prevents nesting. Compile validates child `slot` membership/accepts/capacity; an
omitted slot selects the first without rewriting JSON. Slots do not introduce data scopes. Dynamic
resolvers are trusted customer code and must be deterministic; malformed results return compile
diagnostics. Fixed composite expansions remain noneditable. See ADR-0014 and core slots tests.

Slot captions are literal text by default, including text that matches a catalog key. Optional
`labelKey: "acme.card.body"` opts into host translation with `label: "Contents"` as its English fallback.

M09a (ADR-0015): Columns uses `columns: [{width,components}]` (integer widths 1..12 totaling 12), with
positional column_0/column_1 slots and no redundant child.slot. Legacy flat Columns/layout.width inputs
migrate without mutation; multi-row spans retain order through nested transparent rows. Ordinary layout
components/slot semantics and submission scopes remain. Builder palette eligibility requires an explicit
nonblank builder title. The current UI is a harness; spec 10/M09b replaces its interactions.

`CompiledNode.parentSlot` stores effective column membership separately from the source child.
`resolveSlots` derives positional slots for layout nodes with column collections; explicit slot
metadata must match those collections in order and count. Columns on non-layout models are rejected.

Static `ComponentNode.disabled` and `readOnly` flags inherit through layouts. Disabled also combines
with disabledWhen; host read-only remains stronger. They use the same protected-user-write refresh
contract as host mode and dynamic disabled state; API writes continue to work (ADR-0017).
