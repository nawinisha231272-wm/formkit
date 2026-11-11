import { expect, test } from "vitest";
import { engine, field, form } from "./helpers";
import { createLogic } from "../src/logic/index";

test("root logic without registration fails closed, including a declared empty list; legacy conditions still execute", () => {
  const e = engine();
  const legacy = form([
    field("answer"),
    field("dependent", { visibleWhen: ["eq", { ref: "answer" }, "yes"] }),
  ]);
  for (const logic of [
    [],
    [
      {
        id: "rule",
        trigger: { on: "change" },
        then: [{ action: "require", target: "dependent" }],
      },
    ],
  ]) {
    const result = e.compile({ ...legacy, logic });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual({
      severity: "error",
      code: "missing-logic",
      message:
        "Root logic requires @ourform/core/logic registration at createEngine.",
    });
  }
  const result = e.compile(legacy);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Legacy definition must compile.");
  const session = e.createSession(result.form);
  expect(session.getFieldState("dependent").visible).toBe(false);
  session.setValue("answer", "yes");
  expect(session.getFieldState("dependent").visible).toBe(true);
  session.dispose();
});

test("no-logic engine detects opaque rule declarations while registered runtime validates every wire shape", () => {
  for (const logic of [null, "untrusted", {}, [{ id: "bad", then: [] }]]) {
    const input = { ...form([field()]), logic };
    expect(engine().compile(input).diagnostics[0]?.code).toBe("missing-logic");
    expect(
      engine().registerLogic(createLogic()).compile(input).diagnostics[0]?.code,
    ).toBe("invalid-definition");
  }
});
