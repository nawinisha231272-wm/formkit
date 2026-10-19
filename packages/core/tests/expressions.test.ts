import { test, expect } from "vitest";
import {
  compileExpression,
  fromJsonLogic,
  type FunctionMap,
} from "../src/index";
import { engine, field, form, session } from "./helpers";
const context = {
  getRef: (id: string) => (id === "n" ? 2 : undefined),
  getPath: () => [1, 2, 3],
  mode: "edit" as const,
};
function run(input: unknown, functions: FunctionMap = {}): unknown {
  const result = compileExpression(input, {
    byRef: (id) => (id === "n" ? ["n"] : undefined),
    byPath: () => ["n"],
    functions,
  });
  expect(result.diagnostics).toEqual([]);
  return result.expression!.evaluate(context);
}
test.each([
  [null, null],
  [true, true],
  ["literal", "literal"],
  [2, 2],
  [["add", 1, 2, 3], 6],
  [["sub", 5, 2], 3],
  [["mul", 2, 3, 4], 24],
  [["div", 6, 2], 3],
  [["mod", 7, 3], 1],
  [["div", 1, 0], null],
  [["mod", 1, 0], null],
  [["add", 1, "2"], null],
  [["mul", 1e308, 1e308], null],
  [["eq", 2, 2], true],
  [["eq", 2, "2"], false],
  [["neq", 2, "2"], false],
  [["neq", 2, 3], true],
  [["gt", 3, 2], true],
  [["gte", 2, 2], true],
  [["lt", "a", "b"], true],
  [["lte", 3, 3], true],
  [["gt", null, null], false],
  [["and", true, 1], true],
  [["and", true, 0], false],
  [["or", false, "x"], true],
  [["not", 0], true],
  [["if", true, "yes", "no"], "yes"],
  [["if", false, "yes", "no"], "no"],
  [["empty", " "], true],
  [["empty", false], false],
  [["empty", null], true],
  [["len", "abc"], 3],
  [["len", 3], null],
  [["sum", 1, 2, 3], 6],
  [["sum"], 0],
  [["min", 5, 2], 2],
  [["max", 5, 2], 5],
  [["concat", "a", "b"], "ab"],
  [["concat", "a", 2], null],
  [["in", "b", "abc"], true],
  [["in", 2, "abc"], false],
  [{ ref: "n" }, 2],
  [{ path: "data.values" }, [1, 2, 3]],
  [{ path: "form.mode" }, "edit"],
  [["sum", { path: "data.values" }], 6],
  [["min", { path: "data.values" }], 1],
  [["max", { path: "data.values" }], 3],
  [["len", { path: "data.values" }], 3],
  [["in", 2, { path: "data.values" }], true],
] as [unknown, unknown][])("expression %j returns %j", (expr, expected) =>
  expect(run(expr)).toEqual(expected),
);
test("aggregates/empty/len on host data and null arithmetic", () => {
  for (const [value, expr, expected] of [
    [[], ["empty", { path: "data.a" }], true],
    [{}, ["empty", { path: "data.a" }], true],
    [{ x: 1 }, ["len", { path: "data.a" }], 1],
    [[], ["min", { path: "data.a" }], null],
    [[], ["max", { path: "data.a" }], null],
    [[1, "2"], ["sum", { path: "data.a" }], null],
  ] as [unknown, unknown, unknown][]) {
    const r = compileExpression(expr, { byRef: () => [], byPath: () => [] });
    expect(
      r.expression!.evaluate({ ...context, getPath: () => value }),
    ).toEqual(expected);
  }
  expect(run(["add", null, 1])).toBeNull();
  expect(run(["in", null, null])).toBe(false);
});
test("expressions short-circuit and host function failures return null", () => {
  let calls = 0;
  const fn = {
    pure: true,
    availableInNode: true,
    run: () => {
      calls++;
      return 4;
    },
  };
  expect(run(["if", true, 1, ["call", "test"]], { test: fn })).toBe(1);
  expect(run(["and", false, ["call", "test"]], { test: fn })).toBe(false);
  expect(run(["or", true, ["call", "test"]], { test: fn })).toBe(true);
  expect(calls).toBe(0);
  expect(run(["call", "test"], { test: fn })).toBe(4);
  expect(calls).toBe(1);
  expect(
    run(["call", "test"], {
      test: {
        ...fn,
        run: () => {
          throw new Error("host");
        },
      },
    }),
  ).toBeNull();
  expect(
    run(["call", "test"], { test: { ...fn, run: () => undefined } }),
  ).toBeNull();
  const s = session(
    engineWithFunction(),
    form([
      field("name", {
        calculate: { expr: ["call", "upper", { ref: "source" }] },
      }),
      field("source", { defaultValue: "ada" }),
    ]),
  );
  expect(s.getValue("name")).toBe("ADA");
  s.setValue("source", "bob");
  expect(s.getValue("name")).toBe("BOB");
});
function engineWithFunction() {
  const e = engine(); // use a distinct engine configured with a host function
  const configured =
    new (e.constructor as typeof import("../src/index").Engine)({
      functions: {
        upper: {
          pure: true,
          availableInNode: true,
          run: (v) => String(v).toUpperCase(),
        },
      },
    });
  for (const model of e.listFields()) configured.register(model);
  return configured;
}
test("invalid operators, arities, references, paths, host functions and limits produce diagnostics", () => {
  const bindings = { byRef: () => undefined, byPath: () => undefined };
  for (const [expr, code] of [
    [["nope", 1], "invalid-expression"],
    [["__proto__"], "invalid-expression"],
    [["not", 1, 2], "invalid-expression"],
    [{}, "invalid-expression"],
    [{ ref: "missing" }, "bad-ref"],
    [{ path: "data.unknown" }, "bad-path"],
    [{ path: "row.a" }, "bad-path"],
    [{ path: "data.constructor" }, "unsafe-path"],
    [["call", "missing"], "unknown-function"],
    [["call", 2], "unknown-function"],
    [undefined, "invalid-expression"],
  ] as [unknown, string][]) {
    expect(
      compileExpression(expr, bindings).diagnostics.some(
        (d) => d.code === code,
      ),
      JSON.stringify(expr),
    ).toBe(true);
  }
  for (const flags of [
    { pure: false, availableInNode: true },
    { pure: true, availableInNode: false },
  ])
    expect(
      compileExpression(["call", "test"], {
        ...bindings,
        functions: { test: { ...flags, run: () => 1 } },
      }).diagnostics[0]!.code,
    ).toBe("unknown-function");
  let deep: unknown = 1;
  for (let i = 0; i < 66; i++) deep = ["not", deep];
  expect(
    compileExpression(deep, bindings).diagnostics.some(
      (d) => d.code === "expression-limit",
    ),
  ).toBe(true);
  expect(
    compileExpression(
      ["sum", ...Array(2000).fill(1)],
      bindings,
    ).diagnostics.some((d) => d.code === "expression-limit"),
  ).toBe(true);
});
test("JSONLogic subset converts and reports unsupported constructs", () => {
  expect(fromJsonLogic({ ">": [{ var: "qty" }, 2] })).toEqual({
    expr: ["gt", { path: "data.qty" }, 2],
    diagnostics: [],
  });
  expect(fromJsonLogic({ var: "data.qty" }).expr).toEqual({ path: "data.qty" });
  expect(fromJsonLogic({ "!": true }).expr).toEqual(["not", true]);
  expect(fromJsonLogic(null).expr).toBeNull();
  expect(fromJsonLogic({ unsupported: [1] }).diagnostics[0]!.code).toBe(
    "unsupported-jsonlogic",
  );
  expect(fromJsonLogic({ var: ["a", "fallback"] }).diagnostics[0]!.code).toBe(
    "unsupported-jsonlogic",
  );
  let deep: unknown = true;
  for (let i = 0; i < 66; i++) deep = { "!": deep };
  expect(
    fromJsonLogic(deep).diagnostics.some((d) => d.code === "expression-limit"),
  ).toBe(true);
});
test("JSON type mismatches and inherited operator names never change expression meaning", () => {
  const r = compileExpression(["neq", null, { path: "data.value" }], {
    byRef: () => [],
    byPath: () => [],
  });
  expect(r.expression!.evaluate({ ...context, getPath: () => ({}) })).toBe(
    false,
  );
  expect(fromJsonLogic({ "==": [1, "1"] }).diagnostics[0]!.code).toBe(
    "unsupported-jsonlogic",
  );
  expect(
    fromJsonLogic(JSON.parse('{"__proto__":1}')).diagnostics[0]!.code,
  ).toBe("unsupported-jsonlogic");
});
