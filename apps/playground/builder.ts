/// <reference types="vite/client" />
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import { renderBuilder } from "@ourform/element";
import { createBuilder as createPortableBuilder } from "@ourform/builder";
import { builtinComponents } from "@ourform/components";
import type { BuilderController } from "@ourform/builder";
import type { FormController } from "@ourform/renderer-dom";
import { defineLayout } from "@ourform/sdk";
import { customerReference } from "./builder-fields";
import approved from "../../fixtures/forms/builder-ux/customer-onboarding.json";
import approvedData from "../../fixtures/forms/builder-ux/customer-onboarding.data.json";
import feedback from "../../fixtures/forms/feedback.json";
import nested from "../../fixtures/forms/nested-tabs/customer.json";
import { employeeFields } from "../vanilla-example/src/employee-fields";
const query = new URLSearchParams(location.search);
const schema = query.has("empty")
  ? { $formVersion: "1.0", id: "new-form", display: "form", components: [] }
  : query.has("large")
    ? {
        $formVersion: "1.0",
        id: "large-builder",
        display: "form",
        components: Array.from({ length: 500 }, (_, i) => ({
          id: `field_${i}`,
          type: "text",
          key: `field${i}`,
          label: `Field ${i + 1}`,
        })),
      }
    : query.has("approved")
      ? approved
      : query.has("fixture")
        ? nested
        : query.has("locks")
          ? {
              ...feedback,
              components: [
                ...feedback.components,
                {
                  id: "cmp_comment",
                  type: "textarea",
                  key: "comment",
                  label: "Comment",
                },
              ],
            }
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
const options = {
  schema,
  fields: query.has("demos")
    ? [...employeeFields, customerReference, card, rootSection]
    : [
        ...employeeFields.filter(
          (field) => field.model.type !== "employeeObject",
        ),
        customerReference,
      ],
  idPrefix: "",
  ...(query.has("approved") ? { data: approvedData } : {}),
  theme: query.get("theme") ?? "base",
  themeMode: query.get("mode") === "dark" ? "dark" : "light",
  chrome: {
    ...(query.has("chrome") ? { theme: query.get("chrome")! } : {}),
    density: query.has("compact") ? "compact" : "comfortable",
  },
  ...(query.has("locks")
    ? {
        locked: {
          cmp_name: "structure" as const,
          cmp_rating: "all" as const,
          cmp_comment: "key" as const,
        },
      }
    : {}),
  ...(query.has("filtered")
    ? { palette: { groups: ["basic"], hidden: ["password"] } }
    : {}),
  ...(query.has("host-options")
    ? {
        palette: {
          groups: ["basic", "acme components"],
          hidden: ["password"],
          order: { "acme components": -10 },
        },
        toolbar: { actions: ["edit", "json", "delete"] as const },
        messages: { "ofb.save": "Keep changes", "ofb.edit": "Configure" },
        icons: { save: [["circle", { cx: 12, cy: 12, r: 5 }]] as const },
      }
    : {}),
  editor: {
    mode: query.has("drawer") ? ("drawer" as const) : ("modal" as const),
    openOnAdd: !query.has("no-open"),
    ...(query.has("host-options")
      ? {
          tabs: { hide: ["Layout"] },
          properties: { rating: { hide: ["placeholder"] } },
        }
      : {}),
  },
} satisfies import("@ourform/builder").BuilderOptions;
const controller = query.has("factory")
  ? createPortableBuilder(document.getElementById("builder")!, schema, {
      ...options,
      fields: [...builtinComponents, customerReference],
    })
  : renderBuilder(document.getElementById("builder")!, options);
document.getElementById("builder")!.addEventListener("of-save", () => {
  if (!query.has("manual-save"))
    window.setTimeout(() => controller.markSaved(), 500);
});
if (query.has("approved")) controller.builder.select("email");
else if (!query.has("empty") && !query.has("fixture") && !query.has("large"))
  controller.builder.select(query.has("locks") ? "cmp_name" : "cmp_rating");
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
