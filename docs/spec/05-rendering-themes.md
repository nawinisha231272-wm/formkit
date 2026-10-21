# 05 — Rendering and themes

Status: normative. Packages: `@ourform/renderer-dom`, `@ourform/theme-*`.

## Renderer

```ts
export function mount(
  root: Element,
  session: FormSession,
  options: RenderOptions & { engine: Engine },
): FormView;

export interface RenderOptions extends ThemeOptions {
  views: ReadonlyMap<string, FieldDefinition["views"]>;
  theme?: Theme | string;
  idPrefix?: string;
  presentation?: Readonly<Record<string, FieldPresentation>>;
  t?: (key: string, params?: Record<string, unknown>) => string;
}
export interface ThemeOptions {
  themes?: readonly Theme[];
  themeMode?: "light" | "dark" | "high-contrast";
  appTheme?: ThemeOverride;
  formTheme?: ThemeOverride;
  componentThemes?: Readonly<Record<string, ThemeOverride>>;
}
export interface FieldPresentation {
  help?: string;
  prefix?: string;
  suffix?: string;
  cellLabel?: string; // combined column and stable row context
}
export interface FormView {
  setTheme(theme: Theme | string): void;
  setMode(mode: "light" | "dark" | "high-contrast"): void;
  focus(componentId: string): void;
  submit(): ReturnType<FormSession["submit"]>;
  unmount(): void;
  destroy(): void; // M02 alias
}
export function renderToString(
  session: FormSession,
  options: RenderOptions,
): string;
```

Rules:

- One mounted unit per component instance, keyed `componentId` or `componentId:rowId`.
- Subscribe to `StatePatch`; for each changed field update its control props and shell state in place.
- Never recreate a control that contains `document.activeElement`. Never interrupt IME composition.
- Never call whole-form validation while rendering. Read `FieldState`.
- Unmount releases every listener and subscription (tested for leaks).

## Portable control representation (decided in M2, ADR-0002)

Candidates: (a) tiny VNode tree `h(tag, props, children)` + keyed patcher; (b) DOM factory
`(props) => { el, update(props), destroy() }`. Score on Text, Rating and a 500-field form:
lines to author a control, update cost per keystroke, effort to embed in React and Angular,
SSR string output, bundle size. The props contract (`04-sdk.md`) is identical either way.

## FieldShell anatomy

```text
root
├─ label (+ required marker)
├─ description
├─ controlWrapper
│  ├─ prefix
│  ├─ control      ← the only part a custom field writes
│  └─ suffix
├─ help
└─ errors → error
```

Shell responsibilities: ids, `for`, `aria-describedby` (description + help + errors),
`aria-invalid`, `aria-required`, required marker, error rendering after touch/submit per
`validateOn`, one `aria-live="polite"` region per form, error summary on failed submit with links
that move focus to the field (via `focusRef`).

## Themes

```ts
export type FieldPart =
  | "root"
  | "label"
  | "required"
  | "description"
  | "controlWrapper"
  | "prefix"
  | "control"
  | "suffix"
  | "help"
  | "errors"
  | "error";
export type ShellVariant = "field" | "group" | "inline" | "cell" | "none";

export interface Theme {
  name: string;
  extends?: string;
  tokens: Record<`--of-${string}`, string>;
  classes: Partial<Record<ShellVariant, Partial<Record<FieldPart, string>>>>;
  css?: string; // compiled CSS text
  modes?: Partial<
    Record<"dark" | "high-contrast", Record<`--of-${string}`, string>>
  >;
}
```

- Resolution: base → installed theme → app theme → form overrides → component overrides.
- Scope: `<div class="of-root" data-of-theme="<name>">`. Two forms on one page may differ.
- `setTheme` swaps the attribute, the token style block and class names on existing elements.
  It must preserve values, focus, caret position, dirty/touched, errors, pending work, wizard page, rows.
- Required tokens: `--of-color-primary`, `--of-color-text`, `--of-color-muted`, `--of-color-border`,
  `--of-color-error`, `--of-color-bg`, `--of-radius`, `--of-space-1..4`, `--of-font-family`,
  `--of-font-size`, `--of-control-height`, `--of-focus-ring`.
