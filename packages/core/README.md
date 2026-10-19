# @ourform/core

Experimental M00 package. Public exports are defined in `src/index.ts`.

Build: `pnpm --filter @ourform/core build`. No runtime dependencies outside this workspace.

Exports `createEngine`, `Engine`, `FormSession`, and headless model/value/property contracts.

```ts
import { createEngine } from "@ourform/core";
const engine = createEngine();
// Register component models before creating a flat starter session.
```

A session supports `getData`, `getValue`, `setValue`, `markTouched`, `isTouched`, `validate`,
`subscribe` (returns an unsubscribe callback), and `definition`. `Engine` provides `register`,
`getField`, `listFields` and `createSession`. This transitional API has no compiler yet.
