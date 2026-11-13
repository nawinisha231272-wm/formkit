import { expect, test } from "vitest";
import {
  checkLogicConsumers,
  logicConsumerLimits,
} from "../scripts/logic-consumer-size.mjs";

const passing = () => ({
  noLogic: {
    brotli: 29_200,
    includesLogicBody: false,
    includesRuleMetaSchema: false,
  },
  enabled: { includesLogicBody: true, includesRuleMetaSchema: true },
  increment: 7_000,
});
test("pay-for-use gates enforce owner limits at equality and reject one-byte regressions", () => {
  expect(logicConsumerLimits).toEqual({
    mainNoLogic: 28_232,
    noLogic: 29_200,
    increment: 7_000,
    noLogicFull: 68_500,
  });
  expect(checkLogicConsumers(passing())).toEqual([]);
  const noLogic = passing();
  noLogic.noLogic.brotli++;
  expect(checkLogicConsumers(noLogic)).toContain(
    "matched no-logic form: 29201 > 29200",
  );
  const enabled = passing();
  enabled.increment++;
  expect(checkLogicConsumers(enabled)).toContain(
    "opt-in logic increment: 7001 > 7000",
  );
});
test("size alone cannot approve a no-logic build carrying rules or an enabled build missing validation", () => {
  for (const flag of ["includesLogicBody", "includesRuleMetaSchema"] as const) {
    const leaked = passing();
    leaked.noLogic[flag] = true;
    expect(checkLogicConsumers(leaked)).toContain(
      "no-logic form includes rule execution or wire meta-schema",
    );
    const missing = passing();
    missing.enabled[flag] = false;
    expect(checkLogicConsumers(missing)).toContain(
      "enabled form is missing rule execution or wire validation",
    );
  }
});
