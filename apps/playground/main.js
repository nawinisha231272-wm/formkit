import feedback from "../../fixtures/forms/feedback.json";
import { createEngine } from "@ourform/core";
import { ratingField, textField } from "@ourform/components";
import { renderForm } from "@ourform/renderer-dom";
import {
  applyEditorProperty,
  getEditorProperties,
} from "@ourform/builder-core";

const engine = createEngine()
  .register(textField.model)
  .register(ratingField.model);
const views = new Map([
  [textField.model.type, textField.views],
  [ratingField.model.type, ratingField.views],
]);
let schema = structuredClone(feedback);
let session = engine.createSession(schema);
let view = renderForm(document.querySelector("#form"), session, views);
const target = document.querySelector("#target");
const properties = document.querySelector("#properties");
const output = document.querySelector("#output");
const schemaPanel = document.querySelector("#schema");
function rebuild() {
  const data = session.getData();
  view.destroy();
  session = engine.createSession(schema, data);
  view = renderForm(
    document.querySelector("#form"),
    session,
    views,
    document.querySelector("#theme").value,
  );
  schemaPanel.textContent = JSON.stringify(schema, null, 2);
  showProperties();
}
function showProperties() {
  const field = schema.components.find((f) => f.id === target.value);
  if (!field) return;
  properties.replaceChildren();
  for (const p of getEditorProperties(field, engine.getField(field.type))) {
    const row = document.createElement("label");
    row.className = "property";
    row.textContent = p.label;
    const input = document.createElement("input");
    input.type =
      p.kind === "boolean"
        ? "checkbox"
        : p.kind === "number"
          ? "number"
          : "text";
    if (p.kind === "boolean") input.checked = Boolean(p.value);
    else input.value = String(p.value);
    if (p.min !== undefined) input.min = p.min;
    if (p.max !== undefined) input.max = p.max;
    input.addEventListener("change", () => {
      const next =
        p.kind === "boolean"
          ? input.checked
          : p.kind === "number"
            ? Number(input.value)
            : input.value;
      schema = {
        ...schema,
        components: schema.components.map((f) =>
          f.id === field.id ? applyEditorProperty(f, p.key, next) : f,
        ),
      };
      rebuild();
    });
    row.append(input);
    properties.append(row);
  }
}
for (const f of schema.components) {
  const o = document.createElement("option");
  o.value = f.id;
  o.textContent = f.label;
  target.append(o);
}
target.value = "cmp_rating";
target.addEventListener("change", showProperties);
document
  .querySelector("#theme")
  .addEventListener("change", (e) => view.setTheme(e.target.value));
document.querySelector("#validate").addEventListener("click", () => {
  output.textContent = JSON.stringify(
    { data: session.getData(), errors: session.validate() },
    null,
    2,
  );
});
schemaPanel.textContent = JSON.stringify(schema, null, 2);
showProperties();
