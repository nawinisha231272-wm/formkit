# 04 — Component SDK

Status: normative for M2–M8. Packages: `@ourform/sdk` (contracts, definers), models consumed by `@ourform/core`.

M05 adds optional FieldControlProps.placeholder, sourced from the node. controlAttributes forwards it
for field controls (omitted for group controls); mapNativeProps forwards it to native components.
defaultMessage includes base builder property labels and the example EmployeeLookup property label.

## Goal

A developer adding a basic field writes only the control. Label, description, help, errors,
required marker, ARIA wiring, theming, validation wiring, builder palette entry and property panel
come from the library.

## Customer paths

| Path                            | API                                                                                                                         | Code the customer writes                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A. Configure                    | `definePreset(type, { base, defaults, title })`                                                                             | None                                                            |
| A. Assemble                     | `defineComposite({ type, title, components, dataScope })`                                                                   | None                                                            |
| B. Register an existing control | `registerNativeField(adapter, type, Component, opts?)` (+ `registerReactField`, `provideFormField`, `registerElementField`) | One line if conventional; value adapter if the value is complex |
| C. New portable field           | `defineField({ type, value, properties, control })`                                                                         | The control                                                     |
| Advanced                        | `defineLayout`, custom `shell`, custom property `editor`                                                                    | Layout / editor views                                           |
| Package                         | `definePlugin({...})`                                                                                                       | Packaging only                                                  |

## Model (headless)

```ts
export interface ComponentModel<V = unknown, C = Record<string, unknown>> {
  type: string;
  kind: "field" | "layout" | "composite";
  value?: ValueAdapter<V>;
  properties: PropertyMap; // generates ConfigOf<P>, defaults, validation, builder panel
  dataScope?: "none" | "object" | "array";
  expand?: (node: ComponentNode) => ComponentNode[]; // composites
  validators?: string[]; // names of registered validators always applied
  builder: { title: string; group: string; icon?: string; order?: number };
}

export interface ValueAdapter<V> {
  empty(): V;
  normalize(input: unknown): V;
  isEmpty(value: V): boolean;
  equals?(a: V, b: V): boolean; // default Object.is
  serialize?(value: V): unknown; // default identity
  jsonSchema?(config: unknown): object; // contributes to submission JSON Schema
}
// helpers: stringValue(), numberValue({ empty: null }), booleanValue(), arrayValue(item), objectValue({...})
```

