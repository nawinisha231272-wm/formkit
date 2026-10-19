import { defineLayout } from "@ourform/sdk";
export const panelLayout = defineLayout({
  type: "panel",
  title: "Panel",
  tag: "section",
});
export const columnsLayout = defineLayout({
  type: "columns",
  title: "Columns",
  columns: true,
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
]);
