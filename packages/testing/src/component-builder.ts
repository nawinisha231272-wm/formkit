import { createEngine } from "@ourform/core";
import {
  createBuilder,
  AddComponent,
  UpdateProperty,
} from "@ourform/builder-core";
import type { PanelProperty } from "@ourform/builder-core";
import { createFormController } from "@ourform/renderer-dom";
import type { FormController, HostOptions } from "@ourform/renderer-dom";
import { defaultMessage } from "@ourform/sdk";
import type { RegisteredField } from "@ourform/sdk";

/** A small author fixture, using the real metadata-driven builder and renderer. */
export function mountComponentBuilder(
  field: RegisteredField,
  options: Pick<HostOptions, "engine" | "theme" | "themes"> & { host: Element },
) {
  if (options.host.childNodes.length)
    throw new Error("Builder host must be empty.");
  const document = options.host.ownerDocument;
  const engine = options.engine ?? createEngine();
  if (!engine.getField(field.model.type)) engine.register(field.model);
  const builder = createBuilder(engine, {
    $formVersion: "1.0",
    id: "author-builder",
    display: "form",
    components: [],
  });
  const palette = document.createElement("button");
  palette.type = "button";
  palette.textContent = `Add ${field.model.title}`;
  palette.dataset.componentType = field.model.type;
  const properties = document.createElement("div");
  properties.dataset.authorProperties = "";
  const previewRoot = document.createElement("div");
  previewRoot.dataset.authorPreview = "";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  options.host.append(palette, properties, status, previewRoot);
  let preview: FormController | undefined;
  let destroyed = false;
  const editorCleanups: Array<() => void> = [];
  function editor(property: PanelProperty) {
    const label = document.createElement("label");
    label.append(defaultMessage(property.label));
    const complex = ["json", "expr", "options"].includes(property.kind);
    const input =
      property.kind === "select"
        ? document.createElement("select")
        : complex
          ? document.createElement("textarea")
          : document.createElement("input");
    if (input instanceof HTMLSelectElement)
      for (const choice of property.options ?? []) {
        const option = document.createElement("option");
        option.value = choice.value;
        option.textContent = defaultMessage(choice.label);
        input.append(option);
      }
    if (input instanceof HTMLInputElement) {
      input.type =
        property.kind === "boolean"
          ? "checkbox"
          : property.kind === "number"
            ? "number"
            : "text";
      input.checked = Boolean(property.value);
      if (property.min !== undefined) input.min = String(property.min);
      if (property.max !== undefined) input.max = String(property.max);
    }
    input.dataset.property = property.key;
    input.value =
      property.value === undefined
        ? ""
        : complex
          ? JSON.stringify(property.value)
          : String(property.value);
    const change = () => {
      if (destroyed) return;
      try {
        const value: unknown =
          input instanceof HTMLInputElement && input.type === "checkbox"
            ? input.checked
            : complex
              ? JSON.parse(input.value)
              : property.kind === "number"
                ? Number(input.value)
                : input.value;
        const id = builder.getState().selection;
        if (id)
          status.textContent = builder
            .dispatch(new UpdateProperty(id, property.key, value))
            .map((d) => d.message)
            .join("; ");
      } catch {
        status.textContent = "Enter valid JSON before applying this property.";
      }
    };
    input.addEventListener("change", change);
    editorCleanups.push(() => input.removeEventListener("change", change));
    label.append(input);
    return label;
  }
  function refresh() {
    const data = preview?.session.getData();
    preview?.destroy();
    preview = undefined;
    const state = builder.getState();
    editorCleanups.splice(0).forEach((cleanup) => cleanup());
    properties.replaceChildren();
    if (state.selection)
      for (const group of builder.propertyPanel(state.selection).groups) {
        const section = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent = group.name;
        section.append(legend);
        for (const property of group.properties)
          if (property.visible) section.append(editor(property));
        properties.append(section);
      }
    if (!state.definition.components.length) return;
    preview = createFormController(previewRoot, {
      engine,
      schema: state.definition,
      fields: [field],
      ...(data ? { data } : {}),
      ...(options.theme === undefined ? {} : { theme: options.theme }),
      ...(options.themes ? { themes: options.themes } : {}),
    });
  }
  const add = () => builder.dispatch(new AddComponent(field.model.type));
  palette.addEventListener("click", add);
  const unsubscribe = builder.subscribe(refresh);
  return {
    builder,
    get preview() {
      return preview;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      editorCleanups.splice(0).forEach((cleanup) => cleanup());
      unsubscribe();
      palette.removeEventListener("click", add);
      preview?.destroy();
      options.host.replaceChildren();
    },
  };
}
