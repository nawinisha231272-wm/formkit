import type { ComponentNode } from "@ourform/schema";
import type { ComponentModel, PropertyDefinition } from "@ourform/core";
import { compileExpression } from "@ourform/core";

export interface PanelProperty {
  key: string;
  kind: PropertyDefinition["kind"];
  label: string;
  group: string;
  value: unknown;
  visible: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  editor?: string;
}
export interface PropertyPanelModel {
  componentId: string;
  groups: { name: string; properties: PanelProperty[] }[];
}
const base: [string, PropertyDefinition["kind"], string][] = [
  ["label", "string", "Display"],
  ["labelKey", "string", "Display"],
  ["description", "string", "Display"],
  ["placeholder", "string", "Display"],
  ["tooltip", "string", "Display"],
  ["prefix", "string", "Display"],
  ["suffix", "string", "Display"],
  ["disabled", "boolean", "Display"],
  ["readOnly", "boolean", "Display"],
  ["hidden", "boolean", "Display"],
  ["key", "string", "Data"],
  ["defaultValue", "json", "Data"],
  ["clearOnHide", "boolean", "Data"],
  ["validation.required", "boolean", "Validation"],
  ["visibleWhen", "expr", "Conditional"],
  ["disabledWhen", "expr", "Conditional"],
  ["calculate.expr", "expr", "Logic"],
  ["calculate.allowOverride", "boolean", "Logic"],
  ["layout.width", "number", "Layout"],
  ["ariaLabel", "string", "Accessibility"],
];
export function propertyValue(node: ComponentNode, key: string): unknown {
  if (key === "hidden") return node.visibleWhen === false;
  if (key === "clearOnHide") return node.clearOnHide ?? true;
  return key
    .split(".")
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === "object" && Object.hasOwn(value, part)
          ? (value as Record<string, unknown>)[part]
          : undefined,
      node,
    );
}
export function createPropertyPanel(
  node: ComponentNode,
  model: ComponentModel,
): PropertyPanelModel {
  const groups: PropertyPanelModel["groups"] = [];
  const append = (entry: PanelProperty) => {
    let group = groups.find((g) => g.name === entry.group);
    if (!group) groups.push((group = { name: entry.group, properties: [] }));
    group.properties.push(entry);
  };
  const config = Object.fromEntries(
    Object.entries(model.properties ?? {}).map(([key, p]) => [
      key,
      Object.hasOwn(node.properties ?? {}, key)
        ? node.properties![key]
        : p.default,
    ]),
  );
  const value = model.value?.empty();
  const schemaType = (
    model.value?.jsonSchema?.(config) as { type?: unknown } | undefined
  )?.type;
  const rules =
    typeof value === "string"
      ? ["minLength", "maxLength", "pattern"]
      : typeof value === "number" ||
          (value === null &&
            (schemaType === "number" ||
              (Array.isArray(schemaType) && schemaType.includes("number"))))
        ? ["min", "max"]
        : Array.isArray(value)
          ? ["minItems", "maxItems"]
          : [];
  for (const [key, kind, group] of base) {
    if (
      (!model.value &&
        [
          "prefix",
          "suffix",
          "defaultValue",
          "validation.required",
          "calculate.expr",
          "calculate.allowOverride",
        ].includes(key)) ||
      (key === "key" && !model.value && model.dataScope !== "object")
    )
      continue;
    append({
      key,
      kind,
      label: `of.builder.${key}`,
      group,
      value: propertyValue(node, key),
      visible:
        key !== "calculate.allowOverride" || node.calculate?.expr !== undefined,
      ...(key === "layout.width" ? { min: 1, max: 12 } : {}),
    });
    if (key === "validation.required")
      for (const rule of rules)
        append({
          key: `validation.${rule}`,
          kind: rule === "pattern" ? "string" : "number",
          label: `of.builder.validation.${rule}`,
          group,
          value: propertyValue(node, `validation.${rule}`),
          visible: true,
          ...(rule.endsWith("Length") || rule.endsWith("Items")
            ? { min: 0 }
            : {}),
        });
  }
  for (const [key, p] of Object.entries(model.properties ?? {})) {
    const visible =
      p.visibleWhen === undefined ||
      !!compileExpression(p.visibleWhen, {
        byRef: () => [],
        byPath: () => [],
      }).expression?.evaluate({
        getRef: (id) => config[id],
        getPath: (path) =>
          path.reduce<unknown>(
            (v, part) =>
              v && typeof v === "object"
                ? (v as Record<string, unknown>)[String(part)]
                : undefined,
            config,
          ),
        mode: "edit",
      });
    append({
      key: `properties.${key}`,
      kind: p.kind,
      label: p.label,
      group: p.group,
      value: config[key],
      visible,
      ...(p.options ? { options: p.options.map((o) => ({ ...o })) } : {}),
      ...(p.min === undefined ? {} : { min: p.min }),
      ...(p.max === undefined ? {} : { max: p.max }),
      ...(p.editor ? { editor: p.editor } : {}),
    });
  }
  return { componentId: node.id, groups };
}
