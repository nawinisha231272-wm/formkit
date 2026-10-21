# 01 — Form definition

Status: normative. Package: `@ourform/schema`.

The form definition is our own versioned JSON format (UI, layout, logic). It is NOT JSON Schema.
From it we generate a standard JSON Schema (Draft 2020-12) describing the submission.

## Types

```ts
export interface FormDefinition {
  $formVersion: "1.0";
  id: string;
  title?: string;
  display: "form" | "wizard";
  requires?: { plugin: string; version: string }[]; // semver range
  settings?: { locale?: string; validateOn?: "change" | "blur" | "submit" }; // default 'blur'
  components: ComponentNode[];
}

export interface ComponentNode {
  id: string; // stable, builder-generated, unique in the form
  type: string; // registered type; namespaced for plugins: 'acme.employeeLookup'
  key?: string; // required when the model produces a value
  label?: string;
  description?: string;
  placeholder?: string;
  ariaLabel?: string; // accessible name override; visible label remains unchanged (M05)
  defaultValue?: unknown;
  validation?: ValidationRules;
  visibleWhen?: Expr;
  disabledWhen?: Expr;
  calculate?: { expr: Expr; allowOverride?: boolean };
  clearOnHide?: boolean; // default true
  properties?: Record<string, unknown>; // validated against the model's property map
  layout?: { width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 };
  components?: ComponentNode[]; // ordinary layouts and containers
  columns?: {
    width: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    components: ComponentNode[];
  }[]; // Columns, instead of components
  slot?: string; // M09: parent's declared slot; omitted selects its first/default slot
  meta?: Record<string, unknown>; // never interpreted by the library
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // ECMAScript regex source, compiled once, no flags except 'u'
  minItems?: number;
  maxItems?: number;
  custom?: { validator: string; args?: Record<string, Expr> }[]; // registered names only
}
```

`Expr` is defined in `03-expressions.md`.

## Identity and data rules

| Concept      | Rule                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | Unique across the form. Expressions use `{ ref: id }`. Survives key renames and moves.                                                                      |
| `key`        | Unique among siblings in the same data scope. Allowed chars: `[A-Za-z_][A-Za-z0-9_]*`. Reserved: `__proto__`, `constructor`, `prototype`.                   |
| Data scope   | `dataScope: 'object'` (container) creates a nested object; `'array'` (repeater, datagrid) creates an array of row objects; layouts (`'none'`) add no level. |
| Row identity | Each array row gets a `rowId` (opaque string) kept in session state, not in submitted data.                                                                 |

## Validation of definitions

- `formDefinitionSchema`: JSON Schema 2020-12 meta-schema for the shapes above.
- `validateDefinition(def, registry?) → Diagnostic[]`: structure, unique ids, unique keys per scope,
  known types (when a registry is given), properties valid for the type, expressions reference
  existing ids, `requires` satisfied.
- Diagnostics: `{ severity: 'error' | 'warning', code, componentId?, message }`. Codes are stable
  strings such as `duplicate-id`, `duplicate-key`, `unknown-type`, `missing-plugin`, `bad-ref`,
  `cycle`, `invalid-property`.

## Migrations

`migrate(def) → { definition, applied: string[] }` upgrades older `$formVersion` values. Only 1.0
exists now; the function and its test harness exist from M1 so later versions plug in.

## Submission schema

`toSubmissionSchema(compiled) → JSONSchema` (2020-12):

- object per data scope, `properties` per keyed field, `required` for unconditional `required`;
- field types from each model's `ValueAdapter.jsonSchema(config)`;
- conditional rules that cannot be expressed become `x-ourform-*` annotations, never silently dropped.
  Checked in tests with Ajv 2020 on good and bad submissions from fixtures.

## M01 validation and migration boundary

The exported meta-schema describes the full 1.0 wire shape; `validateDefinition` adds scoped uniqueness,
reserved-key, registry, property and reference checks. It accepts unknown values and returns diagnostics
without throwing for malformed input. `migrate` returns `{ definition, applied, diagnostics }`; consumers
must check diagnostics before reading definition. Only 1.0 is recognized. Submission schema generation,
plugin satisfaction and composite/array execution follow their assigned milestones.

