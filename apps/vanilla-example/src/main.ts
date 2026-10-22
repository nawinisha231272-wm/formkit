import protectedSchema from "../../../fixtures/forms/native/protected-writes.json";
import { renderForm, defineOurFormElement } from "@ourform/element";
import nativeSchema from "../../../fixtures/forms/native/host-feedback.json";
import onboardingSchema from "../../../fixtures/forms/onboarding/customer.json";
import onboardingData from "../../../fixtures/forms/onboarding/customer.data.json";
const query = new URLSearchParams(location.search);
const schema = query.has("protected")
  ? protectedSchema
  : query.has("onboarding")
    ? onboardingSchema
    : nativeSchema;
const initialData = query.has("protected")
  ? {
      name: "stored",
      locked: false,
      staticReadOnly: "stored",
      staticDisabled: "stored",
    }
  : query.has("readonly") && query.has("onboarding")
    ? onboardingData
    : query.has("onboarding")
      ? { preferences: { reference: "web-onboarding" } }
      : {};
import { employeeFields as fields } from "./employee-fields";
const output = document.querySelector("#result")!;
const form = renderForm("#form", {
  schema,
  defaultData: initialData,
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
