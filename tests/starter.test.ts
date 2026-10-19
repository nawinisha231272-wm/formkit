import { test } from "vitest";
import assert from "node:assert/strict";
import { createEngine } from "@ourform/core";
import { ratingField, textField } from "@ourform/components";
import { getEditorProperties } from "@ourform/builder-core";
import feedback from "../fixtures/forms/feedback.json";
const schema: import("@ourform/schema").FormDefinition = {
  ...feedback,
  $formVersion: "1.0",
  display: "form",
};
test("registry, defaults, validation, subscriptions", async () => {
  const engine = createEngine()
    .register(textField.model)
    .register(ratingField.model);
  const compiled = engine.compile(schema);
  assert.ok(compiled.ok);
  const session = engine.createSession(compiled.form);
  const changes: import("@ourform/core").Path[][] = [];
  assert.deepEqual(session.getData(), { name: "", rating: 0 });
  assert.equal((await session.validate()).errors.length, 1);
  session.subscribe((e) => changes.push(e.changedPaths));
  session.setValue("name", "Ana");
  session.setValue("rating", 4);
  assert.deepEqual(session.getData(), { name: "Ana", rating: 4 });
  assert.deepEqual(changes, [[["name"]], [["rating"]]]);
  assert.deepEqual((await session.validate()).errors, []);
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
  const result = engine.compile({
    ...schema,
    components: [schema.components[0]!, { ...schema.components[0]!, id: "z" }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((d) => d.code === "duplicate-key"));
});
