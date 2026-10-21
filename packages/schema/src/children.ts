import type { ComponentNode } from "./types";

/** Child collections retain their real wire path; returned arrays are not copies. */
export function childCollections(node: Readonly<ComponentNode>): {
  components: ComponentNode[];
  path: string;
  slot?: string;
}[] {
  if (node.columns)
    return node.columns.map((column, index) => ({
      components: column.components,
      path: `columns/${index}/components`,
      slot: `column_${index}`,
    }));
  return node.components
    ? [{ components: node.components, path: "components" }]
    : [];
}
/** Traverse both ordinary layouts and column collections in wire reading order. */
export function componentChildren(
  node: Readonly<ComponentNode>,
): ComponentNode[] {
  return childCollections(node).flatMap((group) => group.components);
}
/** Effective placement; column membership has no redundant child.slot on the wire. */
export function childSlot(
  parent: Readonly<ComponentNode>,
  child: Readonly<ComponentNode>,
): string | undefined {
  if (parent.columns) {
    const index = parent.columns.findIndex((column) =>
      column.components.some((node) => node.id === child.id),
    );
    return index < 0 ? undefined : `column_${index}`;
  }
  return child.slot;
}
