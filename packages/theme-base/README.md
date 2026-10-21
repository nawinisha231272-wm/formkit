# @ourform/theme-base

Import the named theme object and pass it to mount or register it in `themes`. Compiled scoped CSS is included in the object; no CSS framework or host scanner is required. Supports light, dark, high-contrast and RTL. SDK imports are types only.

`builderTheme` exports Neutral chrome separately from `baseTheme`: light/dark --ofb-\* tokens for
accessible text, signals, boundaries and focus. Builder density is applied by the builder runtime;
these descriptors have no DOM side effects. The canvas continues using its selected form theme.
