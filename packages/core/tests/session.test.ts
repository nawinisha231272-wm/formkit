import { test, expect } from "vitest";
import { createEngine, type ComponentModel } from "../src/index";
import type { FormDefinition } from "@ourform/schema";
const text: ComponentModel = {
  type: "text",
  title: "Text",
  value: {
    empty: () => "",
    normalize: (v) => String(v ?? ""),
    isEmpty: (v) => v === "",
  },
};
const schema: FormDefinition = {
  $formVersion: "1.0",
  id: "test",
  components: [
    {
      id: "a",
      type: "text",
      key: "name",
      label: "Name",
      validation: { required: true },
    },
  ],
};
test("headless engine registry and session lifecycle", () => {
  const engine = createEngine().register(text);
  expect(engine.listFields()).toEqual([text]);
  expect(engine.getField("missing")).toBeUndefined();
  const session = engine.createSession(schema);
  expect(session.validate()).toHaveLength(1);
  expect(session.getValue("name")).toBe("");
  expect(session.isTouched("name")).toBe(false);
  session.markTouched("name");
  expect(session.isTouched("name")).toBe(true);
  const events: unknown[] = [];
  const unsub = session.subscribe((e) => events.push(e));
  session.setValue("name", "Ana");
  session.setValue("name", "Ana");
  expect(events).toHaveLength(1);
  expect(session.validate()).toEqual([]);
  unsub();
  session.setValue("name", "Bob");
  expect(events).toHaveLength(1);
  expect(session.getData()).toEqual({ name: "Bob" });
  expect(() => session.setValue("unknown", "x")).toThrow("Unknown field");
  expect(() => engine.register(text)).toThrow("Duplicate");
  expect(
    engine.createSession(schema, { name: "initial" }).getValue("name"),
  ).toBe("initial");
  expect(
    engine
      .createSession({
        ...schema,
        components: [{ ...schema.components[0]!, defaultValue: "default" }],
      })
      .getValue("name"),
  ).toBe("default");
});
test("starter definition errors remain explicit", () => {
  const engine = createEngine().register(text);
  expect(() =>
    engine.createSession({ ...schema, $formVersion: "2" as "1.0" }),
  ).toThrow("Unsupported");
  expect(() =>
    engine.createSession({
      ...schema,
      components: [{ ...schema.components[0]!, id: "" }],
    }),
  ).toThrow("stable");
  expect(() =>
    engine.createSession({
      ...schema,
      components: [
        schema.components[0]!,
        { ...schema.components[0]!, id: "b" },
      ],
    }),
  ).toThrow("Duplicate");
  expect(() => createEngine().createSession(schema)).toThrow("Unregistered");
  expect(() =>
    engine
      .createSession(schema)
      .definition({ ...schema.components[0]!, type: "missing" }),
  ).toThrow("Unregistered");
});
