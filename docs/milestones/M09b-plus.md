# M09b+ — Authoring shortcuts

Status: **approved with owner amendments; starts after M09b approval**. Depends on M09b screenshot approval.
Prerequisite satisfied: PR #15 approved at `79e69f6`, merged as `0b3b452` on 2026-10-23 after
first-attempt green PR/push Verify. Work is on `m09b-plus-authoring`; ADR-0020 is accepted with
the owner's opt-in-theme/option-B amendment. Proceed with the split: builder-owned ≤29 kB and full
initial transitive closure ≤64,613 Brotli bytes, with existing runtime/lazy budgets unchanged.
Order: M09b → M09b+ → M09c → M09d → M10a → M10b. M09d is an accepted plan (ADR-0019),
with implementation starting only after M09c. No M09c root logic is included here.

Scope and acceptance are the “M09b+” section of spec 10: inline label editing, hover/focus
quick-add between siblings, Ctrl/Cmd+K command bar, and atomic multi-selection operations. All mutations
use builder-core commands, slot validation and host locks. Before implementation, write the selection
and command contracts in an ADR and add deterministic replay/keyboard coverage. Existing keys remain
stable when a label is edited. Respect cancellation and private modal additions.

Delivery starts with ADR-0018 split (builder-owned initial ≤29 kB; full initial closure ≤64,613
bytes), then inline label editing → precise quick-add → shared action search → multi-select.
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

## Step 0 — carried-over round-5 review, owner instruction 2026-10-23

Recheck the existing five-theme readable half-column labels (≤16 characters), compact toolbar and
shared hover/selection placement; fresh per-command announcements; default desktop Build mode;
and the heading-visible first-panel flip. Preserve all approved assertions and platform baselines.
Add the explicitly requested Unwrap announcement/exact-history regression alongside the existing
Add/Duplicate/Delete/Paste/Wrap/settings checks. Record commands/results and the unchanged baseline
manifest before splitting code; no screenshot approval is inferred for future M09b+ changes.

## Implementation checkpoint — inline labels and quick-add

Literal labels edit in place by double-click or Shift+F2; Enter commits one command and Escape
cancels. Translation-key captions open generated Settings. `ComponentNode.labelKey` is public,
schema-validated and rendered with its literal `label` fallback; validation messages use the resolved
caption. Hover/focus insertion markers open a lazy searchable menu at their exact slot/index and filter
through `canDrop`. Load failure preserves schema/history/selection and offers Retry. Final three-browser,
axe, five-theme and size evidence is recorded after the consumer measurement below.

Checkpoint evidence (2026-10-27): the full loading/authoring browser matrix passes **42/42** across
Chromium, Firefox and WebKit, with a separate **9/9** repeated inline-label activation matrix. The
consumer gates pass at **28,767 / 29,000** builder-owned initial and **63,487 / 64,613** full initial.
The combined feature checkpoint adds 1,283 / 2,438 Brotli bytes over the accepted split baseline;
the quick-add loaded closure is 3,403 bytes including 2,901 bytes already shared with initial code.
See `../reviews/m09b-plus-authoring-checkpoint.md`. Command search, multi-select, full pinned verify
and the owner gate remain open.
