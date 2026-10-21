import { isSafeKey } from "@ourform/schema";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import { resolveSlots } from "@ourform/core";
import type { Engine, ComponentSlot } from "@ourform/core";

export interface DropTarget {
  readonly parentId?: string;
  readonly slot?: string;
  readonly index?: number;
}
export function locate(definition: FormDefinition, id: string) {
  function walk(
    nodes: ComponentNode[],
    path: string,
    parentId?: string,
  ):
    | {
        node: ComponentNode;
        nodes: ComponentNode[];
        index: number;
        path: string;
        parentId?: string;
      }
    | undefined {
    for (const [index, node] of nodes.entries()) {
      const pointer = `${path}/${index}`;
      if (node.id === id)
        return {
          node,
          nodes,
          index,
          path: pointer,
          ...(parentId === undefined ? {} : { parentId }),
        };
      const found =
        node.components &&
        walk(node.components, `${pointer}/components`, node.id);
      if (found) return found;
    }
    return undefined;
  }
  return walk(definition.components, "/components");
}
export function entries(definition: FormDefinition, engine: Engine) {
  const result: { node: ComponentNode; scope: string; path: string[] }[] = [];
  function visit(nodes: ComponentNode[], scope: string, path: string[]) {
    for (const node of nodes) {
      const next = node.key ? [...path, node.key] : path;
      result.push({ node, scope, path: next });
      const object = ["object", "array"].includes(
        engine.getField(node.type)?.dataScope ?? "none",
      );
      visit(
        node.components ?? [],
        object ? node.id : scope,
        object ? next : path,
      );
    }
  }
  visit(definition.components, "", []);
  return result;
}
export function newId(
  definition: FormDefinition,
  reserved?: ReadonlySet<string>,
): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = `cmp_${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
    if (!locate(definition, id) && !reserved?.has(id)) return id;
  }
  throw new Error("Unable to allocate a unique component id.");
}
export function uniqueKey(
  definition: FormDefinition,
  engine: Engine,
  stem: string,
  scope: string,
  excluding: ReadonlySet<string> = new Set(),
): string {
  const keys = new Set(
    entries(definition, engine)
      .filter((entry) => entry.scope === scope && !excluding.has(entry.node.id))
      .map((entry) => entry.node.key),
  );
  let key = stem;
  for (let suffix = 2; keys.has(key); suffix++) key = `${stem}_${suffix}`;
  return key;
}
export function destinationScope(
  definition: FormDefinition,
  engine: Engine,
  parentId?: string,
): string {
  const entry = entries(definition, engine).find((e) => e.node.id === parentId);
  return entry
    ? ["object", "array"].includes(
        engine.getField(entry.node.type)?.dataScope ?? "none",
      )
      ? entry.node.id
      : entry.scope
    : "";
}
export function createNode(
  definition: FormDefinition,
  engine: Engine,
  type: string,
  parentId?: string,
): ComponentNode {
  const model = engine.getField(type)!;
  const title = model.builder?.title ?? model.title;
  const node: ComponentNode = { id: newId(definition), type, label: title };
  if (
    model.value ||
    model.dataScope === "object" ||
    model.dataScope === "array"
  ) {
    const slug = title
      .replace(/[^A-Za-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^[^A-Za-z_]/, "_$&")
      .toLowerCase();
    node.key = uniqueKey(
      definition,
      engine,
      isSafeKey(slug) ? slug : "field",
      destinationScope(definition, engine, parentId),
    );
  }
  return node;
}
export function destination(
  definition: FormDefinition,
  engine: Engine,
  target: DropTarget,
) {
  if (target.parentId === undefined) {
    if (target.slot !== undefined)
      throw new Error("The form root has no named parent slot.");
    return {
      nodes: definition.components,
      path: "/components",
      slot: {
        name: "children",
        label: "Form",
        accepts: ["field", "layout", "composite"],
      } as ComponentSlot,
      first: "children",
      parent: undefined,
    };
  }
  const parent = locate(definition, target.parentId);
  if (!parent) throw new Error(`Unknown parent component: ${target.parentId}`);
  const model = engine.getField(parent.node.type)!;
  if (model.kind === "composite")
    throw new Error("Fixed composite children cannot be edited.");
  const slots = resolveSlots(model, parent.node);
  const name = target.slot ?? slots[0]?.name;
  const slot = slots.find((s) => s.name === name);
  if (!slot)
    throw new Error(
      `No editable slot '${name ?? "(none)"}' in ${parent.node.label ?? parent.node.type}.`,
    );
  return {
    nodes: parent.node.components ?? [],
    path: `${parent.path}/components`,
    slot,
    first: slots[0]!.name,
    parent,
  };
}
/** Pure preflight shared by pointer indicators, keyboard operations and structural commands. */
export function checkDrop(
  engine: Engine,
  definition: FormDefinition,
  type: string,
  target: DropTarget,
  movingId?: string,
): Diagnostic[] {
  const fail = (code: string, message: string): Diagnostic[] => [
    { severity: "error", code, message },
  ];
  const model = engine.getField(type);
  if (!model) return fail("unknown-type", `Unknown component type: ${type}`);
  if (target.parentId !== undefined && model.builder?.rootOnly)
    return fail(
      "root-only",
      "This component can only be placed at the form root.",
    );
  if (movingId) {
    const moving = locate(definition, movingId);
    if (!moving)
      return fail("builder-command", `Unknown component: ${movingId}`);
    function contains(node: ComponentNode): boolean {
      return (
        node.id === target.parentId || (node.components ?? []).some(contains)
      );
    }
    if (contains(moving.node))
      return fail(
        "drop-cycle",
        "A component cannot be dropped into itself or a descendant.",
      );
  }
  try {
    const to = destination(definition, engine, target);
    if (
      !to.slot.accepts.includes(model.kind ?? "field") &&
      !to.slot.accepts.includes(type)
    )
      return fail(
        "slot-accepts",
        `Slot '${to.slot.label}' does not accept ${model.title}.`,
      );
    const count = to.nodes.filter(
      (n) => (n.slot ?? to.first) === to.slot.name && n.id !== movingId,
    ).length;
    if (to.slot.max !== undefined && count >= to.slot.max)
      return fail(
        "slot-capacity",
        `Slot '${to.slot.label}' accepts at most ${to.slot.max} children.`,
      );
    if (
      target.index !== undefined &&
      (!Number.isInteger(target.index) ||
        target.index < 0 ||
        target.index > count)
    )
      return fail(
        "builder-command",
        "Invalid insertion index within the selected slot.",
      );
    return [];
  } catch (cause) {
    return fail(
      "invalid-slot",
      cause instanceof Error ? cause.message : "Invalid destination slot.",
    );
  }
}
export function insertNode(
  definition: FormDefinition,
  engine: Engine,
  node: ComponentNode,
  target: DropTarget,
) {
  const to = destination(definition, engine, target);
  const created = !!to.parent && !to.parent.node.components;
  const nodes = to.parent
    ? (to.parent.node.components ??= [])
    : definition.components;
  const indices = nodes.flatMap((n, index) =>
    (n.slot ?? to.first) === to.slot.name ? [index] : [],
  );
  const ordinal = target.index ?? indices.length;
  const index =
    indices[ordinal] ?? (indices.length ? indices.at(-1)! + 1 : nodes.length);
  if (to.parent && to.slot.name !== to.first) node.slot = to.slot.name;
  else delete node.slot;
  nodes.splice(index, 0, node);
  return { path: `${to.path}/${index}`, arrayPath: to.path, created, nodes };
}
