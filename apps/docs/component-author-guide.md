# Component author guide

This guide is the complete development path for the unpublished M08 SDK. The AI-assisted rehearsals
are preparation only. The M08 gate still needs an independent human author report and review.

## 1. Start from the pushed branch

Use a fresh checkout; no working-tree overlay or files from another checkout are required:

```sh
git clone --branch m08-sdk-complete --single-branch https://github.com/nawinisha231272-wm/formkit.git formkit
cd formkit
git rev-parse HEAD
git status --porcelain
```

The last command must be empty. The guide, CLI source, scaffold templates and test kit are committed
on this branch. Build outputs are ignored and are created by the next steps.

## 2. Provision the exact tools and generate a project

Requires Git and an existing npm/npx installation for bootstrap. This shell helper provisions both
pinned executables for every command, including scripts they launch; global Node/pnpm defaults do
not need changing:

```sh
ofrun() { npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 "$@"; }
ofrun node --version
ofrun pnpm --version
ofrun pnpm install --frozen-lockfile
ofrun pnpm build
ofrun pnpm sdk:pack "$PWD/../ourform-sdk-kit"
ofrun node packages/cli/dist/cli.js create-component acme-note --directory ../acme-note --local-packages "$PWD/../ourform-sdk-kit"
cd ../acme-note
ofrun pnpm install
ofrun pnpm exec playwright install chromium firefox webkit
ofrun pnpm verify
```

Expected tool versions: v22.22.3 and 10.10.0. Keep the shell helper in the same shell when changing
directories. On a Linux host needing browser system libraries, use `ofrun pnpm exec playwright install
--with-deps chromium firefox webkit` with the host's normal package-install privileges, or use the
pinned Docker commands below. The bootstrap and initial dependency install need registry access;
runtime forms and the generator itself make no network call.

Both checkout and scaffold have `.nvmrc` containing 22.22.3. If nvm is already installed, `nvm install`
and `nvm use` select that file. The generated package also pins `packageManager: pnpm@10.10.0`,
`engines.node: 22.22.3`, `engines.pnpm: 10.10.0`, with engine-strict enabled. The ofrun path works
without nvm/Corepack/global installs. Commit the generated pnpm-lock.yaml; subsequent installs use
`ofrun pnpm install --frozen-lockfile`. The integration suite also proves a frozen/offline reinstall.

`create-theme` and `create-plugin` take the same arguments. A theme includes a preview field; a plugin
packages its field. The generator refuses an existing target. The local kit provides all twelve
unpublished public dependencies. After matching SDK packages are published, install
`@ourform/cli@0.0.1` and omit --local-packages. The kit and generated file overrides must remain at
their chosen paths during development; regenerate a project when relocating its kit.

## 3. Write a complete numeric field

Replace src/index.ts with this Quantity field (a number input, with empty = null). All imports,
property helpers, defaults, events, theme classes and ARIA forwarding are included. The same source
is compiled and browser-tested in the SDK's authoring fixture.

```ts
import {
  defineField,
  numberValue,
  numberProperty,
  booleanProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";

const english = { "acme.quantity.unset": "Not set" } as const;
type Translate = FieldControlProps<number | null, Record<string, unknown>>["t"];
function message(t: Translate, key: keyof typeof english): string {
  const translated = t(key);
  return translated === key ? english[key] : translated;
}
export const field = defineField({
  type: "acme-quantity",
  title: "Quantity",
  value: numberValue({ empty: null }),
  properties: {
    min: numberProperty({ label: "Minimum", default: 0 }),
    max: numberProperty({ label: "Maximum", default: 100 }),
    step: numberProperty({ label: "Step", default: 1, min: 0.01 }),
    showValue: booleanProperty({ label: "Show value", default: true }),
  },
  control: (p) =>
    h(
      "div",
      {},
      h("input", {
        ...controlAttributes(p),
        type: "number",
        value: p.value ?? "",
        min: p.config.min,
        max: p.config.max,
        step: p.config.step,
        class: p.theme.classFor("control"),
        oninput: (event: Event) => {
          const value = (event.target as HTMLInputElement).valueAsNumber;
          p.setValue(Number.isFinite(value) ? value : null);
        },
        onblur: p.onBlur,
      }),
      p.config.showValue
        ? h(
            "output",
            {},
            p.value === null
              ? message(p.t, "acme.quantity.unset")
              : String(p.value),
          )
        : null,
    ),
});
```

min/max/step configure the input. Put business range validation in the fixture's node.validation
(e.g. `{required:true,min:0,max:100}`), so canonical Node validation enforces it too. Zero is a valid
number; null is empty. An input event is typed Event; cast its target inside the handler. Forward
controlAttributes and onBlur. The core handles read-only/disabled user writes and restores the DOM
value; the control needs no protection guard or manual restoration.

The portable control works in DOM, React, Angular and Web Component hosts. Register field.model and
field.views together through the host's fields array, or package descriptors with definePlugin.
Never import another package's source or invoke whole-form validation from a control.

## 4. Translate control text with an English default

The typed Quantity example above uses `FieldControlProps<...>["t"]` as Translate. The signature is
`t(key: string, params?: Record<string, unknown>): string`. Keep a typed English dictionary in the
component and use it when t returns the unknown key, as message() demonstrates. Hosts supply
translations through renderer t or engine providers.localization; known shell/validation keys retain
the SDK's English catalog. The example's output says "Not set" without a provider and uses a supplied
translation for acme.quantity.unset. No English string is passed as t's second argument.

## 5. Use the generated browser harness

