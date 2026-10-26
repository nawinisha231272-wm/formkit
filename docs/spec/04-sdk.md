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
  builder?: {
    title: string;
    group: string;
    icon?: string;
    order?: number;
    rootOnly?: boolean;
  };
}

export interface ComponentSlot {
  name: string;
  label: string; // literal English fallback
  labelKey?: string; // explicit opt-in to host translation
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
slots/tabs/rootOnly options). Slot labels are literal by default. Optional labelKey explicitly opts into host translation
with label as the English fallback. Tabs default slot names first/second are stable option values;
labels can change independently. See the guide's typed card example and ADR-0014 implementation note.

## M09a — Column collections and palette eligibility (ADR-0015)

Columns' per-node slots are column_0, column_1, etc., matching its `node.columns` array. Every column
owns its own components collection and width; the column widths total 12. Slot resolvers/compile and
commands share this mapping. Layout models without explicit slots derive these destinations from
column collections; explicit slot metadata must match the storage. Fixed composites still own their
expansion; composite templates and expanded children also migrate/traverse column collections.
CompiledNode.parentSlot records effective column membership without adding child.slot to wire JSON.

A builder palette entry requires a nonblank `model.builder.title`; model.title alone is a renderer
caption and does not opt into authoring. Missing metadata or an empty/whitespace builder title hides
the entry without preventing schema compilation or explicit commands. SDK definers still generate
builder titles from their title option. The playground excludes employeeObject/SDK card/Root section
registrations by default; ?demos explicitly enables their conformance harness cases.

## M09b builder theme descriptors (ADR-0016)

SDK exports BuilderTheme, BuilderTokens, BuilderPrimitive and defineBuilderTheme. Tokens are safe
--ofb-\* string values; modes.dark supplies overrides; recipes maps primitive names to token overrides.
The helper freezes snapshots and rejects unsafe names/JSON, CSS escapes/network values and unknown
primitive names. It resolves no DOM or registry. Renderer preset descriptors and the builder runtime
apply appearance per owner instance, independently from form definition JSON. Material joins the
four existing form themes for new-component conformance. No M09c rule engine is introduced here.

## M09d — Extension and configuration (accepted plan; ADR-0019)

**Plan accepted with owner amendments on 2026-10-23; not an implemented API.**
This documentation-only change does not start M09d or approve PR #15. Implement only after M09c.
Delivery order: M09b+ → M09c → M09d → M10a → M10b. See [M09d](../milestones/M09d.md).

### Descriptor extension

`extendField(base, overrides)` and `extendLayout(base, overrides)` compose a new frozen registration
from an SDK descriptor. They do not subclass controls, mutate the base or replace an existing type.
`overrides.type` is required, nonempty and distinct; title/builder presentation may change. Defaults:

| Member           | Planned merge/override rule                                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Value adapter    | Inherit the complete adapter, including empty/required/serialization/JSON Schema behavior. No partial adapter merge. Replacement requires `value: {replace: true, adapter}` and explicit typed view compatibility plus adapter/validation/view conformance.                                                             |
| Validators       | Retain base validators in order; append `extraValidators` (registered names), de-duplicating identical names. Ordinary overrides cannot remove inherited validation.                                                                                                                                                    |
| Shell and views  | Inherit the shell and every portable/native/pack/layout view. Explicit compatible shell/view overrides affect the derived type only and require conformance.                                                                                                                                                            |
| Properties       | Merge by property name. Existing entries retain their position and inherit omitted metadata; new entries append in declaration order and require complete metadata/helper definitions. Existing kind/value types must remain compatible.                                                                                |
| Defaults         | `defaults` overrides declared config-property defaults after metadata merging; reject unknown names, invalid values or incompatible metadata. It is distinct from response `defaultValue`.                                                                                                                              |
| Hidden editors   | `hideProperties` names declared config properties; retain metadata, defaults, serialization and validation. Inherited hides are presentation defaults; explicit host rules may reveal them (spec 07). They are not authorization or removal of a property.                                                              |
| Portable wrapper | `wrapControl(baseControl, props)` receives the base portable control and the derived typed props; it returns the composed VNode. Forward state/ARIA/refs and call the base control without taking ownership of its session or shell.                                                                                    |
| Layout structure | Preserve kind, dataScope, child storage, slot declarations/resolver, expansion and root-only constraints. Existing instance configuration may still select valid dynamic slots through that resolver. Layout presentation may change through a compatible layout view; renderer-owned children/outlets retain identity. |

