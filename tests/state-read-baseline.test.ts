import { expect, test } from "vitest";
import baseline from "../docs/performance/renderer-state-read-counts.json";
import { checkStateReadBaselineEvolution } from "../scripts/state-read-baseline.mjs";
test("state-read gate accepts equality and refuses increases, removal and workload changes", () => {
  expect(() => checkStateReadBaselineEvolution(null, baseline)).not.toThrow();
  expect(() =>
    checkStateReadBaselineEvolution(baseline, baseline),
  ).not.toThrow();
  for (const name of Object.keys(
    baseline.cases,
  ) as (keyof typeof baseline.cases)[]) {
    expect(() =>
      checkStateReadBaselineEvolution(baseline, {
        ...baseline,
        cases: { ...baseline.cases, [name]: baseline.cases[name] + 1 },
      }),
    ).toThrow("Cannot increase");
    const removed: { [key: string]: number } = { ...baseline.cases };
    delete removed[name];
    expect(() =>
      checkStateReadBaselineEvolution(baseline, {
        ...baseline,
        cases: removed,
      }),
    ).toThrow("missing");
  }
  expect(() =>
    checkStateReadBaselineEvolution(baseline, { ...baseline, edits: 1 }),
  ).toThrow("workload");
});
