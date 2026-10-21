# 10 — Builder UX

Status: normative for M09b. Mockups approved by the owner on 2026-10-21 ("OurForm Builder UX" design canvas, screens 1–5); they are the visual reference. Logic mode (screen 3) is specified in 11-logic-rules.md and delivered in M09c; grid/table authoring (screen 4) is delivered in M10a. Packages: @ourform/builder (UI), on top of @ourform/builder-core (M09a).
Keep the Form.io builder pattern users know — palette on the left, drag onto a canvas, a hover toolbar on each placed component, a tabbed settings dialog on Edit — and improve on it: undo/redo for everything, an outline tree for deep nesting, visible reasons for refused drops, keyboard-only building with screen-reader announcements, settings generated from component properties, and a calm design where the canvas shows the form's real theme.
The UI never decides structure rules itself: every drop, paste, wrap and move is validated by builder-core (slot contract and drop rules from M09a) and applied as a command.
Phone widths (< 768 px) show a read-only preview, not the editor.
Order: Edit · Move (grip) · Duplicate · Copy/Paste · Edit JSON · More (⋯) · Delete. Every action is also in the right-click menu and has a shortcut; each is exactly one undo step.
Containers: empty slots show a dashed placeholder "Drag a component here, or press +"; + opens a mini palette (search + six most-used types). Hovered slots show labels ("Column 2 of 3", "Tab: Contact"). Containers collapse to a one-line header on the canvas.
Adding: drag from palette, or click a palette item to add below the selection. After adding, the new component is selected and the editor opens (editor.openOnAdd, default true). Generated label "Text field 2" and key textField2; the key follows label edits until edited by hand.
Modal (default) or right-side drawer (editor.mode: 'drawer').

- Header: "<Type> · <Label>", key shown quietly, close button.
- Tabs: Display, Data, Validation, Conditional, Logic, Layout, Accessibility, then one tab per extra property group a component declares. Fields are generated from base groups + the model's properties (spec 04). Validation tab shows only rules valid for the value adapter.
- Conditional and Logic tabs: rule builder rows "field · operator · value", joined by All/Any, producing the compact expression format (spec 03); a raw expression view is available.
- Right pane: live preview rendered by the real renderer in the form's theme, updating as you type.
- Footer: Delete (danger, left) · hint "Esc cancels · Ctrl+Enter saves" · Cancel · Save (primary).
- Modal: changes preview instantly, commit on Save as one undo step; Cancel/Esc discards. A tab with a validation problem shows a red dot; Save is disabled until fixed.
- Drawer: changes apply live; undo steps are debounced (one per field edit session, 500 ms).
- Focus: trapped in modal; returns to the component on close.

1. Pointer Events for mouse, pen and touch. Touch: 300 ms long-press starts a drag.
2. Sources: palette items, grip, component body after a 4 px threshold, outline rows.
3. Target: deepest slot under the pointer; index from children's midpoints (vertical) or column centres (Columns).
4. Indicators: 2 px accent insertion line between siblings; tinted target slot with its label; vertical line between columns.
5. Refusal: red outline + short reason near the pointer, from builder-core diagnostics ("A Wizard page can only be at the top level", "Data grid columns accept fields only", "Can't drop a container into itself"). No history entry.
6. Hover-to-open: 600 ms over a collapsed container expands it; 600 ms over a tab header switches tab.
7. Auto-scroll within 48 px of the canvas edge, speed increasing towards the edge.
8. Escape or dropping outside the canvas cancels with no history entry.
9. Moving into/out of a Container changes the data path: toast shows the new path; key conflicts are auto-renamed (city2) with a diagnostic.
10. Performance: cached slot rectangles refreshed on scroll/resize; no per-frame layout reads; no long task over 50 ms while dragging in a 500-field form (Chromium trace).
    One polite live region announces: pick up ("Picked up Email. Use arrow keys to move, Space to drop."), position while moving ("Email, Panel Contact, position 2 of 4."), result ("Moved Email into Panel Contact, position 2 of 4."), refusal ("Can't drop here: data grid columns accept fields only."), delete ("Deleted Email. Press Ctrl+Z to undo."). Canvas: application region with roving tabindex.
    Themes apply to the builder itself, not only to the rendered form. The builder chrome (header, palette, outline, toolbars, edit dialog, drawer, menus, toasts) is built only from a small set of internal primitives — Button, IconButton, Input, Select, Switch, Checkbox, Tabs, SegmentedControl, Dialog, Drawer, Menu, Tooltip, Toast, Tree, Chip — whose look comes entirely from builder theme tokens and per-theme recipes. No chrome element hard-codes colours, radii or fonts.

