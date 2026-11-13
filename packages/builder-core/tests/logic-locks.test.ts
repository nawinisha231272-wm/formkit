import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";
import { builtinComponents } from "@ourform/components";
import { createBuilder, ReplaceDefinition, UpdateLogic } from "../src/index";
import type { FormDefinition, LogicRule } from "@ourform/schema";
import type { Builder, LockLevel } from "../src/index";

const rule = (target = "a"): LogicRule => ({
  id: "business",
  name: "Business customers",
  trigger: { on: "change", refs: ["b"] },
  when: ["eq", { ref: "b" }, "business"],
  then: [{ action: "require", target }],
});
function setup(locked: Record<string, LockLevel>, logic?: LogicRule[]) {
  const engine = createEngine({ logic: createLogic() });
  for (const field of builtinComponents) engine.register(field.model);
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: "logic-locks",
    display: "form",
    components: [
      { id: "a", key: "a", type: "text", label: "Account" },
      { id: "b", key: "b", type: "text", label: "Customer type" },
      {
        id: "panel",
        type: "panel",
        label: "Details",
        components: [
          { id: "child", type: "text", key: "child", label: "Child" },
        ],
      },
    ],
    ...(logic ? { logic } : {}),
  };
  return createBuilder(engine, definition, { locked });
}
function replace(builder: Builder, logic: LogicRule[]) {
  return builder.dispatch(
    new ReplaceDefinition({ ...builder.getState().definition, logic }),
  );
}
function refused(builder: Builder, logic: LogicRule[], id: string) {
  const before = builder.getState();
  expect(replace(builder, logic)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "locked-component", componentId: id }),
    ]),
  );
  expect(builder.getState()).toBe(before);
}
test("all locks reject new, changed and removed root contributions through JSON", () => {
  refused(setup({ a: "all" }), [rule()], "a");
  const builder = setup({ a: "all" }, [rule()]);
  refused(builder, [{ ...rule(), when: true }], "a");
  refused(builder, [{ ...rule(), enabled: false }], "a");
  refused(builder, [{ ...rule(), trigger: { on: "load" } }], "a");
  refused(builder, [{ ...rule(), otherwise: "none" }], "a");
  refused(builder, [], "a");
});
test("all locks cover subtree targets and inherited state from an ancestor", () => {
  refused(setup({ panel: "all" }), [rule("child")], "panel");
  refused(
    setup({ child: "all" }),
    [{ ...rule(), then: [{ action: "hide", target: "panel" }] }],
    "child",
  );
});

test("UpdateLogic cannot bypass all locks, including otherwise actions and propagated state", () => {
  for (const action of [
    "show",
    "hide",
    "enable",
    "disable",
    "setReadOnly",
  ] as const) {
    const builder = setup({ child: "all" });
    const before = builder.getState();
    const contribution = {
      ...rule(),
      then: [],
      otherwise: [
        action === "setReadOnly"
          ? { action, target: "panel", value: true }
          : { action, target: "panel" },
      ],
    };
    expect(builder.dispatch(new UpdateLogic([contribution]))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "locked-component",
          componentId: "child",
        }),
      ]),
    );
    expect(builder.getState()).toBe(before);
  }
});
test("locked inputs may drive editable targets and unrelated actions in mixed rules remain editable", () => {
  const read: LogicRule = {
    ...rule("b"),
    trigger: { on: "change", refs: ["a"] },
    when: ["eq", { ref: "a" }, "yes"],
  };
  expect(replace(setup({ a: "all" }), [read])).toEqual([]);
  const mixed = {
    ...rule(),
    then: [...rule().then, { action: "require" as const, target: "b" }],
  };
  const builder = setup({ a: "all" }, [mixed]);
  expect(
    replace(builder, [
      { ...mixed, then: [...rule().then, { action: "optional", target: "b" }] },
    ]),
  ).toEqual([]);
  expect(replace(builder, [{ ...mixed, then: rule().then }])).toEqual([]);
});
test("key and structure locks allow logic edits and history restores them byte-identically", () => {
  for (const level of ["key", "structure"] as const) {
    const builder = setup({ a: level });
    const before = JSON.stringify(builder.getState().definition);
    expect(replace(builder, [rule()])).toEqual([]);
    const after = JSON.stringify(builder.getState().definition);
    expect(builder.undo()).toEqual([]);
    expect(JSON.stringify(builder.getState().definition)).toBe(before);
    expect(builder.redo()).toEqual([]);
    expect(JSON.stringify(builder.getState().definition)).toBe(after);
  }
});
test("priority changes on a locked target are refused, unrelated rule insertion is allowed", () => {
  const second = {
    ...rule(),
    id: "second",
    then: [{ action: "optional" as const, target: "a" }],
  };
  const builder = setup({ a: "all" }, [rule(), second]);
  refused(builder, [second, rule()], "a");
  expect(
    replace(builder, [{ ...rule("b"), id: "unrelated" }, rule(), second]).some(
      (d) => d.severity === "error",
    ),
  ).toBe(false);
});
