import { test, expect } from "vitest";
import { ESLint } from "eslint";
test("lint rejects relative cross-package imports and forbidden dependency direction", async () => {
  const eslint = new ESLint();
  for (const code of [
    "import type { FieldDefinition } from '../../sdk/src/index.js';",
    "import type { FieldDefinition } from '@ourform/sdk';",
  ]) {
    const results = await eslint.lintText(code, {
      filePath: "packages/core/src/boundary-probe.ts",
    });
    expect(
      results[0]?.messages.some((m) => m.ruleId === "ourform/boundaries"),
    ).toBe(true);
  }
});
