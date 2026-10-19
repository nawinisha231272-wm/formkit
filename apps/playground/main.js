import { bootstrap4Theme } from "@ourform/theme-bootstrap4";
import { defaultMessage } from "@ourform/sdk";
import feedback from "../../fixtures/forms/feedback.json";
import { createEngine } from "@ourform/core";
import {
  ratingField,
  textField,
  numberField,
  checkboxField,
} from "@ourform/components";
import { mount } from "@ourform/renderer-dom";
import {
  applyEditorProperty,
  getEditorProperties,
} from "@ourform/builder-core";

const engine = createEngine()
  .register(textField.model)
  .register(ratingField.model)
  .register(numberField.model)
  .register(checkboxField.model);
const views = new Map([
  [textField.model.type, textField.views],
  [ratingField.model.type, ratingField.views],
  [numberField.model.type, numberField.views],
  [checkboxField.model.type, checkboxField.views],
]);
import { bootstrap5Theme } from "@ourform/theme-bootstrap5";
import { tailwindTheme } from "@ourform/theme-tailwind";
const themes = [bootstrap4Theme, bootstrap5Theme, tailwindTheme];
function renderForm(root, session, views, theme = "base") {
  return mount(root, session, {
    engine,
    views,
    themes,
    theme,
    themeMode: document.querySelector("#mode").value,
  });
}
let schema = structuredClone(feedback);
if (new URLSearchParams(location.search).has("sdk"))
  schema.components.push(
    { id: "cmp_age", key: "age", type: "number", label: "Age" },
    {
      id: "cmp_accept",
      key: "accept",
      type: "checkbox",
      label: "Accept terms",
    },
  );

function createSession(data = {}) {
  const result = engine.compile(schema);
  if (!result.ok)
    throw new Error(result.diagnostics.map((d) => d.message).join("; "));
  return engine.createSession(result.form, { data });
}
let session = createSession();
let view = renderForm(document.querySelector("#form"), session, views);
const target = document.querySelector("#target");
const properties = document.querySelector("#properties");
const output = document.querySelector("#output");
const schemaPanel = document.querySelector("#schema");
function rebuild() {
  const data = session.getData();
  const compiled = engine.compile(schema);
  schemaPanel.textContent = JSON.stringify(schema, null, 2);
  if (!compiled.ok) {
    output.textContent = JSON.stringify(
      { diagnostics: compiled.diagnostics },
      null,
      2,
    );
    return;
  }
  const nextSession = engine.createSession(compiled.form, { data });
  output.textContent = "";
  view.destroy();
  session.dispose();
  session = nextSession;
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
    row.textContent = defaultMessage(p.label);
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
document.querySelector("#validate").addEventListener("click", async () => {
  output.textContent = JSON.stringify(
    { data: session.getData(), errors: (await session.validate()).errors },
    null,
    2,
  );
});
schemaPanel.textContent = JSON.stringify(schema, null, 2);
showProperties();

document
  .querySelector("#mode")
  .addEventListener("change", (e) => view.setMode(e.target.value));
document
  .querySelector("#direction")
  .addEventListener(
    "change",
    (e) => (document.querySelector("#form").dir = e.target.value),
  );
document.querySelector("#submit").addEventListener("click", async () => {
  output.textContent = JSON.stringify(await view.submit(), null, 2);
});
