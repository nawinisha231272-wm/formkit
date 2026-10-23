import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import {
  createBuilder,
  RemoveComponent,
  MoveComponent,
  UpdateProperty,
  DuplicateComponent,
  AddComponent,
} from "@ourform/builder-core";

test("history labels retain action and original subject through delete, selection and replay", () => {
  const engine = createEngine();
  for (const field of builtinComponents) engine.register(field.model);
  const builder = createBuilder(engine, {
    $formVersion: "1.0",
    id: "history-label",
    display: "form",
    components: [
      { id: "email", type: "email", key: "email", label: "Email" },
      { id: "name", type: "text", key: "name", label: "Name" },
    ],
  });
  const unchanged = builder.getState().definition;
  const noOp = new UpdateProperty("email", "label", "Email");
  expect(builder.dispatch(noOp)).toEqual([]);
  expect(builder.commandLabel(noOp)).toEqual({
    action: "UpdateProperty",
    label: "Email",
  });
  expect(builder.getState().definition).toBe(unchanged);
  expect(builder.getState().history.past).toHaveLength(0);
  for (const command of [
    new MoveComponent("email", { index: 1 }),
    new UpdateProperty("email", "label", "Work email"),
    new DuplicateComponent("email"),
    new RemoveComponent("email"),
    new AddComponent("email"),
  ]) {
    const expected =
      command.type === "AddComponent"
        ? "Email"
        : ["RemoveComponent", "DuplicateComponent"].includes(command.type)
          ? "Work email"
          : "Email";
    expect(
      builder.dispatch(command).filter((d) => d.severity === "error"),
    ).toEqual([]);
    expect(builder.commandLabel(command)).toEqual({
      action: command.type,
      label: expected,
    });
    builder.select(null);
    builder.undo();
    expect(builder.commandLabel(command).label).toBe(expected);
    builder.redo();
    expect(builder.commandLabel(command).label).toBe(expected);
  }
});
