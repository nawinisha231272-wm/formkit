import schema from "./form-definition.schema.json";
import { isRecord } from "./json";
export function shape(value: unknown, rule: Record<string, unknown>): boolean {
  if (typeof rule.$ref === "string")
    return shape(
      value,
      schema.$defs[rule.$ref.slice(8) as keyof typeof schema.$defs],
    );
  if (Array.isArray(rule.anyOf)) return rule.anyOf.some((r) => shape(value, r));
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
    if (typeof rule.minItems === "number" && value.length < rule.minItems)
      return false;
    return value.every((v, i) => {
      const r = Array.isArray(rule.prefixItems)
        ? rule.prefixItems[i]
        : undefined;
      return shape(v, (r ?? rule.items ?? {}) as Record<string, unknown>);
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
        ? shape(v, props[k] as Record<string, unknown>)
        : rule.additionalProperties === false
          ? false
          : isRecord(rule.additionalProperties)
            ? shape(v, rule.additionalProperties)
            : true,
    );
  }
  return true;
}
