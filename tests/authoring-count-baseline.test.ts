import { expect, test } from "vitest";
import { checkAuthoringCountBaselineEvolution } from "../scripts/work-count-baseline.mjs";
import baseline from "../docs/performance/builder-authoring-counts.json";

test("authoring count expectations reject increases, missing metrics and workload changes", () => {
  expect(() =>
    checkAuthoringCountBaselineEvolution(null, baseline),
  ).not.toThrow();
  expect(() =>
    checkAuthoringCountBaselineEvolution(baseline, baseline),
  ).not.toThrow();
  expect(() =>
    checkAuthoringCountBaselineEvolution(baseline, {
      ...baseline,
      indexNodeVisits: 501,
    }),
  ).toThrow("Cannot increase");
  for (const action of ["delete", "move", "required"] as const)
    for (const metric of [
      "childCommands",
      "publications",
      "historyEntries",
    ] as const)
      expect(() =>
        checkAuthoringCountBaselineEvolution(baseline, {
          ...baseline,
          bulk: {
            ...baseline.bulk,
            [action]: {
              ...baseline.bulk[action],
              [metric]: baseline.bulk[action][metric] + 1,
            },
          },
        }),
      ).toThrow("Cannot increase");
  expect(() =>
    checkAuthoringCountBaselineEvolution(baseline, {
      ...baseline,
      fields: 499,
    }),
  ).toThrow("workload");
  expect(() =>
    checkAuthoringCountBaselineEvolution(baseline, { ...baseline, bulk: {} }),
  ).toThrow("missing");
  expect(() =>
    checkAuthoringCountBaselineEvolution(baseline, {
      ...baseline,
      indexNodeVisits: 499,
    }),
  ).not.toThrow();
});
