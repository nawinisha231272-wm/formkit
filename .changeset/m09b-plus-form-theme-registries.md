---
"@ourform/renderer-dom": patch
"@ourform/element": patch
"@ourform/react": patch
"@ourform/angular": patch
"@ourform/theme-material": patch
---

Expose per-instance form theme registries on OurFormElement and update React/Angular registry
inputs in place. Add atomic FormView.setThemes(registry, selectedTheme?) and unknown-theme error
codes while preserving session state and focus. Apply Material's outer Tabs heading style to the
semantic canvas tree wrapper as well as a direct form root.

Expose the already-approved independent planning/Data preload policies through builder wrappers,
including Angular inputs and custom-element properties; React reacts to prop changes.
