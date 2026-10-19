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
  defaultValue?: unknown;
  validation?: ValidationRules;
  visibleWhen?: Expr;
  disabledWhen?: Expr;
  calculate?: { expr: Expr; allowOverride?: boolean };
  clearOnHide?: boolean; // default true
  properties?: Record<string, unknown>; // validated against the model's property map
  layout?: { width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 };
  components?: ComponentNode[]; // layouts and containers
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
