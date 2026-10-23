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
- Modal: changes preview instantly, commit on Save as one undo step; Cancel/Esc discards. When adding, the component stays in a private draft: Save commits the component and settings together as one step labelled “Add Email” (using its builder title); Cancel, Escape and Close discard it, publish no schema change, create no history, and restore the selection and focus from before the drop. Drawer mode commits the addition on drop as one step; later live edits are separate steps and closing never discards. `openOnAdd: false` commits defaults immediately without opening an editor. Paste, Duplicate and Wrap in layout each create one step and never open the editor. A tab with a validation problem shows a red dot; Save is disabled until fixed.
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
  The canvas always renders the form's theme. Design controls are inert with non-mutating callbacks; their disabled/read-only appearance reflects the schema, rather than marking every design control read-only. With match-form, the chrome uses the same theme's builder tokens, so a Material form is edited in a Material-styled builder.
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
  locked: { submit: "structure", customerId: "all", legacyRef: "key" },
  readOnlyKeys: ["submit"], // compatible shorthand for structure locks
  icons: customIconSet,
  messages: { "ofb.edit": "Configure" },
});
```

## Host component locks (owner clarification, 2026-10-21)

`locked` maps a component's stable id or data key to `key`, `structure` or `all`.
A listed selector defaults to `structure`; `readOnlyKeys: ["submit"]` remains shorthand for
`locked: {submit: "structure"}`. Locks belong to the host, never the wire definition.

- `key`: the data key cannot change; other edits are allowed.
- `structure`: the component cannot be deleted, change key/type, or move to a different data scope
  (into/out of a Container or grid). Moves within its scope and display/validation/logic/layout edits
  remain allowed.
- `all`: nothing can change. Editing selection, movement and deletion are blocked; Edit JSON may
  inspect the component read-only.

Canvas and outline show a lock icon. Blocked toolbar actions are disabled with an explanatory tooltip
(e.g. "Locked by your app: can't delete"). Settings grey out protected properties. Builder-core commands
must return `locked-component` for a forbidden Remove, ChangeKey, type change, cross-scope Move or JSON
apply, including an equivalent change through an ancestor edit/import; UI checks alone are insufficient.
Tests cover each level. Lock configuration is not a security boundary against an application replacing
its own builder instance/options.

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

## Owner review corrections — 2026-10-22 (normative M09b)

- At widths ≥1280px the header is one row; Undo, Redo, Issues, Preview and Save are aligned right.
  The form selector is labelled **Theme**. Header **More** exposes **Builder look: Match form / Neutral**,
  Appearance and keyboard destination/wrap controls. Builder look persists in browser-profile storage
  (no network); hosts may namespace it with `preferenceKey` for an authenticated user. An explicit
  host `chrome.theme` takes precedence on creation. Storage denial falls back to the active instance.
- Conditional opens with sentence rows (field · operator · value) and All/Any; Disabled when uses the
  same editor. Logic > Calculated value uses field · arithmetic/concatenation operator · value.
  Editing any row updates the same private draft immediately; there is no separate Apply step.
  **Write as expression** is secondary and synchronizes both ways. Arbitrary supported expressions
  that have no equivalent simple rows remain intact and open the expression view, without flattening
  or silently rewriting nested logic. Invalid raw input blocks Save and leaves the valid draft intact.
  This remains spec-03 compact expressions; spec-11 rule actions and Logic mode stay M09c.
- Field/operator/join pickers are searchable comboboxes: type to filter, arrows to navigate, Enter to
  commit, Escape to restore the current selection, Tab to continue. Typing an uncommitted filter does
  not change the definition. Controls expose listbox/option/active-descendant semantics.
- In the single-select outline and canvas, selection follows component focus. End/Up then Duplicate
  or Wrap targets that component. Virtual slots choose their actual destination; host locks still apply.
- Palette types have distinct library icons (plugins may declare their icon). Basic order is Text,
  Email, Number, Select, Checkbox, Radio, Date, Textarea, then remaining registered types. Absent types
  are not fabricated. Unlabelled/blank layouts use their registered type title everywhere. Hide a
  zero-count Controls summary rather than displaying “Controls 0 fields”.
- Generated Display editors include Tooltip, Prefix, Suffix, Disabled and Read-only. Prefix/suffix
  apply to value-field shells, not non-value layouts/content/buttons. Tooltip is a native hover title;
  Description remains the durable explanatory text. Disabled and Read-only are static schema flags,
  inherited by descendants; disabled also combines with disabledWhen. Host read-only overrides remain
  stronger. User writes are ignored and controls restored; API writes remain possible. The dialog
  header shows the type icon and full component location as well as the quiet key.
- New Select additions start with editable Option 1/Option 2. This is builder Add behavior; existing
  schemas, renderer model defaults and deliberately empty choices are preserved. Issues flags Select
  or Radio with no options, with a link selecting that component. Radio has no fabricated defaults.
- Material read-only controls use a filled surface and solid border, including phone preview; other
  themes keep their existing appearance.

### Host-confirmed save status

Header Save emits `of-save` with `{definition}` and changes the chip/live announcement to **Saving…**.
The host persists that exact definition, then calls `BuilderController.markSaved()` (chip **Saved
<local time>**) or `markSaveFailed(message)` (visible/announced failure). The builder does not perform
storage/network persistence. Save is disabled during an outstanding request. If schema edits happen
before acknowledgement, those edits stay unsaved; `markSaved()` cannot label a newer definition saved.
Calling either acknowledgement without an outstanding request has no effect. The demo simulates
successful host acknowledgement. Remove the contradictory “Form ready to save” announcement.

## M09b+ — authoring shortcuts (owner approved)

**Approved with owner amendments.** Start with ADR-0018’s loading split, then deliver the shortcuts and polish after M09b screenshot approval and before
M09c. See `docs/milestones/M09b-plus.md`. Keep changes small and use the existing command/lock/slot contracts:

1. Inline label editing: double-click or a keyboard action edits the canvas label; Enter commits one
   label command, Escape cancels. Existing data keys never change silently. Respect `all` locks.
2. Hover/focus “+” between siblings opens the searchable mini palette at that precise slot/index.
   Add and initial modal settings retain M09b's atomic Save/Cancel behavior and keyboard alternative.
3. Ctrl/Cmd+K command bar searches three explicit groups: Add component, Jump to component, Actions.
   Reuse registered palette/action metadata; report disabled actions and preserve focus on Escape.
4. Multi-select with Shift/Cmd/Ctrl click and keyboard range/toggle alternatives. Move, Delete, Wrap
   and Required apply as atomic bounded-history commands. Nested selections normalize to highest
   selected ancestors; mixed-scope/conflicting/locked operations refuse atomically with a reason.

Acceptance proposal: all four flows work by mouse and keyboard, with axe in every builder theme;
no focus/state loss on theme changes; atomic exact undo/redo, including randomized selection/move
sequences; no duplicate descendant operations; locked/illegal targets refused with no partial mutation.
Update only changed visual states, retain count/size budgets, run full pinned verify. The owner approved the plan with the amendments in ADR-0018 and M09b-plus.md. Reusable sections/templates, tablet width tooling, preview test data, guided
pre-save fixes and persistent version history/diff/restore remain backlog after M10a, not this proposal.

## M09b live-review announcements — owner amendment, 2026-10-22

Plain visible notices expire after five seconds. Action toasts, including delete's Undo, remain eight
seconds and pause their remaining lifetime while hovered or keyboard focus is inside. F6 region cycling reaches
the visible Undo action without activating it; expose the shortcut accessibly. Replacing a notice
removes the previous one immediately. Expiring visible content never clears or truncates the separate
polite screen-reader announcement. Ctrl/Cmd+Z remains available after the toast closes, through the
normal command history. Test remaining-time pause/resume for hover and focus in every browser.

The polite live region is screen-reader-only; the toast is the sole visible announcement surface.
Clear and reset the live-region text for every new message, including repeated identical messages.
Undo/Redo replace both messages using the command label (for example, “Undid move of Email” and
“Redid move of Email”); empty history announces “Nothing to undo” or “Nothing to redo”. A theme,
chrome or mode re-render must not replay an old toast. Move completion reports the actual final
destination position and sibling count. Tooltips use no-wrap/max-content sizing, centred above
their buttons and clamped inside the viewport; all five builder themes have single-line checks.

## M09b live-review round 4 — 2026-10-22

Selection and hover tags remain outside component content, start-aligned on the outline edge;
the toolbar aligns to the other side. Narrow tags truncate their end with ellipsis and preserve full
title/ARIA text. If the scrollport has insufficient room above, both flip below, with space reserved
for neighbours. Check geometry and 1280×800 Material/Bootstrap 5 captures for selected column field,
hovered neighbour and first panel field. Undo/Redo use aria-disabled and no-op activation when empty,
preserving focus. Ctrl/Cmd+Z on the focused empty Undo button announces Nothing to undo. Body-level
undo/redo applies only when exactly one builder exists; embedded multiple-builder hosts retain local
shortcut scope. F6 cycles builder regions and reachable toast action; Option+Z is never intercepted.
No merge before owner image approval and first-attempt green CI. Budget stays 30 kB for this review.

## M09b live-review round 5 — 2026-10-22

At 1280×800, half-column name tags preserve the whole label through 16 characters in all five
builder themes. Reserve label space first; truncate the secondary ` · key` suffix first, retaining
full title/ARIA text. Narrow component toolbars collapse to Edit, Move, Duplicate, Delete and More;
Copy, Paste and Edit JSON remain in More with their existing shortcuts. Hover and selection share
one placement rule: outside the top edge when clear, otherwise both below. The first-panel-field
visual fixture includes its panel heading and asserts that the below placement is exercised. Keep
the clipped-scroll geometry regression separately, without hiding the heading in the review image.

Every successful builder command, including unchanged settings Save and public command dispatch,
uses the same announcer as Move. Add, Duplicate, Delete, Paste, Wrap and settings Save replace stale
live text and the visible toast (for example, “Duplicated Email”, “Deleted Phone” and “Saved settings
for Email”). Move retains its actual destination count. Delete retains its eight-second reachable
Undo action; expiry does not clear the independent live announcement. Failed commands announce their
diagnostics instead. Successful no-op commands capture subject metadata without a history entry.

Each new desktop builder opens Build. View mode is not persisted; the user's Builder look preference
is independent. Below 768px the existing read-only Preview rule still applies. Approved desktop
screenshot fixtures explicitly select Build before interacting or capturing.
