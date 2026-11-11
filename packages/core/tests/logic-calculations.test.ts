import { expect, test } from "vitest";
import { createEngine } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, text, number } from "./helpers";

test("root calculations fold in rule order over the field's position-zero formula", () => {
  for (const reverse of [false, true]) {
    const e = createEngine({ logic: createLogic() })
      .register(text)
      .register(number);
    const rules = [3, 4].map((expr) => ({
      id: `calculate-${expr}`,
      trigger: { on: "change" },
      when: ["neq", { ref: "source" }, "off"],
      then: [{ action: "calculate", target: "target", expr }],
    }));
    const c = e.compile({
      ...form([
        field("source"),
        field("target", { type: "number", calculate: { expr: 2 } }),
      ]),
      logic: reverse ? rules.reverse() : rules,
    });
    if (!c.ok) throw new Error(JSON.stringify(c.diagnostics));
    const s = e.createSession(c.form);
    expect(s.getValue("target")).toBe(reverse ? 3 : 4);
    s.setValue("source", "off");
    expect(s.getValue("target")).toBe(2);
    expect(s.getFieldState("target").logic).toBeUndefined();
    s.dispose();
  }
});

test("without a field formula, inactive root calculations retain otherwise/revert and later-user-edit semantics", () => {
  for (const otherwise of ["revert", "none"] as const) {
    const e = createEngine({ logic: createLogic() })
      .register(text)
      .register(number);
    const c = e.compile({
      ...form([
        field("source", { defaultValue: "yes" }),
        field("target", { type: "number" }),
      ]),
      logic: [
        {
          id: "root-only",
          trigger: { on: "change" },
          when: ["eq", { ref: "source" }, "yes"],
          then: [{ action: "calculate", target: "target", expr: 3 }],
          otherwise,
        },
      ],
    });
    if (!c.ok) throw new Error(JSON.stringify(c.diagnostics));
    const s = e.createSession(c.form);
    expect(s.getValue("target")).toBe(3);
    s.setValue("source", "no");
    expect(s.getValue("target")).toBe(otherwise === "revert" ? null : 3);
    expect(s.getFieldState("target").logic?.authoritative ?? false).toBe(false);
    s.setValue("target", 9, { source: "user" });
    expect(s.getValue("target")).toBe(9);
    s.dispose();
  }
});

test("sequential root values read current root-calculated dependencies as well as legacy calculations", () => {
  const e = createEngine({ logic: createLogic() })
    .register(text)
    .register(number);
  const c = e.compile({
    ...form([
      field("source"),
      field("bridge", { type: "number", defaultValue: 2 }),
      field("derived", { type: "number" }),
      field("result", { type: "number" }),
    ]),
    logic: [
      {
        id: "ordered",
        trigger: { on: "change", refs: ["source"] },
        then: [
          { action: "setValue", target: "bridge", value: 3 },
          { action: "setValue", target: "result", value: { ref: "derived" } },
        ],
      },
      {
        id: "derived",
        trigger: { on: "change" },
        then: [
          {
            action: "calculate",
            target: "derived",
            expr: ["mul", { ref: "bridge" }, 2],
          },
        ],
      },
    ],
  });
  if (!c.ok) throw new Error(JSON.stringify(c.diagnostics));
  const s = e.createSession(c.form);
  s.setValue("source", "go");
  expect(s.getData()).toEqual({
    source: "go",
    bridge: 3,
    derived: 6,
    result: 6,
  });
  s.dispose();
});

test("an invalid root calculation is diagnosed without throwing and cannot submit successfully", async () => {
  const e = createEngine({ logic: createLogic() }).register({
    ...text,
    value: {
      ...text.value!,
      normalize: (value: unknown) => {
        if (typeof value !== "string") throw new TypeError("Expected text");
        return value;
      },
    },
  });
  const c = e.compile({
    ...form([field("target")]),
    logic: [
      {
        id: "invalid-calculation",
        trigger: { on: "load" },
        then: [{ action: "calculate", target: "target", expr: 42 }],
      },
    ],
  });
  if (!c.ok) throw new Error(JSON.stringify(c.diagnostics));
  const s = e.createSession(c.form);
  const result = await s.submit();
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.errors.map((error) => error.error.code)).toContain(
      "invalid-logic-value",
    );
  expect(s.getValue("target")).toBe("");
  s.dispose();
});

test("an inactive root calculation does not suppress the ordinary default when a field becomes visible again", () => {
  const e = createEngine({ logic: createLogic() })
    .register(text)
    .register(number);
  const c = e.compile({
    ...form([
      field("show", { defaultValue: "yes" }),
      field("source"),
      field("target", {
        type: "number",
        defaultValue: 7,
        visibleWhen: ["eq", { ref: "show" }, "yes"],
      }),
    ]),
    logic: [
      {
        id: "inactive",
        trigger: { on: "change" },
        when: ["eq", { ref: "source" }, "active"],
        then: [{ action: "calculate", target: "target", expr: 3 }],
      },
    ],
  });
  if (!c.ok) throw new Error(JSON.stringify(c.diagnostics));
  const s = e.createSession(c.form);
  expect(s.getValue("target")).toBe(7);
  s.setValue("show", "no");
  expect(s.getValue("target")).toBeNull();
  s.setValue("show", "yes");
  expect(s.getValue("target")).toBe(7);
  s.dispose();
});
