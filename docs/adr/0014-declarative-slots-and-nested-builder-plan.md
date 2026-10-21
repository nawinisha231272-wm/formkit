# ADR-0014 — Declarative slots and nested builder plan

Status: accepted plan; implementation and evidence belong to M09.

Milestone: M09

Decision: owner-approved amendment after M08 closure.

## Context

The M05 builder edits a nested definition but exposes only a list canvas and three commands.
M07 supplies Panel, Columns, Fieldset and Container. A builder that recognizes each container by
type would need new drop-target code whenever an SDK author adds a container. Tabs must exercise
multiple independent child destinations before array/grid/Wizard structures arrive.

ADR-0003 permits additive SDK APIs. This amendment adds optional slot metadata and does not change
existing field/control/value contracts, historical images, correctness checks or performance policy.

## Decision

ComponentModel declares slots using the ordinary static form:

```ts
slots: [
  {
    name: "children",
    label: "Contents",
    accepts: ["field", "layout", "composite"],
    max: 10,
  },
];
```

Each slot has a unique safe-key name, a translatable label with English fallback, accepted component
kinds or exact registered types, and an optional nonnegative integer direct-child capacity. A missing
max is unbounded. A trusted per-node resolver may return the same descriptors when instance properties
determine slots, as with configurable Tabs. The shared headless resolver validates and snapshots at
most 64 descriptors; compile, commands, renderer and UI consume that contract. The builder contains
no switch on container type. A component may additionally declare builder.rootOnly for structures
such as future Wizard pages.

Keep the ordered wire components array. An optional child slot string selects a parent's declared
slot; omission selects its first/default slot and remains omitted on untouched old JSON. Existing
single-slot layouts retain their rendering/data behavior. Legacy layout models without explicit slots
retain a children slot. Fields and fixed composite expansions are not inferred editable containers.
Slot membership is presentation/authoring structure, never a data-scope boundary by itself.

All structural operations share validation: no self/descendant insertion, unknown slot, incompatible
kind/type, exceeded capacity or prohibited root-only nesting. Re-check keys over the destination data
scope, including transparent descendants. Refuse conflicts atomically. When a move/rename/wrap/unwrap
changes a data path, report affected runtime path expressions as stale-path warnings, even if the old
path now resolves to another field. Stable ref ids remain unchanged. Duplicate subtrees receive new
ids and unique keys, and rebase internal runtime refs while leaving external refs and opaque metadata
unchanged. Removed references retain the existing repairable-draft dangling-ref behavior.

Commands cover Add, Remove, Move at any depth/slot, UpdateProperty, Duplicate subtree, ChangeKey,
WrapInLayout and Unwrap. Each emits replayable RFC 6902 JSON Patch. Exact before/after snapshots retain
byte-identical JSON and generated identities on undo/redo, with a finite configurable history limit
(default 100). JSON import is a validated atomic command. No-op/failed edits preserve history and redo.

The reusable builder uses the actual renderer in design mode, shows nested/empty slot indicators,
generated property and expression editors, editable JSON with diagnostics, live preview and outline.
Mouse drag/drop and keyboard cut/paste target the same slots. Alt+arrows reorder/reparent, and refused
operations publish visible accessible reasons. Chrome styles stay independent of form themes.
DOM/custom-element/React/Angular wrappers publish of-schema-change with definition and JSON Patch.

Tabs moves into M09. Its configured options define stable slot names and editable captions; tab and
theme changes preserve mounted children/data/state. Runtime keyboard navigation follows tablist/tab/
tabpanel semantics; design mode exposes all slots. Removing a nonempty slot is refused until its
children are moved or removed. Tabs must pass all four themes and the supported hosts.

Split M10 into M10a (Repeater, DataGrid, EditGrid, Wizard; rowId/array scopes and slots) and M10b
(Date/Time/DateTime, async Select/Autocomplete, File, Currency, Phone, Tags; documented nullable
adapters). Keep M11/M12 numbering and the M11 human guide-usability task.

## Consequences and acceptance

The plan changes merge separately before implementation. M09 must prove four-level mouse and
keyboard building (Tabs > Panel > Columns > field), generic SDK slots with zero builder code, visible
illegal-drop reasons, cross-scope path/conflict behavior, and 50 random nested command sequences with
independent patch replay and byte-identical undo/redo. Bounded history is tested separately. Preserve
all existing checks and baselines; new component conformance/visuals cover Base, Bootstrap 4,
Bootstrap 5 and Tailwind. Full pinned verify and first-run green CI are required before merge.
Stop after M09; no M10 implementation is included.

Keyboard reference patterns: [W3C APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
and [W3C APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

## M09 implementation

The shared headless resolver, optional wire slot, complete structural commands and bounded snapshot
history implement the planned contract. Slot labels are literal English captions by default; passing
them through host translation supports catalog keys, with the unchanged caption as fallback. No code
recognizes built-in types in builder drop handling. Fixed model-owned composites remain uneditable.

The new @ourform/builder owns chrome and delegates forms/native bridges to renderer/adapters. Design
and preview share one session. Schema edits remount transient view/session state while preserving
answers for surviving value-field IDs; removed answers are not history. Theme/mode updates preserve
controls, selection handles and insertion buttons. Wrappers keep native owner context/DI and publish
nonempty patches only. Engine/registration changes rebuild the controller; controlled schema echoes
do not rebuild or loop. Tabs keeps inactive panels mounted; focus reveals error targets in ancestors.

There is no external runtime library: the new package depends only on existing OurForm layers. The
existing boundary lint rule explicitly allows adapters to import the builder UI for their wrappers.
No existing deterministic counts, screenshot tolerances, correctness checks or size limits increase.
