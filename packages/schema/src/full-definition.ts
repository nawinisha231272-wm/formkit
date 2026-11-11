import base from "./form-structure.schema.json";
import logic from "./logic.schema.json";
import { validateUsing, migrateUsing } from "./validate-definition";
import type { DefinitionRegistry, Diagnostic } from "./types";

function freezeSchema<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeSchema(child);
    Object.freeze(value);
  }
  return value;
}
/** Complete published meta-schema; construction is removable from structure-only consumers. */
function createSchema() {
  return freezeSchema({
    ...base,
    properties: { ...base.properties, logic: logic.logic },
    $defs: { ...base.$defs, ...logic.$defs },
  });
}
export const formDefinitionSchema = /* @__PURE__ */ createSchema();

export function validateDefinition(
  input: unknown,
  registry?: DefinitionRegistry,
): Diagnostic[] {
  try {
    return validateUsing(input, registry, formDefinitionSchema);
  } catch {
    return [
      {
        severity: "error",
        code: "invalid-definition",
        message: "Unable to validate definition safely.",
      },
    ];
  }
}
export const migrate = (input: unknown): ReturnType<typeof migrateUsing> =>
  migrateUsing(input, validateDefinition);
