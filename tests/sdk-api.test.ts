import { expect, test } from "vitest";
import ts from "typescript";
import { readFile } from "node:fs/promises";
import * as sdk from "@ourform/sdk";
test("SDK 0.x export inventory matches ADR-0003", async () => {
  const source = await readFile("packages/sdk/src/index.ts", "utf8");
  const file = ts.createSourceFile(
    "index.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const inventory = { values: [] as string[], types: [] as string[] };
  for (const statement of file.statements) {
    expect(ts.isExportDeclaration(statement)).toBe(true);
    if (!ts.isExportDeclaration(statement)) continue;
    expect(
      statement.exportClause && ts.isNamedExports(statement.exportClause),
    ).toBe(true);
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause))
      continue;
    for (const name of statement.exportClause.elements)
      inventory[
        statement.isTypeOnly || name.isTypeOnly ? "types" : "values"
      ].push(name.name.text);
  }
  for (const names of Object.values(inventory)) names.sort();
  expect(inventory).toEqual(
    JSON.parse(await readFile("docs/api/sdk-0.x.json", "utf8")),
  );
  expect(Object.keys(sdk).sort()).toEqual(inventory.values);
  expect([...inventory.values, ...inventory.types]).not.toContain("default");
});
