# @ourform/themes

Form themes are explicit host configuration and are never stored in form JSON.

```ts
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";

createFormController(root, { schema, themes: [bootstrap5Theme], theme: "bootstrap5" });
```

Material extends Base, so register its exported dependency set:

```ts
import { materialThemes } from "@ourform/themes/material";

createFormController(root, { schema, themes: materialThemes, theme: "material" });
```

The older `@ourform/theme-*` entries remain compatibility re-exports during migration.
