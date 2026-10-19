import { test } from "vitest";
import assert from "node:assert/strict";
import { createEngine } from "@ourform/core";
import { ratingField, textField } from "@ourform/components";
import { getEditorProperties } from "@ourform/builder-core";
import feedback from "../fixtures/forms/feedback.json";
const schema: import("@ourform/schema").FormDefinition = {
  ...feedback,
  $formVersion: "1.0",
};
test("registry, defaults, validation, subscriptions", () => {
  const engine = createEngine()
    .register(textField.model)
    .register(ratingField.model);
  const session = engine.createSession(schema);
  const changes: string[][] = [];
  session.subscribe((e) => changes.push(e.changedPaths));
  assert.deepEqual(session.getData(), { name: "", rating: 0 });
  assert.equal(session.validate().length, 1);
  session.setValue("name", "Ana");
  session.setValue("rating", 4);
  assert.deepEqual(session.getData(), { name: "Ana", rating: 4 });
  assert.deepEqual(changes, [["name"], ["rating"]]);
  assert.deepEqual(session.validate(), []);
  assert.ok(
    getEditorProperties(schema.components[1]!, ratingField.model).some(
      (p) => p.key === "max" && p.value === 5,
    ),
  );
});
test("duplicate plugin type is rejected", () => {
  const engine = createEngine().register(textField.model);
  assert.throws(() => engine.register(textField.model), /Duplicate component/);
});
test("duplicate data key is rejected", () => {
  const engine = createEngine().register(textField.model);
  assert.throws(
    () =>
      engine.createSession({
        ...schema,
        components: [
          schema.components[0]!,
          { ...schema.components[0]!, id: "z" },
        ],
      }),
    /Duplicate/,
  );
});
