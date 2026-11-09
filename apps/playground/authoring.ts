import {
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
} from "@ourform/themes";
import { renderComponent, mountComponentBuilder } from "@ourform/testing";
import { field as slider } from "../docs/examples/slider";
import { field as quantity } from "../docs/examples/quantity";
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const themes = [
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
];
let sliderFixture: ReturnType<typeof renderComponent>;
let quantityFixture: ReturnType<typeof renderComponent>;
let mini: ReturnType<typeof mountComponentBuilder>;
function render() {
  sliderFixture?.destroy();
  quantityFixture?.destroy();
  mini?.destroy();
  const theme = element<HTMLSelectElement>("theme").value;
  const readOnly = element<HTMLInputElement>("read-only").checked;
  const disabled = element<HTMLInputElement>("disabled").checked;
  const node = {
    validation: { required: true },
    disabledWhen: ["eq", disabled, true] as import("@ourform/sdk").Expr,
  };
  sliderFixture = renderComponent(slider, {
    host: element("slider"),
    theme,
    themes,
    readOnly,
    node,
  });
  quantityFixture = renderComponent(quantity, {
    host: element("quantity"),
    theme,
    themes,
    readOnly,
    node,
  });
  mini = mountComponentBuilder(quantity, {
    host: element("builder"),
    theme,
    themes,
  });
}
for (const id of ["theme", "read-only", "disabled"])
  element(id).addEventListener("change", render);
render();
window.authoring = {
  get slider() {
    return sliderFixture;
  },
  get quantity() {
    return quantityFixture;
  },
  get mini() {
    return mini;
  },
};
window.addEventListener("pagehide", () => {
  sliderFixture.destroy();
  quantityFixture.destroy();
  mini.destroy();
});
declare global {
  interface Window {
    authoring: {
      readonly slider: typeof sliderFixture;
      readonly quantity: typeof quantityFixture;
      readonly mini: typeof mini;
    };
  }
}