Merge a property definition shallowly by metadata member; arrays/objects such as options, default
and visibleWhen replace atomically, not by implicit concatenation or recursive merge. New defaults
are bounded safe JSON. Merge views by adapter key, replacing a supplied adapter view as a whole and
retaining unspecified views. `wrapControl` and a direct `views.portable` replacement are mutually
exclusive; the wrapper receives the immediate resolved base portable control, not itself.

The original descriptor's type/identity is immutable. `kind`, `dataScope`, structural slot/storage contracts
and composite expansion cannot change through these helpers. A different structural contract needs
`defineField`/`defineLayout` and a new model. `extendLayout` has no value adapter to replace.
Layout view composition must preserve the existing mounting/slot protocol; it does not introduce a
second child renderer. `wrapControl` applies only to the portable control: native-only bases have
no portable control to wrap, and adapter-specific changes use explicit views/`overrideView`.

Resolve and flatten ancestry once, retaining headless base/type/version provenance. Permit at most
**8 derivation edges** (root depth 0); count presets and extensions together, including kit presets.
Reject cycles, repeated derived type identities and depth 9. Property/default/validator/shell/view
merges are evaluated root to leaf, never by registration-array order. Direct helper misuse throws
a programmer error with its stable diagnostic code; imported kit mistakes return diagnostics.

The base must resolve in the installed registration graph. Cross-plugin derivation declares the
base-owning plugin in `requires` with an npm-semver range; every plugin/kit engine range must match
the installed core, and every base dependency range must match its installed owner. Derived types
do not weaken ancestor compatibility requirements. Changing a published derived type's canonical
value/serialization/structure is a breaking change for its owning package and requires a new
compatible version/migration decision; kit format version, kit release version and engine range
are separate. ADR-0003 allows additive exports; implementation must update the API inventory,
package READMEs and changesets without changing existing definers' defaults.

Illustrative planned author surface (not runnable until M09d):

```ts
import { extendField, stringProperty, h } from "@ourform/sdk";
import { numberField } from "@ourform/components";

export const currency = extendField(numberField, {
  type: "acme.currency",
  title: "Currency",
  properties: {
    currency: stringProperty({ label: "Currency", default: "USD" }),
  },
  wrapControl: (baseControl, p) => {
    const id = `${p.a11y.id}-currency`;
    const describedBy = [p.a11y.describedBy, id].filter(Boolean).join(" ");
    return h(
      "div",
      {},
      h("span", { id }, p.config.currency),
      baseControl({ ...p, a11y: { ...p.a11y, describedBy } }),
    );
  },
});
```

This demonstrates reuse/adornment with the inherited number/null adapter. It does not settle M10b
locale parsing, decimal precision or rounding. It retains the existing description and adds the
currency code to it; the author guide must verify all-host/theme conformance within the milestone's
line-count rule. Native views that bypass the portable wrapper need their own compatible
binding when the added property affects rendering; inheritance is not evidence that they conform.

### Explicit view replacement

`overrideView(type, adapter, view)` is a pure public SDK helper returning a frozen override descriptor;
it does not mutate a registry. Pass descriptors through host `viewOverrides` options on the renderer,
Element, React or Angular host/builder instance. Adapter keys are `react`, `angular`, `element`, with
typed bridge helpers in their own packages; SDK/core never import those frameworks. Node receives
only the headless models. A view cannot replace the value adapter, validators, shell ownership or
form definition.

Resolution for an exact type/adapter becomes: **explicit host override → existing native view →
renderer pack → portable view → no-view**. Resolve before mounting; changing overrides requires an
explicit host remount, not global mutation. Repeated descriptors for the same type/adapter fail with
`view-override-conflict`; unknown targets/invalid bridges fail explicitly. Targeting a base does not
silently retarget separately registered derived types. Unmatched adapters and other instances keep
their existing views. Ordinary `engine.register`/plugin duplicate-type registration keeps throwing.

