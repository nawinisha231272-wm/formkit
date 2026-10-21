# 04 — Component SDK

Status: normative for M2–M9. Packages: `@ourform/sdk` (contracts, definers), models consumed by `@ourform/core`.

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
  slots?:
    | readonly ComponentSlot[]
    | ((node: Readonly<ComponentNode>) => readonly ComponentSlot[]);
  expand?: (node: ComponentNode) => ComponentNode[]; // composites
  validators?: string[]; // names of registered validators always applied
  builder: {
    title: string;
    group: string;
    icon?: string;
    order?: number;
    rootOnly?: boolean;
  };
}

export interface ComponentSlot {
  name: string;
  label: string;
  accepts: readonly string[]; // field/layout/composite kinds or exact registered type
  max?: number; // direct children in this slot, not descendants
}

export interface ValueAdapter<V> {
  empty(): V;
  normalize(input: unknown): V;
  isEmpty(value: V): boolean;
  equals?(a: V, b: V): boolean; // default Object.is
  serialize?(value: V): unknown; // default identity
  jsonSchema?(config: unknown): object; // contributes to submission JSON Schema
}
// shipped helpers: stringValue(), numberValue({ empty: null }), booleanValue(), nullableBooleanValue({ requiredTrue: false })
// array helpers and further nullable inputs belong to M10; custom adapters use this interface.
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

## M07 layouts (ADR-0009)

`defineLayout({type,title,dataScope?,tag?,columns?,properties?})` returns a RegisteredField with a
non-value kind=layout model and a frozen LayoutView. dataScope is none (default) or object; tag is
div (default), section or fieldset; columns defaults false. Layout properties use normal generated
metadata. The renderer owns child mounting into the layout root, after its heading/description.
Built-in descriptors: panelLayout, columnsLayout, fieldsetLayout, containerLayout; builtinLayouts
and builtinComponents join the compatible M06 builtinFields export.

## M08 extension contracts (ADR-0003)

definePreset(type,{base,defaults,title}) shares a portable/native field's adapter/validators/views and derives frozen
typed property defaults. Node properties override them; the base is unchanged and the type must differ.
defineComposite({type,title,components,dataScope}) snapshots fixed child templates. Object scope is
default; none is transparent. Children receive instance-id/local-id ids and runtime visibility/calculation/validation refs
are rebased; properties/meta/default values stay opaque. Absolute paths/external refs retain meaning. Wire definitions remain compact; expanded
nodes are validated for shape, ids, keys, types, properties and refs. Instance children cannot override
the template. Recursive expansion fails; limits are 64 levels / 10,000 expanded nodes. Composite roots
use a fieldset/legend; defineLayout remains the API for wire-editable child layouts.

definePlugin packages trusted descriptors. Install with createEngine({plugins:[plugin,...]}), supplying
all dependencies together; order is independent. Semver ranges use npm semantics against coreVersion
and installed plugin versions. Invalid/incompatible registrations and conflicting plugin ids, component
types, theme names, functions, validators or data-source names throw; form requires returns missing-plugin.
Core keeps models/version metadata; renderer/adapters receive component views and themes explicitly.
dataSources are host-owned providers under providers.dataSources, with no automatic network access;
M11 remote-control behavior is deferred. Changing plugins requires a new engine.

@ourform/testing exports renderComponent(def,{host,theme,...}), with an empty caller-owned Element host,
optional engine/node/data/fields/readOnly/adapter/nativeHost and a normal destroyable FormController result.
checkValueAdapter, checkValidation and checkBuilderRoundTrip plus componentTestEngine are reusable
Node/browser invariants. CLI create-component/create-theme/create-plugin emit pinned standalone
projects; --local-packages selects packed prepublication dependencies. See apps/docs author guides.
Every new component must pass conformance and visuals in base, Bootstrap 4, Bootstrap 5 and Tailwind.

The exact proposed SDK 0.x named export freeze is docs/api/sdk-0.x.json / ADR-0003. The external
guide-only developer exercise and M08 human gate review are required before that freeze is accepted.

## M08 rehearsal corrections (ADR-0012)

