/// <reference types="vite/client" />
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import { renderForm, renderBuilder } from "@ourform/element";
import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { materialTheme } from "@ourform/themes/material";
import { bootstrap4BuilderTheme } from "@ourform/builder/themes/bootstrap4";
import { bootstrap5BuilderTheme } from "@ourform/builder/themes/bootstrap5";
import { materialBuilderTheme } from "@ourform/builder/themes/material";
import schema from "../../fixtures/forms/builder-ux/theme-comparison.json";
const data = {
  fullName: "Ana Lima",
  email: "ana@exam",
  customerType: "business",
};
const themes = [baseTheme, bootstrap4Theme, bootstrap5Theme, materialTheme];
const forms = ["bootstrap4", "bootstrap5", "material"].map((theme) => {
  const form = renderForm(document.getElementById(theme)!, {
    schema,
    data,
    theme,
    themes,
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
  themes,
  builderThemes: [
    bootstrap4BuilderTheme,
    bootstrap5BuilderTheme,
    materialBuilderTheme,
  ],
});
builder.builder.select("email");
window.addEventListener("pagehide", () => {
  forms.forEach((form) => form.destroy());
  builder.destroy();
});
