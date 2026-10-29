import { expect, test } from "vitest";
import { baseTheme } from "@ourform/themes/base";
import { bootstrap4Theme } from "@ourform/themes/bootstrap4";
import { bootstrap5Theme } from "@ourform/themes/bootstrap5";
import { tailwindTheme } from "@ourform/themes/tailwind";
import { materialTheme } from "@ourform/themes/material";
import { resolveTheme } from "@ourform/renderer-dom";

test("each opt-in form theme retains layout and tab styling without implicit theme imports", () => {
  for (const theme of [
    baseTheme,
    bootstrap4Theme,
    bootstrap5Theme,
    tailwindTheme,
    materialTheme,
  ]) {
    const resolved = resolveTheme(theme, {
      themes: theme.extends ? [baseTheme, theme] : [theme],
    });
    expect(resolved.css, theme.name).toContain(
      "grid-template-columns:repeat(12,minmax(0,1fr))",
    );
    expect(resolved.css, theme.name).toContain(
      ".of-column{grid-column:span var(--of-column-span,12)",
    );
    expect(resolved.css, theme.name).toContain(
      '.of-tablist>[role="tab"][aria-selected="true"]',
    );
  }
});