- Themes to ship: `base` (semantic, minimal CSS), `bootstrap5` (class map onto Bootstrap 5 classes,
  works with or without Bootstrap CSS loaded via compiled fallback), `tailwind` (compiled CSS
  shipped in the package; must not depend on the host's Tailwind scanner).
  M05 adds `bootstrap4` as an explicit compatibility preset at the user's request (ADR-0007).
  It has Bootstrap 4 class mapping and compiled fallback; the legacy `bootstrap` alias remains Bootstrap 5.
- Every theme passes the theme conformance suite: all states, validation, disabled, read-only,
  focus, hover, multi-value, nested grid, wizard, RTL, dark and high-contrast.

## M02 renderer selection

ADR-0002 selects VNodes with a small keyed DOM patcher. Each mounted field updates from FieldState,
including focused controls; no render-time whole-form validation or control replacement occurs.
The low-level mountVNode lifecycle also supports development host probes. Theme presets update classes
in place. Static SSR shares control output without browser globals; it currently accepts explicit
`{ views, theme? }` alongside the session. The normative engine-based mount API, shell variants and
complete themes remain M03 work. Focus/caret, composition event, cleanup and SSR tests cover M02 behavior.

## M03 shell/theme runtime (ADR-0005)

The explicit view registry carries each definition's shell hint. The engine remains headless and
mount rejects sessions from another engine. Native `adapter` selection belongs to M04; builder
render/design mode and row-specific focus arrive with their owning milestones. `themeMode` is
reserved for color/contrast appearance and does not occupy the future renderer mode option.

Each mount owns a style element and a random instance selector, with generated unique control ids.
SSR is static and uses a safe `idPrefix` (default `of-ssr`); hosts must choose distinct prefixes for
multiple SSR forms. The M02 `renderForm` wrapper retains its raw ids and three shipped theme aliases.

Field/group/inline/cell/none shells share DOM/SSR generation. A group's label text is inside a legend;
required text is linked as its accessible description because group does not support aria-required.
A cell uses an invisible label with host-supplied column/row context. None leaves labeling to child
controls; a headless layout container renders its optional heading and child shells.

`view.submit()` and native submit events within the mount root trigger summary/focus behavior;
`session.submit()` remains a headless operation. Summary links use focusRef, falling back to a group's
first enabled interactive descendant. Only the single form live region announces validation changes.

Theme inheritance and overrides are explicit per mount, with duplicate/missing/cyclic registrations
rejected. ThemeOverride contains tokens, classes and optional modes. CSS is trusted host code scoped
using `.of-root`; it must not use unscoped selectors. Token declarations reject rule/HTML delimiters.
The renderer depends on shipped presets (types-only SDK dependencies), as allowed by ADR-0005.
The theme conformance package tests M03 features; multi-value/grid/wizard cases await implementation.

M05: optional node.ariaLabel overrides the labelled-by target's text while retaining the visible label.
This applies to native and portable controls. node.placeholder is forwarded through control props and
controlAttributes. Low-level mount requires explicit preset registration; host controllers and the legacy
renderForm wrapper include Bootstrap 4/5 and Tailwind. Actual framework stylesheet compatibility is
tested with 4.6.2 and 5.3.8 independently; loading both global framework stylesheets together is not covered.

M06 renders portable non-value views alongside layout containers, supplies portable actions and emits
composed bubbling of-action events with {name,componentId,data}, plus optional onAction callbacks. Async
validation forwards pending to aria-busy, a field description and the existing single live region.
Renderer-owned pointer tracking defers blur touches until activation ends; keyboard blur is immediate.
Queued touches/timers/listeners are removed on unmount. This prevents error layout changes canceling clicks.
Select values are set after options are installed; all themes exclude radios/hidden controls from text
input sizing and include select/textarea/radio/action styles. Existing t callbacks retain of.required;
engine localization providers and the English catalog supply the default path.

## M07 layouts and remount

Panel/Columns/Fieldset/Container have independent child units and semantic DOM/SSR roots. Layout width
sets a child's 1–12 grid span under Columns (default 12); up to 640px viewport width columns stack.
Base layout styles are inherited by Bootstrap 4/5 and Tailwind. Theme/parent updates preserve children,
focus, caret and session state. Static portable SSR is replaced on client mount, with no hydration.
FormView.reset(data?) clears submitted/summary state and pending blur touches before session.reset.

## 1.0 support decision (ADR-0011)

Bootstrap 4 remains fully supported for 1.0. Every new component must pass conformance and visual checks
in all four shipped themes: base, Bootstrap 4, Bootstrap 5 and Tailwind. Existing contrast/pixel thresholds
and pinned framework stylesheet versions remain unchanged.

## M09 authoring and Tabs

RenderOptions.mode `edit | design` defaults edit. Design exposes every slot/hidden field, inert portable
controls and native placeholders; its live region is off. Slot wrappers are resolved from headless
metadata, without recognizing container types. LayoutView.tabs requests APG tablist/tab/tabpanel
semantics; inactive child roots stay mounted. Focus(id) activates ancestor tabs, including error focus.
Theme/tab changes retain child identity/session state. Shared defaultThemes supplies preset themes to
form and builder hosts. `@ourform/builder` shares one session between design and preview; schema edits
recreate transient state and preserve surviving field IDs' answers. Removed response values are not
undo history. Generated chrome controls preserve identity/focus on appearance changes.

M09a compatibility wiring: canonical column wrappers own widths and child mounts. Runtime columns do
not add visible captions; design slots retain their existing harness descriptions. Responsive stacking,
child identity/theme behavior and submission semantics remain. This is storage wiring, not M09b polish.

## M09b Material and builder appearance (ADR-0016)

Material is a portable CSS appearance, not a Material framework renderer pack. `materialTheme` is a
standard renderer preset, preserving shell DOM and state updates while adding outlined floating-label
fields, underline tabs, pill buttons, elevated panels and light/dark/high-contrast tokens. Hosts may
self-host Roboto; no package fetches fonts. It has a separate 10 kB theme budget; existing budgets stand.

Every shipped theme exports `builderTheme` as well as its form descriptor. Base exports Neutral chrome.
Builder themes use SDK `BuilderTheme`/`BuilderTokens`/`BuilderPrimitive`; defineBuilderTheme snapshots
safe --ofb-\* tokens, dark overrides and primitive token recipes. The builder resolves inheritance and
match-form per instance; form themes and builder themes do not modify one another. See spec 10.
New controls now pass Material conformance/visuals in addition to the four established themes.

M09b design canvases opt into `designTabs: 'active'` to display only the active tab while preserving inert
portable controls, real theme rendering, and native design placeholders. The default remains all-slot
for existing render integrations. Native hosts may bind framework context per form instance through
`forController(controller)`, so a settings preview's hooks use its isolated controller and session.
