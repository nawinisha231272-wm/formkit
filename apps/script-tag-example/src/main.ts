import type { BuilderController, BuilderOptions } from "@ourform/builder";
import type { FormDefinition } from "@ourform/schema";

declare global {
  interface Window {
    OurFormBuilder: {
      createBuilder(
        root: Element,
        schema: FormDefinition,
        options?: Omit<BuilderOptions, "schema">,
      ): BuilderController;
      themes: readonly string[];
    };
    scriptTagBuilder: BuilderController;
  }
}

const query = new URLSearchParams(location.search);
const schema: FormDefinition = {
  $formVersion: "1.0",
  id: "script-tag-builder",
  display: "form",
  components: [{ id: "name", type: "text", key: "name", label: "Full name" }],
};

const controller = window.OurFormBuilder.createBuilder(
  document.getElementById("builder")!,
  schema,
  {
    assetBase: new URL("/assets/", location.href).href,
    preload: query.get("preload") === "idle" ? "idle" : "none",
    settingsPreload: query.get("settingsPreload") === "none" ? "none" : "idle",
    planningPreload: query.get("planningPreload") === "none" ? "none" : "idle",
    dataPreload: query.get("dataPreload") === "none" ? "none" : "idle",
    styleNonce: "ourform-script-tag",
  },
);

window.scriptTagBuilder = controller;
