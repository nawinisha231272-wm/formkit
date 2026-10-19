# @ourform/renderer-dom

Experimental M00 package. Public exports are defined in `src/index.ts`.

Build: `pnpm --filter @ourform/renderer-dom build`. No runtime dependencies outside this workspace.

Exports `renderForm`, `AppearanceTheme` and `FormView`.

```ts
import { renderForm } from "@ourform/renderer-dom";
// `views` maps registered component type strings to each field definition's views.
const view = renderForm(root, session, views, "base");
view.setTheme("tailwind");
view.destroy();
```

The renderer now consumes compiled session nodes and per-field patches; rendering never calls validation.

Themes are starter presets (`base`, `bootstrap`, `tailwind`). Theme switching currently rebuilds
controls. Full accessibility, reconciliation and real theme packages arrive in M02–M03.
