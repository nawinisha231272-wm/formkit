import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  createBuilder,
  AddComponent,
  UpdateProperty,
  RemoveComponent,
} from "@ourform/builder-core";
import type { PanelProperty, Command } from "@ourform/builder-core";
import { renderForm } from "@ourform/element";
import type { FormController } from "@ourform/element";
import { defaultMessage } from "@ourform/sdk";
import type { FormDefinition, ThemeMode } from "@ourform/sdk";
import feedback from "../../fixtures/forms/feedback.json";
import { employeeFields } from "../vanilla-example/src/employee-fields";

const engine = createEngine();
for (const field of builtinComponents) engine.register(field.model);
for (const field of employeeFields) engine.register(field.model);
const builder = createBuilder(engine, feedback as FormDefinition);
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const theme = element<HTMLSelectElement>("builder-theme");
const mode = element<HTMLSelectElement>("builder-mode");
const status = element("diagnostics");
let preview: FormController | undefined;
let data: unknown = {};
function dispatch(command: Command) {
  const diagnostics = builder.dispatch(command);
  status.textContent = diagnostics
    .map((d) => `${d.severity}: ${d.message}`)
    .join(" · ");
}
for (const group of builder.palette()) {
  const heading = document.createElement("h3");
  heading.textContent = group.name;
  element("palette").append(heading);
  for (const item of group.components) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = defaultMessage(item.title);
    button.dataset.type = item.type;
    button.addEventListener("click", () =>
      dispatch(new AddComponent(item.type)),
    );
    element("palette").append(button);
  }
}
function editor(property: PanelProperty) {
  const row = document.createElement("label");
  row.className = "property";
  row.append(defaultMessage(property.label));
  const complex = ["json", "expr", "options"].includes(property.kind);
  const input =
    property.kind === "select"
      ? document.createElement("select")
      : complex
        ? document.createElement("textarea")
        : document.createElement("input");
  if (input instanceof HTMLSelectElement)
    for (const option of property.options ?? []) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = defaultMessage(option.label);
      input.append(node);
    }
  if (input instanceof HTMLInputElement) {
    input.type =
      property.kind === "boolean"
        ? "checkbox"
        : property.kind === "number"
          ? "number"
          : "text";
    if (property.min !== undefined) input.min = String(property.min);
    if (property.max !== undefined) input.max = String(property.max);
    input.checked = Boolean(property.value);
  }
  input.value =
    property.value === undefined
      ? ""
      : complex
        ? JSON.stringify(property.value)
        : String(property.value);
  input.dataset.property = property.key;
  if (property.editor) input.dataset.editor = property.editor;
  input.addEventListener("change", () => {
    try {
      const value: unknown =
        input instanceof HTMLInputElement && input.type === "checkbox"
          ? input.checked
          : input.value === "" && property.kind !== "string"
            ? undefined
            : complex
              ? JSON.parse(input.value)
              : property.kind === "number"
                ? Number(input.value)
                : input.value;
      const id = builder.getState().selection;
      if (id) dispatch(new UpdateProperty(id, property.key, value));
    } catch {
      status.textContent = "Enter valid JSON before applying this property.";
    }
  });
  row.append(input);
  return row;
}
function authoring() {
  const state = builder.getState();
  const canvas = element("canvas");
  canvas.replaceChildren();
  for (const node of state.definition.components) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = node.label ?? node.type;
    button.dataset.id = node.id;
    button.setAttribute("aria-pressed", String(state.selection === node.id));
    button.addEventListener("click", () => builder.select(node.id));
    li.append(button);
    canvas.append(li);
  }
  element<HTMLButtonElement>("undo").disabled = state.history.past.length === 0;
  element<HTMLButtonElement>("redo").disabled =
    state.history.future.length === 0;
  element<HTMLButtonElement>("remove").disabled = state.selection === null;
  const panel = element("builder-properties");
  panel.replaceChildren();
  if (state.selection)
    for (const group of builder.propertyPanel(state.selection).groups) {
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = group.name;
      fieldset.append(legend);
      for (const property of group.properties)
        if (property.visible) fieldset.append(editor(property));
      panel.append(fieldset);
    }
  element("builder-json").textContent = JSON.stringify(
    state.definition,
    null,
    2,
  );
}
function rebuild() {
  if (preview) data = preview.session.getData();
  const result = engine.compile(builder.getState().definition);
  preview?.destroy();
  preview = undefined;
  element("builder-result").textContent = "";
  if (!result.ok) {
    status.textContent = result.diagnostics.map((d) => d.message).join(" · ");
    return;
  }
  preview = renderForm(element("preview"), {
    schema: builder.getState().definition,
    fields: employeeFields,
    data,
    theme: theme.value,
    themeMode: mode.value as ThemeMode,
  });
}
builder.subscribe((_state, patch) => {
  authoring();
  if (patch.length) {
    element("builder-patch").textContent = JSON.stringify(patch, null, 2);
    rebuild();
  }
});
element("undo").addEventListener("click", () => builder.undo());
element("redo").addEventListener("click", () => builder.redo());
element("remove").addEventListener("click", () => {
  const id = builder.getState().selection;
  if (id) dispatch(new RemoveComponent(id));
});
theme.addEventListener("change", () => preview?.view.setTheme(theme.value));
mode.addEventListener("change", () =>
  preview?.view.setMode(mode.value as ThemeMode),
);
element("builder-submit").addEventListener("click", async () => {
  if (preview)
    element("builder-result").textContent = JSON.stringify(
      await preview.submit(),
      null,
      2,
    );
});
builder.select("cmp_rating");
rebuild();
window.addEventListener("pagehide", () => preview?.destroy());
declare global {
  interface Window {
    miniBuilder: {
      builder: typeof builder;
      readonly preview: FormController | undefined;
    };
  }
}
window.miniBuilder = {
  builder,
  get preview() {
    return preview;
  },
};
