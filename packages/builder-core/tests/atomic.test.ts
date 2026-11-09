import { expect, test } from "vitest";
import { createEngine } from "@ourform/core";
import { textField } from "@ourform/components";
import {
  AtomicCommand,
  UpdateProperty,
  RemoveComponent,
  createBuilder,
} from "../src/index";

const fixture = () => ({
  $formVersion: "1.0" as const,
  id: "atomic",
  display: "form" as const,
  components: ["a", "b"].map((id) => ({
    id,
    type: "text",
    key: id,
    label: id,
  })),
});
const engine = () => createEngine().register(textField.model);
test("atomic property edits publish once and undo/redo every schema byte", () => {
  const builder = createBuilder(engine(), fixture());
  const before = JSON.stringify(builder.getState().definition);
  let publications = 0;
  builder.subscribe(() => publications++);
  expect(
    builder.dispatch(
      new AtomicCommand("Required 2 components", [
        new UpdateProperty("a", "validation.required", true),
        new UpdateProperty("b", "validation.required", true),
      ]),
    ),
  ).toEqual([]);
  const after = JSON.stringify(builder.getState().definition);
  expect(publications).toBe(1);
  expect(builder.getState().history.past).toHaveLength(1);
  builder.undo();
  expect(JSON.stringify(builder.getState().definition)).toBe(before);
  builder.redo();
  expect(JSON.stringify(builder.getState().definition)).toBe(after);
});
test("child failure and host lock each refuse all changes and history", () => {
  for (const locked of [false, true]) {
    const builder = createBuilder(
      engine(),
      fixture(),
      locked ? { locked: { b: "all" } } : {},
    );
    const before = builder.getState();
    const result = builder.dispatch(
      new AtomicCommand("Delete", [
        new RemoveComponent("a"),
        new RemoveComponent(locked ? "b" : "absent"),
      ]),
    );
    expect(result.some((diagnostic) => diagnostic.severity === "error")).toBe(
      true,
    );
    expect(builder.getState()).toBe(before);
  }
});
