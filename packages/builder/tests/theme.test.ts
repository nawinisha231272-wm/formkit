import { test, expect } from "vitest";
import { materialTheme } from "@ourform/theme-material";
import { defineBuilderTheme } from "@ourform/sdk";
import { resolveChrome, chromeStyle } from "../src/theme";
import { primitiveStyle } from "../src/primitive-style";
import { builderStyle } from "../src/style";
import { settingsStyle } from "../src/settings-style";
import { pointerStyle } from "../src/pointer-style";
import { workbenchStyle } from "../src/workbench-style";

function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
export function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
test.each(
  ["base", "bootstrap4", "bootstrap5", "tailwind", "material"].flatMap((name) =>
    ["light", "dark"].map((mode) => [name, mode] as const),
  ),
)(
  "%s %s chrome text, signals, boundaries and focus meet token contrast",
  (name, mode) => {
    const theme = resolveChrome({}, name, mode);
    const t = (key: string) => theme.tokens[`--ofb-${key}`]!;
    for (const surface of ["surface", "surface-raised", "canvas"])
      for (const foreground of [
        "text",
        "text-muted",
        "accent",
        "danger",
        "success",
        "logic",
        "info",
        "focus-ring",
        "border",
      ])
        expect(
          contrast(t(foreground), t(surface)),
          `${foreground}/${surface}`,
        ).toBeGreaterThanOrEqual(
          ["border", "focus-ring"].includes(foreground) ? 3 : 4.5,
        );
    for (const tone of ["accent", "danger", "success", "logic", "info"])
      expect(contrast(t(tone), t(`${tone}-soft`)), tone).toBeGreaterThanOrEqual(
        4.5,
      );
    expect(contrast(t("accent"), t("accent-contrast"))).toBeGreaterThanOrEqual(
      4.5,
    );
  },
);
test("custom chrome inheritance, recipes, density and accent resolve without shared state", () => {
  const theme = defineBuilderTheme({
    name: "acme",
    extends: "neutral",
    tokens: { "--ofb-accent": "#0f766e" },
    recipes: { Button: { "--ofb-radius": "20px" } },
  });
  const resolved = resolveChrome(
    { theme: "acme", density: "compact", mode: "dark", accent: "#0f766e" },
    "base",
    "light",
    [theme],
  );
  expect(resolved.name).toBe("acme");
  expect(resolved.mode).toBe("dark");
  expect(resolved.tokens["--ofb-control-height"]).toBe("30px");
  expect(resolved.tokens["--ofb-accent-contrast"]).toBe("#ffffff");
  expect(resolved.recipes.Button?.["--ofb-radius"]).toBe("20px");
  expect(chromeStyle(resolved, "test-1")).toContain(
    '[data-ofb-primitive="Button"]{--ofb-radius:20px}',
  );
  expect(chromeStyle(resolved, "test-1")).toContain("dialog::backdrop{");
  expect(resolveChrome().tokens["--ofb-control-height"]).toBe("36px");
  expect(resolveChrome({}, "custom-form").name).toBe("neutral");
  expect(resolveChrome({}, "acme", "light", [theme]).name).toBe("acme");
  expect(() => chromeStyle(resolved, '"]body{')).toThrow();
  expect(() => resolveChrome({ theme: "missing" })).toThrow("Unknown");
  expect(() => resolveChrome({ accent: "red" })).toThrow("hex");
  expect(() => resolveChrome({}, "base", "light", [theme, theme])).toThrow(
    "Duplicate",
  );
  expect(() =>
    resolveChrome({ theme: "loop" }, "base", "light", [
      { name: "loop", extends: "loop", tokens: {} },
    ]),
  ).toThrow("cycle");
});
test("primitive chrome CSS never hard-codes colors, radii or fonts and cannot restyle form controls", () => {
  const allChrome = [
    primitiveStyle,
    builderStyle,
    settingsStyle,
    pointerStyle,
    workbenchStyle,
  ].join("\n");
  expect(allChrome).not.toMatch(/#[a-f\d]{3,8}\b|\brgba?\(/i);
  for (const declaration of allChrome.matchAll(
    /(?:^|[;{])\s*(?:color|background|background-color|border-radius|font-family|font-size|font-weight)\s*:\s*([^;}]+)/g,
  ))
    expect(declaration[1], declaration[0]).toMatch(/^var\(--ofb-/);
  expect(primitiveStyle).not.toContain(".of-builder button:");
  expect(primitiveStyle).not.toContain(".of-builder :focus-visible");
});

test.each(["light", "dark", "high-contrast"] as const)(
  "Material %s read-only fill is distinct and readable",
  (mode) => {
    const tokens = {
      ...materialTheme.tokens,
      ...(mode === "light" ? {} : materialTheme.modes?.[mode]),
    };
    const background = tokens["--of-material-readonly-bg"]!;
    expect(background).not.toBe(tokens["--of-material-panel-bg"]);
    expect(
      contrast(tokens["--of-color-text"]!, background),
    ).toBeGreaterThanOrEqual(4.5);
  },
);
