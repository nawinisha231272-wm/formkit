# Build a nested form with the OurForm builder

This guide uses the M09b branch and public UI/API only. The builder runs in your application;
it does not send forms or answers to a service. The playground's custom Customer reference field
is a normal SDK registration, with no component-specific builder UI.

## Start from a clean checkout

```sh
git clone --branch m09b-builder-ux https://github.com/nawinisha231272-wm/formkit.git
cd formkit
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm build
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm --filter @ourform/playground dev
```

The root `.nvmrc` pins Node 22.22.3 and `packageManager` pins pnpm 10.10.0. The commands above provision
both explicitly; if you use nvm, `nvm install && nvm use` is equivalent for Node. Keep the pinned pnpm.
After building, the CLI help is available with `node packages/cli/dist/index.js --help` (it exits 0).
Open `http://127.0.0.1:4173/builder.html?empty`. The ready-made example is `?approved`; the screen-5
theme comparison is `/builder-themes.html`. The task below starts empty. Ports in use must be freed
or the app's Vite configuration adjusted consistently.

## The twelve-field task

1. Add **Tabs**, naming it **Customer onboarding** in the settings dialog. Save.
2. Add **Panel**, label **Contact**, inside its **First tab**. Save.
3. Add **Columns**, label **Contact details**, inside Contact. Save. Its two slots are Column 1/2.
4. Inside Column 1, add the following six fields, saving each dialog:

   | Palette type | Label         |
   | ------------ | ------------- |
   | Text         | Full name     |
   | Email        | Email         |
   | Text         | Phone         |
   | Text         | Customer type |
   | Text         | Company name  |
   | Text         | Tax ID        |

5. For **Company name**, open its **Conditional** tab. Expand **Conditions for Visible when**,
   choose **Add condition**, field **Customer type**, operator **equals**, value `business`. Save.
   A literal comparison string needs no JSON quotes. The generated expression references the other
   field's stable id; the display label/data key is not its expression id. The canvas shows hidden
   fields for authoring, with a condition chip; Preview executes the condition.
6. Choose **Column 2** in the outline and add these six fields there:

   | Palette type       | Label              |
   | ------------------ | ------------------ |
   | Customer reference | Customer reference |
   | Rating             | Experience         |
   | Select             | Industry           |
   | Checkbox           | Terms              |
   | Text               | Order reference    |
   | Textarea           | Notes              |

7. Open Customer reference's settings: its **Reference** tab and **Reference hint** editor come
   from the SDK field's metadata. Change the hint and check the live preview; Cancel discards it,
   or Save applies the edit once. No builder extension is required for this custom field.
8. Switch to **Preview**. Company name is absent until Customer type is `business`, then appears.
   Customer reference is a working text control. Switch to **JSON** to copy your form definition.
   There should be 12 value fields nested under Tabs › Panel › Columns, with six in each column.
9. Try Undo/Redo. Adding a component with its initial settings is one step. Copy/Paste, Duplicate
   and Wrap each commit once and never open settings. Cancel/Escape/Close discard a pending modal
   addition. Header Save emits `of-save`; saving the definition to disk/database belongs to the host.

Phone is intentionally a plain Text field here; the advanced Phone component belongs to M10b.
Select starts with registered defaults; this task does not require future async providers.

### Mouse route

Drag a palette entry into a slot. The insertion line and tinted slot identify the destination while
dragging. Use the bottom of a column to append after its last field. Click a field to select it;
use its hover toolbar or right-click menu for actions. Only the active design tab is shown.
Selecting a hidden field through the outline reveals its tab. Search filters registered components.
An empty slot's +/placeholder opens a six-entry mini palette with search.

### Keyboard route

Tab to a palette button and Enter to add. The modal initially focuses Label; Ctrl/Cmd+A replaces it.
Ctrl/Cmd+Enter saves; Escape cancels. Tab/Shift+Tab navigates the modal; arrow keys switch its tab strip.
On macOS WebKit, browser keyboard access may require Option+Tab instead of Tab (and Shift+Option+Tab
backwards). The automated task exercises this native browser setting too.

The outline has one tab stop: Up/Down traverses rows, Left/Right collapses/expands or reaches
parent/children, Home/End goes to the first/last row. Enter on a component edits; Enter on a virtual
Column/Tab slot chooses it as the destination for the next palette add or paste. After choosing
Column 2, Shift+Tab back to the palette to add there. A newly selected value field adds subsequent
siblings immediately after it. Ctrl/Cmd+X then Ctrl/Cmd+V moves into the chosen slot; Alt+arrows
reorders/reparents. Space picks up, arrows move between destinations, Space drops, Escape cancels.
Shift+F10 opens the component menu. Live announcements describe pickup, destination and refusal.

## Register your own field in an application

```ts
import { createBuilder } from "@ourform/builder";
import { builtinComponents } from "@ourform/components";
import {
  defineField,
  stringValue,
  stringProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";

const reference = defineField({
  type: "acme.reference",
  title: "Customer reference",
  group: "Acme",
  value: stringValue(),
  properties: {
    hint: stringProperty({
      label: "Reference hint",
      default: "Customer reference",
      group: "Reference",
    }),
  },
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      value: p.value,
      placeholder: p.config.hint,
      class: p.theme.classFor("control"),
      oninput: (event: Event) =>
        p.setValue((event.target as HTMLInputElement).value),
      onblur: p.onBlur,
    }),
});
const builder = createBuilder(
  document.querySelector("#builder")!,
  {
    $formVersion: "1.0",
    id: "customer",
    display: "form",
    components: [],
  },
  {
    fields: [...builtinComponents, reference],
    theme: "bootstrap4",
    chrome: { theme: "match-form", density: "comfortable" },
    onSchemaChange: ({ definition, patch }) => console.log(definition, patch),
  },
);
```

Use an empty, caller-owned mount; call `builder.destroy()` when it is removed. A builder title makes
registered components available in the palette. Headless slot declarations make SDK layouts drop
targets automatically. Theme packages export form themes and builderTheme descriptors; the browser
presets include Base/Neutral, Bootstrap 4, Bootstrap 5, Tailwind and Material. Pin chrome independently
with `chrome.theme`, or supply custom `builderThemes` using `defineBuilderTheme`. See [the builder README](../../packages/builder/README.md)
for locks, filtered palettes, hidden editor groups/properties, icon overrides and host events.

At widths below 768px, the builder shows an accessible read-only form preview. Use a desktop viewport
for authoring. Bootstrap 4 remains fully supported for 1.0.

## Verify and report the author exercise

Stop the dev server, then use the same pinned wrapper with `pnpm verify` (replace the final command
in the provisioning invocation with `pnpm verify`). Linux screenshots use the official image
`mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a`;
existing approved baselines are compared, never overwritten to make a run pass.

For an independent guide trial, record the author/session provenance, branch/commit, start/first-render/
finish timestamps, commands/results, mouse and keyboard outcomes, exported definition and screenshots.
Use only this guide, the linked public builder README and the CLI's own help; do not inspect implementation
source or request implementation assistance. Record blockers/gaps when they occur. Timebox to 90 minutes;
stop and report a blocker after ten minutes without progress. AI evidence is not a human usability pass;
the latter remains required in M11. A trial does not approve implementation screenshots for the owner.
