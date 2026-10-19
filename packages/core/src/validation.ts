import type { CompiledNode, FieldError } from "./types";
export function validateValue(
  entry: CompiledNode,
  value: unknown,
): FieldError[] {
  const rules = entry.node.validation;
  const adapter = entry.model.value;
  if (!rules || !adapter) return [];
  const errors: FieldError[] = [];
  const add = (code: string, params?: Record<string, unknown>) =>
    errors.push({
      code,
      messageKey: `of.validation.${code}`,
      ...(params ? { params } : {}),
    });
  if (adapter.isEmpty(value)) {
    if (rules.required) add("required");
    return errors;
  }
  if (typeof value === "string") {
    if (
      rules.minLength !== undefined &&
      Array.from(value).length < rules.minLength
    )
      add("minLength", { min: rules.minLength });
    if (
      rules.maxLength !== undefined &&
      Array.from(value).length > rules.maxLength
    )
      add("maxLength", { max: rules.maxLength });
    if (entry.pattern && !entry.pattern.test(value))
      add("pattern", { pattern: rules.pattern });
  }
  if (typeof value === "number") {
    if (rules.min !== undefined && value < rules.min)
      add("min", { min: rules.min });
    if (rules.max !== undefined && value > rules.max)
      add("max", { max: rules.max });
  }
  if (Array.isArray(value)) {
    if (rules.minItems !== undefined && value.length < rules.minItems)
      add("minItems", { min: rules.minItems });
    if (rules.maxItems !== undefined && value.length > rules.maxItems)
      add("maxItems", { max: rules.maxItems });
  }
  return errors;
}
