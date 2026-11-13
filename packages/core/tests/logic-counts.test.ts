import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createEngine, type LogicWorkCounts } from "../src/index";
import { createLogic } from "../src/logic/index";
import type { LogicRule } from "@ourform/schema";
import { field, form, text } from "./helpers";
const baseline = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/performance/logic-work-counts.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const property of [false, true])
  for (const size of [100, 500, 1000])
    test(`${size} fields, property=${property}: indexed rules do exact bounded work and unrelated edits evaluate zero rules`, () => {
      const components = Array.from({ length: size }, (_, i) => field(`f${i}`));
      const logic: LogicRule[] = components.slice(0, -1).map((node) => ({
        id: `rule_${node.id}`,
        trigger: { on: "change" },
        when: ["eq", { ref: node.id }, "yes"],
        then: property
          ? [
              {
                action: "setProperty",
                target: node.id,
                property: "label",
                value: { ref: node.id },
              },
            ]
          : [{ action: "require", target: node.id }],
      }));
      const engine = createEngine({ logic: createLogic() }).register(
        property ? { ...text, logicSettable: ["label"] } : text,
      );
      const compiled = engine.compile({
        ...form(components, { validateOn: "change" }),
        logic,
      });
      if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
      const session = engine.createSession(compiled.form);
      const observe = (id: string) => {
        const before = { ...session.debug.logic! };
        const processors = Object.values(session.debug.processorRuns).reduce(
          (a, b) => a + b,
          0,
        );
        let patches = 0,
          changedFields = 0;
        const stop = session.subscribe((patch) => {
          patches++;
          changedFields += patch.changedFields.length;
        });
        session.setValue(id, "yes", { source: "user" });
        stop();
        return {
          ...Object.fromEntries(
            Object.keys(before).map((key) => [
              key,
              session.debug.logic![key as keyof LogicWorkCounts] -
                before[key as keyof LogicWorkCounts],
            ]),
          ),
          processorRuns:
            Object.values(session.debug.processorRuns).reduce(
              (a, b) => a + b,
              0,
            ) - processors,
          patches,
          changedFields,
        };
      };
      expect(observe(`f${size - 1}`)).toEqual(baseline.unrelatedEdit);
      expect(observe("f0")).toEqual(
        property
          ? { ...baseline.oneRuleEdit, actionExpressions: 1 }
          : baseline.oneRuleEdit,
      );
      session.dispose();
    });
