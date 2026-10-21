import { renderForm } from "@ourform/element";
import type { FormController } from "@ourform/renderer-dom";
import schema from "../../fixtures/forms/nested-tabs/customer.json";
import data from "../../fixtures/forms/nested-tabs/customer.data.json";
const query = new URLSearchParams(location.search);
const definition = structuredClone(schema);
if (query.has("disabled"))
  Object.assign(definition.components[0]!, { disabledWhen: true });
const controller = renderForm(document.getElementById("tabs-form")!, {
  schema: definition,
  data,
  readOnly: query.has("readonly"),
});
const theme = document.getElementById("theme") as HTMLSelectElement;
theme.addEventListener("change", () => controller.view.setTheme(theme.value));
document.getElementById("submit")!.addEventListener("click", async () => {
  document.getElementById("result")!.textContent = JSON.stringify(
    await controller.submit(),
  );
});
document
  .getElementById("reset")!
  .addEventListener("click", () => controller.reset());
window.tabsForm = controller;
window.addEventListener("pagehide", () => controller.destroy());
declare global {
  interface Window {
    tabsForm: FormController;
  }
}
