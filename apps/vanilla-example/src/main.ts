import { renderForm, defineOurFormElement } from "@ourform/element";
import schema from "../../../fixtures/forms/native/host-feedback.json";
import { employeeFields as fields } from "./employee-fields";
const output = document.querySelector("#result")!;
const form = renderForm("#form", {
  schema,
  fields,
  readOnly: new URLSearchParams(location.search).has("readonly"),
  onSubmit: (result) => (output.textContent = JSON.stringify(result)),
});
document.querySelector("#submit")!.addEventListener("click", () => {
  void form.submit();
});
defineOurFormElement();
window.hostDemo = { form, unmount: () => form.destroy() };

window.defineExampleTag = defineOurFormElement;
