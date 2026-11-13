import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinComponents } from "@ourform/components";
import { createBuilder, UpdateLogic } from "../src/index";
import type { FormDefinition, LogicRule } from "@ourform/schema";
const definition: FormDefinition = {
  $formVersion: "1.0",
  id: "rules",
  display: "form",
  components: [
    { id: "a", key: "a", type: "text", label: "A" },
    { id: "b", key: "b", type: "text", label: "B" },
  ],
};
const rule = (
  id: string,
  action: "require" | "optional" = "require",
): LogicRule => ({
  id,
  name: id,
  trigger: { on: "change", refs: ["a"] },
  then: [{ action, target: "a" }],
});
const setup = () => {
  const engine = createEngine({ logic: createLogic() });
  for (const registered of builtinComponents) engine.register(registered.model);
  return { engine, builder: createBuilder(engine, definition) };
};
test("rule edits emit one immutable /logic patch, preserve selection and undo/redo byte-identically", () => {
  const { builder: b } = setup();
  b.select("a");
  const patches: unknown[] = [];
  b.subscribe((_state, patch) => patches.push(patch));
  const source = [rule("first")];
  const before = JSON.stringify(b.getState().definition);
  expect(
    b
      .dispatch(new UpdateLogic(source, "Business customers"))
      .some((d) => d.severity === "error"),
  ).toBe(false);
  source[0]!.name = "caller changed";
  expect(b.getState().definition.logic?.[0]?.name).toBe("first");
  expect(b.getState().selection).toBe("a");
  expect(b.getState().history.past).toHaveLength(1);
  expect(b.commandLabel(b.getState().history.past[0]!)).toEqual({
    action: "UpdateLogic",
    label: "Business customers",
  });
  expect(patches.at(-1)).toEqual([
    { op: "add", path: "/logic", value: [rule("first")] },
  ]);
  expect(Object.isFrozen(b.getState().definition.logic?.[0])).toBe(true);
  const after = JSON.stringify(b.getState().definition);
  b.undo();
  expect(JSON.stringify(b.getState().definition)).toBe(before);
  b.redo();
  expect(JSON.stringify(b.getState().definition)).toBe(after);
});
test("add/edit/duplicate/reorder/remove all use one atomic command and wire priority", () => {
  const { builder: b, engine } = setup();
  const check = (rules: LogicRule[], required: boolean) => {
    const before = b.getState().history.past.length;
    b.dispatch(new UpdateLogic(rules, "Rule edit"));
    expect(b.getState().history.past).toHaveLength(before + 1);
    const compiled = engine.compile(b.getState().definition);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const s = engine.createSession(compiled.form);
    expect(s.getFieldState("a").required).toBe(required);
    s.dispose();
  };
  check([rule("first")], true);
  check([rule("first"), rule("copy")], true);
  check([rule("first"), rule("second", "optional")], false);
  check([rule("second", "optional"), rule("first")], true);
  check([rule("second", "optional")], false);
  check([], false);
});
test("no-op, invalid refs and cycles preserve schema, selection, history and redo", () => {
  const { builder: b } = setup();
  b.select("b");
  b.dispatch(new UpdateLogic([rule("first")], "Rules"));
  b.dispatch(new UpdateLogic([], "Rules"));
  b.undo();
  const before = b.getState();
  expect(
    b
      .dispatch(new UpdateLogic(before.definition.logic!, "Rules"))
      .some((d) => d.severity === "error"),
  ).toBe(false);
  expect(b.getState()).toBe(before);
  const invalid = {
    ...rule("invalid"),
    then: [{ action: "require" as const, target: "missing" }],
  };
  expect(
    b.dispatch(new UpdateLogic([invalid])).some((d) => d.severity === "error"),
  ).toBe(true);
  expect(b.getState()).toBe(before);
  const cycles: LogicRule[] = [
    {
      id: "one",
      trigger: { on: "change" },
      then: [{ action: "calculate", target: "b", expr: { ref: "a" } }],
    },
    {
      id: "two",
      trigger: { on: "change", refs: ["b"] },
      then: [{ action: "setValue", target: "a", value: { ref: "b" } }],
    },
  ];
  expect(
    b.dispatch(new UpdateLogic(cycles)).some((d) => d.severity === "error"),
  ).toBe(true);
  expect(b.getState()).toBe(before);
});

test("rule command snapshots safe JSON, captures no-op subjects and uses the form title as fallback", () => {
  const { builder, engine } = setup();
  const rules = [rule("original")];
  const command = new UpdateLogic(rules, "Original rule");
  rules[0]!.then[0] = { action: "optional", target: "a" };
  expect(Object.isFrozen(command)).toBe(true);
  expect(Object.isFrozen(command.rules[0]!.then)).toBe(true);
  expect(builder.dispatch(command)).toEqual([]);
  expect(builder.getState().definition.logic?.[0]!.then[0]!.action).toBe(
    "require",
  );
  const before = builder.getState();
  const noop = new UpdateLogic(command.rules, "No-op rule");
  expect(builder.dispatch(noop)).toEqual([]);
  expect(builder.getState()).toBe(before);
  expect(builder.commandLabel(noop)).toEqual({
    action: "UpdateLogic",
    label: "No-op rule",
  });
  expect(() => new UpdateLogic(JSON.parse('[{"__proto__":{}}]'))).toThrow(
    "safe JSON",
  );
  expect(() => new UpdateLogic(null as unknown as LogicRule[])).toThrow(
    "safe JSON",
  );
  const titled = createBuilder(engine, { ...definition, title: "Form rules" });
  const fallback = new UpdateLogic([]);
  expect(titled.dispatch(fallback)).toEqual([]);
  expect(titled.commandLabel(fallback)).toEqual({
    action: "UpdateLogic",
    label: "Form rules",
  });
});
