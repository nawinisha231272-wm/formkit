import { test, expect } from "@playwright/test";
import type {} from "../../apps/benchmarks/counts";

for (const fixture of ["100", "500", "1000", "onboarding"] as const)
  test(`${fixture}: form edits perform zero redundant CSP declaration writes`, async ({
    page,
  }) => {
    await page.goto("/counts.html");
    await page.waitForFunction(() => !!window.ourformWorkCounts);
    const work = await page.evaluate((fixture) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        CSSStyleDeclaration.prototype,
        "cssText",
      )!;
      const seen = new Map<CSSStyleDeclaration, string>();
      let redundant = 0;
      let writes = 0;
      Object.defineProperty(CSSStyleDeclaration.prototype, "cssText", {
        ...descriptor,
        set(value: string) {
          if (this.parentRule) {
            writes++;
            if (seen.get(this) === value) redundant++;
            seen.set(this, value);
          }
          descriptor.set!.call(this, value);
        },
      });
      try {
        const edits = window.ourformWorkCounts(fixture);
        return { redundant, writes, rules: seen.size, edits: edits.length };
      } finally {
        Object.defineProperty(
          CSSStyleDeclaration.prototype,
          "cssText",
          descriptor,
        );
      }
    }, fixture);
    expect(work.edits).toBe(25);
    expect(work.redundant).toBe(0);
    // Every stylesheet write is a first mount; none of the 25 edits rewrites a rule.
    expect(work.writes).toBe(work.rules);
    expect(work.rules).toBe(fixture === "onboarding" ? 124 : Number(fixture));
  });
