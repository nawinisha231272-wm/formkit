---
"@ourform/builder": minor
"@ourform/renderer-dom": minor
"@ourform/element": patch
"@ourform/react": patch
"@ourform/angular": patch
"@ourform/testing": patch
"@ourform/themes": minor
---

Make form and builder themes explicit per-instance registrations, add lazy host-owned theme loading,
and defer generated Settings UI with accessible idle-preload/failure recovery. Publish opt-in theme
subpaths and generated per-theme script bundles while preserving compatibility theme entries.