Acceptance includes replacing React Select while leaving the form JSON byte-identical, preserving
its state, ARIA, validation and lifecycle, and leaving Angular/Element unaffected.

### Versioned JSON component kits

A kit is data with `$kitVersion: "1.0"`, a unique `id`, release `version`, `engine` semver range,
optional dependencies, `presets`, `composites`, `palette` and `editDialog`. Publish Draft 2020-12
`componentKitSchema` and an offline JSON export `@ourform/schema/component-kit.schema.json`, with
schema identifier `urn:ourform:component-kit:1.0`. Unknown members are errors. No URL is fetched to
load a kit or resolve its schema/dependencies. Publish the same schema for editor autocomplete:
scaffolds include a `$schema` association to that identifier, resolvable to the locally installed
schema file; `$schema` is an allowed association member, never a runtime fetch instruction.

Ship a standard trusted plugin with stable id **`ourform.builtins`**, exported by
`@ourform/components`. Its release version matches `@ourform/core`; its engine compatibility is
checked with the normal plugin rules. It wraps every built-in field/layout shipped in that release,
without test/demo registrations. Hosts install it explicitly; core never imports components/SDK
or auto-installs it. Node uses its headless model manifest, while browser hosts receive the matching
views separately. No application-written built-ins wrapper is needed for a JSON-only kit dependency.

### Optional kit entry and bundle budget

Ship loader and meta-schema validation through the separate **`@ourform/core/kits`** entry. Its
kit-enabled `createEngine({plugins, kits})` facade delegates ordinary engine construction to the root
core entry, then performs transactional kit resolution. This preserves the accepted call shape while
making kit integration an explicit import; the root entry must not import/re-export the loader,
validator or bundled meta-schema. Core still never imports SDK/components. SDK shared descriptor
lowering must not accidentally pull in kit JSON parsing/meta-schema validation.

Builder hosts opt into the kit entry only when configuring kits; the ordinary builder entry uses
the already resolved engine manifest without statically importing kit tooling. An already loaded
engine's policies do not require revalidating kit files in the builder. No-kit apps pay **zero kit
loader/meta-schema bytes or requests**, including no default prefetch of the optional entry.

Add an independent enforced kit-entry size budget to the M09d delivery checks. Its numeric ceiling
must be proposed with consumer-build measurements and accepted before shipping, as with ADR-0018's
additional feature entries; it is not an unbounded allowance. Measure the actual kit-enabled
consumer closure, including parsing/validation code and required schema assets, with shared chunks
counted once and the incremental cost over the equivalent no-kit build reported. Cover Vite/React,
Angular CLI, vanilla and script-tag consumers, offline and strict CSP. ADR-0018's **≤29 kB
builder-owned initial** and every existing entry/aggregate ceiling remain unchanged; no automatic
budget increases.

### Kit loading and data-only properties

`createEngine({plugins, kits})` accepts kit JSON documents, text or UTF-8 bytes after host-owned storage loading.
Supply all trusted base models and named validators/functions through plugins at creation; core does
not auto-import built-ins. Browser hosts supply the matching view bindings explicitly, as today.
The builder consumes the same engine's resolved kit manifest; a convenience `kits` option when it
creates its own engine goes through the same loader. An existing engine and conflicting kit inputs
are rejected rather than installed twice. Do not mutate kits/plugins in a live engine; create a new
engine/builder with explicit host lifecycle handling.

Headless kit lowering lives in core/schema and is shared with SDK `definePreset`/`defineComposite`
semantics. Core must never import SDK. Resolve the complete dependency/base/template graph before
publishing registrations; shared lowering preserves config defaults, named validators, composite
id/ref rebasing, data scopes and submission JSON Schema. SDK/renderer-owned view assembly inherits
the matching base views or standard composite layout; core neither stores nor executes views.
Add `extraValidators` and data-only `properties` to `definePreset` additively so code and JSON presets
lower identically; omitting them preserves the existing API's semantics.

