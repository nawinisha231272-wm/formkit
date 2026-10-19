# 05 — Rendering and themes

Status: normative. Packages: `@ourform/renderer-dom`, `@ourform/theme-*`.

## Renderer

```ts
export function mount(
  root: Element,
  session: FormSession,
  options: {
    engine: Engine;
    theme?: Theme | string;
    adapter?: string; // adapter default 'dom'
    mode?: "render" | "design"; // design = builder canvas
  },
): {
  setTheme(theme: Theme | string): void;
  focus(componentId: string, rowId?: string): void;
  unmount(): void;
};

export function renderToString(
  session: FormSession,
  options: { engine: Engine; theme?: Theme | string },
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
- Every theme passes the theme conformance suite: all states, validation, disabled, read-only,
  focus, hover, multi-value, nested grid, wizard, RTL, dark and high-contrast.

## M02 renderer selection

ADR-0002 selects VNodes with a small keyed DOM patcher. Each mounted field updates from FieldState,
including focused controls; no render-time whole-form validation or control replacement occurs.
The low-level mountVNode lifecycle also supports development host probes. Theme presets update classes
in place. Static SSR shares control output without browser globals; it currently accepts explicit
`{ views, theme? }` alongside the session. The normative engine-based mount API, shell variants and
complete themes remain M03 work. Focus/caret, composition event, cleanup and SSR tests cover M02 behavior.
