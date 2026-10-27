# Component author guide

This guide is the complete development path for the unpublished M08 SDK. The earlier Slider/Color rehearsals
remain preparation only. M08 author evidence follows the owner decision in ADR-0013; human guide usability is required in M11.

## 1. Start from the pushed branch

Use a fresh checkout; no working-tree overlay or files from another checkout are required:

```sh
git clone --branch m08-gate-close --single-branch https://github.com/nawinisha231272-wm/formkit.git formkit
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
ofrun node packages/cli/dist/cli.js --help
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
packages its field. The generator refuses an existing target. The local kit provides all thirteen
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

## 4a. Value adapters and nullable booleans

A ValueAdapter<V> defines the canonical model value, separately from DOM input strings. These are
function members, not values:

```ts
import type { ValueAdapter } from "@ourform/sdk";
const answer: ValueAdapter<boolean | null> = {
  empty: () => null,
  normalize: (raw: unknown) =>
    raw === true ? true : raw === false ? false : null,
  isEmpty: (value) => value === null,
  equals: (a, b) => Object.is(a, b),
  serialize: (value) => value,
  jsonSchema: (_config: unknown) => ({ type: ["boolean", "null"] }),
};
```

| Member                  | Contract                                                                                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| empty()                 | Return the canonical unset value. isEmpty(empty()) must be true. Return a fresh object/array for mutable empty values.                                                                                                                                                                 |
| normalize(raw: unknown) | Convert input to canonical V; handle missing/null inputs. Session creation and setValue normalize. Server validateSubmission rejects noncanonical submitted values rather than silently accepting coercion.                                                                            |
| isEmpty(value: V)       | Define required semantics. Required fails whenever isEmpty is true; optional empty values skip ordinary constraints. Never substitute Boolean(value). Numeric zero and a boolean false answer can be meaningful.                                                                       |
| equals?(a,b)            | Compare canonical values before a write; default Object.is. Object adapters usually need structural equality to suppress unnecessary patches.                                                                                                                                          |
| serialize?(value)       | Produce safe JSON for submit; default identity. serialize/normalize should preserve the canonical round trip. Do not return undefined, functions, cycles or unsafe object keys.                                                                                                        |
| jsonSchema?(config)     | Return a safe JSON Schema object describing serialized values, not the adapter itself. Config contains resolved properties. Without a hint, generated schema marks the adapter as an extension and cannot infer its type. Dynamic/custom validation still requires validateSubmission. |

Use the shipped `nullableBooleanValue()` for tri-state answers: empty=null, true and false are both
nonempty, so either answer passes required. Use `nullableBooleanValue({requiredTrue:true})` for
consent: true passes required; false and null fail required, but false remains false in the data.
Optional false/null remain valid in both policies. The helper normalizes booleans and "true"/"false";
other inputs become null. Canonical submissions must contain actual booleans/null. equals is Object.is,
serialize is identity and jsonSchema permits boolean/null. Generated required JSON Schema excludes all
boolean/null values recognized by isEmpty, including false for consent. `booleanValue()` stays
nonnullable: empty=false, false fails required. It takes no options; do not spread it into a nullable
adapter because equals/serialize then have the wrong value type.

The following complete inline example uses the public helper. Replace the generated component source
and adapt its test values/interactions/editor cases as described below; no shell markup is handwritten.

```ts
import {
  defineField,
  nullableBooleanValue,
  stringProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";
type Translate = FieldControlProps<
  boolean | null,
  Record<string, unknown>
>["t"];
export function caption(t: Translate, literal: string, key: string): string {
  if (!key) return literal;
  const translated = t(key);
  return translated === key ? literal : translated;
}
export const field = defineField({
  type: "acme-yes-no",
  title: "Yes/No toggle",
  shell: "inline",
  value: nullableBooleanValue({ requiredTrue: true }),
  properties: {
    yesLabel: stringProperty({ label: "Yes caption", default: "Yes" }),
    noLabel: stringProperty({ label: "No caption", default: "No" }),
    yesLabelKey: stringProperty({ label: "Yes message key", default: "" }),
    noLabelKey: stringProperty({ label: "No message key", default: "" }),
  },
  control: (p) =>
    h(
      "div",
      {},
      h("input", {
        ...controlAttributes(p),
        type: "checkbox",
        checked: p.value === true,
        class: p.theme.classFor("control"),
        oninput: (event: Event) =>
          p.setValue((event.target as HTMLInputElement).checked),
        onblur: p.onBlur,
      }),
      h(
        "span",
        { "data-answer-label": "" },
        p.value === true
          ? caption(p.t, p.config.yesLabel, p.config.yesLabelKey)
          : caption(p.t, p.config.noLabel, p.config.noLabelKey),
      ),
    ),
});
```

Here Yes/No use a native checkbox: initial null and false are both unchecked. Reset restores null;
interaction commits a boolean. Use a separate unset indication or a three-choice control when users
must distinguish or select unset visually. This example's model and validation preserve the distinction.

## 4b. Choose a shell

| Shell           | When to use                                                 | Library-owned presentation                                                                                                                                              |
| --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| field (default) | A single text, number or lookup control                     | Label above control, description/help/errors and ARIA.                                                                                                                  |
| group           | Multiple focusable options, radio/checkbox groups or Rating | Fieldset and legend name the group; controlAttributes forwards group ARIA.                                                                                              |
| inline          | A checkbox or switch with its label beside it               | Control first, adjacent field label; no custom label HTML needed.                                                                                                       |
| cell            | A field inside a future data-grid row                       | Compact shell without a visible field label. Supply renderer presentation.cellLabel with column/row context (node.label is the fallback); grid behavior belongs to M10. |
| none            | A layout/display that supplies its own structure            | No visible field label. Children retain their own shells. The author must supply appropriate semantics if using it for an interactive control.                          |

Set `shell` on defineField; keep spreading controlAttributes(p) and calling p.onBlur. Use `controlAttributes(p, "group")` on a group control wrapper and provide option semantics/keyboard behavior inside it. A shell changes
presentation and accessible naming, never value/required semantics. Composites use their registered
fieldset layout; do not change their data scope to choose a shell.

## 4c. Editable captions: literal by default, message key by opt-in

The inline example declares all captions in properties, so types/defaults/editors derive from the
same metadata. yesLabel/noLabel are literal strings, even when a host catalog happens to contain that
text as a key. Optional yesLabelKey/noLabelKey opt into translation. The typed caption(t,literal,key)
function uses the literal as its English fallback when a key is blank or t returns the unknown key.
For example `{yesLabel:"Yes", yesLabelKey:"acme.answer.yes"}` displays a supplied translation or Yes.
Keep user-entered literal text out of t(); this avoids accidental translation. Changing either literal
or key through the generated editor must change the preview; browser helpers below assert both.

## 5. Use the generated browser harness

The scaffold includes index.html, preview.ts, a separate Vitest include pattern, Playwright config
(Chromium/Firefox/WebKit), axe and browser/component.spec.ts. `ofrun pnpm dev` shows the live control,
required/disabled/read-only toggles, all five themes, Submit/Reset and the mini builder. `pnpm verify`
runs build, strict typecheck, Node tests and this browser suite.

After authoring a different control, update its value/interaction samples and metadata-editor cases
in the generated tests. Keep the assertions for validation, state, identity, keyboard, cleanup and
accessibility. The starter browser case always checks names/descriptions, required errors, values,
reset, protected writes, API writes and zero serious/critical axe violations in all five themes.

New projects have no approved image baseline. The sample captures explicitly UNAPPROVED screenshots
and logs `visual baseline missing: evidence captured, comparison pending explicit record/review`.
Functional/a11y assertions still run. Record a fresh platform folder with `ofrun pnpm visual:record`,
inspect the images, and commit the reviewed baselines. That command records and then compares; it
refuses to overwrite an existing platform folder. Later verify runs compare existing images at the
same 0.02 maximum pixel ratio. A passing first verify with unapproved images is not visual approval.
Before shipping a new component, review comparisons in base, Bootstrap 4, Bootstrap 5, Tailwind and Material.

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

## Author evidence and human usability

M08 accepts a fresh Codex session with no implementation context using only this guide, CLI and
generated project. The owner also explicitly accepted the submitted continued-session Yes/No trial
as a one-off exception; its failed fresh-session condition remains recorded (ADR-0013). Earlier
implementing-agent Slider/Color rehearsals remain rehearsals. A human guide-usability pass is required
in M11. Record author, context/provenance, times, commands, results and confusing steps; do not relabel
AI evidence as human review or hide a No comfort verdict. M08's final recommendation and API-freeze
status are recorded in docs/progress.md and ADR-0003. Stop for owner review before M09.

### Add a container without builder code (M09)

```ts
import { defineLayout } from "@ourform/sdk";
export const card = defineLayout({
  type: "acme.card",
  title: "Card",
  slots: [{ name: "body", label: "Contents", accepts: ["field"], max: 3 }],
});
```

Register `card` alongside fields. It immediately appears in the palette and exposes a nested drop slot.
Slot names are stable safe keys; labels are captions; accepts lists kinds or exact registered types,
max counts direct children. Child wire `slot` chooses a destination (omitted means first). Pure
`slots(node)` resolvers support instance-configured destinations; the shared resolver validates at
most64 descriptors. Use model-owned composite children for fixed expansion; editable slots are for
layouts. See `@ourform/builder` README for keyboard authoring and lifecycle details.

Slot captions are literal text by default, including text that matches a catalog key. Optional
`labelKey: "acme.card.body"` opts into host translation with `label: "Contents"` as its English fallback.

## Declared builder caption

`ComponentModel.builder.caption` identifies the displayed inline-edit property and defaults to
`label` when omitted; `false` opts out. `defineField` and `defineLayout` accept `caption` with
the same meaning. Panel and Fieldset continue to use `node.label` for their heading and legend.
Inline editing is available only when the caption is visibly rendered. Enter or blur commits one
trimmed update, Escape cancels, and an empty caption is refused with a visible reason. A `labelKey`
opens Settings; editing never changes the data key.
