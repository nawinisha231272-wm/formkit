import { inspectJson, isSafeKey } from "@ourform/schema";
import type { ComponentNode } from "@ourform/schema";
import type { ComponentModel, ComponentSlot } from "./model";
import { snapshot } from "./paths";

const children: readonly ComponentSlot[] = Object.freeze([
  Object.freeze({
    name: "children",
    label: "Contents",
    accepts: Object.freeze(["field", "layout", "composite"]),
  }),
]);
const emptySlots: readonly ComponentSlot[] = Object.freeze([]);
/** Resolve pure, registered slot metadata. No defaults are written into the wire definition. */
export function resolveSlots<T>(
  model: ComponentModel<T>,
  node: Readonly<ComponentNode>,
): readonly ComponentSlot[] {
  const source = model.slots;
  if (source === undefined)
    return model.kind === "layout" ? children : emptySlots;
  const slots = typeof source === "function" ? source(node) : source;
  if (!Array.isArray(slots) || slots.length > 64 || inspectJson(slots).length)
    throw new Error("Slots must be bounded JSON with at most 64 descriptors.");
  const names = new Set<string>();
  for (const slot of slots) {
    if (
      !slot ||
      typeof slot !== "object" ||
      typeof slot.name !== "string" ||
      !isSafeKey(slot.name) ||
      names.has(slot.name) ||
      typeof slot.label !== "string" ||
      !slot.label.trim() ||
      (slot.labelKey !== undefined &&
        (typeof slot.labelKey !== "string" || !slot.labelKey.trim())) ||
      !Array.isArray(slot.accepts) ||
      slot.accepts.some(
        (kind: unknown) => typeof kind !== "string" || !kind.trim(),
      ) ||
      (slot.max !== undefined &&
        (!Number.isSafeInteger(slot.max) || slot.max < 0))
    )
      throw new Error(
        "Slots need unique safe names, labels, accepted kinds/types and nonnegative integer capacities.",
      );
    names.add(slot.name);
  }
  return snapshot(slots);
}