Kit presets may declare **new config properties** with kinds **string, number, boolean, select,
options or json**. Require complete metadata for each property: supported kind, nonempty literal
English label (optional explicit translation key), group, safe default, and kind-specific constraints
and select choices where applicable. Validate defaults and all configured values against that
metadata with the same `invalid-property` diagnostics in Node and browser. Use bounded safe JSON;
reject prototype names, unknown metadata, `expr` kind and executable/custom-editor definitions.
New names cannot collide with inherited properties or structural/identity members; inherited-property
metadata overrides remain the trusted extension contract above.

Values are stored/exported at `properties.<name>` and resolved with ordinary config defaults.
Generate editors from this metadata; hosts and expression evaluation can read the resolved values
without writing through arbitrary paths. During implementation, update spec 03's typed configuration
reference contract for stable component ids plus declared property names, with safe resolution and
dependency tracking shared by Node/browser. These references are distinct from submitted-data paths.
Data-only declarations attach no rendering, submission-value validation, normalization or side
effects. Metadata validation checks config shape only. A separately registered trusted extension or
an explicitly authored expression/host consumer may use the value; the kit cannot manufacture such
behavior or mark a property logic-settable on its own.

Imported-kit failures return immutable `engine.getKitDiagnostics()` diagnostics; the engine retains
trusted registrations but publishes **none** of the requested kits on any kit error. Compile fails
closed with those errors, including for forms that would otherwise use only trusted types; the
builder shows blocking diagnostics. Trusted plugin/programmer errors still throw. No partially
usable kit installation or silent fallback is allowed.

Planned JSON-only acceptance fixture:

```json
{
  "$kitVersion": "1.0",
  "id": "acme.contacts",
  "version": "1.0.0",
  "engine": "^0.0.1",
  "requires": {
    "plugins": [
      { "plugin": "ourform.builtins", "version": "^0.0.1" },
      { "plugin": "acme.contact-rules", "version": "^1.0.0" }
    ],
    "validators": ["acme.usPhone"]
  },
  "presets": [
    {
      "type": "acme.usPhone",
      "base": "text",
      "title": "US phone",
      "properties": {
        "reportColumn": {
          "kind": "string",
          "label": "Report column",
          "group": "Data",
          "default": "phone"
        }
      },
      "defaults": {},
      "extraValidators": ["acme.usPhone"]
    }
  ],
  "composites": [
    {
      "type": "acme.address",
      "title": "Address",
      "dataScope": "object",
      "components": [
        { "id": "street", "type": "text", "key": "street", "label": "Street" },
        {
          "id": "postal",
          "type": "text",
          "key": "postal",
          "label": "Postal code"
        },
        {
          "id": "phone",
          "type": "acme.usPhone",
          "key": "phone",
          "label": "Phone"
        }
      ]
    }
  ],
  "palette": {
    "groups": [{ "id": "contacts", "title": "Contacts", "order": 4 }],
    "types": {
      "acme.usPhone": { "group": "contacts", "order": 0 },
      "acme.address": { "group": "contacts", "order": 1 },
      "password": { "hide": true },
      "hidden": { "hide": true },
      "text": { "rename": "Text field" }
    }
  },
  "editDialog": {
    "*": { "hide": ["tooltip"] },
    "acme.usPhone": {
      "default": { "validation.required": true },
      "lock": ["validation.required"],
      "relabel": { "label": "Question" }
    }
  }
}
```

`ourform.builtins` is the standard trusted plugin above; the example needs no app-written wrapper.
`acme.contact-rules` supplies an independently registered
validator; its implementation is **not** in the kit. Fixtures pin actual engine/plugin versions
when M09d ships. Dependencies may additionally declare `kits: [{kit,version}]` and `functions: [name]`.
`reportColumn` is declared data-only metadata: the generated dialog edits it, expressions/hosts can
read it, and changing it alone leaves Text's control and submission validation unchanged. Presets
cannot add control code or use undeclared config properties; use a trusted extension for new behavior.
Kits cannot request adapter replacement, wrappers or executable view overrides;
they may reference a separately registered trusted extended type. Composite children follow the existing fixed-template contract, including
columns, namespaced stable ids and bounded expansion. This kit cannot depend on M10b's future Phone.

