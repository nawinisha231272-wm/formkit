import { test, expect, expectTypeOf } from "vitest";
import { createEngine } from "@ourform/core";
import {
  textField,
  ratingField,
  numberField,
  checkboxField,
} from "@ourform/components";
import { getEditorProperties } from "@ourform/builder-core";
import { renderToString } from "@ourform/renderer-dom";
import {
  defineField,
  stringValue,
  numberValue,
  booleanValue,
  stringProperty,
  numberProperty,
  booleanProperty,
  selectProperty,
  exprProperty,
  optionsProperty,
  jsonProperty,
  resolveConfig,
  h,
  renderVNodeToString,
  controlAttributes,
  defaultMessage,
  escapeHtml,
  type ConfigOf,
  type FieldControlProps,
} from "../src/index";
const definition = (properties: Record<string, unknown> = {}) => ({
  $formVersion: "1.0",
  id: "test",
  display: "form",
  components: [
    {
      id: "rating",
      key: "rating",
      type: "rating",
      properties,
      validation: { required: true },
    },
  ],
});
test("required unset Rating fails validation and typed metadata drives defaults", async () => {
  expectTypeOf<ConfigOf<typeof ratingField.properties>>().toEqualTypeOf<{
    max: number;
    allowHalf: boolean;
  }>();
  const e = createEngine().register(ratingField.model);
  const result = e.compile(definition());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("compile");
  const s = e.createSession(result.form);
  expect(s.getValue("rating")).toBeNull();
  expect((await s.validate()).errors[0]!.error.code).toBe("required");
  s.setValue("rating", 3);
  expect((await s.validate()).valid).toBe(true);
  expect(resolveConfig(ratingField.properties)).toMatchObject({
    ok: true,
    config: { max: 5, allowHalf: false },
  });
  expect(ratingField.model.builder).toEqual({
    title: "Rating",
    group: "Fields",
  });
  expect(ratingField.shell).toBe("group");
  expect(
    getEditorProperties(
      result.form.definition.components[0]!,
      ratingField.model,
    ).find((p) => p.key === "allowHalf")?.value,
  ).toBe(false);
});
test.each([
  { max: "5" },
  { max: 11 },
  { max: 0 },
  { allowHalf: "yes" },
  { unknown: true },
])("invalid properties %j are compile diagnostics", (properties) => {
  const r = createEngine()
    .register(ratingField.model)
    .compile(definition(properties));
  expect(r.ok).toBe(false);
  expect(r.diagnostics.some((d) => d.code === "invalid-property")).toBe(true);
});
test("value helpers normalize safely and recognize their own empty values", () => {
  const string = stringValue();
  expect(string.isEmpty(string.empty())).toBe(true);
  expect(string.normalize(null)).toBe("");
  expect(string.normalize(2)).toBe("2");
  expect(string.jsonSchema?.({})).toEqual({ type: "string" });
  expect(() => stringValue("nonempty")).toThrow("blank");
  const n = numberValue({ empty: null });
  for (const invalid of [
    null,
    undefined,
    "",
    "  ",
    NaN,
    Infinity,
    {},
    true,
    "abc",
  ])
    expect(n.normalize(invalid)).toBeNull();
  expect(n.normalize("0")).toBe(0);
  expect(n.normalize("1.5")).toBe(1.5);
  expect(n.isEmpty(n.empty())).toBe(true);
  expect(n.jsonSchema?.({})).toEqual({ type: ["number", "null"] });
  expect(() => numberValue({ empty: 0 as unknown as null })).toThrow("null");
  const b = booleanValue();
  expect(b.isEmpty(b.empty())).toBe(true);
  expect(b.normalize("false")).toBe(false);
  expect(b.normalize("true")).toBe(true);
  expect(b.normalize(1)).toBe(false);
  expect(b.jsonSchema?.({})).toEqual({ type: "boolean" });
});
test("all property helpers validate config without mutating defaults", () => {
  const properties = {
    s: stringProperty({ label: "String", default: "x" }),
    n: numberProperty({ label: "Number", default: 1, min: 0, max: 5 }),
    b: booleanProperty({ label: "Boolean", default: false }),
    select: selectProperty({
      label: "Select",
      default: "a",
      options: [{ value: "a", label: "A" }],
    }),
    expr: exprProperty({ label: "Expr", default: null }),
    options: optionsProperty({ label: "Options", default: [] }),
    json: jsonProperty({ label: "JSON", default: { a: [] as number[] } }),
  };
  expectTypeOf<ConfigOf<typeof properties>>().toEqualTypeOf<{
    s: string;
    n: number;
    b: boolean;
    select: string;
    expr: import("@ourform/schema").Expr;
    options: { value: string; label: string }[];
    json: { a: number[] };
  }>();
  const r = resolveConfig(properties, {
    n: 3,
    json: { a: [1] },
    expr: ["eq", 1, 1],
  });
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error("config");
  expect(Object.isFrozen(r.config.json.a)).toBe(true);
  expect(properties.json.default).toEqual({ a: [] });
  for (const values of [
    [],
    null,
    { select: "b" },
    { expr: { bad: true } },
    { options: [{ value: 1, label: "bad" }] },
    { json: () => {} },
    { n: -1 },
    { b: "false" },
  ])
    expect(resolveConfig(properties, values).ok).toBe(false);
  expect(() =>
    defineField({
      type: "bad",
      title: "Bad",
      value: stringValue(),
      properties: {
        bad: numberProperty({ label: "Bad", default: 99, max: 2 }),
      },
      control: () => h("input", {}),
    }),
  ).toThrow("Invalid property");
  const original = { label: "Max", default: 5 };
  const props = { max: numberProperty(original) };
  const custom = defineField({
    type: "custom",
    title: "Custom",
    group: "Examples",
    icon: "star",
    value: stringValue(),
    properties: props,
    control: (p) => h("input", { value: p.value }),
  });
  props.max.default = 8;
  expect(custom.properties.max.default).toBe(5);
  expect(custom.model.builder).toMatchObject({
    group: "Examples",
    icon: "star",
  });
});
test("VNode authoring escapes output and rejects executable strings/unsafe attributes", () => {
  const node = h(
    "div",
    { title: "<\"&'", key: "hidden" },
    "text <script>",
    1,
    false,
    null,
    [
      h("input", {
        value: "<value>",
        disabled: false,
        "aria-invalid": false,
        ref: () => {},
        oninput: () => {},
      }),
    ],
  );
  const html = renderVNodeToString(node);
  expect(html).toContain("text &lt;script&gt;1");
  expect(html).toContain('aria-invalid="false"');
  expect(html).not.toContain("oninput");
  expect(html).not.toContain("key=");
  expect(html).not.toContain("ref=");
  expect(escapeHtml(">")).toBe("&gt;");
  expect(Object.isFrozen(node.children)).toBe(true);
  for (const fn of [
    () => h("script", {}),
    () => h("input", { oninput: "evil" }),
    () => h("button", { OnClick: "evil" }),
    () => h("div", { title: () => {} }),
    () => h("div", { key: true }),
    () => h("div", { ref: "bad" }),
    () => h("div", { innerHTML: "evil" }),
    () => h("a", { href: "javascript:evil" }),
    () => h("div", {}, h("b", { key: 1 }), h("b", { key: 1 })),
  ])
    expect(fn).toThrow();
});
test("SSR uses the same portable representation in Node without browser globals", () => {
  expect(typeof globalThis.document).toBe("undefined");
  const controls = [textField, numberField, checkboxField, ratingField];
  const e = createEngine()
    .register(textField.model)
    .register(numberField.model)
    .register(checkboxField.model)
    .register(ratingField.model);
  const result = e.compile({
    $formVersion: "1.0",
    id: "all",
    display: "form",
    components: [
      {
        id: "name",
        key: "name",
        type: "text",
        label: "<Name>",
        description: "Help & more",
      },
      { id: "age", key: "age", type: "number" },
      { id: "accept", key: "accept", type: "checkbox" },
      { id: "stars", key: "stars", type: "rating" },
    ],
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("compile");
  const s = e.createSession(result.form, {
    data: { name: "<input>", age: 0, accept: true },
  });
  const views = new Map(controls.map((c) => [c.model.type, c.views]));
  const markup = renderToString(s, { views });
  expect(markup).toContain("&lt;Name&gt;");
  expect(markup).toContain('value="&lt;input&gt;"');
  expect(markup).toContain('checked="true"');
  expect(markup).toContain("0");
  expect(markup).not.toContain("onclick");
  expect(() => renderToString(s, { views: new Map() })).toThrow(
    "No portable view",
  );
});
test("shared a11y attributes and English defaults are stable", () => {
  let focused: unknown;
  const p: FieldControlProps<string, Record<string, never>> = {
    value: "",
    setValue: () => {},
    onBlur: () => {},
    config: {},
    state: {
      disabled: false,
      readOnly: true,
      invalid: true,
      pending: false,
      required: true,
    },
    a11y: { id: "id", name: "key", labelledBy: "label", describedBy: "help" },
    focusRef: (v) => {
      focused = v;
    },
    theme: { classFor: () => "" },
    t: defaultMessage,
  };
  const attrs = controlAttributes(p);
  expect(controlAttributes(p, "group")).toMatchObject({
    role: "group",
    "aria-required": undefined,
  });
  expect(attrs).toMatchObject({
    "aria-labelledby": "label",
    "aria-describedby": "help",
    "aria-invalid": "true",
    readOnly: true,
  });
  (attrs.ref as (v: null) => void)(null);
  expect(focused).toBeNull();
  expect(defaultMessage("of.ratingMax")).toBe("Number of stars");
  expect(defaultMessage("of.rating.allowHalf")).toBe("Allow half stars");
  expect(defaultMessage("unknown")).toBe("unknown");
});

test("Rating stays under thirty meaningful authoring lines", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../../components/src/rating.ts", import.meta.url),
    "utf8",
  );
  const definition = source.slice(source.indexOf("export const ratingField"));
  const count = definition
    .split("\n")
    .filter(
      (line) => line.trim() && !/^[{}()[\],;]+$/.test(line.trim()),
    ).length;
  expect(count).toBeLessThan(30);
  expect(count).toBe(29);
});
