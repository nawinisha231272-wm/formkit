# ADR-0015 — Per-column child storage and explicit palette opt-in

Status: accepted for implementation by the owner's M09a request.

Columns owns `columns: [{width,components}]`; widths are integers 1..12 and total 12. It has no
simultaneous flat `components`. A column is a transparent structural collection, not a component or
data scope. Its positional slot name is `column_0`, `column_1`, etc. Array membership determines
placement; column children do not persist redundant `slot` names. Existing ordinary layouts/Tabs
retain their ordered components plus optional child slot contract. Shared schema traversal exposes
both storage forms, so commands locate real JSON Pointers (including columns/<index>/components).
Compiled entries carry effective parent-slot metadata separately from the immutable wire child.
Adding Columns creates two empty width-6 columns. Width/list editing UI is deferred to M09b.

The 1.0 migration boundary detects legacy Columns without columns, copies input and consumes each
immediate child's layout.width (default 12). Pack spans in original order into rows of at most 12;
fill unused trailing width with an empty column. A single row becomes columns directly. All full-width
children can share one width-12 column. Other multiple rows become nested transparent Columns inside
one width-12 outer column, using deterministic collision-free IDs for new row layouts. Existing field
IDs/keys/config/ref expressions and input objects remain unchanged. Canonical input is idempotent;
mixed old/new storage and malformed widths are rejected, not guessed. Migration is reported in applied
and runs before registry compilation. Builder import stores the canonical definition and patches it.

Definition JSON Schema describes column shape and exclusive storage; the semantic validator enforces
the sum of widths, which ordinary JSON Schema cannot compute from arbitrary numeric array members.
Submission JSON Schema remains a data object across columns, never an array/wrapper for visual columns.

Palette inclusion is explicit: a registered model needs a nonblank builder.title. The model's renderer
title remains available independently. Demo registrations are not included by the default playground;
an explicit ?demos opt-in preserves their automated engine/harness checks. Registration still controls
what existing schemas may compile; hiding a palette entry is not an authorization boundary.

The current UI is an M09 harness. Spec 10/M09b owns Pointer Events drag, drag-only drop indicators,
click selection, active-tab-only canvas and a tabbed edit dialog. M09a only wires the new storage into
the current harness and renderer; it does not implement or polish those interactions.
