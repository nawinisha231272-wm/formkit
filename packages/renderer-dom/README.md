# @ourform/renderer-dom

```ts
import { mount } from "@ourform/renderer-dom";
import { tailwindTheme } from "@ourform/theme-tailwind";
const view = mount(root, session, {
  engine,
  views: new Map([
    [textField.model.type, textField.views],
    [ratingField.model.type, ratingField.views],
  ]),
  themes: [tailwindTheme],
  theme: "tailwind",
  mode: "dark",
  presentation: { name: { help: "Shown on your receipt" } },
});
view.setTheme("base"); // updates classes/tokens in place
view.setMode("high-contrast");
view.focus("name");
const result = await view.submit(); // failed submissions focus a linked error summary
view.unmount(); // destroy() alias; session lifetime remains host-owned
```

Explicit registries are per mount; engine models stay headless. The base theme ships as the
renderer default; other names must be registered in `themes`. `Theme` objects also work directly.
`appTheme`, `formTheme`, `componentThemes` apply token/class/mode overrides in that order.
Custom CSS must scope its selectors with `.of-root`; it is trusted host code. No theme makes network calls.
`themeMode` is light/dark/high-contrast. Use `dir=rtl` on the root for RTL.

Shell hints travel with `defineField().views`. Field, group (fieldset/legend), inline, cell and none
share anatomy and translated shell messages (`t`). `presentation[id]` accepts help/prefix/suffix
and `cellLabel` (combined column/row context). Group focus falls back to the first enabled control.
A single polite region announces validation. `session.submit()` alone is headless; use `view.submit()`
or a bubbling native submit event for summary/focus behavior. Mounted roots do not add a submit button.

`renderToString(session, { views, theme?, themes?, idPrefix?, ...overrides })` shares the shells without
browser globals. Give each SSR form a distinct safe `idPrefix` (default `of-ssr`); SSR is static, not hydration.
New DOM mounts generate unique ids unless `idPrefix` is supplied. The M02 `renderForm` compatibility
wrapper keeps raw ids and supports all three shipped theme names; use `mount` for scoped ids, registered themes and submit integration.

M04 adds adapter/nativeHost to mount options. NativeHost mounts an opaque control slot and returns
update/destroy; the renderer continues to own FieldShell and focus/error wiring. resolveView chooses native,
then pack, then portable once per field, or throws no-view with type and adapter. onSubmit receives native
and imperative submission results. Native SSR is not supplied by these client adapters; portable SSR remains.
createFormHost(fields, engine?) builds isolated engine/view maps. Portable/native views can share a type
when they share its model; conflicting models or duplicate views throw. createFormController(root, options)
owns compile/session/mount/subscriptions/disposal for adapters. It installs default theme presets; fields
must be provided explicitly (the adapters supply built-ins). syncData writes changed compiled leaf paths.
