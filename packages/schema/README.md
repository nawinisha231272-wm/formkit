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

M06 exports toSubmissionSchema(compiled), JSONSchema and the structural SubmissionSchemaSource type.
The generator depends on no core import. It emits Draft 2020-12 submission objects, static value/rule/
required constraints and x-ourform-\* annotations for runtime logic. It preserves optional empty-value
semantics and rejects unsafe schema paths. Host adapters provide JSON submission type hints via jsonSchema.
See @ourform/validation for shared runtime validation and ADR-0008 for annotation boundaries.
Static options metadata now rejects duplicate/empty values, preserving stable keys and the empty sentinel.

emailPattern is the shared Tier 1 email rule source used by core and JSON Schema output.

Boolean value adapters may have more than one empty state (e.g. nullable consent treats false and
null as empty). For a declared boolean/null JSON Schema domain, toSubmissionSchema normalizes each serialized boolean/null candidate before consulting isEmpty. Required excludes every empty candidate; optional values
remain valid. This keeps nullableBooleanValue({requiredTrue:true}) aligned with runtime validation.

M09 adds optional component `slot: string`: the parent's declared destination, omitted for its first
slot. Root components cannot specify a slot. Children retain their ordered `components` array. Slot
membership does not change data scopes; moving into a keyed Container does. Old JSON remains valid.

M09a (ADR-0015): Columns uses `columns: [{width,components}]` (integer widths 1..12 totaling 12), with
positional column_0/column_1 slots and no redundant child.slot. Legacy flat Columns/layout.width inputs
migrate without mutation; multi-row spans retain order through nested transparent rows. Ordinary layout
components/slot semantics and submission scopes remain. Builder palette eligibility requires an explicit
nonblank builder title. The current UI is a harness; spec 10/M09b replaces its interactions.

`ComponentColumn` and `ColumnWidth` describe the canonical wire collections. `childCollections(node)`
returns real relative collection paths and effective column slot names; `componentChildren(node)`
flattens immediate children in reading order; `childSlot(parent, child)` resolves placement without
writing wire metadata. Returned collection arrays refer to the source. Treat compiled definitions as
immutable and mutate only command-owned draft copies.

Optional ComponentNode presentation fields `tooltip`, `prefix`, `suffix` are strings; `disabled` and
`readOnly` are static boolean flags. Flags inherit through containers; disabled combines with
disabledWhen, and host read-only cannot be weakened by a node. See spec 01 and ADR-0017.
