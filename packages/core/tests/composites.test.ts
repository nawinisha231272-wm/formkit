import { expect, test } from "vitest";
import { createEngine } from "../src/index";
import type { ComponentModel } from "../src/index";
const definition = (type: string, extra = {}) => ({
  $formVersion: "1.0",
  id: "composite",
  display: "form",
  components: [{ id: "instance", type, ...extra }],
});
test("composite compiler rejects unsafe, malformed, missing and recursive expansion without throwing", () => {
  const cases: ComponentModel[] = [
    { type: "missing", title: "Missing", kind: "composite" },
    {
      type: "recursive",
      title: "Recursive",
      kind: "composite",
      expand: () => [{ id: "again", type: "recursive" }],
    },
    {
      type: "throws",
      title: "Throws",
      kind: "composite",
      expand: () => {
        throw new Error("Author failure");
      },
    },
    {
      type: "shape",
      title: "Shape",
      kind: "composite",
      expand: () => [{ id: "", type: "unknown" }],
    },
    {
      type: "unsafe",
      title: "Unsafe",
      kind: "composite",
      expand: () =>
        JSON.parse('[{"id":"unsafe","type":"text","constructor":1}]'),
    },
    {
      type: "unknown",
      title: "Unknown",
      kind: "composite",
      expand: () => [{ id: "child", type: "absent" }],
    },
  ];
  for (const model of cases) {
    const engine = createEngine().register(model);
    expect(engine.compile(definition(model.type))).toMatchObject({
      ok: false,
      diagnostics: expect.any(Array),
    });
  }
  const engine = createEngine().register({
    type: "valid",
    title: "Valid",
    kind: "composite",
    expand: () => [],
  });
  expect(
    engine.compile(definition("valid", { components: [] })).diagnostics,
  ).toContainEqual(expect.objectContaining({ code: "invalid-composite" }));
});