- Every shipped theme package exports two things: the form theme (spec 05) and a builderTheme: --ofb-\* token values (font family, accent, accent-contrast, surface, surface-raised, border, text, text-muted, danger, success, logic, focus-ring, radius, control height, shadow-1/2) plus optional recipes for primitives (e.g. Material: pill buttons, underline tabs, outlined inputs; Bootstrap 4/5: square-ish buttons, bordered nav tabs).
- Builder themes shipped: Neutral (default chrome from the approved mockups), Bootstrap 4, Bootstrap 5, Tailwind, Material. Each has light and dark token sets and works in both densities.
- chrome.theme: 'match-form' (default) makes the chrome follow the canvas theme chosen in the header; any named builder theme can be pinned instead. Host apps can register their own with defineBuilderTheme({ name, extends, tokens, recipes }).
- Switching theme restyles chrome and canvas in place: no rebuild, selection, open dialog, focus, undo history and drag state are preserved.
- Builder-specific signal colours keep their meaning in every theme: selection/drop = accent, refusal/delete = danger, logic badges = logic colour (orange family), conditional visibility = info.
- Contrast is checked per theme in CI: text ≥ 4.5:1, UI boundaries and focus ring ≥ 3:1, in light and dark.
  The canvas always renders the form's theme. With match-form, the chrome uses the same theme's builder tokens, so a Material form is edited in a Material-styled builder.
  Material is a new theme package (@ourform/theme-material) delivered in M09b: portable CSS (outlined fields with floating labels, underline tabs, pill buttons, elevated cards), light and dark, passing the theme conformance suite like the other themes. It is an appearance theme, not a dependency on any Material component library; React MUI / Angular Material renderer packs stay after 1.0.
  Header: brand, breadcrumb (Forms / form name), save status chip, mode switch Build · Logic · Data · Preview · JSON, theme switcher, undo/redo, issues count, Preview, Save. Build is specified here; Logic in spec 11 (M09c); Data shows the submission JSON Schema and sample data; Preview runs the form; JSON is the validated definition editor. Palette groups: Basic, Layout (Panel, Columns, Tabs, Fieldset, Table, Wizard), Data (Data grid, Edit grid, Repeater, Container), Advanced, then plugin groups. On the canvas, a field that drives rules shows a logic badge ("Controls 3 fields"); a component with a visibility condition shows an info chip ("Shown when Customer type is Business"); containers can collapse.

```ts
createBuilder(el, definition, {
  theme: "bootstrap5",
  chrome: {
    theme:
      "match-form" |
      "neutral" |
      "bootstrap4" |
      "bootstrap5" |
      "tailwind" |
      "material" |
      "<custom>",
    mode: "auto" | "light" | "dark",
    accent: "#0f766e",
    density: "comfortable" | "compact",
  },
  palette: {
    groups: ["basic", "layout", "acme"],
    hidden: ["password"],
    order: { acme: 0 },
  },
  toolbar: {
    actions: ["edit", "move", "duplicate", "copy", "json", "more", "delete"],
  },
  editor: {
    mode: "modal" | "drawer",
    openOnAdd: true,
    tabs: { hide: ["logic"] },
    properties: { text: { hide: ["tooltip"] } },
  },
  readOnlyKeys: ["submit"],
  icons: customIconSet,
  messages: { "ofb.toolbar.edit": "Configure" },
});
```

Events: of-select, of-schema-change ({ definition, patch }), of-before-delete (cancellable), of-editor-open. All chrome strings are message keys.

## Delivery (M09b)

Approved mockups (2026-10-21): (1) builder with nested form, drag in progress, hover toolbar, logic badges and theme switch; (2) edit dialog with live preview states; (3) logic mode — M09c; (4) data grid, edit grid and table — M10a; (5) one form in Bootstrap 4, Bootstrap 5 and Material, plus dark compact builder. M09b implements screens 1, 2 and 5 plus builder themes and the Material theme.

- Task script — 12-field form with Tabs › Panel › Columns nesting, one conditional rule, one custom component — completes by mouse and by keyboard alone in Playwright, all three browsers.
- Every toolbar action works from toolbar, right-click menu and shortcut; each is one undo step.
- A custom SDK component gets the toolbar, generated dialog tabs and live preview with zero builder code.
- axe: no serious/critical issues — light and dark, both densities, dialog open and closed; live-region announcements asserted in tests.
- Visual baselines for approved screens 1, 2 and 5 (per platform) match the mockups in structure; owner signs off the screenshots.
- Builder chrome renders in Neutral, Bootstrap 4, Bootstrap 5, Tailwind and Material, light and dark, both densities; match-form follows the header theme switch; switching keeps selection, open dialog, focus, undo history and drag state (Playwright).
- No chrome style hard-codes colour, radius or font (lint/test over builder CSS: only --ofb-\* tokens).
- Per-theme contrast checks pass in CI for chrome tokens (text ≥ 4.5:1, boundaries/focus ≥ 3:1).
- @ourform/theme-material passes the theme conformance suite and visual checks like the other themes; defineBuilderTheme with a custom theme is covered by tests and documented.
- No long task over 50 ms while dragging in a 500-field form (Chromium trace).
- Host options covered by tests and documented in the builder README.
- Fresh Codex session (M08 trial rules) builds the task-script form from builder docs alone; findings fixed. Human usability pass remains in M11.
