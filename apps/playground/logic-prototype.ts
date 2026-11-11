import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinFields } from "@ourform/components";
import {
  createFormController,
  type FormController,
} from "@ourform/renderer-dom";
import { baseTheme } from "@ourform/themes/base";
import schema from "../../fixtures/forms/logic/prototype.json";
import interleaved from "../../fixtures/forms/logic/interleaved.json";
import loadInitializer from "../../fixtures/forms/logic/load-initializer.json";
import actionOrder from "../../fixtures/forms/logic/action-order.json";
import calculationPrecedence from "../../fixtures/forms/logic/calculation-precedence.json";
const query = new URLSearchParams(location.search);
const definition = query.has("precedence")
  ? {
      ...calculationPrecedence,
      components: calculationPrecedence.components.map((node) =>
        node.calculate
          ? {
              ...node,
              calculate: {
                ...node.calculate,
                allowOverride: query.has("allow-override"),
              },
            }
          : node,
      ),
    }
  : query.has("actions")
    ? actionOrder
    : query.has("load-initializer")
      ? loadInitializer
      : query.has("interleaved")
        ? {
            ...interleaved,
            logic: query.has("reverse")
              ? [...interleaved.logic].reverse()
              : interleaved.logic,
          }
        : schema;
const host = createFormController(document.querySelector("#form")!, {
  schema: definition,
  engine: createEngine({ logic: createLogic() }),
  fields: builtinFields,
  themes: [baseTheme],
  data:
    query.has("precedence") ||
    query.has("interleaved") ||
    query.has("load-initializer") ||
    query.has("actions")
      ? {}
      : {
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
