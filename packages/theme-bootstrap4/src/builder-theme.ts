import type { BuilderTheme } from "@ourform/sdk";
export const builderTheme: BuilderTheme = {
  name: "bootstrap4",
  extends: "neutral",
  tokens: {
    "--ofb-accent": "#0064cf",
    "--ofb-accent-contrast": "#ffffff",
    "--ofb-focus-ring": "#0064cf",
    "--ofb-font-family": "system-ui, -apple-system, sans-serif",
    "--ofb-radius": "4px",
  },
  modes: {
    dark: {
      "--ofb-accent": "#9ec5fe",
      "--ofb-accent-contrast": "#102345",
      "--ofb-focus-ring": "#9ec5fe",
    },
  },
  recipes: {
    Tabs: {
      "--ofb-tab-radius": "4px 4px 0 0",
      "--ofb-tab-border-width": "1px",
    },
  },
};
