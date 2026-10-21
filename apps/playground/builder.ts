import { renderBuilder } from "@ourform/element";
import type { BuilderController } from "@ourform/builder";
import type { FormController } from "@ourform/renderer-dom";
import { defineLayout } from "@ourform/sdk";
import feedback from "../../fixtures/forms/feedback.json";
import nested from "../../fixtures/forms/nested-tabs/customer.json";
import { employeeFields } from "../vanilla-example/src/employee-fields";
const query = new URLSearchParams(location.search);
const schema = query.has("empty")
  ? { $formVersion: "1.0", id: "new-form", display: "form", components: [] }
  : query.has("fixture")
    ? nested
    : feedback;
const card = defineLayout({
  type: "acme.card",
  title: "SDK card",
  slots: [
    { name: "body", label: "Fields only", accepts: ["field"], max: 2 },
    { name: "extra", label: "Extra fields", accepts: ["field"], max: 1 },
  ],
});
const rootSection = defineLayout({
  type: "acme.root-section",
  title: "Root section",
  rootOnly: true,
});
const controller = renderBuilder(document.getElementById("builder")!, {
  schema,
  fields: query.has("demos")
    ? [...employeeFields, card, rootSection]
    : employeeFields.filter((field) => field.model.type !== "employeeObject"),
  idPrefix: "",
});
if (!query.has("empty") && !query.has("fixture"))
  controller.builder.select("cmp_rating");
window.miniBuilder = {
  builder: controller.builder,
  get preview() {
    return controller.preview;
  },
};
window.nestedBuilder = controller;
window.addEventListener("pagehide", () => controller.destroy());
declare global {
  interface Window {
    miniBuilder: {
      builder: BuilderController["builder"];
      readonly preview: FormController | undefined;
    };
    nestedBuilder: BuilderController;
  }
}
