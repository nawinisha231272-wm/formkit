# @ourform/components

Experimental M00 package. Public exports are defined in `src/index.ts`.

Build: `pnpm --filter @ourform/components build`. No runtime dependencies outside this workspace.

Exports `textField` and `ratingField`. Each exposes a headless `.model` to register on the engine,
and `.views` for the renderer. Rating retains the starter numeric empty value of zero until M02.
