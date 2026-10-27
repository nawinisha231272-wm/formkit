# ADR-0021 — Builder selection and command contracts

Status: accepted for M09b+ by the owner decisions recorded in spec 10 and the milestone plan.

M09b+ adds inline label editing, precise quick-add, command search and multi-selection. These routes
must not create parallel mutation logic or weaken the M09 slot, lock, history and patch contracts.

## Selection model

The headless builder keeps one primary `selection`, which is the focus/action anchor and remains
compatible with existing hosts. The DOM builder owns an ordered selection set for its instance. The
primary selection is always the most recently focused/toggled member. Schema changes remove missing
ids; a surviving primary remains primary, otherwise the nearest surviving member becomes primary.
Theme/chrome/mode changes preserve the set.

Selection normalizes before a bulk command: if an ancestor and descendant are selected, only the
highest selected ancestor participates. Document order supplies deterministic command order. Plain
click/focus selects one. Cmd/Ctrl+click toggles one. Shift+click selects the visible range from the
anchor; Shift+Up/Down extends or contracts the outline range without moving focus outside the tree.
Escape returns to the primary selection. Canvas and outline expose the same `aria-selected` state.

Locks affect actions, not observation: `all` components may appear in a range, but any attempted
edit/move/delete/wrap including one is refused as a whole. No operation silently drops a locked or
illegal member.

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
never auto-renames some members. Duplicate, Paste and the existing single-component commands retain
their contracts.

Inline label commit is one `UpdateProperty(id, "label", value)` and never changes a key. Empty labels
are invalid. `all` locks refuse the command. When a label is represented by an explicit translation
key, the inline action opens generated Settings instead of replacing translated text.

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
only. Actions invoke existing handlers and display their disabled reason. Escape restores the exact
prior focus and makes no history entry. Search never evaluates user code.

The command bar remains unshipped until its consumer-built chunk ceiling is measured and approved.
Its activation stub counts toward the 29,000-byte builder-owned initial gate; the loaded entry is
excluded from initial closure only until requested. Quick-add and any bulk-edit dialog are lazy by
default and report both initial and full-closure deltas under ADR-0018/0020.

The 2026-10-27 probe recommends lazy indexing and a 4,500-byte command-bar closure ceiling. It
measured 4,218 bytes for that closure, but its immediate activation frame raised builder-owned
initial to 29,044 bytes. No implementation may ship until the owner approves the separate command
budget and at least 45 bytes of normal compaction brings initial back within 29,000. The fixed full
initial measurement was 63,753 / 64,613. See the command-bar measurement report for the rejected
initial-index alternative and shared-chunk accounting.

## Verification

Unit tests cover normalization, deterministic atomic replay, refusal rollback, locks, property
intersection and byte-identical undo/redo over randomized sequences. Browser tests cover pointer,
keyboard and assistive-state routes in all five builder themes and all three browsers, including
focus restoration, exact slot filtering, translation-key fallback and unchanged keys. Axe reports no
serious/critical issues. Every feature reports its consumer-build byte delta before delivery.
