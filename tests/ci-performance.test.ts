import { test, expect } from "vitest";
import { checkWorkCounts } from "../scripts/work-counts.mjs";
import { pairedRatios, compareTimings } from "../scripts/timing-statistics.mjs";
import {
  advanceNightly,
  nightlyIssuePlan,
} from "../scripts/nightly-performance.mjs";
const expected = {
  processorsPerEdit: 26,
  domCreatedPerEdit: 0,
  domReplacedPerEdit: 0,
  statePatchesPerEdit: 1,
  rendersPerStatePatch: 26,
};
const edit = () => ({ ...expected, rendersPerStatePatch: [26] });
test("count gate rejects every work increase and requires a baseline update for decreases", () => {
  const edits = Array.from({ length: 25 }, edit);
  expect(() => checkWorkCounts(expected, edits)).not.toThrow();
  for (const key of [
    "processorsPerEdit",
    "domCreatedPerEdit",
    "domReplacedPerEdit",
    "statePatchesPerEdit",
  ] as const)
    expect(() =>
      checkWorkCounts(expected, [
        { ...edit(), [key]: expected[key] + 1 },
        ...edits.slice(1),
      ]),
    ).toThrow("increased");
  expect(() =>
    checkWorkCounts(expected, [
      { ...edit(), rendersPerStatePatch: [27] },
      ...edits.slice(1),
    ]),
  ).toThrow("increased");
  expect(() =>
    checkWorkCounts(expected, [
      { ...edit(), processorsPerEdit: 25 },
      ...edits.slice(1),
    ]),
  ).toThrow("Update the reviewed count baseline");
  expect(() =>
    checkWorkCounts(expected, [
      { ...edit(), rendersPerStatePatch: [25] },
      ...edits.slice(1),
    ]),
  ).toThrow("decreased");
  expect(() => checkWorkCounts(expected, edits.slice(1))).toThrow("25 edits");
});
const results = (value: number) =>
  [100, 500, 1000].map((count) => ({
    count,
    samples: 15,
    processorRuns: 650,
    compileMS: value,
    mountMS: value,
    editMS: value,
    themeMS: value,
  }));
test("A/B reports median paired ratios from at least five pairs rather than a ratio of medians", () => {
  const pairs = [1, 10, 100, 1000, 10000].map((value, index) => ({
    main: results(value),
    candidate: results(value * [5, 5, 1, 0.01, 0.01][index]!),
  }));
  expect(pairedRatios(pairs).map((row) => row.compileMS)).toEqual([1, 1, 1]);
  expect(() => pairedRatios(pairs.slice(1))).toThrow("five");
  expect(() =>
    pairedRatios([
      { main: results(0), candidate: results(1) },
      ...pairs.slice(1),
    ]),
  ).toThrow("Invalid");
});
test("nightly ratios retain exact >20% boundary and reject missing/corrupt measurements", () => {
  expect(
    compareTimings({ results: results(10) }, results(12)).every(
      (metric) => !metric.exceeded,
    ),
  ).toBe(true);
  expect(
    compareTimings({ results: results(10) }, results(12.01)).every(
      (metric) => metric.exceeded,
    ),
  ).toBe(true);
  expect(() => compareTimings({ results: results(10) }, results(NaN))).toThrow(
    "Invalid",
  );
  expect(() =>
    compareTimings({ results: results(10) }, results(12).slice(1)),
  ).toThrow("Expected one");
});
test("nightly issue opens only on the third consecutive bad night; gaps, recovery and new baselines reset", () => {
  const bad = compareTimings({ results: results(10) }, results(13));
  const good = compareTimings({ results: results(10) }, results(10));
  const first = advanceNightly(null, "2026-10-20", "baseline-a", bad);
  const second = advanceNightly(first, "2026-10-21", "baseline-a", bad);
  expect(nightlyIssuePlan(first, undefined).action).toBe("none");
  expect(nightlyIssuePlan(second, undefined).action).toBe("none");
  expect(advanceNightly(second, "2026-10-21", "baseline-a", bad)).toBe(second);
  const third = advanceNightly(second, "2026-10-22", "baseline-a", bad);
  const plan = nightlyIssuePlan(third, undefined);
  expect(plan.action).toBe("create");
  expect(plan.body).toContain("three consecutive nights");
  expect(
    nightlyIssuePlan(third, {
      body: `Human notes\n${plan.body}\nKeep these notes`,
    }).action,
  ).toBe("update");
  expect(
    nightlyIssuePlan(third, {
      body: `Human notes\n${plan.body}\nKeep these notes`,
    }).body,
  ).toContain("Keep these notes");
  for (const reset of [
    advanceNightly(second, "2026-10-23", "baseline-a", bad),
    advanceNightly(second, "2026-10-22", "baseline-b", bad),
  ])
    expect(nightlyIssuePlan(reset, undefined).action).toBe("none");
  const recovered = advanceNightly(third, "2026-10-23", "baseline-a", good);
  expect(
    Object.values(recovered.metrics).every((metric) => metric.streak === 0),
  ).toBe(true);
  expect(nightlyIssuePlan(recovered, { body: plan.body }).body).toContain(
    "No metric currently",
  );
  expect(() => advanceNightly(null, "invalid", "a", bad)).toThrow(
    "Invalid nightly date",
  );
});

