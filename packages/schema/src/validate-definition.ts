import { shape } from "./shape";
import { validateProperties } from "./properties";
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
        ...(node.validation?.custom ?? []).flatMap((rule) =>
          Object.values(rule.args ?? {}),
        ),
      ])
        if (expr !== undefined) expressions(expr, node.id);
      if (registry && model)
        diagnostics.push(
          ...validateProperties(
            model.properties ?? {},
            node.properties ?? {},
          ).map((d) => ({ ...d, componentId: node.id })),
        );
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
