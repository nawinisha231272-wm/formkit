import schema from "./form-structure.schema.json";
import { isRecord } from "./json";
export function shape(
  value: unknown,
  rule: Record<string, unknown>,
  legacyColumns = false,
  root: Record<string, unknown> = schema,
): boolean {
  // The component's two allOf branches apply only to Columns/column collections.
  // Avoid recursively testing both discriminators for every ordinary field.
  const skipColumnRules =
    rule === (root.$defs as Record<string, unknown>).component &&
    (legacyColumns ||
      (isRecord(value) &&
        value.type !== "columns" &&
        !Object.hasOwn(value, "columns")));
  if (!skipColumnRules) {
    if (
      Array.isArray(rule.allOf) &&
      !rule.allOf.every((r) => shape(value, r, legacyColumns, root))
    )
      return false;
    if (
      rule.not &&
      isRecord(rule.not) &&
      shape(value, rule.not, legacyColumns, root)
    )
      return false;
    if (rule.if && isRecord(rule.if)) {
      const branch = shape(value, rule.if, legacyColumns, root)
        ? rule.then
        : rule.else;
      if (isRecord(branch) && !shape(value, branch, legacyColumns, root))
        return false;
    }
  }
  if (typeof rule.$ref === "string")
    return shape(
      value,
      (root.$defs as Record<string, Record<string, unknown>>)[
        rule.$ref.slice(8)
      ] ?? {},
      legacyColumns,
      root,
    );
  if (Array.isArray(rule.anyOf))
    return rule.anyOf.some((r) => shape(value, r, legacyColumns, root));
  if ("const" in rule && value !== rule.const) return false;
  if (Array.isArray(rule.enum) && !rule.enum.includes(value)) return false;
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    if (
      !types.some((t) =>
        t === "null"
          ? value === null
          : t === "array"
            ? Array.isArray(value)
            : t === "object"
              ? isRecord(value)
              : t === "integer"
                ? typeof value === "number" && Number.isInteger(value)
                : typeof value === t,
      )
    )
      return false;
  }
  if (
    typeof value === "number" &&
    ((typeof rule.minimum === "number" && value < rule.minimum) ||
      (typeof rule.maximum === "number" && value > rule.maximum))
  )
    return false;
  if (
    typeof value === "string" &&
    typeof rule.minLength === "number" &&
    value.length < rule.minLength
  )
    return false;
  if (Array.isArray(value)) {
    if (
      (typeof rule.minItems === "number" && value.length < rule.minItems) ||
      (typeof rule.maxItems === "number" && value.length > rule.maxItems)
    )
      return false;
    return value.every((v, i) => {
      const r = Array.isArray(rule.prefixItems)
        ? rule.prefixItems[i]
        : undefined;
      return shape(
        v,
        (r ?? rule.items ?? {}) as Record<string, unknown>,
        legacyColumns,
        root,
      );
    });
  }
  if (isRecord(value)) {
    if (
      Array.isArray(rule.required) &&
      rule.required.some(
        (k) => typeof k === "string" && !Object.hasOwn(value, k),
      )
    )
      return false;
    const props = isRecord(rule.properties) ? rule.properties : {};
    return Object.entries(value).every(([k, v]) =>
      Object.hasOwn(props, k)
        ? shape(v, props[k] as Record<string, unknown>, legacyColumns, root)
        : rule.additionalProperties === false
          ? false
          : isRecord(rule.additionalProperties)
            ? shape(v, rule.additionalProperties, legacyColumns, root)
            : true,
    );
  }
  return true;
}
