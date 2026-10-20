import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { validateSubmission } from "@ourform/validation";
import type { FormDefinition } from "@ourform/schema";
import {
  defineComposite,
  defineField,
  defineDisplay,
  definePlugin,
  definePreset,
  h,
  numberProperty,
  registerNativeField,
  stringProperty,
  resolveConfig,
  stringValue,
} from "../src/index";

const text = defineField({
  type: "test.text",
  title: "Text",
  value: stringValue(),
  properties: {
    size: numberProperty({ label: "size", default: 10, min: 1, max: 30 }),
  },
  control: (p) => h("input", { value: p.value, size: p.config.size }),
});
const definition = (
  components: FormDefinition["components"] = [],
): FormDefinition => ({
  $formVersion: "1.0",
  id: "extensions",
  display: "form",
  components,
});
test("presets validate typed defaults, share views, preserve base and allow per-node overrides", () => {
  const preset = definePreset("test.short", {
    base: text,
    title: "Short",
    defaults: { size: 4 },
  });
  expect(resolveConfig(preset.properties)).toMatchObject({
    ok: true,
    config: { size: 4 },
  });
  expect(resolveConfig(preset.properties, { size: 7 })).toMatchObject({
    ok: true,
    config: { size: 7 },
  });
  expect(text.properties.size.default).toBe(10);
  expect(preset.views).toBe(text.views);
  expect(preset.model.builder.title).toBe("Short");
  expect(Object.isFrozen(preset.properties.size)).toBe(true);
  for (const type of ["", text.model.type])
    expect(() =>
      definePreset(type, { base: text, title: "Bad", defaults: {} }),
    ).toThrow("distinct");
  expect(() =>
    definePreset("bad", { base: text, title: "Bad", defaults: { size: 50 } }),
  ).toThrow();
  expect(() => {
    // @ts-expect-error metadata derives a numeric size
    definePreset("invalid", {
      base: text,
      title: "Bad",
      defaults: { size: "large" },
    });
  }).toThrow();
});
test("native presets preserve the native view and snapshot property metadata", () => {
  const base = registerNativeField("react", "native-base", () => null, {
    properties: { size: numberProperty({ label: "size", default: 5 }) },
  });
  const preset = definePreset("native-preset", {
    base,
    title: "Preset",
    defaults: { size: 2 },
  });
  expect(preset.views).toBe(base.views);
  expect(preset.model.properties?.size?.default).toBe(2);
  expect(base.model.properties?.size?.default).toBe(5);
  expect(Object.isFrozen(preset.model.properties?.size)).toBe(true);
  const plugin = definePlugin({
    id: "raw-model",
    version: "1.0.0",
    engine: "^0.0.1",
    components: [text.model],
  });
  expect(
    createEngine({ plugins: [plugin] }).getField(text.model.type)?.value
      ?.normalize,
  ).toBe(text.model.value!.normalize);
  const raw = {
    ...text.model,
    type: "raw-meta",
    builder: { title: "Original", group: "Custom" },
  };
  const engine = createEngine({
    plugins: [
      definePlugin({
        id: "raw-meta",
        version: "1.0.0",
        engine: "*",
        components: [raw],
      }),
    ],
  });
  raw.builder.title = "Changed externally";
  expect(engine.getField("raw-meta")?.builder?.title).toBe("Original");
});
test("display presets preserve non-value models and typed metadata", () => {
  const display = defineDisplay({
    type: "display-base",
    title: "Display",
    properties: { note: stringProperty({ label: "note", default: "" }) },
    control: (props) => h("span", null, props.config.note),
  });
  const preset = definePreset("display-preset", {
    base: display,
    title: "Preset",
    defaults: { note: "Preset content" },
  });
  expect(preset.model.value).toBeUndefined();
  expect(preset.views).toBe(display.views);
  expect(preset.properties.note.default).toBe("Preset content");
});
test("composite instances namespace internal refs, preserve wire JSON and submit isolated object scopes", async () => {
  const children: FormDefinition["components"] = [
    {
      id: "street",
      type: text.model.type,
      key: "street",
      validation: { required: true },
    },
    { id: "city", type: text.model.type, key: "city" },
    { id: "postal", type: text.model.type, key: "postal" },
    {
      id: "country",
      type: text.model.type,
      key: "country",
      defaultValue: "US",
    },
    {
      id: "copy",
      type: text.model.type,
      key: "copy",
      calculate: { expr: { ref: "street" } },
      visibleWhen: ["neq", { ref: "street" }, ""],
      disabledWhen: ["eq", { ref: "country" }, "GB"],
    },
  ];
  const address = defineComposite({
    type: "test.address",
    title: "Address",
    components: children,
  });
  children[0]!.key = "changed";
  const engine = createEngine().register(text.model).register(address.model);
  const wire = definition([
    {
      id: "billing",
      type: address.model.type,
      key: "billing",
      label: "Billing",
    },
    {
      id: "shipping",
      type: address.model.type,
      key: "shipping",
      label: "Shipping",
    },
    {
      id: "external",
      type: text.model.type,
      key: "external",
      calculate: { expr: { ref: "billing/street" } },
    },
  ]);
  const result = engine.compile(wire);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  expect(result.form.definition).toEqual(wire);
  expect(result.form.byId["billing/street"]!.path).toEqual([
    "billing",
    "street",
  ]);
  const session = engine.createSession(result.form);
  session.setValue("billing.street", "One Main Street");
  session.setValue("shipping.street", "Two Main Street");
  expect(session.getValue("billing.copy")).toBe("One Main Street");
  expect(session.getValue("shipping.copy")).toBe("Two Main Street");
  expect(session.getValue("external")).toBe("One Main Street");
  const submitted = await session.submit();
  expect(submitted.ok).toBe(true);
  if (submitted.ok)
    expect(await validateSubmission(result.form, submitted.data)).toMatchObject(
      { valid: true },
    );
  session.dispose();
  expect(createEngine().register(text.model).compile(wire)).toMatchObject({
    ok: false,
  });
});
test("transparent and nested composites preserve scopes; generated collisions and bad refs fail", () => {
  const leaf = defineComposite({
    type: "leaf",
    title: "Leaf",
    dataScope: "none",
    components: [{ id: "text", type: text.model.type, key: "name" }],
  });
  const nested = defineComposite({
    type: "nested",
    title: "Nested",
    components: [{ id: "leaf", type: "leaf" }],
  });
  const engine = createEngine()
    .register(text.model)
    .register(leaf.model)
    .register(nested.model);
  const result = engine.compile(
    definition([{ id: "n", type: "nested", key: "object" }]),
  );
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.form.byId["n/leaf/text"]!.path).toEqual(["object", "name"]);
  expect(
    engine.compile(
      definition([
        { id: "n", type: "leaf" },
        { id: "n/text", type: text.model.type, key: "other" },
      ]),
    ).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "duplicate-id" }));
  expect(
    engine.compile(
      definition([
        {
          id: "bad",
          type: text.model.type,
          key: "bad",
          visibleWhen: { ref: "absent" },
        },
      ]),
    ).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "bad-ref" }));
  expect(() =>
    defineComposite({
      type: "bad",
      title: "Bad",
      components: [{ id: "", type: "x" }],
    }),
  ).toThrow();
  expect(() =>
    defineComposite({ type: "", title: "Bad", components: [] }),
  ).toThrow();
  expect(() =>
    defineComposite({
      type: "bad",
      title: "Bad",
      components: JSON.parse('[{"constructor":1}]'),
    }),
  ).toThrow();
});
test("plugin installation enforces engine/dependency ranges, conflicts and per-engine form requires", async () => {
  const dependency = definePlugin({
    id: "acme.base",
    version: "1.2.3",
    engine: "^0.0.1",
  });
  const source = () => ["customer-owned"];
  const plugin = definePlugin({
    id: "acme.fields",
    version: "2.1.0",
    engine: "0.x",
    components: [text],
    themes: [{ name: "acme", tokens: {}, classes: {} }],
    requires: [{ plugin: "acme.base", version: "^1.2.0" }],
    functions: {
      acme: { pure: true, availableInNode: true, run: () => "plugin" },
    },
    validators: { acmeRule: { validate: () => null } },
    dataSources: { customers: source },
  });
  const engine = createEngine({ plugins: [plugin, dependency] });
  expect(engine.providers.dataSources).toEqual({ customers: source });
  const wire = {
    ...definition([
      {
        id: "p",
        type: text.model.type,
        key: "p",
        calculate: { expr: ["call", "acme"] },
        validation: { custom: [{ validator: "acmeRule" }] },
      },
    ]),
    requires: [{ plugin: "acme.fields", version: ">=2 <3" }],
  };
  const result = engine.compile(wire);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const session = engine.createSession(result.form);
    expect(await session.submit()).toEqual({ ok: true, data: { p: "plugin" } });
    session.dispose();
  }
  const isolated = createEngine().register(text.model);
  expect(createEngine().compile(wire).diagnostics).toContainEqual(
    expect.objectContaining({ code: "missing-plugin" }),
  );
  expect(
    isolated.compile({ ...definition(), requires: wire.requires }).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "missing-plugin" }));
  for (const version of ["garbage", "^3", "^2.2.0", "^2.1.1-beta.1"])
    expect(
      engine.compile({
        ...definition(),
        requires: [{ plugin: plugin.id, version }],
      }).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: "missing-plugin" }));
  expect(Object.isFrozen(plugin.requires?.[0])).toBe(true);
  expect(() =>
    definePlugin({ id: "", version: "1.0.0", engine: "*" }),
  ).toThrow();
  for (const bad of [
    { ...dependency, version: "bad" },
    { ...dependency, engine: "bad" },
    { ...dependency, engine: ">=1" },
    { ...dependency, requires: [{ plugin: "absent", version: "*" }] },
  ])
    expect(() => createEngine({ plugins: [bad] })).toThrow();
  expect(() => createEngine({ plugins: [dependency, dependency] })).toThrow(
    "Duplicate plugin",
  );
  expect(() => createEngine({ plugins: [plugin] })).toThrow("requires");
  for (const conflict of [
    { ...dependency, components: [text] },
    { ...dependency, functions: plugin.functions! },
    { ...dependency, validators: plugin.validators! },
    { ...dependency, dataSources: plugin.dataSources! },
    { ...dependency, themes: plugin.themes },
  ])
    expect(() => createEngine({ plugins: [plugin, conflict] })).toThrow(
      /Duplicate/,
    );
  expect(() =>
    createEngine({
      plugins: [dependency],
      validators: { constructor: { validate: () => null } },
    }),
  ).toThrow("Reserved");
  expect(() =>
    createEngine({
      plugins: [plugin, dependency],
      providers: { dataSources: null },
    }),
  ).toThrow("provider map");
  expect(() =>
    createEngine({
      plugins: [plugin, dependency],
      providers: { dataSources: { customers: source } },
    }),
  ).toThrow("data source");
});
