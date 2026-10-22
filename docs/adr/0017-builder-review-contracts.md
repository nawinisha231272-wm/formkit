# ADR-0017 — M09b owner review: one expression value and acknowledged saves

Status: accepted for implementation by the owner review of 2026-10-22.

The independent trial's product frictions require product changes, not only guide advice. Friendly
rule rows and raw JSON now edit one private draft value. Searchable accessible pickers replace native
condition selects. Complex expressions stay intact in the raw view; invalid input cannot corrupt the
valid draft. Modal Save still commits one command; the drawer retains grouped live edits. No spec-11
Logic rules are implemented.

Single-selection follows component focus in outline/canvas. Actions consequently target the focused
component, with the existing lock exceptions. Unnamed components use registered titles. Builder Add
provides Select's two editable choices; the model's runtime default remains empty for existing forms.
Authoring-only empty-choice warnings share the header and Issues panel; they do not reject wire data.

Additive schema fields tooltip/prefix/suffix/disabled/readOnly expose existing shell presentation and
static protection in generated Display editors. Static protection inherits through layouts and cannot
be weakened by a child, a disabledWhen expression, or a field flag when the host is read-only. API
writes remain allowed. Tooltip uses a native title; Description is the visible explanatory alternative.
These properties do not require model-specific builder forms or reverse package dependencies.

BuilderController adds markSaved()/markSaveFailed(message). Save captures the exact definition and
emits of-save before host acknowledgement. A later acknowledgement cannot clear edits made since that
snapshot. The chip states Draft/Unsaved/Saving/Saved time/Failure never imply SDK network persistence.
Only one save is outstanding; acknowledgements when idle are ignored. Hosts own persistence.

Builder look is a browser-profile preference, locally stored without customer form data or network
calls. preferenceKey lets a host isolate authenticated users; explicit chrome options take precedence.
Restricted storage is optional and cannot prevent editing. Header More holds settings/destinations,
leaving a single desktop row. Filled Material read-only fields deliberately replace dashed borders.

Spec 10 and M09b-plus.md propose four later productivity features. They remain unapproved; no inline
label editing, hover-between quick-add, command bar or multi-select implementation is included here.
