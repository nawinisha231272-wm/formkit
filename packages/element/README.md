# @ourform/element

```ts
import {
  renderForm,
  registerElementField,
  defineOurFormElement,
} from "@ourform/element";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
const fields = [registerElementField("employee", "employee-lookup")];
const form = renderForm("#container", {
  schema,
  fields,
  data: {},
  theme: "bootstrap5",
  themes: [bootstrap5Theme],
});
form.session.subscribe(({ data, changedPaths }) =>
  console.log(data, changedPaths),
);
await form.submit();
form.destroy();
defineOurFormElement("our-form"); // explicit, once per document; importing is Node-safe
```

Native elements use `.value`, `value-change` (`CustomEvent.detail` is the value), capture `blur`,
`.disabled`, `.readOnly`, `.id`, `.name`, `.required`, `.labelledBy`, `.describedBy` and `.invalid`.
Map unusual conventions with valueProp/changeProp/blurProp/disabledProp/readOnlyProp/mapChange.
ValueType defaults to string; choose number/boolean/array explicitly. Objects require a value adapter.
The component owns its internal focusable element and must forward its supplied ARIA/state properties.
The bridge forwards global ARIA attributes to the custom root; required is passed as a property so it
can be applied to a supported inner role. A custom element may override focus() for Shadow DOM.

`<our-form>` properties: schema, data, theme, themes, engine, readOnly, fields. Set properties before connecting
for a single initial mount. Light DOM is default; set `shadow` before connecting for an open shadow root.
Events bubble and are composed: of-ready, of-change ({ data, changedPaths }), of-submit (SubmitResult).
Methods: submit(), validate(), reset(data?), focusField(id). controller exposes the active session/view.
Disconnect disposes the mount/session; reconnect preserves the latest data. Schema/engine/fields/readOnly
changes rebuild deliberately; data/theme/themes changes update in place. Use setData on the returned controller
for changed-leaf controlled updates. Duplicate tag registrations throw. No plugin API is implied by fields.

M06 registers all Tier 1 builtinFields automatically. Configure custom/async validation and localization
on the supplied engine. HostOptions.onAction and composed, bubbling of-action DOM events expose custom
button actions (including across the custom element's Shadow DOM boundary).

M07: layouts are included by default. Example: `pnpm --filter @ourform/vanilla-example dev`, then open
`http://127.0.0.1:4181/?onboarding`. The same 40-field fixture supports read-only, summary and reset.

```html
<our-form
  theme="bootstrap4"
  read-only
  schema='{"$formVersion":"1.0","id":"sample","display":"form","components":[{"id":"name","type":"text","key":"name","label":"Name"}]}'
  data='{"name":"Ana"}'
></our-form>
```

Call defineOurFormElement() once before using the tag. schema/data JSON attributes and theme/read-only
are observed; string theme and readOnly properties reflect attributes. Boolean attributes use presence,
so remove read-only to enable editing. Object properties remain supported. Invalid attribute JSON/compile
emits composed of-error ({message}); malformed JSON preserves the current form. No URLs are fetched.
Imperative reset() clears the renderer summary and touched state. Disconnect/reconnect preserves data.
Invalid schema/theme updates retain the previous valid property. Removing schema clears the mounted
form; setting it again remounts with preserved data. Initial connection failures also emit of-error.
Custom Theme objects remove the string attribute and remain property-owned.

## Visual builder (M09)

```ts
import { renderBuilder, defineOurFormBuilderElement } from "@ourform/element";
const controller = renderBuilder(emptyMount, {
  schema,
  fields: [customField],
  onSchemaChange: save,
});
defineOurFormBuilderElement();
const element = document.createElement("our-form-builder");
element.schema = schema;
element.fields = [customField];
element.theme = "bootstrap4";
element.setAttribute("shadow", ""); // optional; before connection
mount.append(element);
element.addEventListener("of-schema-change", (e) => save(e.detail));
```

`OurFormBuilderElement` exposes schema/theme/engine/fields/controller. Set engine/fields before connect;
changes validate and recreate the controller. Connected schema updates load atomically without resetting
history; schema echoes are no-ops. Theme updates preserve controller/control identity. `of-ready` supplies
the controller; `of-error` reports invalid schema/attributes. Disconnect destroys listeners/controllers;
reconnect restores current definition with new history. Light and open-shadow modes are supported;
schema events bubble/composed. Use controller.preview for response data. No global field registry.

M09b builder elements expose `chrome` as a JavaScript property. Setting it calls `setChrome` in place;
it is retained across disconnect/reconnect. The imperative `renderBuilder` factory accepts the full
builder options, including palette, toolbar, editor and locks. Native elements stay in the owner's DOM.

Register form descriptors per instance with `element.themes = [baseTheme, bootstrap5Theme]`
(imported from `@ourform/themes/base` and `@ourform/themes/bootstrap5`) before connecting;
set `element.theme = "bootstrap5"` to select one. Replacing `themes` after connection updates
styles and controls in place, preserving values, touched/errors, focus and caret. The same registry
is retained on reconnect. Unknown names throw an Error with `code: "unknown-theme"`; attribute or
connection failures emit composed `of-error` with `{ code, message }`. Invalid registry/selection
updates leave the previous registry, selection and live session unchanged; there is no fallback.

### Per-feature builder preload

The builder host exposes independent `settingsPreload`, `planningPreload` and `dataPreload`
options (`'idle'` by default, `'none'` to load only on activation). `preload` controls only
Logic/JSON and defaults to `'none'`. Set all four to `'none'` for a no-background-import host.
Angular uses inputs, React uses props, and the builder custom element uses properties.
