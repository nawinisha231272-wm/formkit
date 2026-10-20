# Theme author guide

A Theme contains a name, optional parent, CSS tokens, shell/part classes, optional CSS and dark/high-
contrast token overrides. Theme packages import SDK types only and carry no component or framework
runtime. Start with `ourform create-theme acme-theme` (see the component guide for local packed kits).
The scaffold's field is a preview sample, while `theme` is the exported theme descriptor.

```ts
import type { Theme } from "@ourform/sdk";
export const acme: Theme = {
  name: "acme",
  extends: "base",
  tokens: { "--of-accent": "#2459a6" },
  classes: { field: { control: "acme-control" } },
};
```

Supply the descriptor in the renderer's themes array and select by name. Include any parent theme
descriptors too; base is always available. Bootstrap 4 and 5 are separate fully supported 1.0 themes,
with pinned real-framework CSS coexistence tests. A plugin can package themes, but the host chooses
which descriptors to expose; theme metadata never enters the wire form definition.

Use field parts root/label/required/description/controlWrapper/prefix/control/suffix/help/errors/error.
Style every shell variant, including group/inline/cell/none. Scope CSS to the theme root and preserve
the renderer's instance scoping. Classes/tokens must support text, keyboard focus, required/invalid/
pending/disabled/read-only, grouped controls and generated layouts without replacing DOM controls.
Use modes for dark and high contrast and verify RTL. Do not bake customer values into CSS or make
network requests to load fonts/frameworks. Customers may supply framework CSS themselves.

Use createThemeConformance plus the @ourform/testing/playwright checkThemeConformance and
checkReadOnlyTheme helpers, then actual customer components and layouts. axe must report no serious
or critical issues. Inspect focus visibility, labels/error descriptions, mobile overflow and all four
supported themes. Existing theme switches must preserve the input instance, focus, caret and data.
Store browser/platform-specific visual baselines; Linux generation uses scripts/playwright-container.json.
Never loosen pixel thresholds. Compare once against reviewed images and keep original baselines.

`pnpm verify` includes correctness, conformance, visuals, size and exact work counts. Run timings with
`pnpm benchmark:check` alone. PR timing summaries are advisory; nightly Linux regressions require three
consecutive nights over 20% before issue reporting. See docs/spec/09-standards.md and ADR-0010.
