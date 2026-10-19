import { test, expect } from "vitest";
import { createEngine } from "../src/index";
import { text, engine, field, form, session } from "./helpers";
const schema = form([
  field("name", { id: "a", label: "Name", validation: { required: true } }),
]);
test("headless engine registry and session lifecycle", async () => {
  const e = engine();
  expect(e.listFields()).toContainEqual(text);
  expect(e.getField("missing")).toBeUndefined();
  const s = session(e, schema);
  expect((await s.validate()).errors).toHaveLength(1);
  expect(s.getValue("name")).toBe("");
  expect(s.getFieldState("a").touched).toBe(false);
  s.touch("name");
  expect(s.getFieldState("a").touched).toBe(true);
  const events: unknown[] = [];
  const unsub = s.subscribe((e) => events.push(e));
  s.setValue("name", "Ana");
  s.setValue("name", "Ana");
  expect(events).toHaveLength(1);
  expect((await s.validate()).valid).toBe(true);
  expect(events).toHaveLength(2);
  unsub();
  s.setValue("name", "Bob");
  expect(events).toHaveLength(2);
  expect(s.getData()).toEqual({ name: "Bob" });
  expect(() => s.setValue("unknown", "x")).toThrow("Unknown field");
  expect(() => e.register(text)).toThrow("Duplicate");
  expect(session(e, schema, { name: "initial" }).getValue("name")).toBe(
    "initial",
  );
  expect(
    session(e, form([field("name", { defaultValue: "default" })])).getValue(
      "name",
    ),
  ).toBe("default");
});
test("starter definition errors now return compile diagnostics", () => {
  const e = engine();
  expect(e.compile({ ...schema, $formVersion: "2" })).toMatchObject({
    ok: false,
    diagnostics: [{ code: "invalid-definition" }],
  });
  expect(
    e.compile({ ...schema, components: [field("name", { id: "" })] }),
  ).toMatchObject({ ok: false, diagnostics: [{ code: "invalid-definition" }] });
  expect(
    e.compile(form([field("name"), field("name", { id: "b" })])),
  ).toMatchObject({ ok: false, diagnostics: [{ code: "duplicate-key" }] });
  expect(createEngine().compile(schema)).toMatchObject({
    ok: false,
    diagnostics: [{ code: "unknown-type" }],
  });
  expect(() =>
    session(e, schema).definition(field("name", { id: "a", type: "missing" })),
  ).toThrow("Unregistered");
});
