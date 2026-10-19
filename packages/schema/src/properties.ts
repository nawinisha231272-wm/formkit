import { isRecord, inspectJson } from "./json";
import { shape } from "./shape";
import schema from "./form-definition.schema.json";
import type { Diagnostic, PropertyDescriptor } from "./types";
export function validateProperties(
  properties: Record<string, PropertyDescriptor>,
  input: unknown,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(input) || inspectJson(input).length)
    return [
      {
        severity: "error",
        code: "invalid-property",
        message: "Properties must be safe JSON objects.",
      },
    ];
  for (const [key, value] of Object.entries(input)) {
    const p = Object.hasOwn(properties, key) ? properties[key] : undefined;
    let valid = !!p;
    if (p)
      switch (p.kind) {
        case "number":
          valid =
            typeof value === "number" &&
            Number.isFinite(value) &&
            (p.min === undefined || value >= p.min) &&
            (p.max === undefined || value <= p.max);
          break;
        case "string":
        case "boolean":
          valid = typeof value === p.kind;
          break;
        case "select":
          valid =
            typeof value === "string" &&
            !!p.options?.some((o) => o.value === value);
          break;
        case "expr":
          valid = shape(value, schema.$defs.expr);
          break;
        case "options":
          valid =
            Array.isArray(value) &&
            value.every(
              (o) =>
                isRecord(o) &&
                typeof o.value === "string" &&
                typeof o.label === "string" &&
                Object.keys(o).every((k) => ["value", "label"].includes(k)),
            );
          break;
        case "json":
          valid = true;
          break;
        default:
          valid = false;
      }
    if (!valid)
      diagnostics.push({
        severity: "error",
        code: "invalid-property",
        message: `Invalid property: ${key}`,
      });
  }
  return diagnostics;
}
