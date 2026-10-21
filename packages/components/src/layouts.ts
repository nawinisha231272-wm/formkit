import { defineLayout } from "@ourform/sdk";
import { tabsLayout } from "./tabs";
export const panelLayout = defineLayout({
  type: "panel",
  title: "Panel",
  tag: "section",
});
export const columnsLayout = defineLayout({
  type: "columns",
  title: "Columns",
  columns: true,
  slots: (node) =>
    (node.columns ?? []).map((_, index) => ({
      name: `column_${index}`,
      label: `Column ${index + 1}`,
      accepts: ["field", "layout", "composite"],
    })),
});
export const fieldsetLayout = defineLayout({
  type: "fieldset",
  title: "Fieldset",
  tag: "fieldset",
});
export const containerLayout = defineLayout({
  type: "container",
  title: "Container",
  dataScope: "object",
});
export const builtinLayouts = Object.freeze([
  panelLayout,
  columnsLayout,
  fieldsetLayout,
  containerLayout,
  tabsLayout,
]);
