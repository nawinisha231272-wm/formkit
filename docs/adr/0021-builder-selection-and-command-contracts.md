# ADR-0021 — Builder selection and command contracts

Status: accepted by the owner on 2026-10-27 with the amendments below.

Size note: the original measurement checkpoints below retain their historical limits. The owner's
2026-10-28 ADR-0018/0020 amendment supersedes them with UI 31,600 / builder-core 7,300 / full 67,400;
bulk preparation and Data bodies are lazy with default idle preload. Selection, immediate command
frame, clipboard, context menu, bulk Delete/Required and PointerDrag remain initial.

M09b+ adds inline label editing, precise quick-add, command search and multi-selection. These routes
must not create parallel mutation logic or weaken the M09 slot, lock, history and patch contracts.

## Selection model

The headless builder keeps one primary `selection` for existing hosts. The DOM builder owns an
ordered selection set, primary and range anchor per instance. The anchor is the member where the
current range started: the last plain click/focus or Cmd/Ctrl+click. Plain click/focus selects one;
Cmd/Ctrl+click toggles one. Deselecting the primary makes the most recently added remaining member
primary; an empty set falls back to the deselected component's parent or the root. Shift ranges from
canvas or outline use visible expanded outline rows in document order. Shift+Up/Down extends or
contracts the range. Schema changes remove missing ids; theme/chrome/mode changes preserve selection.

Only structural commands (Delete, Move, Wrap, Duplicate and Copy) normalize selected ancestors and
descendants to the highest selected ancestor. Property edits use the exact set: a selected ancestor
and descendant are both edited if both support the property. An unsupported member refuses the
whole operation. The outline tree has `aria-multiselectable`; canvas mirrors `aria-selected`, and
selection changes are announced, including “3 selected” and “Deselected Email”. Axe must be clean
in all five themes. Locked-member refusals name blocking components and offer “Deselect locked
components”; no operation silently omits a locked member.

## Command model

Every authoring mutation is a builder-core `Command`. `AtomicCommand` contains named child commands,
applies them to a private state in deterministic order, and publishes only the final state/patch. Any
child error, final compile error, host lock violation or cross-scope ambiguity returns diagnostics
with the original state, no patch and no history entry. A successful atomic command is one bounded
undo step; inverse/redo use snapshots, preserving byte-identical JSON and generated ids.

Bulk Delete removes normalized nodes deepest/last first so source paths remain stable. Bulk Required
updates only components whose generated property metadata includes `required`; a mixed unsupported
selection is refused. Bulk Wrap requires one common parent/slot and adjacent normalized siblings;
it creates one wrapper and retains order. Bulk Move requires one common source data scope and one
destination whose slot accepts every selected type. A move across scopes is refused as a whole; it
never auto-renames some members. Multi-selection Copy and Duplicate act on the normalized set atomically in document order. Paste
inserts the copied set in order, rechecking slots, locks, ids and keys; any failure refuses all. Undo
restores the before-command selection set and primary; redo restores the after set, as builder-instance
state without modifying schema or adding a history entry.

Inline label Enter or blur commits one `UpdateProperty` command; Escape cancels. Trim whitespace
and refuse an empty caption with a visible reason. Edit the model-declared display-caption property
(default `label` for fields and layouts), never the data key. Panel and Fieldset keep `node.label`;
there is no wire migration. A model may declare another caption property or opt out with `false`.
Inline edit is offered only when that caption is visibly rendered; otherwise announce “No caption to
edit” or open Settings. `all` locks refuse
the command. Translation-key captions open generated Settings.

Precise quick-add passes the exact `{parentId, slot, index}` to the existing Add draft path. Search
contains only registered palette entries for which `builder.canDrop(type, target)` has no errors.
Save/Cancel/openOnAdd behavior is unchanged. The menu is a lazy entry with an immediate accessible
busy frame, Retry after failure, exact focus restoration and the shared offline/CSP/assetBase contract.
Its first consumer measurement is 3,403 Brotli bytes including 2,901 bytes of an initial shared
primitive chunk: 502 feature-specific loaded bytes, or 602 including its distinct Retry entry.

## Command search

Ctrl/Cmd+K opens a lazy command-search view with three explicit groups: Add component, Jump to
component and Actions. It reads the same palette, component titles and action metadata used by the
visible UI. Add results use the current insertion target and slot filtering. Jump changes selection
only. Actions apply to the whole selection and state its size (for example, “Delete 3 components”).
Actions supporting only one component are disabled with a reason. Actions invoke existing handlers. Escape restores the exact
prior focus and makes no history entry. Search never evaluates user code.

The command bar remains unshipped pending the combined measurement and initial-size gate.
Its activation stub counts toward the 29,000-byte builder-owned initial gate; the loaded entry is
excluded from initial closure only until requested. Quick-add and any bulk-edit dialog are lazy by
default and report both initial and full-closure deltas under ADR-0018/0020.

The owner approved lazy indexing and a 4,500-byte command-bar closure ceiling on 2026-10-27. The
probe measured 4,218 bytes for that closure, but its immediate activation frame raised builder-owned
initial to 29,044 bytes; the full initial measurement was 63,753 / 64,613. Before either the command
bar or multi-select ships, measure both together, including the separate lazy bulk-editor proposal,
and keep initial within 29,000 bytes. ADR-0018 and ADR-0020 record the full owner conditions. See the
command-bar measurement report for the initial-index alternative and shared-chunk accounting.

## Verification

Unit tests cover normalization, deterministic atomic replay, refusal rollback, locks, property
intersection and byte-identical undo/redo over randomized sequences. Browser tests cover pointer,
keyboard and assistive-state routes in all five builder themes and all three browsers, including
focus restoration, exact slot filtering, translation-key fallback and unchanged keys. Axe reports no
serious/critical issues. Every feature reports its consumer-build byte delta before delivery.

Deterministic work-count checks cover bulk Delete, Move and Required at 500 selected components;
report their timing separately as advisory.
