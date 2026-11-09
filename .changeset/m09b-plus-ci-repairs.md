---
"@ourform/renderer-dom": patch
"@ourform/cli": patch
"@ourform/builder": patch
"@ourform/theme-base": patch
"@ourform/theme-bootstrap4": patch
"@ourform/theme-bootstrap5": patch
"@ourform/theme-tailwind": patch
---

Preserve the missing portable-view error when no theme is supplied, include explicit theme registrations
and all unpublished dependencies in packed author scaffolds, and use a builder token for inline caption
weight. Repair selection accessibility and restore host toolbar and keyboard context-menu behavior.

Bulk planning and Data mode bodies now preload independently at idle by default. Hosts can opt out
with `planningPreload: "none"` and `dataPreload: "none"`; activation retains immediate accessible
loading, reason/Retry, cancellation and strict-CSP/custom-asset-base behavior.

Complete ordered multi-selection actions and the metadata-generated lazy bulk editor, preserve selection
through pointer toolbar/drag activation and undo/redo, and apply the owner-approved dialog, caption,
help-text and error presentation polish. Existing schema and protected immediate behavior are preserved.

Bound generated browser verification to two independent workers while keeping the repository
headless pool serial, retaining all browser/theme/axe checks and existing proof deadlines.
