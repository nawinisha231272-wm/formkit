/// <reference types="vite/client" />
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?raw";
import { renderForm } from "@ourform/renderer-dom";
import { createThemeConformance } from "@ourform/testing";
import type { ThemeMode } from "@ourform/sdk";
const query = new URLSearchParams(location.search);
if (query.has("bootstrap")) {
  const framework = document.createElement("style");
  framework.textContent = bootstrapCss;
  document.head.append(framework);
}
const fixture = createThemeConformance(document.querySelector("#form")!, {
  theme: query.get("theme") ?? "base",
  mode: (query.get("mode") ?? "light") as ThemeMode,
  readOnly: query.has("readonly"),
  rtl: query.has("rtl"),
});
const submit = document.createElement("button");
submit.type = "submit";
submit.textContent = "Submit";
document.querySelector("#form")!.append(submit);
const style = document.createElement("style");
style.textContent =
  "body{margin:0;background:#e2e8f0}main{max-width:560px;margin:20px auto}h1{font:24px Arial}#form{font-family:Arial,sans-serif}";
document.head.append(style);
const second = () =>
  createThemeConformance(document.querySelector("#second")!, {
    theme: "tailwind",
    mode: "dark",
  });
const legacy = () =>
  renderForm(
    document.querySelector<HTMLElement>("#second")!,
    fixture.session,
    fixture.views,
    "bootstrap",
  );
declare global {
  interface Window {
    themeProbe: typeof fixture & {
      second: typeof second;
      legacy: typeof legacy;
    };
  }
}
window.themeProbe = { ...fixture, second, legacy };
