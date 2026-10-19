import { inspectJson, isRecord, isSafeKey } from "./json";
import type { ComponentNode } from "./types";
export const emailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
export type JSONSchema = Record<string, unknown>;
/** Structural input avoids a schema → core dependency. CompiledForm satisfies this contract. */
export interface SubmissionSchemaSource {
  definition: { id: string; title?: string };
  nodes: readonly {
    node: ComponentNode;
    path: readonly (string | { row: string })[];
    parentId?: string;
    model: {
      dataScope?: string;
      validators?: readonly string[];
      properties?: Record<string, { default?: unknown }>;
      value?: {
        empty(): unknown;
        serialize?(value: unknown): unknown;
        jsonSchema?(config: unknown): object;
      };
    };
  }[];
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function toSubmissionSchema(form: SubmissionSchemaSource): JSONSchema {
  const root: JSONSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {},
    additionalProperties: false,
  };
  if (form.definition.title) root.title = form.definition.title;
  const byId = new Map(form.nodes.map((entry) => [entry.node.id, entry]));
  for (const entry of form.nodes) {
    if (!entry.model.value && entry.model.dataScope !== "object") continue;
    if (entry.path.some((part) => typeof part !== "string"))
      throw new Error("Row schemas require M10.");
    if (entry.path.some((key) => typeof key === "string" && !isSafeKey(key)))
      throw new Error("Unsafe schema path.");
    const ancestors = [entry];
    for (
      let parent = entry.parentId;
      parent;
      parent = byId.get(parent)?.parentId
    )
      ancestors.push(byId.get(parent)!);
    const conditions = ancestors
      .filter((e) => e.node.visibleWhen !== undefined)
      .map((e) => ({
        componentId: e.node.id,
        visibleWhen: e.node.visibleWhen,
      }));
    const config = Object.fromEntries(
      Object.entries(entry.model.properties ?? {}).map(([key, p]) => [
        key,
        Object.hasOwn(entry.node.properties ?? {}, key)
          ? entry.node.properties![key]
          : p.default,
      ]),
    );
    const adapter = entry.model.value;
    const hint = adapter
      ? (adapter.jsonSchema?.(config) ?? {
          "x-ourform-adapter": entry.node.type,
        })
      : { type: "object", properties: {}, additionalProperties: false };
    if (!isRecord(hint) || inspectJson(hint).length)
      throw new Error("ValueAdapter.jsonSchema must return safe JSON.");
    let field: JSONSchema = clone(hint);
    if (adapter) {
      const rules = entry.node.validation ?? {};
      const constraints: JSONSchema = {};
      for (const key of [
        "minLength",
        "maxLength",
        "pattern",
        "minItems",
        "maxItems",
      ] as const)
        if (rules[key] !== undefined) constraints[key] = rules[key];
      if (rules.min !== undefined) constraints.minimum = rules.min;
      if (rules.max !== undefined) constraints.maximum = rules.max;
      if (entry.model.validators?.includes("email"))
        constraints.allOf = [{ pattern: emailPattern }];
      if (entry.model.validators?.includes("options"))
        constraints.enum = (config.options as { value: string }[]).map(
          (option) => option.value,
        );
      const empty = adapter.serialize
        ? adapter.serialize(adapter.empty())
        : adapter.empty();
      if (inspectJson(empty).length)
        throw new Error("Serialized empty value must be safe JSON.");
      const emptySchema =
        typeof empty === "string" && empty.trim() === ""
          ? { type: "string", pattern: "^\\s*$" }
          : { const: empty };
      const nonempty: JSONSchema = {
        allOf: [field, constraints, { not: emptySchema }],
      };
      field = conditions.length
        ? { ...field, "x-ourform-validation": rules }
        : rules.required
          ? nonempty
          : { anyOf: [emptySchema, nonempty] };
      if (
        rules.custom?.length ||
        entry.model.validators?.some((v) => !["email", "options"].includes(v))
      )
        field["x-ourform-validators"] = {
          custom: rules.custom ?? [],
          model: entry.model.validators ?? [],
        };
      if (entry.node.calculate)
        field["x-ourform-calculate"] = entry.node.calculate;
      if (entry.node.disabledWhen !== undefined)
        field["x-ourform-disabledWhen"] = entry.node.disabledWhen;
    }
    if (conditions.length) field["x-ourform-visibility"] = conditions;
    if (entry.node.label) field.title = entry.node.label;
    let target = root;
    const path = entry.path as readonly string[];
    for (const [index, key] of path.entries()) {
      const properties = target.properties as Record<string, JSONSchema>;
      if (index === path.length - 1) properties[key] = field;
      else
        properties[key] ??= {
          type: "object",
          properties: {},
          additionalProperties: false,
        };
      if (entry.node.validation?.required && !conditions.length) {
        const required = (target.required ??= []) as string[];
        if (!required.includes(key)) required.push(key);
      }
      target = properties[key]!;
    }
  }
  return clone(root);
}
