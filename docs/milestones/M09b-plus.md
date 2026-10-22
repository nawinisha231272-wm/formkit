# Proposed M09b+ — Authoring shortcuts

Status: **proposal for owner review, not authorized to build**. Depends on M09b screenshot approval.
Order: M09b → M09b+ (if approved) → M09c. No M09c root logic is included.

Scope and acceptance are the “Proposed M09b+” section of spec 10: inline label editing, hover/focus
quick-add between siblings, Ctrl/Cmd+K command bar, and atomic multi-selection operations. All mutations
use builder-core commands, slot validation and host locks. Before implementation, write the selection
and command contracts in an ADR and add deterministic replay/keyboard coverage. Existing keys remain
stable when a label is edited. Respect cancellation and private modal additions.

Proposed delivery order: inline label editing → precise quick-add → shared action search → multi-select.
Verify every action by pointer and keyboard, all five themes, axe, focus/appearance preservation,
atomic rollback/refusal, bounded history and exact undo/redo. Full pinned verify, changed-state images
and owner review are required. No implementation starts from this proposal without owner approval.

Deferred until after M10a: sections/templates, tablet preview tooling, generated test data, guided
pre-save issue fixes and persistent version history. Current undo history remains a local command log.
