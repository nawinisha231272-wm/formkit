# @ourform/element

```ts
import {
  renderForm,
  registerElementField,
  defineOurFormElement,
} from "@ourform/element";
const fields = [registerElementField("employee", "employee-lookup")];
const form = renderForm("#container", {
  schema,
  fields,
  data: {},
  theme: "bootstrap5",
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

`<our-form>` properties: schema, data, theme, engine, readOnly, fields. Set properties before connecting
for a single initial mount. Light DOM is default; set `shadow` before connecting for an open shadow root.
Events bubble and are composed: of-ready, of-change ({ data, changedPaths }), of-submit (SubmitResult).
Methods: submit(), validate(), reset(data?), focusField(id). controller exposes the active session/view.
Disconnect disposes the mount/session; reconnect preserves the latest data. Schema/engine/fields/readOnly
changes rebuild deliberately; data/theme changes update in place. Use setData on the returned controller
for changed-leaf controlled updates. Duplicate tag registrations throw. No plugin API is implied by fields.
