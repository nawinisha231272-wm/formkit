import { inspectJson, validateDefinition } from "@ourform/schema";
import type { ComponentNode, Expr } from "@ourform/schema";
import type { RegisteredField } from "./native";

/** Declarative reusable children. Local ids and internal refs are namespaced per instance. */
export function defineComposite(spec: {
  type: string;
  title: string;
  components: readonly ComponentNode[];
  dataScope?: "none" | "object";
}): RegisteredField {
  if (!spec.type || inspectJson(spec.components).length)
    throw new Error("Composite components must be bounded safe JSON.");
  const template = JSON.parse(
    JSON.stringify(spec.components),
  ) as ComponentNode[];
  const diagnostics = validateDefinition({
    $formVersion: "1.0",
    id: spec.type,
    display: "form",
    components: template,
  }).filter((d) => d.code !== "bad-ref");
  if (diagnostics.length)
    throw new Error(diagnostics.map((d) => d.message).join("; "));
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  };
  freeze(template);
  return Object.freeze({
    model: Object.freeze({
      type: spec.type,
      title: spec.title,
      kind: "composite" as const,
      dataScope: spec.dataScope ?? "object",
      properties: Object.freeze({}),
      builder: Object.freeze({ title: spec.title, group: "Composites" }),
      expand(node: ComponentNode): ComponentNode[] {
        const ids = new Map<string, string>();
        const collect = (children: readonly ComponentNode[]): void => {
          for (const child of children) {
            ids.set(child.id, `${node.id}/${child.id}`);
            collect(child.components ?? []);
          }
        };
        collect(template);
        const refs = (value: unknown): unknown => {
          if (Array.isArray(value)) return value.map(refs);
          if (value && typeof value === "object")
            return Object.fromEntries(
              Object.entries(value).map(([key, child]) => [
                key,
                key === "ref" && typeof child === "string"
                  ? (ids.get(child) ?? child)
                  : refs(child),
              ]),
            );
          return value;
        };
        const expand = (children: readonly ComponentNode[]): ComponentNode[] =>
          children.map((child) => ({
            ...child,
            id: ids.get(child.id)!,
            ...(child.visibleWhen === undefined
              ? {}
              : { visibleWhen: refs(child.visibleWhen) as Expr }),
            ...(child.disabledWhen === undefined
              ? {}
              : { disabledWhen: refs(child.disabledWhen) as Expr }),
            ...(child.calculate === undefined
              ? {}
              : {
                  calculate: refs(child.calculate) as NonNullable<
                    ComponentNode["calculate"]
                  >,
                }),
            ...(child.validation === undefined
              ? {}
              : {
                  validation: refs(child.validation) as NonNullable<
                    ComponentNode["validation"]
                  >,
                }),
            ...(child.components
              ? { components: expand(child.components) }
              : {}),
          }));
        return expand(template);
      },
    }),
    views: Object.freeze({
      layout: Object.freeze({ tag: "fieldset" as const }),
    }),
  });
}
