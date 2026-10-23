# M09b+ — Authoring shortcuts

Status: **approved with owner amendments; starts after M09b approval**. Depends on M09b screenshot approval.
Order: M09b → M09b+ → M09c. No M09c root logic is included.

Scope and acceptance are the “M09b+” section of spec 10: inline label editing, hover/focus
quick-add between siblings, Ctrl/Cmd+K command bar, and atomic multi-selection operations. All mutations
use builder-core commands, slot validation and host locks. Before implementation, write the selection
and command contracts in an ADR and add deterministic replay/keyboard coverage. Existing keys remain
stable when a label is edited. Respect cancellation and private modal additions.

Delivery starts with ADR-0018 split (core ≤26 kB), then inline label editing → precise quick-add → shared action search → multi-select.
Verify every action by pointer and keyboard, all five themes, axe, focus/appearance preservation,
atomic rollback/refusal, bounded history and exact undo/redo. Full pinned verify, changed-state images
and owner review are required. Owner amendments below are part of acceptance.

Deferred until after M10a: sections/templates, tablet preview tooling, generated test data, guided
pre-save issue fixes and persistent version history. Current undo history remains a local command log.

## Owner polish acceptance — 2026-10-22

Dialog label title plus a separate type chip; one error is plain text, several use a list; live preview
fits content; inline “Show when [All] of these match”; full header name on hover and truncation only
when space runs out. Keep only the Preview mode tab unless a separate button opens a new window
(and is named Open preview). Header More contains settings only; insertion/wrap belong in the selected
component menu. Bootstrap 4/5 help belongs below inputs. Conditional components show a readable
“Shown when Customer type is Business” chip. Hover type labels sit outside content. Fieldset uses
a bracketed-box icon. Translation-key label editing, slot-filtered quick-add, Shift+arrows selection,
shared-property bulk edit and atomic cross-scope refusal follow ADR-0018. Deferred features remain
after M10a. Re-take changed screenshots and request owner approval.
