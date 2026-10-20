import { expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createEngine } from "@ourform/core";
import {
  createBuilder,
  AddComponent,
  UpdateProperty,
} from "@ourform/builder-core";
import { ratingField } from "@ourform/components";

test("SDK scenario A: shipped portable Rating uses fewer than 30 meaningful non-import lines", async () => {
  const source = await readFile("packages/components/src/rating.ts", "utf8");
  const file = ts.createSourceFile(
    "rating.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const start = file.statements
    .find((statement) => !ts.isImportDeclaration(statement))!
    .getStart(file);
  // Formatting-only punctuation/blank lines and imports do not count as author logic.
  const meaningful = source
    .slice(start)
    .split("\n")
    .filter((line) => line.trim() && !/^[\s{}()[\],;]+$/.test(line));
  expect(meaningful).toHaveLength(29);
  expect(meaningful.length).toBeLessThan(30);
});
test("SDK scenario B source: conventional React registration is one statement without mapping options", async () => {
  const source = await readFile("apps/playground/sdk-extensions.ts", "utf8");
  const file = ts.createSourceFile(
    "sdk-extensions.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const statements = file.statements.filter(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => declaration.name.getText(file) === "conventional",
      ),
  );
  expect(statements).toHaveLength(1);
  const statement = statements[0]! as ts.VariableStatement;
  const expression = statement.declarationList.declarations[0]!.initializer!;
  expect(ts.isCallExpression(expression)).toBe(true);
  if (ts.isCallExpression(expression)) {
    expect(expression.expression.getText(file)).toBe("registerReactField");
    expect(expression.arguments).toHaveLength(2);
  }
});
test("SDK scenario D: unchanged Rating appears in generated palette and edits max with zero builder code", () => {
  const engine = createEngine().register(ratingField.model);
  const builder = createBuilder(engine, {
    $formVersion: "1.0",
    id: "scenario-d",
    display: "form",
    components: [],
  });
  expect(
    builder
      .palette()
      .flatMap((group) => group.components)
      .map((component) => component.type),
  ).toContain("rating");
  expect(builder.dispatch(new AddComponent("rating"))).toEqual([]);
  const node = builder.getState().definition.components[0]!;
  const max = builder
    .propertyPanel(node.id)
    .groups.flatMap((group) => group.properties)
    .find((property) => property.key === "properties.max");
  expect(max).toMatchObject({ kind: "number", value: 5, min: 1, max: 10 });
  expect(
    builder.dispatch(new UpdateProperty(node.id, "properties.max", 7)),
  ).toEqual([]);
  expect(builder.getState().definition.components[0]!.properties?.max).toBe(7);
  builder.undo();
  expect(
    builder.getState().definition.components[0]!.properties?.max,
  ).toBeUndefined();
  builder.redo();
  expect(builder.getState().definition.components[0]!.properties?.max).toBe(7);
});
