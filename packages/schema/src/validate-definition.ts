import { componentChildren } from "./children";
import { migrateColumns } from "./migrate-columns";
import { shape } from "./shape";
import { validateProperties } from "./properties";
import schema from "./form-structure.schema.json";
import { inspectJson, isRecord, isSafeKey } from "./json";
import type {
  ComponentNode,
  DefinitionRegistry,
  Diagnostic,
  FormDefinition,
} from "./types";
export function validateUsing(
  input: unknown,
  registry?: DefinitionRegistry,
  root: Record<string, unknown> = schema,
): Diagnostic[] {
  const diagnostics = inspectJson(input);
  if (diagnostics.length) return diagnostics;
  if (!shape(input, root, false, root))
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
      if (node.columns) {
        if (node.columns.reduce((sum, column) => sum + column.width, 0) !== 12)
          error("invalid-columns", "Column widths must sum to 12.", node.id);
        if (
          node.columns.some((column) =>
            column.components.some((child) => child.slot !== undefined),
          )
        )
          error(
            "invalid-slot",
            "Column membership determines placement; omit child.slot.",
            node.id,
          );
      }
      if (componentChildren(node).length)
        visit(
          componentChildren(node),
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
export function validateStructure(
  input: unknown,
  registry?: DefinitionRegistry,
): Diagnostic[] {
  try {
    return validateUsing(input, registry);
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
export function migrateUsing(
  input: unknown,
  validate: typeof validateStructure,
): {
  definition: FormDefinition;
  applied: string[];
  diagnostics: Diagnostic[];
} {
  try {
    const diagnostics = inspectJson(input);
    if (diagnostics.length)
      return { definition: input as FormDefinition, applied: [], diagnostics };
    if (!shape(input, schema, true))
      return {
        definition: input as FormDefinition,
        applied: [],
        diagnostics: [
          {
            severity: "error",
            code: "invalid-definition",
            message: "Definition does not match version 1.0 shape.",
          },
        ],
      };
    const migrated = migrateColumns(input as FormDefinition);
    return {
      ...migrated,
      diagnostics: validate(migrated.definition),
    };
  } catch {
    return {
      definition: input as FormDefinition,
      applied: [],
      diagnostics: [
        {
          severity: "error",
          code: "invalid-definition",
          message: "Unable to migrate definition safely.",
        },
      ],
    };
  }
}

/** Component/legacy validation only; the engine checks its root logic capability separately. */
export const migrateStructure = (input: unknown) =>
  migrateUsing(input, validateStructure);
