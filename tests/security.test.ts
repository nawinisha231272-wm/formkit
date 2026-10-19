import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { engine, field, form } from "../packages/core/tests/helpers";
test("prototype-polluting keys and expression paths are compile diagnostics", () => {
  const e = engine();
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const input = form([field("name", { key })]);
    expect(
      e.compile(input).diagnostics.some((d) => d.code === "unsafe-key"),
    ).toBe(true);
    expect(
      e
        .compile(
          form([
            field("name", {
              calculate: { expr: { path: `data.${key}.polluted` } },
            }),
          ]),
        )
        .diagnostics.some((d) => d.code === "unsafe-path"),
    ).toBe(true);
    const polluted = JSON.parse(
      `{"$formVersion":"1.0","id":"form","display":"form","components":[],"meta":{"${key}":{"polluted":true}}}`,
    );
    expect(
      e.compile(polluted).diagnostics.some((d) => d.code === "unsafe-key"),
    ).toBe(true);
  }
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});
test("repository executable sources contain no eval, Function construction or with statements", () => {
  const violations: string[] = [];
  function visitDir(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (
        [
          "node_modules",
          "dist",
          ".git",
          "coverage",
          ".turbo",
          "test-results",
          "playwright-report",
        ].includes(entry.name)
      )
        continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visitDir(file);
      else if (/\.(ts|js|mjs)$/.test(file)) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        function scan(node: ts.Node): void {
          if (
            ts.isWithStatement(node) ||
            (ts.isNewExpression(node) &&
              ts.isIdentifier(node.expression) &&
              node.expression.text === "Function") ||
            (ts.isCallExpression(node) &&
              ts.isIdentifier(node.expression) &&
              ["eval", "Function"].includes(node.expression.text))
          )
            violations.push(
              `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
            );
          ts.forEachChild(node, scan);
        }
        scan(source);
      }
    }
  }
  visitDir(process.cwd());
  expect(violations).toEqual([]);
});
