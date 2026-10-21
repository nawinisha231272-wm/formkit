# @ourform/sdk

Typed component authoring with portable VNodes and headless core models.

```ts
import {
  defineField,
  h,
  controlAttributes,
  stringValue,
  numberProperty,
} from "@ourform/sdk";
const field = defineField({
  type: "acme.text",
  title: "Text",
  value: stringValue(),
  properties: { max: numberProperty({ label: "Max", default: 20, min: 1 }) },
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      value: p.value,
      maxlength: p.config.max,
      oninput: (event: Event) =>
        p.setValue((event.target as HTMLInputElement).value),
      onblur: p.onBlur,
    }),
});
// engine.register(field.model); views.set(field.model.type, field.views);
```

`defineField` returns frozen `{ model, properties, shell, views: { portable, shell } }`. Its author callback
infers both the value type and `ConfigOf<typeof properties>`. `model` contains only headless data/value
contracts, kind, and builder metadata. Default shell is field; default builder group is Fields.
A heterogeneous view registry erases value/config types after author-side checking and runtime config validation.

`FieldControlProps<V,C>` contains value/setValue, onBlur, typed readonly config, state (disabled, readOnly,
invalid, pending, required), a11y ids, focusRef, theme.classFor and t. `controlAttributes` returns shared
input ARIA/state/ref props; pass the optional 'group' role for grouped buttons to omit aria-required,
which that role does not support. Required is still available in state and enforced by core validation.
The renderer uses views.shell for FieldShell selection, including group legends and required announcements.

`stringValue()` uses blank text as empty, `numberValue({ empty: null })` normalizes invalid/nonfinite or
blank input to null, and `booleanValue()` uses false as empty. Each isEmpty recognizes its own empty().
Number zero remains a valid number. The boolean adapter accepts true and the literal string 'true';
other input normalizes to false. Helpers provide submission-type hints through jsonSchema.

Property helpers: stringProperty, numberProperty, booleanProperty, selectProperty, exprProperty,
optionsProperty and jsonProperty. Group defaults to Display. resolveConfig validates metadata defaults
and overrides and returns `{ ok, config?, diagnostics }`; valid configs are copied/frozen. Unknown keys,
wrong kinds, out-of-range numbers, bad select/options/expressions and unsafe JSON produce invalid-property.
`ConfigOf` derives config types without losing number/boolean types. Core compilation uses the same validator.

VNode APIs: h(tag, props, ...children), VNode, VNodeChild, VNodeProps, VNodeAttribute.
Children flatten arrays; null/boolean children are omitted. Keys must be unique per sibling set.
Host function handlers use lowercase event props (oninput, onchange, onclick, onblur). ref receives
an HTMLElement or null on release. Unsafe attributes, executable string events and unsupported URLs are rejected.
`renderVNodeToString` escapes text/attributes and omits refs/events/keys; `escapeHtml` is the shared escaper.
`defaultMessage` supplies the Rating, shell and synchronous validation English defaults and falls back to the message key.
Localization, native bridges and declarative preset/composite/plugin APIs are available; see below.

Types re-exported: ComponentModel, ValueAdapter, PropertyDefinition, PropertyMap, PropertyKind,
PropertyGroup, ConfigOf, FormDefinition, FormField, Expr, FieldControlProps, FocusTarget, ShellVariant,
FieldDefinition and PortableControl. The DOM lifecycle lives in @ourform/renderer-dom, not field authors' code.

M03 exports `Theme`, `ThemeOverride`, `ThemeMode` and `FieldPart` types. Themes specify tokens,
variant/part classes, compiled scoped CSS and dark/high-contrast token overrides. Field overrides
contain tokens, classes and modes. Theme runtime and explicit per-mount registration live in renderer-dom.

M04 adds registerNativeField(adapter, type, Component, options), returning a RegisteredField descriptor.
Install it in a host's fields array; no global registration occurs. ComponentViews has optional native,
packs and portable views. Native selection uses native → pack → portable for the selected adapter.
Conventional string registration needs no options; valueType selects number/boolean/primitive-array.
Object values require a ValueAdapter. Runtime TypeScript prop inference is impossible; default inference
is explicitly string and object emissions are rejected without an adapter. React/Angular wrappers enforce
this boundary in their typed signatures. Options include model/title/properties/shell, valueProp/changeProp/
blurProp/disabledProp/readOnlyProp/mapChange/value. mapNativeProps creates the standard state/ARIA callbacks;
disabled/read-only changes cannot commit. Prototype and direct HTML-writing property mappings are rejected.

