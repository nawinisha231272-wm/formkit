import { expect, test } from "vitest";
import {
  validateStructure,
  migrateStructure,
  validateDefinition,
  migrate,
} from "../src/index";
const form = {
  $formVersion: "1.0",
  id: "structure",
  display: "form",
  components: [],
};
test("structural compiler primitives preserve safe opaque rules but full public validation still rejects malformed rules", () => {
  const definition = { ...form, logic: [{ id: "bad", then: [] }] };
  expect(validateStructure(definition)).toEqual([]);
  expect(migrateStructure(definition)).toEqual({
    definition,
    applied: [],
    diagnostics: [],
  });
  expect(validateDefinition(definition)[0]?.code).toBe("invalid-definition");
  expect(migrate(definition).diagnostics[0]?.code).toBe("invalid-definition");
  for (const unsafe of [() => 1, JSON.parse('{"__proto__":{}}')]) {
    expect(
      validateStructure({ ...form, logic: unsafe }).length,
    ).toBeGreaterThan(0);
    expect(
      migrateStructure({ ...form, logic: unsafe }).diagnostics.length,
    ).toBeGreaterThan(0);
  }
  expect(validateStructure({ ...form, components: null })[0]?.code).toBe(
    "invalid-definition",
  );
  expect(migrateStructure(null).diagnostics[0]?.code).toBe(
    "invalid-definition",
  );
});
