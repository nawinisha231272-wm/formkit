# @ourform/sdk

Experimental M00 package. Public exports are defined in `src/index.ts`.

Build: `pnpm --filter @ourform/sdk build`. No runtime dependencies outside this workspace.

Exports `defineField`, `stringProperty`, `numberProperty`, `booleanProperty`, `stringValue`,
`numberValue`, `ControlProps`, `FieldDefinition`, and headless/schema type re-exports.

```ts
import { defineField, stringValue } from "@ourform/sdk";
const field = defineField({
  type: "example",
  title: "Example",
  value: stringValue(),
  control(props) {
    const input = document.createElement("input");
    input.id = props.id;
    input.value = props.value;
    input.addEventListener("input", () => props.setValue(input.value));
    input.addEventListener("blur", props.onBlur);
    return input;
  },
});
// engine.register(field.model); views.set(field.model.type, field.views);
```

The portable DOM callback is experimental until the M02 renderer comparison.
