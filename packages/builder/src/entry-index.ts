import { childSlot, componentChildren } from "@ourform/schema";
import type { ComponentNode, FormDefinition } from "@ourform/schema";
import { resolveSlots } from "@ourform/sdk";
import type { Engine } from "@ourform/core";

/** Shared document-order metadata for command planning, canvas targets and outline selection. */
export function indexEntries(definition: FormDefinition, engine: Engine) {
  const result: {
    node: ComponentNode;
    parent?: ComponentNode;
    slot: string;
    index: number;
    siblings: ComponentNode[];
    scope: string;
  }[] = [];
  const visit = (
    nodes: ComponentNode[],
    parent?: ComponentNode,
    scope = "",
  ) => {
    const first = parent
      ? resolveSlots(engine.getField(parent.type)!, parent)[0]?.name
      : "children";
    const slotOf = (node: ComponentNode) =>
      (parent ? childSlot(parent, node) : node.slot) ?? first ?? "children";
    const groups = new Map<
      string,
      { siblings: ComponentNode[]; index: number }
    >();
    for (const node of nodes) {
      const slot = slotOf(node);
      let group = groups.get(slot);
      if (!group)
        groups.set(
          slot,
          (group = {
            siblings: nodes.filter((node) => slotOf(node) === slot),
            index: 0,
          }),
        );
      result.push({
        node,
        ...(parent ? { parent } : {}),
        slot,
        index: group.index++,
        siblings: group.siblings,
        scope,
      });
      visit(
        componentChildren(node),
        node,
        ["object", "array"].includes(
          engine.getField(node.type)?.dataScope ?? "none",
        )
          ? node.id
          : scope,
      );
    }
  };
  visit(definition.components);
  return result;
}