test("nightly streaks belong to individual metrics and cannot inherit another platform's history", () => {
  const baseline = { results: results(10) };
  const spike = (metric: "compileMS" | "mountMS" | "editMS") =>
    compareTimings(
      baseline,
      results(10).map((row) =>
        row.count === 500 ? { ...row, [metric]: 13 } : row,
      ),
    );
  let state = advanceNightly(null, "2026-10-20", "a", spike("compileMS"));
  state = advanceNightly(state, "2026-10-21", "a", spike("mountMS"));
  state = advanceNightly(state, "2026-10-22", "a", spike("editMS"));
  expect(nightlyIssuePlan(state, undefined).action).toBe("none");
  const foreign = {
    ...state,
    platform: "darwin-arm64",
    metrics: Object.fromEntries(
      Object.entries(state.metrics).map(([key, value]) => [
        key,
        { ...value, streak: 99 },
      ]),
    ),
  };
  const next = advanceNightly(foreign, "2026-10-23", "a", spike("editMS"));
  expect(next.metrics["500/editMS"]!.streak).toBe(1);
  expect(nightlyIssuePlan(next, undefined).action).toBe("none");
});

test("PR cannot hide extra work by raising expectations or removing fixtures; reviewed decreases are allowed", async () => {
  const { checkCountBaselineEvolution } = await import(
    "../scripts/work-count-baseline.mjs"
  );
  const baseline = { version: 1, edits: 25, fixtures: { "500": expected } };
  expect(() => checkCountBaselineEvolution(null, baseline)).not.toThrow();
  expect(() => checkCountBaselineEvolution(baseline, baseline)).not.toThrow();
  for (const key of Object.keys(expected))
    expect(() =>
      checkCountBaselineEvolution(baseline, {
        ...baseline,
        fixtures: {
          "500": {
            ...expected,
            [key]: expected[key as keyof typeof expected] + 1,
          },
        },
      }),
    ).toThrow("Cannot increase count baseline");
  expect(() =>
    checkCountBaselineEvolution(baseline, { ...baseline, fixtures: {} }),
  ).toThrow("Cannot remove");
  expect(() =>
    checkCountBaselineEvolution(baseline, { ...baseline, edits: 1 }),
  ).toThrow("workload");
  expect(() =>
    checkCountBaselineEvolution(baseline, {
      ...baseline,
      fixtures: { "500": { ...expected, processorsPerEdit: 25 } },
    }),
  ).not.toThrow();
});
