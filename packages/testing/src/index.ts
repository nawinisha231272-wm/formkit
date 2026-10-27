import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { createEngine } from "@ourform/core";
import {
  textField,
  numberField,
  checkboxField,
  ratingField,
} from "@ourform/components";
import { mount } from "@ourform/renderer-dom";
import type { ThemeMode, FormDefinition } from "@ourform/sdk";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import { materialTheme } from "@ourform/themes/material";
export const themeNames = [
  "base",
  "bootstrap4",
  "bootstrap5",
  "tailwind",
  "material",
] as const;
export const themeModes = ["light", "dark", "high-contrast"] as const;
/** States available through M03; later milestones add real multi-value/grid/wizard cases. */
export const themeConformanceStates = [
  "default",
  "invalid",
  "disabled",
  "readOnly",
  "focus",
  "hover",
  "rtl",
  "dark",
  "high-contrast",
] as const;
export function createThemeConformance(
  root: Element,
  options: {
    theme?: string;
    mode?: ThemeMode;
    readOnly?: boolean;
    rtl?: boolean;
  } = {},
) {
  const engine = createEngine()
    .register(textField.model)
    .register(numberField.model)
    .register(checkboxField.model)
    .register(ratingField.model)
    .register({ ...textField.model, type: "cell" })
    .register({
      type: "section",
      title: "Section",
      kind: "layout",
      dataScope: "none",
    });
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: "conformance",
    display: "form",
    components: [
      {
        id: "name",
        type: "text",
        key: "name",
        label: "Name",
        description: "Use your full name",
        validation: { required: true },
      },
      {
        id: "amount",
        type: "number",
        key: "amount",
        label: "Amount",
        defaultValue: 12,
      },
      { id: "accept", type: "checkbox", key: "accept", label: "Accept" },
      {
        id: "rating",
        type: "rating",
        key: "rating",
        label: "Rating",
        validation: { required: true },
      },
      {
        id: "disabled",
        type: "text",
        key: "disabled",
        label: "Disabled",
        defaultValue: "Unavailable",
        disabledWhen: ["eq", 1, 1],
      },
      {
        id: "section",
        type: "section",
        label: "Details",
        components: [
          {
            id: "cell",
            type: "cell",
            key: "cell",
            label: "Quantity",
            defaultValue: "3",
          },
        ],
      },
    ],
  };
  const result = engine.compile(definition);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  const session = engine.createSession(result.form, {
    mode: options.readOnly ? "readOnly" : "edit",
  });
  const views = new Map([
    ["text", textField.views],
    ["number", numberField.views],
    ["checkbox", checkboxField.views],
    ["rating", ratingField.views],
    ["cell", { ...textField.views, shell: "cell" as const }],
  ]);
  root.setAttribute("dir", options.rtl ? "rtl" : "ltr");
  const view = mount(root, session, {
    engine,
    views,
    themes: [
      baseTheme,
      bootstrap4Theme,
      bootstrap5Theme,
      tailwindTheme,
      materialTheme,
    ],
    theme: options.theme ?? "base",
    themeMode: options.mode ?? "light",
    presentation: {
      name: { help: "We will use this on your receipt" },
      amount: { prefix: "$", suffix: "USD" },
      cell: { cellLabel: "Quantity, item A" },
    },
  });
  return {
    engine,
    views,
    session,
    view,
    destroy() {
      view.unmount();
      session.dispose();
    },
  };
}

export { createConformanceEngine } from "./components";
export {
  renderComponent,
  checkValueAdapter,
  checkValidation,
  checkBuilderRoundTrip,
  componentTestEngine,
} from "./authoring";
export type { RenderComponentOptions } from "./authoring";

export { mountComponentBuilder } from "./component-builder";