M05 adds optional FieldControlProps.placeholder, forwarded by controlAttributes (except group controls) and mapNativeProps. defaultMessage supplies generated base builder labels.

M06 adds defineField.validators (registered model rule names), defineDisplay for non-value controls,
optional FieldControlProps.actions (submit/reset/emit) and the shared englishMessages catalog. defineDisplay
uses the same metadata/view composition but omits the model value adapter, so no data key is required.
Readonly actions are disabled by the supplied controls; renderer callbacks own session operations.

M07: `defineLayout({ type: 'acme.section', title: 'Section', tag: 'section', dataScope: 'none' })`
returns frozen model/layout-view metadata. The renderer independently owns child mounts. tag supports
div/section/fieldset, columns enables a 12-track grid, and dataScope supports none/object. Optional
properties use the same helpers/generated builder panels. No value adapter or raw HTML slot is needed.

## M08 presets, composites and plugins

`definePreset(type,{base,defaults,title})` derives typed property defaults and shares the base field's
views/adapter/validators without mutation. Node properties can override them; use a distinct type.
`defineComposite({type,title,components,dataScope})` creates fixed reusable children, object-scoped by
default (or transparent with none). Child ids and internal refs are prefixed with the instance id;
wire definitions remain compact. Children cannot be overridden at the instance. Invalid/recursive
expansion and id/key collisions are compile diagnostics. The Address sample is in `/sdk-extensions.html`.

`definePlugin({id,version,engine,components?,themes?,validators?,functions?,dataSources?,requires?})`
packages trusted descriptors. `createEngine({plugins:[...]})` validates full npm semver ranges, required
plugins and conflicting registration names. A form's unsatisfied requires returns missing-plugin.
Hosts supply packaged component views/themes explicitly; core retains only models/version metadata.
Data sources are customer-owned providers, with no automatic requests. Installation is per engine,
fixed at creation. Native views are packaged as RegisteredField descriptors; raw headless models are
also accepted. See [component author guide](../../apps/docs/component-author-guide.md),
[theme author guide](../../apps/docs/theme-author-guide.md) and ADR-0003 for the proposed 0.x freeze.

M08 author correction: portable controls can call setValue directly. Core rejects protected user
writes and refreshes only the attempted field from stored state, without changing data/processors.
API writes keep working. See the complete Quantity numeric/typed-English-default example and real
required/disabled/top-level-readOnly fixtures in apps/docs/component-author-guide.md (ADR-0012).

`nullableBooleanValue({requiredTrue?: boolean})` provides a tri-state `boolean | null` adapter:
null is unset, true/false remain distinct. By default both boolean answers satisfy required; with
requiredTrue:true only true satisfies required (false is preserved but considered empty). Optional
false and null stay valid in either policy. normalize accepts booleans and "true"/"false", maps other
inputs to null; canonical submissions must already be boolean/null. empty returns null, equals uses
Object.is, serialize is identity, jsonSchema permits boolean/null. Existing booleanValue stays a
nonnullable true-only-required checkbox. See the component author guide's complete adapter contract,
inline Yes/No example and explicit literal-caption/message-key properties.

## Layout slots and Tabs (M09, additive 0.x API)

```ts
const card = defineLayout({
  type: "acme.card",
  title: "Card",
  slots: [{ name: "body", label: "Contents", accepts: ["field"], max: 3 }],
});
```

Register this binding normally: the builder renders a field-only drop target without extension code.
`ComponentSlot` and `resolveSlots` are public headless exports. Layouts without metadata retain one
`children` slot. `slots(node)` can derive up to64 validated descriptors from config; `tabs:true` requests
tablist/panel rendering. Stable slot names are keys; labels are captions and may be translated by the
host. `rootOnly:true` maps to headless builder placement metadata. Changing/removing an occupied slot
must first move its children. Fixed composites remain model-owned, rather than inferred drop targets.

Slot captions are literal text by default, including text that matches a catalog key. Optional
`labelKey: "acme.card.body"` opts into host translation with `label: "Contents"` as its English fallback.
