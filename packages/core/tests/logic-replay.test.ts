import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createEngine, FormSession } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, text, number } from "./helpers";

const definition: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/forms/logic/load-initializer.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const engine = () =>
  createEngine({ logic: createLogic() }).register(text).register(number);

test("load writes initialize once, are not authoritative, and submission replay derives state without replaying values", async () => {
  const e = engine();
  const compiled = e.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const browser = e.createSession(compiled.form);
  expect(browser.getValue("target")).toBe("A");
  expect(browser.getFieldState("target").logic).toEqual({
    ruleId: "copy-at-load",
    authoritative: false,
  });
  browser.setValue("source", "B", { source: "user" });
  browser.setValue("details", "provided");
  expect(await browser.submit()).toEqual({
    ok: true,
    data: { source: "B", target: "A", details: "provided" },
  });
  for (const execution of ["interactive", "submission"] as const) {
    const replay = new FormSession(
      execution === "submission"
        ? { ...compiled.form, logic: compiled.form.logic!.replay() }
        : compiled.form,
      { data: browser.getData() },
    );
    expect(replay.getValue("target")).toBe(
      execution === "submission" ? "A" : "B",
    );
    expect(replay.getFieldState("details").required).toBe(true);
    replay.reset({ source: "B", target: "retained" });
    expect(replay.getValue("target")).toBe(
      execution === "submission" ? "retained" : "B",
    );
    expect(replay.getFieldState("details").required).toBe(true);
    replay.dispose();
  }
  browser.dispose();
});

test("setValue and clear to a non-overridable calculation are compile errors naming rule and field, including otherwise and every trigger", () => {
  for (const allowOverride of [undefined, false])
    for (const action of [
      { action: "setValue", target: "target", value: 99 },
      { action: "clear", target: "target" },
    ])
      for (const trigger of [
        { on: "load" },
        { on: "change", refs: ["source"] },
        { on: "submit" },
        { on: "event", name: "write" },
      ])
        for (const otherwise of [false, true]) {
          const compiled = engine().compile({
            ...form([
              field("source"),
              field("target", {
                type: "number",
                calculate: {
                  expr: 2,
                  ...(allowOverride === undefined ? {} : { allowOverride }),
                },
              }),
            ]),
            logic: [
              {
                id: "conflicting-write",
                trigger,
                then: otherwise ? [] : [action],
                ...(otherwise ? { otherwise: [action] } : {}),
              },
            ],
          });
          expect(compiled.ok).toBe(false);
          expect(compiled.diagnostics).toContainEqual(
            expect.objectContaining({
              severity: "error",
              code: "logic-calculation-conflict",
              componentId: "target",
              message: expect.stringMatching(/conflicting-write.*target/),
            }),
          );
        }
});

test("continuous root calculations reject competing assignments regardless of rule order", () => {
  const calculation = {
    id: "continuous",
    trigger: { on: "change" },
    then: [{ action: "calculate", target: "target", expr: 2 }],
  };
  const write = {
    id: "edge-write",
    trigger: { on: "change", refs: ["source"] },
    then: [{ action: "setValue", target: "target", value: 99 }],
  };
  for (const logic of [
    [calculation, write],
    [write, calculation],
  ]) {
    const compiled = engine().compile({
      ...form([field("source"), field("target", { type: "number" })]),
      logic,
    });
    expect(compiled.ok).toBe(false);
    expect(compiled.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "logic-calculation-conflict",
        componentId: "target",
        message: expect.stringMatching(/edge-write.*target.*continuous/),
      }),
    );
  }
});

test("root replay preserves supplied allowOverride values but still calculates missing ones", () => {
  const e = engine();
  const compiled = e.compile({
    ...form([
      field("target", {
        type: "number",
        calculate: { expr: 2, allowOverride: true },
      }),
    ]),
    logic: [],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  for (const raw of [0, 99, undefined]) {
    const s = new FormSession(
      { ...compiled.form, logic: compiled.form.logic!.replay() },
      { data: raw === undefined ? {} : { target: raw } },
    );
    expect(s.getValue("target")).toBe(raw ?? 2);
    s.dispose();
  }
});
