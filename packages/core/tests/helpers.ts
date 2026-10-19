import {
  createEngine,
  type ComponentModel,
  type Engine,
  type FormSession,
} from "../src/index";
import type { ComponentNode, FormDefinition } from "@ourform/schema";
export const text: ComponentModel<string> = {
  type: "text",
  title: "Text",
  value: {
    empty: () => "",
    normalize: (v) => String(v ?? ""),
    isEmpty: (v) => v.trim() === "",
  },
};
export const number: ComponentModel<number | null> = {
  type: "number",
  title: "Number",
  value: {
    empty: () => null,
    normalize: (v) => (typeof v === "number" && Number.isFinite(v) ? v : null),
    isEmpty: (v) => v === null,
  },
};
export const container: ComponentModel = {
  type: "container",
  title: "Container",
  kind: "layout",
  dataScope: "object",
};
export const panel: ComponentModel = {
  type: "panel",
  title: "Panel",
  kind: "layout",
  dataScope: "none",
};
export function engine() {
  return createEngine()
    .register(text)
    .register(number)
    .register(container)
    .register(panel);
}
export function form(
  nodes: ComponentNode[],
  settings?: FormDefinition["settings"],
): FormDefinition {
  return {
    $formVersion: "1.0",
    id: "test",
    display: "form",
    components: nodes,
    ...(settings ? { settings } : {}),
  };
}
export function field(
  id = "name",
  extra: Partial<ComponentNode> = {},
): ComponentNode {
  return { id, key: id, type: "text", ...extra };
}
export function session(
  e: Engine,
  definition: unknown,
  data?: unknown,
): FormSession {
  const result = e.compile(definition);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return e.createSession(result.form, data === undefined ? {} : { data });
}
