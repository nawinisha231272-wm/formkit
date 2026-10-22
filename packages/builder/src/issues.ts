import { componentChildren } from "@ourform/schema";
import type {
  FormDefinition,
  Diagnostic,
  ComponentNode,
} from "@ourform/schema";
import { componentTitle } from "./types";
import type { UI } from "./types";
/** Authoring warnings share one count between the header and the Issues panel. */
export function builderIssues(
  ui: Pick<UI, "engine" | "t">,
  definition: FormDefinition,
): Diagnostic[] {
  const diagnostics = [...ui.engine.compile(definition).diagnostics];
  const visit = (nodes: ComponentNode[]) => {
    for (const node of nodes) {
      if (["select", "radio"].includes(node.type)) {
        const options =
          node.properties?.options ??
          ui.engine.getField(node.type)?.properties?.options?.default;
        if (Array.isArray(options) && options.length === 0)
          diagnostics.push({
            severity: "warning",
            code: "empty-options",
            componentId: node.id,
            message: ui.t("ofb.emptyOptions", {
              label: componentTitle(ui, node),
            }),
          });
      }
      visit(componentChildren(node));
    }
  };
  visit(definition.components);
  return diagnostics;
}
