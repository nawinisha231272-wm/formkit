import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents, builtinLayouts } from "../src/index";
import { renderToString, createFormHost } from "@ourform/renderer-dom";
import { toSubmissionSchema, validateSubmission } from "@ourform/validation";
import fixture from "../../../fixtures/forms/onboarding/customer.json";
import data from "../../../fixtures/forms/onboarding/customer.data.json";
import { baseTheme } from "@ourform/themes/base";
test("40-field onboarding uses transparent layouts, an object container and consistent escaped semantic SSR", async () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  expect(builtinLayouts.map((field) => field.model.dataScope)).toEqual([
    "none",
    "none",
    "none",
    "object",
    "none",
  ]);
  const compiled = engine.compile(fixture);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  expect(compiled.form.nodes.filter((entry) => entry.model.value)).toHaveLength(
    40,
  );
  const session = engine.createSession(compiled.form, { data });
  const views = new Map(
    builtinComponents.map((field) => [field.model.type, field.views]),
  );
  const html = renderToString(session, { views, themes: [baseTheme] });
  expect(html).toContain("<section");
  expect(html).toMatch(/<fieldset[^>]*data-field-id="address-panel"/);
  expect(html).toContain("<legend");
  expect(html).toContain("of-columns");
  expect(html).toContain("--of-column-span:6");
  expect((html.match(/data-field-id=/g) ?? []).length).toBe(
    compiled.form.nodes.length,
  );
  expect(await validateSubmission(compiled.form, data)).toEqual({
    valid: true,
    errors: [],
  });
  expect(
    Object.keys(toSubmissionSchema(compiled.form).properties as object),
  ).toEqual(["contact", "company", "address", "preferences"]);
  session.dispose();
});
test("layout host registration rejects incompatible object/transparent scopes", () => {
  const engine = createEngine().register({
    type: "container",
    title: "Different",
    kind: "layout",
    dataScope: "none",
  });
  expect(() => createFormHost(builtinLayouts, engine)).toThrow(
    "Conflicting engine model: container",
  );
});
test("named transparent layouts expose a group and escape their heading in SSR", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const compiled = engine.compile({
    $formVersion: "1.0",
    id: "named-layout",
    display: "form",
    components: [
      {
        id: "columns",
        type: "columns",
        label: "<script>Named</script>",
        components: [{ id: "child", type: "text", key: "name", label: "Name" }],
      },
    ],
  });
  if (!compiled.ok) throw new Error("Compile failed");
  const session = engine.createSession(compiled.form);
  const html = renderToString(session, {
    themes: [baseTheme],
    views: new Map(
      builtinComponents.map((field) => [field.model.type, field.views]),
    ),
  });
  expect(html).toContain('role="group"');
  expect(html).toContain('aria-labelledby="of-ssr-columns_label"');
  expect(html).toContain("&lt;script&gt;Named&lt;/script&gt;");
  expect(html).toContain('data-field-id="child"');
  session.dispose();
});
