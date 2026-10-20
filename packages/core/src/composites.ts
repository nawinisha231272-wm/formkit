import { inspectJson, validateDefinition } from "@ourform/schema";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import type { ComponentModel } from "./model";
import { snapshot } from "./paths";

/** Expansion is trusted registered code, never a callback supplied by a wire definition. */
export function expandComposites(
  definition: FormDefinition,
  registry: { get(type: string): ComponentModel | undefined },
): { components: ComponentNode[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  let count = 0;
  const visit = (
    nodes: ComponentNode[],
    depth: number,
    stack: readonly string[],
  ): ComponentNode[] => {
    if (depth > 64) throw new Error("Composite depth exceeds 64.");
    return nodes.map((node) => {
      if (++count > 10000)
        throw new Error("Expanded component count exceeds 10000.");
      const model = registry.get(node.type);
      if (model?.kind !== "composite")
        return {
          ...node,
          ...(node.components
            ? { components: visit(node.components, depth + 1, stack) }
            : {}),
        };
      if (!model.expand) {
        diagnostics.push({
          severity: "error",
          code: "unsupported-component",
          componentId: node.id,
          message: `Composite ${node.type} has no registered expansion.`,
        });
        return node;
      }
      if (stack.includes(node.type))
        throw new Error(`Recursive composite expansion: ${node.type}`);
      if (node.components !== undefined)
        throw new Error(
          "Composite instances cannot override their registered children.",
        );
      const children = model.expand(snapshot(node));
      if (!Array.isArray(children) || inspectJson(children).length)
        throw new Error(
          "Composite expansion must return bounded safe JSON children.",
        );
      // Validate shape before recursion, so malformed callbacks never enter the traversal.
      const shapeErrors = validateDefinition({
        ...definition,
        components: children,
      }).filter((d) => d.code !== "bad-ref");
      if (shapeErrors.length) {
        diagnostics.push(...shapeErrors);
        return node;
      }
      return {
        ...node,
        components: visit(snapshot(children), depth + 1, [...stack, node.type]),
      };
    });
  };
  try {
    const components = visit(definition.components, 0, []);
    if (!diagnostics.length)
      diagnostics.push(
        ...validateDefinition({ ...definition, components }, registry),
      );
    return { components, diagnostics };
  } catch (error) {
    return {
      components: [],
      diagnostics: [
        {
          severity: "error",
          code: "invalid-composite",
          message:
            error instanceof Error
              ? error.message
              : "Composite expansion failed.",
        },
      ],
    };
  }
}