Extend the form `requires` list with mutually exclusive entries `{kit: id, version: semverRange}`
alongside existing `{plugin,version}` entries. Missing, incompatible or absent required provenance
returns `missing-kit`, naming the kit/type/range; plugin-only forms remain compatible. Builder save
records **caret ranges from installed versions** of active kits (and their dependency closure),
including authoring policies: installed `1.0.0` saves `^1.0.0`, rather than an exact pin. Programmatic
forms declare the kits owning referenced types/templates. Loading a requirement never downloads it;
the host explicitly supplies installed kit versions. Compatible patch/minor 1.x upgrades keep forms
valid without rewriting their JSON/history. Use npm-semver caret rules, including narrower 0.x ranges.
Diagnostics/provenance still record the exact installed version used for a particular load.

The kit author guide must require a **major kit release for any change to canonical values,
validation or composite structure**, even if described as a fix. Patch/minor releases may make
compatible presentation/configuration additions only. Start kit releases at **1.0.0**; npm 0.x
caret ranges do not allow the same minor-upgrade compatibility as 1.x. Kit format version and engine/plugin ranges
remain separate. Test unchanged forms against compatible patch/minor releases, reject an incompatible
major with `missing-kit`, and do not silently migrate saved definitions/history.

### Kit authoring tools

Add **`ourform create-kit`** for a versioned JSON kit scaffold, schema association and guide commands,
and **`ourform kit validate <file>`** for offline validation against the same schema and headless
loader as the engine. Resolve trusted registrations through an explicitly host-selected local plugin
bootstrap; never import code named by the kit. The CLI and engine report identical diagnostic codes,
dependency context and JSON Pointers; valid input exits 0, invalid input nonzero and `--help` exits 0.
Guide examples cover built-ins registration, data-only properties, versioning, safe storage, policy
precedence and matching browser/Node validation. The fresh author trial uses these tools/docs.

The future **Save as reusable component** builder action writes kit presets in this same published
format. Only its format compatibility is recorded here; the action, gallery and storage stay deferred
until after M10a.

### Limits, conflict handling and trust boundary

Accepted initial hard limits: **32 kits**, **1 MiB UTF-8 per kit / 4 MiB total**, JSON depth **64**
(root 0), **20,000 visited JSON values per kit / 50,000 total**, and **256 derived registrations per
kit / 1,024 total**. These sit alongside the 8-edge derivation limit and existing composite
expansion limit of 64 levels/10,000 nodes. Hosts may tighten limits; kits cannot raise them.
Measure text size before parse and traversal/expansion before allocation growth; fail atomically.

Untrusted storage enters as bounded JSON text/bytes. Reject unsafe prototype keys at every depth,
unsafe path segments, functions, accessors/non-plain programmatic objects, cycles and non-finite
numbers. Treat arbitrary live JS/proxy objects as trusted-host misuse, not as a safe storage format.
References are local ids or installed names: no remote `$ref`, module URL, function body, JavaScript
expression, dynamic import, event handler or unsanitized HTML execution. Expressions use spec 03's
data AST and named host-registered functions; validators/editors/providers/icons are installed
capabilities referenced by name, never loaded by a kit. Existing Content sanitization still applies.

Unrelated kits assigning different values to the same policy/default cell conflict, rather than
using array-order last-wins. A dependent kit may override a declared dependency's presentation or
defaults, including an explicit reveal of a dependency's hide. Locks always accumulate without
an unlock path. Host presentation rules may reveal kit/inherited hides (spec 07). Duplicate kit ids or component types always
conflict. Canonical dependency/type ordering makes reversed input arrays equivalent. See spec 07
for wildcard/exact/host precedence and authoring-only versus runtime defaults.

Diagnostics include `unknown-base`, `extension-cycle`, `extension-depth`, `incompatible-extension`,
`value-replacement-required`, `invalid-kit`, `kit-limit`, `unsafe-key`, `kit-conflict`, `kit-cycle`,
`missing-kit` and `view-override-conflict`, plus existing validator/function/property diagnostics.
Include originating kit/plugin, type/base, dependency chain and JSON Pointer location where
applicable; do not render raw executable/HTML fragments in messages. Errors are localized with
English defaults. Node/browser parity covers canonical values, ordered errors and submission schema;
builder-only palette/editor policies do not alter validation or serialization.
