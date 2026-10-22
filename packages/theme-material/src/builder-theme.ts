import type { BuilderTheme } from "@ourform/sdk";
export const builderTheme: BuilderTheme = {
  name: "material",
  extends: "neutral",
  tokens: {
    "--ofb-accent": "#6750a4",
    "--ofb-accent-contrast": "#ffffff",
    "--ofb-focus-ring": "#6750a4",
    "--ofb-font-family": "Roboto, system-ui, sans-serif",
    "--ofb-radius": "4px",
  },
  modes: {
    dark: {
      "--ofb-accent": "#d0bcff",
      "--ofb-accent-contrast": "#102345",
      "--ofb-focus-ring": "#d0bcff",
    },
  },
  recipes: {
    Button: { "--ofb-radius": "20px" },
    Tabs: { "--ofb-tab-radius": "0", "--ofb-tab-border-width": "0" },
  },
};
