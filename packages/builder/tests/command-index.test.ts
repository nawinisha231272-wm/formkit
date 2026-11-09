import { expect, test } from "vitest";
import { createCommandIndex } from "../src/features/commands";
import type { FormDefinition } from "@ourform/schema";

test("command indexing never mutates frozen nested form children", async () => {
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: "frozen",
    display: "form",
    components: [
      {
        id: "panel",
        type: "panel",
        components: [
          { id: "first", type: "text" },
          { id: "second", type: "text" },
        ],
      },
    ],
  };
  Object.freeze(definition.components[0]!.components);
  expect(
    (await createCommandIndex().load(definition)).map((node) => node.id),
  ).toEqual(["panel", "first", "second"]);
});

test("500-field command index visits each node once and caches until schema identity changes", async () => {
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: "index",
    display: "form",
    components: Array.from({ length: 500 }, (_, n) => ({
      id: `f${n}`,
      type: "text",
      key: `f${n}`,
      label: `Field ${n}`,
    })),
  };
  const index = createCommandIndex();
  const first = index.load(definition);
  expect(index.load(definition)).toBe(first);
  expect((await first).length).toBe(500);
  expect(index.visits).toBe(500);
  expect(await index.load(definition)).toBe(await first);
  const changed = {
    ...definition,
    components: [...definition.components, { id: "extra", type: "text" }],
  };
  expect((await index.load(changed)).length).toBe(501);
  expect(index.visits).toBe(501);
});