## M06 implemented submission schema

schema exports toSubmissionSchema(SubmissionSchemaSource), JSONSchema and emailPattern. CompiledForm
structurally satisfies the generator input; schema never imports core. validation re-exports the generator.
Draft 2020-12 output includes object scopes, adapter submission type hints, unconditional required/empty
constraints, scalar bounds/patterns and static email/option rules. Optional empty values bypass ordinary
rules as in sessions. Generated submission JSON Schema disallows unknown keys. Serialize is applied to empty-value hints.

Visibility-dependent validation, calculations, disabled conditions and host/custom rules are explicit
x-ourform-\* annotations. Static validators cannot execute those annotations; use validateSubmission for
runtime logic. Arbitrary adapter domain rules require model validators and appropriate jsonSchema hints.
Unsafe/non-JSON adapter schemas and unsafe/row paths are rejected. Arrays executing repeater rows remain M10.

@ourform/validation exports compileForm(engine, unknown) → CompileResult and
validateSubmission(compiled, submission, {providers?, unknownKeys?}) → Promise<ValidationResult>. It checks safe/canonical
serialized data and scope/key structure before using the shared session pipeline. Missing visible required
fields, coercions and forged calculations fail; custom values must round-trip normalize/serialize. It
sends nothing and imports no renderer. See ADR-0008 and fixtures/submissions for explicit good/bad samples.

## Submission unknown-key decision (ADR-0011)

validateSubmission's options select `unknownKeys: 'reject' | 'strip'`, default `'reject'`. Strip ignores
unknown properties only at the root and declared object scopes, before runtime rules/provider validation,
without mutating caller data. Declared adapter values (including object/array values) retain their own
internal shape and canonical checks. Unsafe input anywhere, malformed known scopes, required/type failures
and forged calculations remain errors. The result remains ValidationResult, not a filtered payload.
Generated JSON Schema remains strict; hosts choosing strip use SDK preprocessing rather than expecting
JSON Schema validators to remove properties. This option is not persisted in FormDefinition settings.

## M09 slot placement amendment (ADR-0014)

Child slot names select a parent's declared slot without changing the ordered components tree or
adding a data scope. Existing omitted-slot JSON stays unchanged. Root components do not carry a slot.
Compilation and structural commands validate declared destinations, accepted kinds/types, capacities
and root-only placement. Slot metadata/resolvers are registered model code, never executable wire JSON.

M09's optional child slot is validated against registered model metadata by compilation, including
accepts/direct-child max and rootOnly placement. Definition meta-schema validates its nonempty string
shape; semantics need the engine registry. Tabs is transparent; Container still introduces object scope.

## M09a — Per-column storage (ADR-0015)

Canonical Columns has `columns: [{width,components}]`, one to twelve columns, with integer widths 1..12
summing to 12. It never also has flat components. Membership in the column array determines a child's
slot; children do not carry redundant slot values. Ordinary layouts and Tabs retain components/slot.
Columns and individual columns are transparent to submission data scopes. The definition meta-schema
checks shape/exclusive storage; semantic validation checks the sum of widths. Submission JSON Schema
still exposes value fields and object Containers, not visual column wrappers or arrays.

migrate recognizes legacy type columns without columns, including the existing 1.0 version. It copies
input, consumes direct children's layout.width (default 12), packs rows in order, fills trailing gaps
with empty columns, and uses transparent nested Columns for mixed-width multiple rows. Full-width
vertical lists share one width-12 column. Empty legacy Columns becomes two empty width-6 columns.
New row IDs are deterministic and collision-free; field IDs/keys/refs/data scopes remain stable.
It reports columns-per-column-v1 in applied; canonical input is byte-idempotent. Invalid mixed storage,
widths and unknown legacy slots are rejected. See ADR-0015 and migration tests for exact examples.

Schema exports ComponentColumn/ColumnWidth and childCollections/componentChildren/childSlot. These
headless helpers expose real collection paths and effective placement; returned child arrays refer to
the source, so only builder commands mutate draft copies. No migration writes to caller-owned JSON.
