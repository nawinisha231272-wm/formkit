import type { BuilderTheme } from "@ourform/sdk";
export const builderTheme: BuilderTheme = {
  name: "tailwind",
  extends: "neutral",
  tokens: {
    "--ofb-accent": "#1d4ed8",
    "--ofb-accent-contrast": "#ffffff",
    "--ofb-focus-ring": "#1d4ed8",
    "--ofb-font-family": "Inter, system-ui, sans-serif",
    "--ofb-radius": "8px",
  },
  modes: {
    dark: {
      "--ofb-accent": "#a5b4fc",
      "--ofb-accent-contrast": "#102345",
      "--ofb-focus-ring": "#a5b4fc",
    },
  },
  recipes: {},
};
