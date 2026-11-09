import { renderForm } from "@ourform/element";
import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import schema from "../../fixtures/forms/onboarding/customer.json";
const target = document.querySelector("#onboarding-form")!;
const previous = target.firstElementChild;
const form = renderForm(target, {
  schema,
  themes: [baseTheme, bootstrap4Theme, bootstrap5Theme, tailwindTheme],
  onSubmit: (result) => {
    document.querySelector("#onboarding-result")!.textContent = JSON.stringify(
      result,
      null,
      2,
    );
  },
});
document.querySelector("#render-status")!.textContent =
  "Client form ready. Server markup was replaced with an interactive form.";
document
  .querySelector<HTMLSelectElement>("#onboarding-theme")!
  .addEventListener("change", (event) =>
    form.view.setTheme((event.target as HTMLSelectElement).value),
  );
window.onboardingDemo = {
  form,
  replaced: previous !== target.firstElementChild,
};
window.addEventListener("pagehide", () => form.destroy());
declare global {
  interface Window {
    onboardingDemo: { form: typeof form; replaced: boolean };
  }
}
