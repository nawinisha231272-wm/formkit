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

M05 includes Bootstrap 4 and 5 in host/legacy preset defaults; low-level mount can register bootstrap4Theme explicitly. The bootstrap alias remains Bootstrap 5. Optional node.ariaLabel overrides accessible naming while retaining the visible label; placeholder is forwarded to controls.

M06 renders non-value portable Content/Button views, supplies control actions and forwards custom
HostOptions.onAction events ({name, componentId, data}) plus bubbling of-action DOM events. Submit actions
share summary/focus/callback handling; reset uses the same session. Localization defaults to the engine
provider with the English SDK catalog fallback; the existing t callback and of.required alias remain valid.
Async validators expose aria-busy and a pending description through the shared shell/live region.
Pointer-triggered blur touches are deferred until activation completes to prevent validation layout
changes from canceling clicks; keyboard blur stays immediate. Listeners and queued work are cleaned up.

M07 layouts share semantic DOM/static SSR shells and preserve independently keyed children on parent
and theme updates. FormView.reset(data?) clears summary/submitted and deferred blur state, then resets
the session. Mount replaces any existing SSR markup; hydration and native-view SSR are not implemented.

```ts
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { renderToString, mount } from "@ourform/renderer-dom";
const engine = createEngine();
for (const component of builtinComponents) engine.register(component.model);
const compiled = engine.compile(definition);
if (!compiled.ok) throw new Error("Invalid definition");
const session = engine.createSession(compiled.form);
const views = new Map(builtinComponents.map((c) => [c.model.type, c.views]));
const html = renderToString(session, { views }); // server; escape-safe portable output
// Client: create its own session from the same definition/data, then replace server markup:
const view = mount(document.querySelector("#form")!, session, {
  engine,
  views,
});
view.reset();
```

`pnpm dev` → `/onboarding.html` demonstrates built-package server output and client remount.

Rejected user edits on disabled/read-only fields trigger a core refresh patch. Portable rendering
restores live value/checked properties even when VNode props are unchanged, preserving node identity.
Field authors forward state/ARIA and can call setValue directly; no manual DOM restoration is needed.

M09 adds `mode: 'design'` to RenderOptions: every authoring slot and hidden field is shown with inert
portable controls and native placeholders. Runtime Tabs retains every panel/control while switching;
focus(id) reveals ancestor panels. `defaultThemes` is a frozen array containing Bootstrap4/5/Tailwind
(the Base fallback is built in), shared by the form host and builder. `@ourform/builder` mounts a design
view and editable preview on one session, avoiding duplicate processor/provider runs.

M09a (ADR-0015): Columns uses `columns: [{width,components}]` (integer widths 1..12 totaling 12), with
positional column_0/column_1 slots and no redundant child.slot. Legacy flat Columns/layout.width inputs
migrate without mutation; multi-row spans retain order through nested transparent rows. Ordinary layout
components/slot semantics and submission scopes remain. Builder palette eligibility requires an explicit
nonblank builder title. The current UI is a harness; spec 10/M09b replaces its interactions.
