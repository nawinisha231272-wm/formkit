import { inspectJson, componentChildren, childSlot } from "@ourform/schema";
import type {
  ComponentNode,
  FormDefinition,
  Diagnostic,
} from "@ourform/schema";
import type { Engine } from "@ourform/core";
import { entries, locate, destinationScope } from "./structure";
import type { DropTarget } from "./structure";

export type LockLevel = "key" | "structure" | "all";
export type ComponentLocks =
  | Readonly<Record<string, LockLevel>>
  | readonly string[];
export interface LockOptions {
  locked?: ComponentLocks;
  readOnlyKeys?: readonly string[];
}
const rank: Record<LockLevel, number> = { key: 1, structure: 2, all: 3 };
/** Host configuration is snapshotted. An id/key collision takes the stronger lock. */
export function createLocks(options: LockOptions = {}) {
  if (inspectJson(options).length) throw new Error("Locks must be safe JSON.");
  const levels = new Map<string, LockLevel>();
  const add = (selector: unknown, level: unknown) => {
    if (
      typeof selector !== "string" ||
      !selector.trim() ||
      typeof level !== "string" ||
      !Object.hasOwn(rank, level)
    )
      throw new Error("Invalid component lock.");
    const checked = level as LockLevel;
    if (rank[checked] >= (rank[levels.get(selector)!] ?? 0))
      levels.set(selector, checked);
  };
  for (const selector of options.readOnlyKeys ?? []) add(selector, "structure");
  if (Array.isArray(options.locked))
    for (const selector of options.locked) add(selector, "structure");
  else
    for (const [selector, level] of Object.entries(options.locked ?? {}))
      add(selector, level);
  return (node: ComponentNode): LockLevel | undefined => {
    const byId = levels.get(node.id),
      byKey = node.key ? levels.get(node.key) : undefined;
    return (rank[byId!] ?? 0) >= (rank[byKey!] ?? 0) ? byId : byKey;
  };
}
type Locks = ReturnType<typeof createLocks>;
const refusal = (node: ComponentNode, action: string): Diagnostic => ({
  severity: "error",
  code: "locked-component",
  componentId: node.id,
  message: `Locked by your app: can't ${action} (${node.label ?? node.id}).`,
});
/** Include ancestor positions so moving a frozen subtree cannot bypass an all lock. */
function placement(
  definition: FormDefinition,
  id: string,
  common: ReadonlySet<string>,
): unknown[] {
  const result: unknown[] = [];
  let found = locate(definition, id);
  while (found) {
    const parent = found.parentId
      ? locate(definition, found.parentId)?.node
      : undefined;
    const slot = parent
      ? (childSlot(parent, found.node) ?? found.node.slot)
      : undefined;
    const siblings = found.nodes.filter(
      (node) =>
        common.has(node.id) &&
        (!parent || (childSlot(parent, node) ?? node.slot) === slot),
    );
    result.push([
      found.parentId,
      slot,
      siblings.findIndex((node) => node.id === found!.node.id),
    ]);
    found = found.parentId ? locate(definition, found.parentId) : undefined;
  }
  return result;
}
/** Central comparison also covers arbitrary commands, ancestor edits and JSON imports. */
export function checkLocks(
  before: FormDefinition,
  after: FormDefinition,
  engine: Engine,
  locks: Locks,
): Diagnostic[] {
  const previous = entries(before, engine),
    next = new Map(
      entries(after, engine).map((entry) => [entry.node.id, entry]),
    );
  const common = new Set(
    previous
      .filter((entry) => next.has(entry.node.id))
      .map((entry) => entry.node.id),
  );
  const diagnostics: Diagnostic[] = [];
  for (const entry of previous) {
    const level = locks(entry.node);
    if (!level) continue;
    const current = next.get(entry.node.id);
    let action: string | undefined;
    if (!current) action = "delete";
    else if (entry.node.key !== current.node.key)
      action = "change the data key";
    else if (level !== "key" && entry.node.type !== current.node.type)
      action = "change the component type";
    else if (level !== "key" && entry.scope !== current.scope)
      action = "move to a different data scope";
    else if (
      level === "all" &&
      JSON.stringify(entry.node) !== JSON.stringify(current.node)
    )
      action = "edit this component";
    else if (
      level === "all" &&
      JSON.stringify(placement(before, entry.node.id, common)) !==
        JSON.stringify(placement(after, entry.node.id, common))
    )
      action = "move this component";
    // key-only locks do not prevent deletion: there is no surviving key to rename.
    if (action && !(level === "key" && !current))
      diagnostics.push(refusal(entry.node, action));
  }
  return diagnostics;
}
export function lockedDrop(
  definition: FormDefinition,
  engine: Engine,
  locks: Locks,
  target: DropTarget,
  movingId?: string,
): Diagnostic[] {
  let parent = target.parentId
    ? locate(definition, target.parentId)
    : undefined;
  while (parent) {
    if (locks(parent.node) === "all")
      return [refusal(parent.node, "edit this component")];
    parent = parent.parentId ? locate(definition, parent.parentId) : undefined;
  }
  if (!movingId) return [];
  const source = locate(definition, movingId)?.node;
  if (!source) return [];
  const sourceEntries = entries(definition, engine);
  const toScope = destinationScope(definition, engine, target.parentId);
  const originalScope = sourceEntries.find(
    (entry) => entry.node.id === movingId,
  )?.scope;
  const visit = (node: ComponentNode, scopeChanges: boolean): Diagnostic[] => {
    const level = locks(node);
    if (level === "all") return [refusal(node, "move this component")];
    if (level === "structure" && scopeChanges)
      return [refusal(node, "move to a different data scope")];
    const childrenChange =
      scopeChanges &&
      (engine.getField(node.type)?.dataScope ?? "none") === "none";
    return componentChildren(node).flatMap((child) =>
      visit(child, childrenChange),
    );
  };
  return visit(source, originalScope !== toScope);
}
