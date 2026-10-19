# @ourform/renderer-dom

The M02 renderer mounts portable VNode controls once and updates fields named in StatePatch.
It reads FieldState; mounting, typing and theme switching never call session.validate().

```ts
import { renderForm, renderToString } from "@ourform/renderer-dom";
const view = renderForm(root, session, views, "base");
view.setTheme("tailwind");
view.focus("component-id");
const html = renderToString(session, { views, theme: "base" }); // also runs in Node
view.destroy(); // leaves session ownership with the host
```

Views maps component types to field.views from defineField. The transitional explicit map is engine-scoped
by the host; no global view registry is added. FormView has setTheme/focus/destroy. Themes are still cosmetic
base/bootstrap/tailwind presets. Full mount engine options and FieldShell variants/theme packages arrive in M03.

mountVNode(vnode) is the low-level host-slot primitive: it returns el, update(next) and destroy().
Matching tag/key identities preserve elements. Keyed child reorders preserve focus/caret; replacing a
focused node's tag throws. Event listeners dispatch current props, and refs/listeners are released once.
During composition, value writes are deferred and intermediate input events are ignored; compositionend
commits the current user input before further updates. Actual OS IME conformance remains part of later hardening.

renderToString shares the control VNodes and safely escapes output. It emits static HTML without event
handlers or hydration; client apps can mount afresh. SSR uses no browser globals. Nested object/layout nodes
are supported. Shell selection is retained as SDK metadata; full group/inline/cell rendering is M03 scope.

The development probe page checks production controls in React 19.2 and Angular 20.3, plus cleanup,
focused updates, composition events and four-field accessibility. It is not a public framework adapter.
