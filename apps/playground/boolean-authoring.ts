import { createEngine } from "@ourform/core";
import { nullableBooleanValue } from "@ourform/sdk";
import {
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
} from "@ourform/themes";
import { renderComponent, mountComponentBuilder } from "@ourform/testing";
import { field } from "../docs/examples/yes-no";
const themes = [
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
];
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let consent: ReturnType<typeof renderComponent>,
  answer: ReturnType<typeof renderComponent>,
  mini: ReturnType<typeof mountComponentBuilder>;
const makeEngine = () =>
  createEngine({
    providers: {
      localization: (key) =>
        key === "acme.answer.yes"
          ? "Translated yes"
          : key === "acme.answer.no"
            ? "Translated no"
            : undefined,
    },
  });
function render() {
  consent?.destroy();
  answer?.destroy();
  mini?.destroy();
  const theme = element<HTMLSelectElement>("theme").value;
  const readOnly = element<HTMLInputElement>("read-only").checked;
  const disabled = element<HTMLInputElement>("disabled").checked;
  consent = renderComponent(field, {
    host: element("consent"),
    engine: makeEngine(),
    theme,
    themes,
    readOnly,
    node: {
      label: "Consent",
      validation: { required: element<HTMLInputElement>("required").checked },
      disabledWhen: ["eq", disabled, true],
    },
  });
  const ordinary = {
    ...field,
    model: {
      ...field.model,
      type: "acme-answer",
      value: nullableBooleanValue(),
    },
  };
  answer = renderComponent(ordinary, {
    host: element("answer"),
    theme,
    themes,
    node: { label: "Answer", validation: { required: true } },
  });
  mini = mountComponentBuilder(field, {
    host: element("builder"),
    theme,
    themes,
    engine: makeEngine(),
  });
}
for (const id of ["theme", "required", "read-only", "disabled"])
  element(id).addEventListener("change", render);
element("submit").addEventListener("click", async () => {
  element("result").textContent = JSON.stringify(await consent.submit());
});
element("reset").addEventListener("click", () => {
  consent.reset();
  element("result").textContent = "";
});
render();
window.booleanAuthoring = {
  get consent() {
    return consent;
  },
  get answer() {
    return answer;
  },
  get mini() {
    return mini;
  },
};
window.addEventListener("pagehide", () => {
  consent.destroy();
  answer.destroy();
  mini.destroy();
});
declare global {
  interface Window {
    booleanAuthoring: {
      readonly consent: typeof consent;
      readonly answer: typeof answer;
      readonly mini: typeof mini;
    };
  }
}
