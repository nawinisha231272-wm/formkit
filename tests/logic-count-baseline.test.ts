import { expect, test } from "vitest";
import { checkLogicCountBaselineEvolution } from "../scripts/work-count-baseline.mjs";
import baseline from "../docs/performance/logic-work-counts.json";

test("rule count evolution rejects higher or removed metrics and changed fixture scale", () => {
  expect(() => checkLogicCountBaselineEvolution(null, baseline)).not.toThrow();
  expect(() =>
    checkLogicCountBaselineEvolution(baseline, baseline),
  ).not.toThrow();
  for (const fixture of ["unrelatedEdit", "oneRuleEdit"] as const)
    for (const metric of Object.keys(baseline[fixture])) {
      const counts = baseline[fixture] as Record<string, number>;
      expect(() =>
        checkLogicCountBaselineEvolution(baseline, {
          ...baseline,
          [fixture]: { ...counts, [metric]: counts[metric]! + 1 },
        }),
      ).toThrow("Cannot increase");
      const removed = { ...counts };
      delete removed[metric];
      expect(() =>
        checkLogicCountBaselineEvolution(baseline, {
          ...baseline,
          [fixture]: removed,
        }),
      ).toThrow("Missing");
    }
  expect(() =>
    checkLogicCountBaselineEvolution(baseline, {
      ...baseline,
      fields: [100, 500],
    }),
  ).toThrow("workload");
  expect(() =>
    checkLogicCountBaselineEvolution(baseline, {
      ...baseline,
      unrelatedEdit: { candidates: -1 },
    }),
  ).toThrow("Invalid");
});
