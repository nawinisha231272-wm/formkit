import type { BuilderTheme } from "@ourform/sdk";
export const builderTheme: BuilderTheme = {
  name: "bootstrap5",
  extends: "neutral",
  tokens: {
    "--ofb-accent": "#0b5ed7",
    "--ofb-accent-contrast": "#ffffff",
    "--ofb-focus-ring": "#0b5ed7",
    "--ofb-font-family": "system-ui, -apple-system, sans-serif",
    "--ofb-radius": "6px",
  },
  modes: {
    dark: {
      "--ofb-accent": "#a6c8ff",
      "--ofb-accent-contrast": "#102345",
      "--ofb-focus-ring": "#a6c8ff",
    },
  },
  recipes: {
    Tabs: {
      "--ofb-tab-radius": "4px 4px 0 0",
      "--ofb-tab-border-width": "1px",
    },
  },
};
