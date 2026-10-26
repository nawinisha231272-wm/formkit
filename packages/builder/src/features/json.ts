import type { ComponentNode, Diagnostic } from "@ourform/schema";
import type { JsonPatchOp } from "@ourform/builder-core";
import type { UI } from "../types";

const message = (ui: UI, key: "ofb.invalidJson" | "ofb.readOnlyJson", params?: Record<string, unknown>) => {
  const translated = ui.t(key, params);
  if (translated !== key) return translated;
  return key === "ofb.readOnlyJson"
    ? "Locked by your app. This JSON is read-only."
    : `Enter valid JSON: ${String(params?.message ?? "")}`;
};

export function mountJsonPanel(host: HTMLElement, ui: UI, prefix: string,
  load: (value: unknown) => Diagnostic[], getPatch: () => readonly JsonPatchOp[],
  primitives: { element: typeof import("../types").element; button: typeof import("../types").button }) {
  const { element, button } = primitives;
  const json = element(ui.document, "textarea", "", "of-builder-json");
  json.dataset.builderPart = "json";
  json.id = `${prefix}builder-json`;
  json.setAttribute("aria-label", ui.t("of.builder.json"));
  json.spellcheck = false;
  let dirty = false;
  const reload = () => {
    dirty = false;
    json.value = JSON.stringify(ui.builder.getState().definition, null, 2);
  };
  json.addEventListener("input", () => { dirty = true; }, { signal: ui.signal });
  const apply = button(ui, ui.t("of.builder.applyJson"), () => {
    try {
      const diagnostics = load(JSON.parse(json.value));
      if (!diagnostics.some(d => d.severity === "error")) reload();
    } catch (cause) {
      ui.announce(ui.t("of.builder.invalidJson", {
        message: cause instanceof Error ? cause.message : "",
      }));
    }
  });
  const patch = element(ui.document, "pre", "", "of-builder-patch");
  patch.dataset.builderPart = "patch";
  patch.id = `${prefix}builder-patch`;
  patch.tabIndex = 0;
  patch.setAttribute("role", "region");
  patch.setAttribute("aria-label", ui.t("of.builder.patch"));
  host.append(json, apply, button(ui, ui.t("of.builder.reloadJson"), reload),
    element(ui.document, "h3", ui.t("of.builder.patch")), patch);
  const update = () => {
    if (!dirty) json.value = JSON.stringify(ui.builder.getState().definition, null, 2);
    patch.textContent = JSON.stringify(getPatch(), null, 2);
  };
  reload(); update();
  return { update, focus: () => json.focus() };
}

export function mountComponentJson(host: HTMLElement, ui: UI, original: ComponentNode,
  readonly: boolean, change: (node: ComponentNode, property: string) => Diagnostic[],
  problem: (property: string, message: string | undefined) => void,
  primitives: { labelledInput: typeof import("../primitives").labelledInput; element: typeof import("../types").element }) {
  const { labelledInput, element } = primitives;
  const field = labelledInput(ui, ui.t("ofb.editJson"), "textarea");
  const input = field.input as HTMLTextAreaElement;
  input.value = JSON.stringify(original, null, 2);
  input.readOnly = readonly;
  input.dataset.property = "JSON";
  input.addEventListener("input", () => {
    try { change(JSON.parse(input.value) as ComponentNode, "JSON"); }
    catch (cause) { problem("JSON", message(ui, "ofb.invalidJson", {
      message: cause instanceof Error ? cause.message : String(cause),
    })); }
  }, { signal: ui.signal });
  host.append(field.wrapper);
  if (readonly) host.prepend(element(ui.document, "p", message(ui, "ofb.readOnlyJson")));
}
