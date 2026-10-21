# ADR-0016 — Approved builder UX delivery and builder theme contract

Status: accepted for implementation by the owner's 2026-10-21 request.

The attached specifications replace planned spec 10 and add normative spec 11. The owner approved
screens 1–5 on 2026-10-21. Preserve original exported HTML as visual references, never implementation
source. M09b delivers screens 1/2/5 and builder themes; M09c delivers Logic; M10a delivers Table and
screen 4 grid/edit-grid authoring. The old 10-builder-ui.md placeholder is replaced by 10-builder-ux.md.

Builder chrome uses internal accessible primitives, --ofb-\* tokens and per-theme recipes. Theme packages
still import SDK types only and export both form and builder theme descriptors. SDK owns the public
builder-theme contracts/defineBuilderTheme; builder owns their runtime application. Material is a
portable appearance theme, with no Material framework dependency. Neutral is the default chrome for
Base; match-form follows other form themes. Custom/pinned chrome remains independent of the canvas.

Modal edits use a draft and real renderer preview, saving one atomic command; cancel discards the draft.
Drawer edits use debounced edit sessions. Structural rules remain in builder-core, including the new
spec's conflict rename plus diagnostic for cross-scope moves. No renderer/core depends on builder.

Existing compact-expression conditions/calculations support M09b dialog rows. Root logic rules,
triggers/actions/effects/dependency-map UI are M09c; full grid/array authoring is M10a. Future controls
are registered through the palette contract, not hard-coded placeholders. Plan changes ship separately
before implementation. Owner approval of the designs and owner sign-off of implementation screenshots
are distinct evidence. The fresh-session trial uses the M08 author rules; human usability stays in M11.
