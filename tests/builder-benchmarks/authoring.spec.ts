import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { platform, arch } from "node:os";
import { readFileSync } from "node:fs";
const expected = JSON.parse(
  readFileSync("docs/performance/builder-authoring-counts.json", "utf8"),
) as { fields: number; indexNodeVisits: number };
import type {} from "../../apps/playground/builder";

test("record isolated first-use 500-field command indexing with exact node work", async ({
  page,
}) => {
  await page.goto("/builder.html?large&settingsPreload=none");
  await expect(page.locator('#canvas [data-field-id="field_499"]')).toHaveCount(
    1,
  );
  const metric = await page.evaluate(
    async (url) => {
      // This is an internal benchmark of the emitted feature, not a new public SDK entry.
      const { createCommandIndex } = await import(url);
      const definition = window.miniBuilder.builder.getState().definition;
      const index = createCommandIndex();
      const started = performance.now();
      const first = index.load(definition);
      const nodes = await first;
      const milliseconds = performance.now() - started;
      const cached = index.load(definition);
      return {
        milliseconds,
        nodes: nodes.length,
        visits: index.visits,
        cached: cached === first,
      };
    },
    `/@fs${resolve("packages/builder/dist/features/commands.js")}`,
  );
  expect(metric.nodes).toBe(expected.fields);
  expect(metric.visits).toBe(expected.indexNodeVisits);
  expect(metric.cached).toBe(true);
  const report = {
    platform: `${platform()}-${arch()}`,
    fields: 500,
    ...metric,
    advisoryTargetMilliseconds: 50,
    advisoryTargetMet: metric.milliseconds <= 50,
  };
  await mkdir("benchmark-results/builder-authoring", { recursive: true });
  await writeFile(
    `benchmark-results/builder-authoring/${report.platform}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  // Timing is advisory and intentionally does not fail verify or this independent timing job.
});
