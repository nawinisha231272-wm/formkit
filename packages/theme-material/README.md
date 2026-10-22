# @ourform/theme-material

Portable Material form appearance: outlined fields with floating labels, underline tabs, pill buttons
and elevated panels. No Material component library, global CSS, network or framework dependency.

Use `theme: "material"` with the standard form hosts, or pass `materialTheme` explicitly through the
renderer theme registry. Light, dark and high-contrast modes share the existing shell semantics,
IDs, accessible labels, state patches and control identity. Labels remain visible when empty.

The font stack starts with Roboto. Host apps may self-host it (the playground uses pinned Fontsource
assets) or use the system fallback; the package never downloads fonts. CSS is scoped per form mount.
Conformance is the same shared theme suite as Base/Bootstrap 4/Bootstrap 5/Tailwind; screenshot
baselines are platform-separated. Builder appearance is documented in spec 10 and ADR-0016.

`builderTheme` exports matching light/dark builder chrome, inheriting Neutral tokens and adding
this theme's accent, typography and primitive recipes. It is separate from the form descriptor.
Use `chrome.theme: "match-form"` or pin it by name; density is applied by the builder runtime.
No global CSS, DOM side effects or runtime SDK import is introduced.

Read-only controls use a distinct filled neutral surface (`--of-material-readonly-bg`) and solid borders, including phone preview, rather
than dashed placeholders. Theme tokens preserve readable contrast in light/dark/high-contrast modes.
