# @ourform/theme-bootstrap4

```ts
import { bootstrap4Theme } from "@ourform/theme-bootstrap4";
mount(root, session, {
  engine,
  views,
  themes: [bootstrap4Theme],
  theme: "bootstrap4",
});
```

Bootstrap 4 class mapping plus compiled scoped fallback CSS; works with or without Bootstrap 4.6.2 CSS.
No jQuery, Bootstrap JavaScript, CDN or framework runtime dependency. Light, dark, high-contrast and RTL
are supported. SDK imports are types only. Host adapters include this preset by default.

Use Bootstrap 4's stylesheet independently of Bootstrap 5's; presets do not isolate two global framework
stylesheets loaded together. The bootstrap legacy alias remains Bootstrap 5. Rating and other controls
use the same shell/part metadata in both themes, with no component-specific theme code.

Reference: [Bootstrap 4 form classes](https://getbootstrap.com/docs/4.6/components/forms/).

Bootstrap 4 is fully supported for 1.0 (ADR-0011). Every new component must pass conformance and
visual checks in base, Bootstrap 4, Bootstrap 5 and Tailwind, with unchanged accessibility/pixel gates.

`builderTheme` exports matching light/dark builder chrome, inheriting Neutral tokens and adding
this theme's accent, typography and primitive recipes. It is separate from the form descriptor.
Use `chrome.theme: "match-form"` or pin it by name; density is applied by the builder runtime.
No global CSS, DOM side effects or runtime SDK import is introduced.
