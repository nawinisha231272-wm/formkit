import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import {
  createFormController,
  type FormController,
} from "@ourform/renderer-dom";
import { baseTheme } from "@ourform/themes/base";
import schema from "../../fixtures/forms/logic/prototype.json";
const host = createFormController(document.querySelector("#form")!, {
  schema,
  engine: createEngine({ logic: createLogic() }),
  fields: builtinFields,
  themes: [baseTheme],
  data: {
    customerType: "business",
    country: "US",
    company: "Acme",
    quantity: 2,
    reference: "chosen",
  },
});
window.ourformLogic = host;
document.querySelector("#submit")!.addEventListener("click", async () => {
  document.querySelector("#result")!.textContent = JSON.stringify(
    await host.submit(),
    null,
    2,
  );
});
document.querySelector("#reset")!.addEventListener("click", () => host.reset());
declare global {
  interface Window {
    ourformLogic: FormController;
  }
}
