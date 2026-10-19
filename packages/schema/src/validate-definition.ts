import schema from "./form-definition.schema.json";
import { inspectJson, isRecord, isSafeKey } from "./json";
import type {
  ComponentNode,
  DefinitionRegistry,
  Diagnostic,
  FormDefinition,
} from "./types";
function freezeSchema(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeSchema(child);
    Object.freeze(value);
  }
}
freezeSchema(schema);
export const formDefinitionSchema = schema;
function shape(value: unknown, rule: Record<string, unknown>): boolean {
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
function validateDefinitionInternal(
  input: unknown,
  registry?: DefinitionRegistry,
): Diagnostic[] {
  const diagnostics = inspectJson(input);
  if (diagnostics.length) return diagnostics;
  if (!shape(input, schema))
    return [
      {
        severity: "error",
        code: "invalid-definition",
        message: "Definition does not match version 1.0 shape.",
      },
    ];
  const def = input as FormDefinition;
  const ids = new Set<string>();
  const refs: { ref: string; componentId: string }[] = [];
  const error = (code: string, message: string, id?: string) =>
    diagnostics.push({
      severity: "error",
      code,
      message,
      ...(id === undefined ? {} : { componentId: id }),
    });
  function expressions(v: unknown, id: string): void {
    if (Array.isArray(v)) {
      for (const child of v) expressions(child, id);
    } else if (isRecord(v)) {
      if (typeof v.ref === "string") refs.push({ ref: v.ref, componentId: id });
      else for (const child of Object.values(v)) expressions(child, id);
    }
  }
  function visit(
    nodes: ComponentNode[],
    keys: Set<string>,
    depth: number,
  ): void {
    if (depth > 64) {
      error("definition-limit", "Component depth exceeds 64.");
      return;
    }
    for (const node of nodes) {
      if (!node.id || !node.type)
        error(
          "invalid-definition",
          "Components require stable id and type.",
          node.id,
        );
      if (ids.has(node.id))
        error("duplicate-id", `Duplicate component id: ${node.id}`, node.id);
      ids.add(node.id);
      const model = registry?.get(node.type);
      if (registry && !model)
        error("unknown-type", `Unknown component type: ${node.type}`, node.id);
      if (model?.value && !node.key)
        error(
          "missing-key",
          "A value-producing component requires a key.",
          node.id,
        );
      if (node.key !== undefined) {
        if (!isSafeKey(node.key))
          error("unsafe-key", `Invalid or reserved key: ${node.key}`, node.id);
        if (keys.has(node.key))
          error(
            "duplicate-key",
            `Duplicate key in data scope: ${node.key}`,
            node.id,
          );
        keys.add(node.key);
      }
      if (node.validation?.pattern !== undefined)
        try {
          new RegExp(node.validation.pattern, "u");
        } catch {
          error(
            "invalid-pattern",
            "Pattern must be a valid Unicode regular expression.",
            node.id,
          );
        }
      for (const expr of [
        node.visibleWhen,
        node.disabledWhen,
        node.calculate?.expr,
      ])
        if (expr !== undefined) expressions(expr, node.id);
      for (const [key, value] of Object.entries(node.properties ?? {})) {
        const property = model?.properties?.[key];
        if (!registry) continue;
        if (
          !property ||
          (property.kind === "number"
            ? typeof value !== "number" ||
              (property.min !== undefined && value < property.min) ||
              (property.max !== undefined && value > property.max)
            : property.kind === "string" || property.kind === "boolean"
              ? typeof value !== property.kind
              : false)
        )
          error("invalid-property", `Invalid property: ${key}`, node.id);
      }
      if (node.components)
        visit(
          node.components,
          !registry ||
            model?.dataScope === "object" ||
            model?.dataScope === "array"
            ? new Set()
            : keys,
          depth + 1,
        );
    }
  }
  visit(def.components, new Set(), 0);
  for (const { ref, componentId } of refs)
    if (!ids.has(ref))
      error("bad-ref", `Unknown component reference: ${ref}`, componentId);
  return diagnostics;
}
export function validateDefinition(
  input: unknown,
  registry?: DefinitionRegistry,
): Diagnostic[] {
  try {
    return validateDefinitionInternal(input, registry);
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
export function migrate(input: unknown): {
  definition: FormDefinition;
  applied: string[];
  diagnostics: Diagnostic[];
} {
  const diagnostics = validateDefinition(input);
  return { definition: input as FormDefinition, applied: [], diagnostics };
}
