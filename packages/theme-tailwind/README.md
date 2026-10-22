# @ourform/theme-tailwind

Import the named theme object and pass it to mount or register it in `themes`. Compiled scoped CSS is included in the object; no CSS framework or host scanner is required. Supports light, dark, high-contrast and RTL. SDK imports are types only.

`builderTheme` exports matching light/dark builder chrome, inheriting Neutral tokens and adding
this theme's accent, typography and primitive recipes. It is separate from the form descriptor.
Use `chrome.theme: "match-form"` or pin it by name; density is applied by the builder runtime.
No global CSS, DOM side effects or runtime SDK import is introduced.
