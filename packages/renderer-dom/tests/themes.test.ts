import { bootstrap4Theme } from "@ourform/theme-bootstrap4";
import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { textField, ratingField, checkboxField } from "@ourform/components";
import { renderToString, resolveTheme } from "@ourform/renderer-dom";
import { baseTheme } from "@ourform/theme-base";
import { bootstrap5Theme } from "@ourform/theme-bootstrap5";
import { tailwindTheme } from "@ourform/theme-tailwind";
import { materialTheme } from "@ourform/theme-material";
import type { Theme, ThemeOverride } from "@ourform/sdk";
const override = (color: string): ThemeOverride => ({
  tokens: { "--of-color-primary": color },
  classes: { field: { label: color } },
});
test("theme resolution merges base, inheritance, app, form and component with each layer's mode", () => {
  const child: Theme = {
    name: "child",
    extends: "tailwind",
    ...override("child"),
    modes: { dark: { "--of-color-primary": "child-dark" } },
  };
  const options = {
    themes: [tailwindTheme, child],
    appTheme: override("app"),
    formTheme: override("form"),
    componentThemes: { a: override("component") },
    themeMode: "dark" as const,
  };
  const resolved = resolveTheme("child", options, "a");
  expect(resolved.tokens["--of-color-primary"]).toBe("component");
  expect(resolved.tokens["--of-color-bg"]).toBe("#17212f");
  expect(resolved.classFor("field", "label")).toContain("component");
  expect(
    resolveTheme("child", { themes: [tailwindTheme, child], themeMode: "dark" })
      .tokens["--of-color-primary"],
  ).toBe("child-dark");
  expect(resolveTheme("child", options).tokens["--of-color-primary"]).toBe(
    "form",
  );
  expect(
    resolveTheme("child", {
      themes: [tailwindTheme, child],
      appTheme: override("app"),
    }).tokens["--of-color-primary"],
  ).toBe("app");
});
test("registries reject duplicates, cycles and missing themes, with no state shared between calls", () => {
  expect(() => resolveTheme("tailwind")).toThrow("Unknown theme");
  expect(resolveTheme("tailwind", { themes: [tailwindTheme] }).name).toBe(
    "tailwind",
  );
  expect(() => resolveTheme("tailwind")).toThrow("Unknown theme");
  expect(() => resolveTheme("base", { themes: [baseTheme, baseTheme] })).toThrow(
    "Duplicate theme",
  );
  expect(() =>
    resolveTheme({ ...baseTheme, name: "cycle", extends: "cycle" }),
  ).toThrow("cycle");
  expect(() => resolveTheme({ ...baseTheme, extends: "absent" })).toThrow(
    "Unknown theme",
  );
  expect(() =>
    resolveTheme({ ...baseTheme, tokens: { "--of-bad": "red;}body{" } }),
  ).toThrow("Invalid theme token");
  expect(() => resolveTheme({ ...baseTheme, css: "</style><script>" })).toThrow(
    "cannot close",
  );
});
test.each([
  baseTheme,
  bootstrap4Theme,
  bootstrap5Theme,
  tailwindTheme,
  materialTheme,
])(
  "$name ships required tokens, compiled scoped CSS and readable modes",
  (theme) => {
    const required = [
      "color-primary",
      "color-text",
      "color-muted",
      "color-border",
      "color-error",
      "color-bg",
      "radius",
      "space-1",
      "space-2",
      "space-3",
      "space-4",
      "font-family",
      "font-size",
      "control-height",
      "focus-ring",
    ];
    for (const token of required)
      expect(theme.tokens[`--of-${token}`]).toBeTruthy();
    expect(theme.css).toContain(".of-root");
    expect(theme.css).toContain("forced-colors");
    expect(theme.modes?.dark?.["--of-color-bg"]).toBeTruthy();
    expect(theme.modes?.["high-contrast"]?.["--of-focus-ring"]).toBeTruthy();
  },
);
test("static shells share ARIA anatomy, safe ids, scoped CSS, modes and translated messages without browser globals", async () => {
  const engine = createEngine()
    .register(textField.model)
    .register(ratingField.model)
    .register(checkboxField.model);
  const compiled = engine.compile({
    $formVersion: "1.0",
    id: "ssr",
    display: "form",
    components: [
      {
        id: "name",
        type: "text",
        key: "name",
        label: "<Name>",
        description: "A description",
        validation: { required: true },
      },
      { id: "rating", type: "rating", key: "rating", label: "Rating" },
      { id: "accept", type: "checkbox", key: "accept", label: "Accept" },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = engine.createSession(compiled.form);
  await session.validate();
  const views = new Map([
    ["text", textField.views],
    ["rating", ratingField.views],
    ["checkbox", checkboxField.views],
  ]);
  const options = {
    views,
    theme: tailwindTheme,
    themeMode: "dark" as const,
    idPrefix: "first",
    presentation: { name: { help: "Helpful", prefix: "$", suffix: "USD" } },
  };
  const html = renderToString(session, options);
  expect(html).toContain("<fieldset");
  expect(html).toContain("<legend");
  expect(html).toContain('data-of-shell="inline"');
  expect(html).toContain(
    'aria-describedby="first-name_description first-name_help first-name_error"',
  );
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('aria-required="true"');
  expect(html).toContain("&lt;Name&gt; is required");
  expect(html).not.toContain("<Name>");
  expect(html.match(/aria-live=/g)).toHaveLength(1);
  expect(html).toContain('.of-root[data-of-instance="first"]');
  expect(html).toContain('data-of-mode="dark"');
  expect(() =>
    renderToString(session, { ...options, idPrefix: '"><script>' }),
  ).toThrow("idPrefix");
});

test("mount rejects a foreign engine before touching the host DOM", async () => {
  const { mount } = await import("@ourform/renderer-dom");
  const engine = createEngine().register(textField.model);
  const result = engine.compile({
    $formVersion: "1.0",
    id: "owner",
    display: "form",
    components: [{ id: "text", key: "text", type: "text" }],
  });
  if (!result.ok) throw new Error("Compile failed");
  const session = engine.createSession(result.form);
  expect(() =>
    mount({} as Element, session, {
      engine: createEngine().register(textField.model),
      views: new Map([["text", textField.views]]),
    }),
  ).toThrow("same engine");
});

test("SSR nested none containers and cell labels retain hierarchy; custom messages replace English defaults", async () => {
  const engine = createEngine().register(textField.model).register({
    type: "section",
    title: "Section",
    kind: "layout",
    dataScope: "none",
  });
  const result = engine.compile({
    $formVersion: "1.0",
    id: "nested",
    display: "form",
    components: [
      {
        id: "section",
        type: "section",
        label: "Details",
        components: [
          {
            id: "child",
            key: "child",
            type: "text",
            validation: { required: true },
          },
        ],
      },
    ],
  });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  const session = engine.createSession(result.form);
  await session.validate();
  const html = renderToString(session, {
    themes: [baseTheme],
    views: new Map([["text", { ...textField.views, shell: "cell" }]]),
    presentation: { child: { cellLabel: "Quantity, item A" } },
    t: (key) => (key === "of.required" ? "Translated error" : key),
  });
  expect(html).toContain('data-of-shell="none"');
  expect(html).toContain('data-of-shell="cell"');
  expect(html).toContain("Quantity, item A");
  expect(html).toContain("Translated error");
  expect(html.indexOf('data-field-id="section"')).toBeLessThan(
    html.indexOf('data-field-id="child"'),
  );
  const ownShell = renderToString(session, {
    themes: [baseTheme],
    views: new Map([["text", { ...textField.views, shell: "none" }]]),
  });
  expect(ownShell).not.toContain("<label");
});
