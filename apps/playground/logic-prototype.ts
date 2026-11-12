import { strictNumber } from "./strict-number";
import calculationErrors from "../../fixtures/forms/logic/calculation-errors.json";
import type { LogicCallContext, LogicEffect } from "@ourform/core";
import effectsDefinition from "../../fixtures/forms/logic/effects.json";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import { materialTheme } from "@ourform/themes/material";
import { defineOurFormElement, type OurFormElement } from "@ourform/element";
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
const definition = query.has("calculation-errors")
  ? {
      ...calculationErrors,
      components: calculationErrors.components.map((node) =>
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
  : query.has("effects")
    ? effectsDefinition
    : query.has("precedence")
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
const effects: LogicEffect[] = [];
const calls: {
  args: readonly unknown[];
  context: LogicCallContext;
  complete(): void;
}[] = [];
const engine = () =>
  createEngine({
    logic: createLogic(),
    functions: {
      lookup: {
        pure: false,
        availableInNode: true,
        run: () => {},
        effect: (args, context) =>
          new Promise<void>((resolve) => {
            calls.push({ args, context, complete: resolve });
          }),
      },
    },
  });
const themes = [
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
];
const host = createFormController(document.querySelector("#form")!, {
  schema: definition,
  engine: engine(),
  onLogicEffect: (effect) => effects.push(effect),
  fields: query.has("calculation-errors")
    ? [...builtinFields, strictNumber]
    : builtinFields,
  themes,
  theme: query.get("theme") ?? "base",
  data:
    query.has("calculation-errors") ||
    query.has("effects") ||
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
window.ourformEffects = {
  effects,
  calls,
  element(shadow) {
    if (!customElements.get("logic-effects-form"))
      defineOurFormElement("logic-effects-form");
    const element = document.createElement(
      "logic-effects-form",
    ) as OurFormElement;
    if (shadow) element.setAttribute("shadow", "");
    element.engine = engine();
    element.themes = themes;
    element.theme = query.get("theme") ?? "base";
    element.schema = effectsDefinition;
    document.body.append(element);
    return element;
  },
};
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
    ourformEffects: {
      effects: LogicEffect[];
      calls: {
        args: readonly unknown[];
        context: LogicCallContext;
        complete(): void;
      }[];
      element(shadow: boolean): OurFormElement;
    };
  }
}
