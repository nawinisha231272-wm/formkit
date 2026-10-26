import { expect, test } from "vitest";
import { defineLayout } from "@ourform/sdk";
import { createEngine, resolveSlots } from "@ourform/core";
import { builtinComponents, tabsLayout } from "@ourform/components";
import { renderToString } from "@ourform/renderer-dom";
import { validateSubmission } from "@ourform/validation";
import { createBuilder, UpdateProperty } from "@ourform/builder-core";
import fixture from "../../../fixtures/forms/nested-tabs/customer.json";
import good from "../../../fixtures/forms/nested-tabs/customer.data.json";
import bad from "../../../fixtures/forms/nested-tabs/customer.invalid.json";
import type { FormDefinition } from "@ourform/schema";
import { baseTheme } from "@ourform/themes/base";
test("Tabs slots share scope, SSR places children in named panels and Node submission matches required rules", async () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const result = engine.compile(fixture);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  expect(result.form.byId.name?.path).toEqual(["name"]);
  expect(result.form.byId.email?.path).toEqual(["contact", "email"]);
  const session = engine.createSession(result.form, { data: good });
  const options = {
    themes: [baseTheme],
    views: new Map(
      builtinComponents.map((field) => [field.model.type, field.views]),
    ),
  };
  const html = renderToString(session, options);
  expect(html).toContain('role="tablist"');
  expect(html).toContain('role="tabpanel"');
  expect(html).toContain('aria-selected="true"');
  expect(html.indexOf('data-of-slot="second"')).toBeLessThan(
    html.indexOf('data-field-id="contact"'),
  );
  expect(html.indexOf('data-field-id="contact"')).toBeLessThan(
    html.lastIndexOf("</div>"),
  );
  expect(html).toMatch(/id="of-ssr-tabs_panel_second"[^>]*hidden/);
  const design = renderToString(session, { ...options, mode: "design" });
  expect(design).not.toContain('role="tablist"');
  expect(design).toContain('data-of-slot="second"');
  expect((await validateSubmission(result.form, good)).valid).toBe(true);
  expect((await validateSubmission(result.form, bad)).valid).toBe(false);
  session.dispose();
});
test("tab labels can change but removing populated slot names is rejected atomically", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const builder = createBuilder(engine, fixture as FormDefinition);
  const before = builder.getState();
  expect(
    builder.dispatch(
      new UpdateProperty("tabs", "properties.tabs", [
        { value: "first", label: "Profile" },
      ]),
    ),
  ).toContainEqual(expect.objectContaining({ code: "invalid-slot" }));
  expect(builder.getState()).toBe(before);
  expect(
    builder.dispatch(
      new UpdateProperty("tabs", "properties.tabs", [
        { value: "first", label: "A < B" },
        { value: "second", label: "C & D" },
      ]),
    ),
  ).toEqual([]);
  const tab = builder.getState().definition.components[0]!;
  expect(resolveSlots(tabsLayout.model, tab).map((slot) => slot.label)).toEqual(
    ["A < B", "C & D"],
  );
  expect(
    engine.compile({
      ...fixture,
      components: [{ id: "empty", type: "tabs", properties: { tabs: [] } }],
    }).ok,
  ).toBe(false);
});

test("slot captions are literal unless labelKey opts into translation with an English fallback", () => {
  const layout = defineLayout({
    type: "translated-tabs",
    title: "Translated tabs",
    tabs: true,
    slots: [
      { name: "first", label: "of.required", accepts: ["field"] },
      {
        name: "second",
        label: "English second",
        labelKey: "acme.second",
        accepts: ["field"],
      },
    ],
  });
  const e = createEngine().register(layout.model);
  const compiled = e.compile({
    $formVersion: "1.0",
    id: "captions",
    display: "form",
    components: [{ id: "tabs", type: layout.model.type }],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = e.createSession(compiled.form);
  const views = new Map([[layout.model.type, layout.views]]);
  const translated = renderToString(session, {
    themes: [baseTheme],
    views,
    t: (key) =>
      key === "acme.second"
        ? "Translated second"
        : key === "of.required"
          ? "Wrongly translated literal"
          : key,
  });
  expect(translated).toContain(">of.required</button>");
  expect(translated).toContain(">Translated second</button>");
  expect(translated).not.toContain("Wrongly translated literal");
  expect(renderToString(session, { views, themes: [baseTheme], t: (key) => key })).toContain(
    ">English second</button>",
  );
  session.dispose();
});