Rule: an "empty" value must be recognised by `isEmpty`. (Starter-kit bug: Rating used `0` as empty
while `isEmpty(0)` was false, so a required Rating passed. Rating's empty is `null`.)

## Property metadata

```ts
export interface PropertyDefinition<T> {
  kind:
    | "string"
    | "number"
    | "boolean"
    | "select"
    | "expr"
    | "options"
    | "json";
  label: string; // message key or literal
  group:
    | "Display"
    | "Data"
    | "Validation"
    | "Conditional"
    | "Layout"
    | "Accessibility"
    | (string & {});
  default: T;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  description?: string;
  visibleWhen?: Expr; // evaluated against the component's own config in the builder
  editor?: string; // id of a registered custom property editor (escape hatch)
}
export type PropertyMap = Record<string, PropertyDefinition<unknown>>;
export type ConfigOf<P extends PropertyMap> = {
  [K in keyof P]: P[K] extends PropertyDefinition<infer T> ? T : never;
};
// helpers: stringProperty, numberProperty, booleanProperty, selectProperty, exprProperty, optionsProperty, jsonProperty
```

From one `properties` map the SDK derives: the TypeScript config type, defaults, runtime config
validation (diagnostic `invalid-property`), the builder property panel, and docs tables.

## Portable field

```ts
export function defineField<V, P extends PropertyMap>(spec: {
  type: string;
  title: string;
  group?: string;
  icon?: string;
  value: ValueAdapter<V>;
  properties?: P;
  shell?: ShellVariant; // 'field' (default) | 'group' | 'inline' | 'cell' | 'none'
  control: PortableControl<V, ConfigOf<P>>; // representation fixed by ADR-0002 in M2
}): FieldDefinition<V, ConfigOf<P>>; // { model: ComponentModel, views: { portable } }

export interface FieldControlProps<V, C> {
  value: V;
  setValue(next: V): void;
  onBlur(): void;
  config: Readonly<C>;
  state: {
    disabled: boolean;
    readOnly: boolean;
    invalid: boolean;
    pending: boolean;
    required: boolean;
  };
  a11y: {
    id: string;
    name: string;
    labelledBy: string;
    describedBy?: string;
    errorId?: string;
  };
  focusRef(target: FocusTarget | null): void;
  theme: { classFor(part: string): string };
  t(key: string, params?: Record<string, unknown>): string;
}
```

Multi-value controls receive `V = T[]` plus `addItem(value?)` and `removeItem(index)`.
The control must spread `a11y.id`, `aria-labelledby`, `aria-describedby`, `aria-invalid` and
`aria-required` (from `state`) onto its focusable element, or onto its group root for `group` shells.

## Shell variants

| Variant  | Use                                  | Semantics                                                  |
| -------- | ------------------------------------ | ---------------------------------------------------------- |
| `field`  | text, number, date, rating\*, lookup | `<label for>` + control + description + errors             |
| `group`  | radio group, checkbox group, rating  | `<fieldset>` + `<legend>`                                  |
| `inline` | single checkbox, switch              | control then label                                         |
| `cell`   | inside DataGrid rows                 | no visible label; accessible name from column header + row |
| `none`   | composites, layouts                  | children manage their own shells                           |

A shell owns presentation and accessibility, never data.

## Native bridges

Conventions (override with `{ valueProp, changeProp, blurProp, disabledProp, value: ValueAdapter }`):

| Host          | Value in                            | Change out                                    | Also passed                                                      |
| ------------- | ----------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| React         | `value`                             | `onValueChange(next)`                         | `onBlur`, `disabled`, `readOnly`, `id`, `name`, `aria-*`         |
| Angular       | `value` input (decorator or signal) | `valueChange` output                          | `disabled`, `readOnly`, `id`; ControlValueAccessor also accepted |
| Web Component | `.value` property                   | `value-change` CustomEvent (`detail` = value) | `.disabled`, `.readOnly`, native `blur`                          |

If no model is given, the bridge infers one: `stringValue()` unless `opts.value` is provided.
Inference is only valid for string, number, boolean and arrays of those; anything else requires
`opts.value`. Document this limit; do not promise one-line registration for complex widgets.

## Override resolution

For type T in adapter A: native view for A → renderer-pack view for A → portable view →
compile/mount error `no-view` naming T and A. Resolved once at mount.

## Plugins

```ts
export function definePlugin(spec: {
  id: string;
  version: string;
  engine: string; // engine = semver range of @ourform/core
  components?: (FieldDefinition | ComponentModel)[];
  themes?: Theme[];
  validators?: ValidatorMap;
  functions?: FunctionMap;
  dataSources?: DataSourceMap;
  requires?: { plugin: string; version: string }[];
}): Plugin;
```

Install validates version ranges and conflicts (throws on duplicate type). A form whose
`requires` is unsatisfied fails compile with `missing-plugin`.

## SDK acceptance scenarios (automated tests by M8)

A. Portable Rating in < 30 lines of meaningful code. B. Conventional React control: 1 statement.
C. Unusual React control: registration + small mapping. D. Rating appears and is editable in the
builder with zero builder code. E. Switching base → bootstrap5 → tailwind needs zero Rating changes.
F. Portable Rating renders in Angular with zero changes.

## M02 implementation decision

ADR-0002 selects h() VNodes for PortableControl and records the comparison and contract details.
`defineField` returns model, views and typed properties metadata; model's builder metadata is headless.
`ConfigOf` is exported from core and re-exported by sdk. Metadata helper groups default to Display;
resolveConfig and core compilation share schema's validateProperties routine. All seven property helpers
are present; array/object value helpers, plugins, composites and native adapters remain later milestones.

`controlAttributes(props, role?)` handles refs, ids and state attributes. For role='group' it omits
aria-required, which the group role does not support; state.required and required validation remain intact.
The M03 shell will provide the complete required announcement and group semantics. This corrects the
blanket “spread aria-required onto every group” instruction above; supported roles determine ARIA validity.
See [WAI-ARIA group](https://www.w3.org/TR/wai-aria-1.2/#group).

`numberValue({ empty: null })` and `booleanValue()` normalize empty values consistently. The transitional
M01 zero-valued Rating default is retired. A single starter assertion updates accordingly; core/schema
regression tests remain unchanged. Field authoring examples now return VNodes rather than HTMLElements.

## M03 additions

`defineField().views` includes the optional `shell` hint alongside `portable`, preserving it in an
explicit renderer registry. SDK exports Theme, ThemeOverride, ThemeMode and FieldPart types.
`controlAttributes` includes pending (`aria-busy`) and read-only state; group mode omits unsupported
aria-readonly/aria-required. FieldShell supplies required announcements from the group legend.
English shell and synchronous-validation messages are available through defaultMessage; a renderer
`t` option translates them. No wire-schema theme or presentation properties are added.

## M04 native registration

registerNativeField returns a RegisteredField descriptor with a headless model and ComponentViews.
ComponentViews selects native[adapter] → packs[adapter] → portable. Native views carry the host component
and mapping metadata; renderer-owned opaque slots are mounted by a NativeHost lifecycle (mount/update/destroy).
Default mapping is value and the framework's conventional change/blur/disabled/readOnly props. mapChange
extracts unusual event payloads. The generic model is string by default; valueType explicitly chooses
number (nullable empty), boolean or primitive-array. Object-valued controls require a ValueAdapter.
Types erased by JavaScript cannot be inspected to infer runtime values. React/Angular typed wrappers
require a value adapter for complex props and explicit non-string inference choices. Runtime value guards
reject complex emissions without an adapter. NativeRegistrationArgs expresses the typed registration boundary.
Unsafe prototype/direct HTML-writing property names are rejected. Native callbacks refuse disabled/read-only
commits, while controls remain responsible for forwarding their supplied state and ARIA to the actual input.

## M06 implemented controls and display composition

ComponentModel/defineField support validators?: readonly string[] referring to engine rules.
defineDisplay({type,title,properties,control}) composes a non-value field model and none-shell view without
a submitted key. Portable FieldControlProps.actions optionally supplies submit/reset/emit(name). The host
renderer owns these operations; no session is recreated by controls. englishMessages is the shared frozen
English catalog and defaultMessage retains the existing helper API and message aliases.

Tier 1 named exports: textareaField, emailField, passwordField, radioField, selectField, hiddenField,
contentField and buttonField, in addition to Text/Number/Checkbox and unchanged Rating. builtinFields is
the shared frozen default registration list. Radio/Select expose options metadata with unique nonempty
string values; empty is the unselected sentinel. Hidden is a normal value-producing hidden input.
Button action/text/event properties select submit/reset/custom events. Content html is rendered through
sanitizeContent into allow-listed VNodes, never raw HTML. Its supported subset/limits/protocols are in
ADR-0008; it is not a general HTML5 parser or an HTML-string sanitizer for other sinks.
