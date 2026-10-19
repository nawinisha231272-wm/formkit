# @ourform/schema

Version 1.0 definition types, Draft 2020-12 meta-schema, diagnostics and migration harness.
No internal or external runtime dependencies. Runs without browser globals.

```ts
import {
  validateDefinition,
  formDefinitionSchema,
  migrate,
} from "@ourform/schema";
const diagnostics = validateDefinition(input); // accepts unknown JSON
const migration = migrate(input);
if (!migration.diagnostics.length)
  console.log(migration.definition, migration.applied);
// formDefinitionSchema can also be used with an external Draft 2020-12 validator.
```

`validateDefinition(input, registry?)` checks structural shape, ids, scoped keys, known models, property
kinds/bounds, reference existence and regular expression syntax. Semantic failures use stable diagnostic
codes such as `duplicate-id`, `duplicate-key`, `unsafe-key`, `bad-ref`, `invalid-pattern`, `unknown-type`
and `invalid-property`. Engine compilation adds expression, cycle and unsupported-capability diagnostics.
The meta-schema handles shape; scoped uniqueness and model contracts require the runtime check.

`DefinitionRegistry` is a structural interface with `get(type)`, exposing a model's value capability,
data scope and property descriptors without importing core. Object data scopes allow repeated keys in
separate containers; layout children share their parent's scope. Without a registry, cross-level scope
semantics are deferred to compilation; sibling uniqueness is still checked.

`migrate` currently accepts only 1.0, returns no applied migrations, and includes diagnostics for invalid
or unsupported input. Read `definition` only when diagnostics is empty; older versions are never silently
reinterpreted. Later migrations will be added here.

`isRecord`, `isSafeKey` and `inspectJson` are shared safety primitives. JSON inspection rejects executable
values, non-finite numbers, non-plain objects, cycles, reserved object keys and excessive depth/size.
They are exported to let core preserve identical safety checks without an import cycle.

Types: `FormDefinition`, `ComponentNode` (`FormField` alias), `ValidationRules`, `Expr`, `ExprOp`,
`Diagnostic`, `DefinitionRegistry`. Submission JSON Schema generation is scheduled for M06.

M02 adds `PropertyDescriptor` and `validateProperties(metadata, overrides)`, shared by engine compilation
and the SDK config resolver. It validates all seven metadata kinds and number bounds/select membership.
The internal shape walker is shared by definition and expression-property validation without importing core.

M05 adds optional ComponentNode.ariaLabel (string) for a shared-shell accessible name override. The visible label is retained; meta remains uninterpreted host metadata.