The scaffold includes index.html, preview.ts, a separate Vitest include pattern, Playwright config
(Chromium/Firefox/WebKit), axe and browser/component.spec.ts. `ofrun pnpm dev` shows the live control,
required/disabled/read-only toggles, all four themes, Submit/Reset and the mini builder. `pnpm verify`
runs build, strict typecheck, Node tests and this browser suite.

After authoring a different control, update its value/interaction samples and metadata-editor cases
in the generated tests. Keep the assertions for validation, state, identity, keyboard, cleanup and
accessibility. The starter browser case always checks names/descriptions, required errors, values,
reset, protected writes, API writes and zero serious/critical axe violations in all four themes.

New projects have no approved image baseline. The sample captures explicitly UNAPPROVED screenshots
and logs `visual baseline missing: evidence captured, comparison pending explicit record/review`.
Functional/a11y assertions still run. Record a fresh platform folder with `ofrun pnpm visual:record`,
inspect the images, and commit the reviewed baselines. That command records and then compares; it
refuses to overwrite an existing platform folder. Later verify runs compare existing images at the
same 0.02 maximum pixel ratio. A passing first verify with unapproved images is not visual approval.
Before shipping a new component, review comparisons in base, Bootstrap 4, Bootstrap 5 and Tailwind.

## 6. Use the correct fixture shape

renderComponent supplies type automatically. node is a partial ComponentNode without type. Required
is node.validation.required, disabled is a disabledWhen expression, and readOnly is a host option:

```ts
import { renderComponent } from "@ourform/testing";
import type { RenderComponentOptions } from "@ourform/testing";
import { field } from "./src/index";
const options = {
  host: document.getElementById("fixture")!,
  theme: "bootstrap4",
  node: { validation: { required: true }, disabledWhen: ["eq", 1, 1] },
  readOnly: true,
  data: { value: 10 },
} satisfies RenderComponentOptions;
const fixture = renderComponent(field, options);
fixture.session.setValue("value", 20, { source: "api" });
fixture.destroy();
```

Use separate empty hosts, or destroy before reusing a host. For a required-only case omit disabledWhen
and readOnly; for disabled-only use node.disabledWhen; for read-only-only set readOnly:true at the top.
There is no node.readOnly/node.readonly. These are real engine/host fixtures; no control-state wrapper
is needed. node overrides label/key/properties, data uses the actual field key (value by default),
fields supplies composite dependencies, engine supplies custom validators/providers, and
adapter/nativeHost select native views. The returned controller supports submit/reset/focus/destroy.

## 7. See it in the builder and assert every property editor

```sh
ofrun pnpm builder
```

The command opens the generated preview with the component registered. Click its Add button. The
palette and editors come from the real builder-core metadata; edits dispatch UpdateProperty and
rebuild the preview. This author fixture is not the M09 full builder product.

The generated browser test calls checkPropertyEditors from @ourform/testing/playwright. For Quantity,
replace its sample cases with these, after clicking "Add Quantity":

```ts
await checkPropertyEditors(page, [
  {
    key: "min",
    value: 5,
    verify: async (preview) => {
      await expect(preview.locator("input")).toHaveAttribute("min", "5");
    },
  },
  {
    key: "max",
    value: 50,
    verify: async (preview) => {
      await expect(preview.locator("input")).toHaveAttribute("max", "50");
    },
  },
  {
    key: "step",
    value: 5,
    verify: async (preview) => {
      await expect(preview.locator("input")).toHaveAttribute("step", "5");
    },
  },
  {
    key: "showValue",
    value: false,
    verify: async (preview) => {
      await expect(preview.locator("output")).toHaveCount(0);
    },
  },
]);
```

Import test/expect from @playwright/test and checkPropertyEditors from @ourform/testing/playwright.
The helper requires exactly one case per generated component-specific properties.\* editor, edits
its actual number/checkbox/select/JSON/text control, and awaits its observable preview assertion.
Missing, duplicate or extra cases fail. Label/base editors are already covered by the SDK's builder
suite; this helper prevents custom property metadata from being merely listed but never exercised.
For a standalone custom harness, mountComponentBuilder(field,{host:emptyElement,theme:"base"}) creates
this mini builder. Its return value exposes builder, preview and destroy. No custom edit forms are needed.

## 8. Generate Linux screenshots in the exact pinned image

Docker is needed for this step. The scaffold's playwright-container.json pins:

```text
mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a
```

```sh
ofrun pnpm visual:linux:record
ofrun pnpm visual:linux:check
```

The script runs linux/amd64, installs frozen dependencies and uses Node 22.22.3 / pnpm 10.10.0 inside
the official Playwright 1.56.1 image. Source and the selected local SDK kit are read-only mounts;
Linux dependencies/builds are disposable. It generates only a fresh Linux baseline folder, compares
with updates disabled, and copies images back only after success. Review and commit browser/**screenshots**.
The snapshot path includes linux-x64 or darwin-arm64 and browser; platforms are never compared.
Existing images are never automatically replaced. Root SDK author fixtures use
`sh scripts/linux-visuals.sh record author` and `sh scripts/linux-visuals.sh check author` from the SDK checkout.

## Human trial and gate

A developer outside implementation must use this guide alone to build one component and report their
name, exact checkout commit, commands/results, elapsed time and confusing steps. AI-assisted Slider
and color rehearsals do not satisfy that requirement. M08 stays open until the actual report and
human review; no M09 implementation is included. Timing investigation uses standalone
pnpm benchmark:check in the SDK, outside verify.
