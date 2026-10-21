# @ourform/builder

Reusable, customer-owned visual builder. It adds DOM UI to headless `@ourform/builder-core` and the
real form renderer; no framework, drag library, global registry or network dependency is introduced.

```ts
import { createBuilderController } from "@ourform/builder";
import { builtinComponents } from "@ourform/components";
import { AddComponent } from "@ourform/builder-core";
const controller = createBuilderController(
  document.querySelector("#builder")!,
  {
    schema: {
      $formVersion: "1.0",
      id: "draft",
      display: "form",
      components: [],
    },
    fields: builtinComponents,
    historyLimit: 100,
    onSchemaChange: ({ definition, patch }) => saveLocally(definition, patch),
  },
);
controller.builder.dispatch(new AddComponent("tabs"));
controller.selectSlot({
  parentId: controller.builder.getState().selection!,
  slot: "second",
});
controller.setTheme("bootstrap4");
controller.setMode("dark");
const diagnostics = controller.load(importedJson);
controller.destroy();
```

The mount must be empty and caller-owned. The lower-level function requires field bindings (models plus views); an optional engine supplies
customer headless registrations/providers. `renderBuilder` from `@ourform/element` registers built-ins
for convenience. HostOptions
carry customer providers, native bridges, data, translation and themes. `BuilderController` exposes
engine, immutable headless builder, current preview, load/selectSlot/setTheme/setMode/destroy.
`onPreviewReady` receives each replacement preview and undefined during cleanup. Repeated destroy
is safe; later mutations throw. Detached UI buttons/listeners cannot edit the draft.

Palette and all property editors are generated from registrations. An SDK layout with declared
slots automatically gets nested drop indicators. Drag palette entries or selection handles into any
slot. The outline follows tree keyboard navigation: Up/Down, Left/Right collapse/parent/child,
Home/End and typeahead. Enter/F2 edits properties; Delete removes. Ctrl/Cmd+X then Ctrl/Cmd+V cuts
into the selected insertion point; Escape cancels. Alt+Up/Down reorders, Alt+Left moves after the parent,
Alt+Right moves into the preceding sibling's first slot. Toolbar controls provide equivalent actions.
These shortcuts do not capture response inputs. Refused drops show a live accessible reason.

Expression properties provide condition rows (AND; equality/order/empty) plus full compact-expression
JSON. Literal comparison strings work without quotes; JSON literals preserve numbers/booleans/null.
Definition JSON imports atomically, retaining the draft/history on errors. Remove may leave a
repairable dangling-reference draft; preview resumes after repair/undo. The patch region exposes the
last RFC 6902 patch. `of-schema-change` bubbles and crosses shadow boundaries with frozen
`{definition,patch}` detail; selection/no-ops, response data and theme changes emit no schema patch.

Design mode exposes hidden fields and every tab slot, makes portable controls inert and displays
native placeholders; the preview executes real controls. Both views share one session (processors and
providers run once). Structural/schema changes recreate the session; matching value-field IDs retain
answers, while transient state and removed answers are not history. Appearance changes retain field,
handle and insertion-button identity, focus/caret, values and state. Chrome stays independent of form
appearance. Tabs and all four themes are supported, including Bootstrap 4 for 1.0.

Wrappers: `<our-form-builder>` / `defineOurFormBuilderElement` and `renderBuilder` in `@ourform/element`,
React `FormBuilder`, Angular `OurFormBuilderComponent`. See their READMEs for ownership/lifecycle rules.
Demo: `/builder.html` (or `?empty`, `?fixture`) in the playground; each example app has `/builder.html`.

Verification: `tests/e2e/nested-builder.spec.ts`, `builder-hosts.spec.ts`, and headless
`packages/builder-core/tests/nested.test.ts`. See ADR-0014 and spec 07.

Linux visuals: `sh scripts/linux-visuals.sh record m09` only when the selected suites have no Linux
PNGs; `sh scripts/linux-visuals.sh check m09` thereafter. Both use the digest-pinned official Playwright
image in scripts/playwright-container.json. Runtime Tabs captures both panels in three browsers and
four themes; builder preview images cover all six hosts and four themes in Chromium. Functional and
axe host conformance runs in all three browsers. Mac/Linux baselines are always separate.
