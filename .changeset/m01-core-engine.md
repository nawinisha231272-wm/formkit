---
"@ourform/schema": minor
"@ourform/core": minor
"@ourform/renderer-dom": patch
---

Add versioned schema validation, safe compilation, object paths, bounded typed expressions, dependency
ordering, immutable session snapshots and per-field state. Session creation now requires a compiled form;
validation is Promise-based and patches contain component ids and parsed paths. Adapt the playground and
renderer to the new contracts. No external runtime dependencies are added; Ajv is a development-only
meta-schema conformance dependency.
