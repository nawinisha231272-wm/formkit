/// <reference types="vite/client" />
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import { renderForm, renderBuilder } from "@ourform/element";
import schema from "../../fixtures/forms/builder-ux/theme-comparison.json";
const data = {
  fullName: "Ana Lima",
  email: "ana@exam",
  customerType: "business",
};
const forms = ["bootstrap4", "bootstrap5", "material"].map((theme) => {
  const form = renderForm(document.getElementById(theme)!, {
    schema,
    data,
    theme,
    idPrefix: `${theme}-`,
    onSubmit: () => {},
  });
  void form.session.validate({ paths: ["email"] });
  return form;
});
const builder = renderBuilder(document.getElementById("builder")!, {
  schema,
  data,
  theme: "material",
  themeMode: "light",
  chrome: { theme: "material", mode: "dark", density: "compact" },
});
builder.builder.select("email");
window.addEventListener("pagehide", () => {
  forms.forEach((form) => form.destroy());
  builder.destroy();
});
