import { defineLayout, optionsProperty, resolveConfig } from "@ourform/sdk";
const properties = {
  tabs: optionsProperty({
    label: "of.builder.tabs",
    default: [
      { value: "first", label: "First tab" },
      { value: "second", label: "Second tab" },
    ],
  }),
};
/** Slot names are stable option values; editing captions does not move children. */
export const tabsLayout = defineLayout({
  type: "tabs",
  title: "Tabs",
  tabs: true,
  properties,
  slots: (node) => {
    const result = resolveConfig(properties, node.properties ?? {});
    if (!result.ok || !result.config.tabs.length)
      throw new Error("Tabs requires at least one named tab.");
    return result.config.tabs.map((tab) => ({
      name: tab.value,
      label: tab.label,
      accepts: ["field", "layout", "composite"],
    }));
  },
});
