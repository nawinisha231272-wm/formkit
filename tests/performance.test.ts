import { test, expect } from "vitest";
import { checkPerformance } from "../scripts/performance-budget.mjs";
test("performance budget accepts the 20% boundary and rejects each metric beyond it", () => {
  const baseline = { compileMS: 10, mountMS: 10, editMS: 10, themeMS: 10 };
  expect(() =>
    checkPerformance(baseline, {
      compileMS: 12,
      mountMS: 12,
      editMS: 12,
      themeMS: 12,
    }),
  ).not.toThrow();
  for (const key of Object.keys(baseline))
    expect(() =>
      checkPerformance(baseline, { ...baseline, [key]: 12.01 }),
    ).toThrow("regression >20%");
  expect(() =>
    checkPerformance(baseline, { ...baseline, editMS: NaN }),
  ).toThrow("Invalid performance metric");
});
