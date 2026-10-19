# @ourform/sdk

Typed component authoring with portable VNodes. No external runtime dependency.

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
Full localization and composite/plugin/native registration APIs arrive in later milestones.

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
