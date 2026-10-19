# @ourform/builder-core

Experimental M00 package. Public exports are defined in `src/index.ts`.

Build: `pnpm --filter @ourform/builder-core build`. No runtime dependencies outside this workspace.

Exports `getEditorProperties(field, model)` (metadata-generated editor entries),
`applyEditorProperty(field, key, value)` (returns an updated field), and `EditorProperty`.
This headless package has no DOM library. Command history and the builder UI arrive later.
