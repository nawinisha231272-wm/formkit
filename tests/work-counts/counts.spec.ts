import { test, expect } from "@playwright/test";
import { checkWorkCounts } from "../../scripts/work-counts.mjs";
import { readFileSync } from "node:fs";
const expected = JSON.parse(
  readFileSync(
    new URL("../../docs/performance/work-counts.json", import.meta.url),
    "utf8",
  ),
);
import type {} from "../../apps/benchmarks/counts";
for (const fixture of ["100", "500", "1000", "onboarding"] as const) {
  test(`${fixture}: exact processor, DOM and render counts for every edit/StatePatch`, async ({
    page,
  }) => {
    await page.goto("/counts.html");
    await page.waitForFunction(() => !!window.ourformWorkCounts);
    const edits = await page.evaluate(
      (fixture) => window.ourformWorkCounts(fixture),
      fixture,
    );
    checkWorkCounts(expected.fixtures[fixture], edits);
    expect(edits).toHaveLength(25);
  });
}
test("DOM counter observes implicit replacements, transient nodes and detached allocations and restores hooks", async ({
  page,
}) => {
  await page.goto("/counts.html");
  await page.waitForFunction(() => !!window.ourformDomWork);
  const result = await page.evaluate(() => {
    const root = document.querySelector("#form")!;
    root.replaceChildren(document.createElement("input"));
    const original = document.createElement;
    const counts = window.ourformDomWork(root, () => {
      document.createElement("aside"); // Never attached: still work.
      root.replaceChildren(document.createElement("button"));
      root.firstChild!.textContent = "new text"; // Implicit native Text allocation.
      const transient = document.createElement("span");
      root.append(transient);
      transient.remove();
    });
    let threw = false;
    try {
      window.ourformDomWork(root, () => {
        throw new Error("host failed");
      });
    } catch {
      threw = true;
    }
    return { counts, restored: document.createElement === original, threw };
  });
  expect(result).toEqual({
    counts: { domCreatedPerEdit: 4, domReplacedPerEdit: 1 },
    restored: true,
    threw: true,
  });
});