Portable controls may call setValue directly; core rejects protected user writes and the renderer
restores stored value/checked properties without replacing the control. Keep forwarding supplied
state/ARIA. The typed t(key,params?) contract is unchanged; apps/docs shows a complete numeric field
with component-owned typed English defaults and host translations.

The scaffold provides exact Node/pnpm metadata and .nvmrc, a preview, Playwright/axe, four-theme browser
verification, a mini builder command, and exact digest-pinned Linux visual commands. Test fixtures use
node.validation.required, node.disabledWhen, and top-level readOnly. @ourform/testing adds
mountComponentBuilder; @ourform/testing/playwright adds checkPropertyEditors and PropertyEditorCase.
The helper requires observable preview assertions for every generated custom properties.\* editor.
Missing baselines produce explicitly unapproved evidence; recording, comparison and review remain
explicit. Existing visual/count/correctness thresholds are unchanged. AI rehearsals do not pass M08.

## Final M08 adapter and caption additions (ADR-0013)

`nullableBooleanValue(options?: {requiredTrue?: boolean}): ValueAdapter<boolean | null>` returns
empty null, normalizes booleans/"true"/"false" (other inputs become null), compares with Object.is,
serializes identity and contributes boolean/null JSON Schema. Default isEmpty recognizes only null;
requiredTrue:true recognizes false and null as empty. Required always delegates to isEmpty: a consent
field must opt into true-only required semantics, while an ordinary tri-state answer accepts false.
Optional false/null remain valid. booleanValue is unchanged and takes no options.

ValueAdapter members empty/normalize/isEmpty are required functions. equals defaults to Object.is;
serialize defaults to identity and must produce safe JSON. jsonSchema(config) is an optional safe JSON
Schema hint over serialized values, with resolved properties as config. Empty must be recognized;
normalize/serialize must preserve canonical round trips. Session writes normalize input; canonical
validateSubmission rejects coercible but noncanonical submissions. JSON Schema can describe static
constraints; runtime conditional/custom rules remain authoritative in validateSubmission. For a
boolean/null hint, required schema excludes every finite-domain value recognized by isEmpty after normalization, rather
than assuming empty() is the only empty value.

Editable control captions live in properties. Literal caption properties default to English text;
separate optional message-key properties enable translation. A missing/unknown key falls back to the
configured literal. Do not unconditionally translate arbitrary user-entered literal text. The typed
inline Yes/No example in the author guide demonstrates this contract and shell: inline; all five
shell choices and their accessibility responsibilities are documented there.

CLI --help/-h are successful no-write operations (exit 0); malformed generation arguments still fail.
Owner-approved author evidence and M11 human usability requirements are recorded in ADR-0013/M08/M11;
this amendment does not add slots or any M09 functionality.

## M09 declarative slots (ADR-0014; implementation follows the plan PR)

Ordinary containers declare `slots: [{name,label,accepts,max?}]`. A trusted per-node resolver may
derive the same descriptors from instance properties (Tabs). A shared headless resolver validates
safe unique names, accepted kind/type strings, nonnegative integer capacities and a maximum of 64
slots. Slots are immutable metadata, with no DOM/view references. Labels use the host translation
callback with their declared English text as fallback.

defineLayout gains optional slots and tab-layout presentation. Omitted slots keep a single children
slot accepting all three kinds. Existing layout JSON and default-slot rendering remain compatible.
An SDK layout declaring slots automatically becomes a canvas/outline drop target without builder
changes. Values are still addressed by model.dataScope and node.key, not by slot names. builder.rootOnly
restricts components such as future Wizard pages to the form root. Fixed composites remain fixed.

Children stay in node.components and may specify node.slot; omission selects the parent's first slot.
Configurable Tabs uses stable option values as slot names and editable option labels as captions.
Deleting a slot with children is an invalid edit until those children are moved or removed.
See spec 07 for structural commands, drop rules and keyboard authoring.

M09 ships the slots described above as additive SDK0.x APIs (`ComponentSlot`, `resolveSlots`, layout
slots/tabs/rootOnly options). Slot labels are literal by default and passed through host translation
with unchanged-caption fallback. Tabs default slot names first/second are stable option values;
labels can change independently. See the guide's typed card example and ADR-0014 implementation note.
