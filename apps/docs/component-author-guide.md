# Component author guide

Use Node 22.22.3 and pnpm 10.10.0. A field has a headless model and a control view. The library supplies
the label, description, required/error announcements, state, generated builder editors and themes.
Write the control with public SDK APIs; do not import another package's source files.

## Start with a project

After the matching 0.0.1 packages are published, install `@ourform/cli@0.0.1` in your tooling
workspace, then run:

```sh
pnpm exec ourform create-component acme-note
cd acme-note
pnpm install
pnpm verify
```

During SDK development the packages are unpublished. From the SDK checkout, build and pack the
local kit, then generate without editing any output:

```sh
pnpm build
pnpm sdk:pack /tmp/ourform-sdk-kit
node packages/cli/dist/cli.js create-component acme-note --directory /tmp/acme-note --local-packages /tmp/ourform-sdk-kit
cd /tmp/acme-note
pnpm install
pnpm verify
```

`create-plugin` and `create-theme` use the same arguments. The theme scaffold includes a preview field;
the plugin scaffold includes a packaged field. The generator refuses existing directories, writes a
standalone pnpm workspace and never installs or sends data itself. Commit the generated lockfile after
installation and use frozen installs afterwards. Tools and bundler overrides are pinned in the output.

## Write only the control

```ts
import { defineField, stringValue, h, controlAttributes } from "@ourform/sdk";
export const note = defineField({
  type: "acme.note",
  title: "Note",
  value: stringValue(),
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      value: p.value,
      class: p.theme.classFor("control"),
      oninput: (event: Event) =>
        p.setValue((event.target as HTMLInputElement).value),
      onblur: p.onBlur,
    }),
});
```

Use lowercase VNode events. Forward the supplied state and ARIA/ref attributes to the actual input;
call onBlur and setValue. Read config and state; do not mutate them. Never call session.validate from
a control. For a grouped Rating, use shell="group", controlAttributes(p,"group") and accessible
buttons; the outer fieldset/legend supplies the group label and required announcement.

Properties such as numberProperty generate config types, defaults, diagnostics and builder editors.
Labels may be message keys; translate control strings with p.t. The empty value must satisfy isEmpty;
Rating uses null, preserving 0 as a valid number. Complex values require an explicit ValueAdapter with
canonical normalize/serialize, equality when needed and a JSON Schema hint. Built-in primitive helpers
are stringValue, numberValue and booleanValue; array/repeater helpers remain M10.

Register `note.model` with your engine and `note.views` under its type in the renderer's view map, or
pass `fields:[note]` to createFormController/Form. The builder reads the same engine registry:
no palette or property-panel extension is needed. Existing customer wire definitions retain stable ids.

## Configure and assemble

```ts
import { definePreset, defineComposite } from "@ourform/sdk";
import { ratingField } from "@ourform/components";
const quickRating = definePreset("acme.quick-rating", {
  base: ratingField,
  title: "Quick rating",
  defaults: { max: 3 },
});
const address = defineComposite({
  type: "acme.address",
  title: "Address",
  dataScope: "object",
  components: [
    { id: "street", type: "text", key: "street", label: "Street" },
    { id: "city", type: "text", key: "city", label: "City" },
    { id: "postal", type: "text", key: "postal", label: "Postal code" },
    { id: "country", type: "text", key: "country", label: "Country" },
  ],
});
```

Preset defaults apply to property metadata, and node.properties can override them. Value adapters,
validators and views are shared; the base is unchanged. A preset needs a distinct type.
Register the composite and all child types. An instance `{id:"billing",type:"acme.address",key:"billing"}`
submits `billing.street` etc. Default scope is object; scope none keeps children in their parent's data
scope. Generated ids are `billing/street`, etc. Internal runtime visibility/calculation/validation refs are rebased; properties/meta/default values stay opaque. External refs and
absolute path expressions remain unchanged. The wire definition stays compact. Instance components
cannot override registered children; cycles, invalid output and generated id/key collisions are errors.
Nested composites are supported with bounded expansion (64 levels, 10,000 components).
Use defineLayout for child-owning layouts editable in the wire definition; composite children are fixed.

## Existing controls and plugins

For a conventional React control: `registerReactField("acme.lookup", EmployeeLookup)` is the complete
registration. An unusual control can set valueProp/changeProp/blurProp/disabledProp and mapChange.
Complex object values need an adapter; TypeScript types cannot be inferred at runtime. Angular uses
provideFormField, Web Components registerElementField. Portable controls need no changes between hosts.
The `/sdk-extensions.html` page has conventional and unusual React examples; the standard Angular
example renders the identical shipped portable Rating.

```ts
import { definePlugin } from "@ourform/sdk";
import { createEngine } from "@ourform/core";
const plugin = definePlugin({
  id: "acme.fields",
  version: "1.0.0",
  engine: "^0.0.1",
  components: [note, address],
});
const engine = createEngine({ plugins: [plugin] });
```

Installation checks full npm semver ranges against core and other installed plugins; order does not
matter. Duplicate plugin ids/types/themes/functions/validators/data-source names throw. Register child
types too. Plugin functions/validators merge with host registries; dataSources are customer-owned
providers available as providers.dataSources. No network call is made by installation. Remote data
source UI/controls remain M11. Plugins are fixed at engine creation; use a new engine to change the set.
Core keeps models and plugin version metadata; hosts receive the plugin's component views and themes
explicitly. Form requires entries fail compile with missing-plugin when absent or version-incompatible.

## Test before shipping

The generated Node suite runs checkValueAdapter, checkValidation and checkBuilderRoundTrip from
@ourform/testing. They throw on failed invariants, and cover empty/canonical values, expected validation
codes, palette discovery/generated editing and byte-identical undo/redo.

In a real browser use `renderComponent(note,{host:emptyElement,theme:"bootstrap4"})`. The returned
controller exposes engine/session/view, focusField, submit/reset and destroy. node/data/fields overrides
allow required, disabled, read-only and composite fixtures. engine supplies custom validators/providers; adapter/nativeHost opt into native views.
Destroy the controller after each test. The host must be empty; it is caller-owned and retained.

Run keyboard, name/description/error, pending/invalid/read-only, reset/focus/identity and axe checks.
Every new component must pass base, Bootstrap 4, Bootstrap 5 and Tailwind conformance and visual
comparisons. Generate Linux images inside the digest-pinned Playwright image matching 1.56.1; keep
platform images separate. Never regenerate existing baselines to make a failure disappear. Run
`pnpm verify`; wall-clock investigation is separate with `pnpm benchmark:check`.

For the M08 independent exercise, a developer outside implementation should use this guide alone to
build one component, run its checks and report their name, commands/results, time and any unclear steps.
That human evidence is required before the SDK gate can be marked GO.
