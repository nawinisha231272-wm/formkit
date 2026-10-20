import { expect, test } from "vitest";
import { stringValue, numberValue } from "@ourform/sdk";
import { textField, ratingField } from "@ourform/components";
import {
  componentTestEngine,
  checkBuilderRoundTrip,
  checkValidation,
  checkValueAdapter,
} from "../src/authoring";
const definition = {
  $formVersion: "1.0" as const,
  id: "test-kit",
  display: "form" as const,
  components: [
    { id: "name", type: "text", key: "name", validation: { required: true } },
  ],
};
test("author test kit checks adapter empties/canonical values and detects broken adapters", () => {
  checkValueAdapter(stringValue(), [null, "hello", 42]);
  checkValueAdapter(numberValue({ empty: null }), ["3", null, 0]);
  checkValueAdapter(
    {
      empty: () => ({}),
      normalize: (value) =>
        Object.fromEntries(
          Object.entries(value as Record<string, unknown>).reverse(),
        ),
      isEmpty: (value) => Object.keys(value).length === 0,
    },
    [{ a: 1, b: 2 }],
  );
  expect(() =>
    checkValueAdapter(
      { empty: () => NaN, normalize: () => NaN, isEmpty: Number.isNaN },
      [],
    ),
  ).toThrow("safe JSON");
  expect(() =>
    checkValueAdapter({ ...stringValue(), isEmpty: () => false }, []),
  ).toThrow("must be empty");
  expect(() =>
    checkValueAdapter({ ...stringValue(), serialize: (value) => value + "x" }, [
      "hello",
    ]),
  ).toThrow("round trip");
});
test("author test kit verifies canonical validation and generated builder round trips", async () => {
  const engine = componentTestEngine([textField, ratingField]);
  checkBuilderRoundTrip(engine, "text");
  checkBuilderRoundTrip(engine, "rating");
  expect(() => checkBuilderRoundTrip(engine, "absent")).toThrow("palette");
  await checkValidation(engine, definition, [
    { data: {}, valid: false, codes: ["required"] },
    { data: { name: "Ada" }, valid: true },
    { data: { name: "Ada", extra: 1 }, valid: false, codes: ["submission"] },
  ]);
  await expect(
    checkValidation(engine, definition, [{ data: {}, valid: true }]),
  ).rejects.toThrow("mismatch");
  await expect(
    checkValidation(
      engine,
      { ...definition, components: [{ id: "bad", type: "absent" }] },
      [],
    ),
  ).rejects.toThrow("unknown-type");
});
