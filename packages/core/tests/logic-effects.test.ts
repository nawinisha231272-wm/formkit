import { expect, test, vi, afterEach } from "vitest";
import { createEngine, FormSession } from "../src/index";
import type { HostFunction, LogicCallContext, StatePatch } from "../src/index";
import { createLogic } from "../src/logic/index";
import { field, form, text } from "./helpers";
import type { LogicAction, LogicTrigger } from "@ourform/schema";
afterEach(() => vi.useRealTimers());
const calls = (
  actions: LogicAction[],
  trigger: LogicTrigger = { on: "event", name: "go" },
  functions: Record<string, HostFunction> = {},
  timeout?: number,
) => {
  const engine = createEngine({
    functions,
    logic: createLogic(
      timeout === undefined ? {} : { nodeCallTimeoutMs: timeout },
    ),
  }).register(text);
  const compiled = engine.compile({
    ...form([field("source"), field("target")]),
    logic: [{ id: "effect-rule", trigger, then: actions }],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return { engine, compiled: compiled.form };
};
const call: LogicAction = {
  action: "call",
  function: "lookup",
  args: [{ ref: "source" }],
};

test("effect-only events publish once; calls run after the patch with frozen data, arguments and event payload", async () => {
  const order: string[] = [];
  let invocation: LogicCallContext | undefined;
  let args: readonly unknown[] | undefined;
  const setup = calls(
    [
      call,
      { action: "focus", target: "target" },
      { action: "emit", name: "done", payload: { ref: "source" } },
      { action: "refreshOptions", target: "target" },
    ],
    undefined,
    {
      lookup: {
        pure: false,
        availableInNode: true,
        run: () => {
          throw Error("effect handler should win");
        },
        effect: (values, context) => {
          order.push("call");
          invocation = context;
          args = values;
          return { ignored: "result never becomes form data" };
        },
      },
    },
  );
  const s = setup.engine.createSession(setup.compiled);
  s.setValue("source", "A");
  const patches: StatePatch[] = [];
  s.subscribe((patch) => {
    patches.push(patch);
    order.push("patch");
  });
  const payload = { request: { id: 1 } };
  s.triggerLogicEvent("go", payload);
  payload.request.id = 99;
  expect(order).toEqual(["patch"]);
  expect(patches).toHaveLength(1);
  expect(patches[0]!.changedFields).toEqual([]);
  expect(patches[0]!.effects?.map((effect) => effect.action)).toEqual([
    "call",
    "focus",
    "emit",
    "refreshOptions",
  ]);
  s.setValue("source", "B");
  await Promise.resolve();
  expect(order).toEqual(["patch", "patch", "call"]);
  expect(invocation!.data).toEqual({ source: "A", target: "" });
  expect(invocation!.event).toEqual({
    name: "go",
    payload: { request: { id: 1 } },
  });
  expect(args).toEqual(["A"]);
  expect(Object.isFrozen(args)).toBe(true);
  expect(Object.isFrozen(invocation!.data)).toBe(true);
  expect(() => {
    (invocation!.data as Record<string, unknown>).source = "tamper";
  }).toThrow();
  expect(s.getData()).toEqual({ source: "B", target: "" });
  expect(s.debug.logic!.effects).toBe(4);
  s.dispose();
});

test("pure/legacy function run receives exactly its declared effect arguments, with no injected context", async () => {
  const run = vi.fn(() => "ignored");
  const setup = calls([call], undefined, {
    lookup: { pure: true, availableInNode: true, run },
  });
  const s = setup.engine.createSession(setup.compiled);
  s.triggerLogicEvent("go");
  await Promise.resolve();
  expect(run).toHaveBeenCalledExactlyOnceWith("");
  s.dispose();
});

test("load effects reach a subscriber installed synchronously after construction, and cancellation prevents cold calls", async () => {
  const run = vi.fn();
  const setup = calls(
    [call, { action: "focus", target: "target" }],
    { on: "load" },
    { lookup: { pure: false, availableInNode: true, run } },
  );
  const first = setup.engine.createSession(setup.compiled);
  const patches: StatePatch[] = [];
  first.subscribe((p) => patches.push(p));
  await Promise.resolve();
  await Promise.resolve();
  expect(patches).toHaveLength(1);
  expect(patches[0]!.effects).toHaveLength(2);
  expect(run).toHaveBeenCalledTimes(1);
  first.dispose();
  const cold = setup.engine.createSession(setup.compiled);
  cold.dispose();
  await Promise.resolve();
  await Promise.resolve();
  expect(run).toHaveBeenCalledTimes(1);
});

test("reset/dispose abort running calls and uncooperative late failures cannot publish", async () => {
  for (const operation of ["reset", "dispose"] as const) {
    let context!: LogicCallContext;
    let reject!: (reason: Error) => void;
    const setup = calls([call], undefined, {
      lookup: {
        pure: false,
        availableInNode: true,
        run: () => {},
        effect: (_args, ctx) => {
          context = ctx;
          return new Promise((_resolve, fail) => {
            reject = fail;
          });
        },
      },
    });
    const s = setup.engine.createSession(setup.compiled);
    const patches: StatePatch[] = [];
    s.subscribe((p) => patches.push(p));
    s.triggerLogicEvent("go");
    await Promise.resolve();
    expect(context.signal.aborted).toBe(false);
    s[operation]();
    expect(context.signal.aborted).toBe(true);
    const count = patches.length;
    reject(Error("late"));
    await Promise.resolve();
    await Promise.resolve();
    expect(patches).toHaveLength(count);
    s.dispose();
  }
});

test("Node skips focus/emit and unavailable calls, awaits allowed calls without changing data", async () => {
  let resolve!: () => void;
  const allowed = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const browser = vi.fn();
  const setup = calls(
    [
      call,
      { action: "call", function: "browser" },
      { action: "focus", target: "target" },
      { action: "emit", name: "skip" },
    ],
    { on: "submit" },
    {
      lookup: { pure: false, availableInNode: true, run: allowed },
      browser: { pure: false, availableInNode: false, run: browser },
    },
  );
  const s = new FormSession({
    ...setup.compiled,
    logic: setup.compiled.logic!.replay(),
  });
  const patches: StatePatch[] = [];
  s.subscribe((p) => patches.push(p));
  let settled = false;
  const result = s.submit().then((value) => {
    settled = true;
    return value;
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  expect(allowed).toHaveBeenCalledTimes(1);
  expect(browser).not.toHaveBeenCalled();
  expect(patches.flatMap((p) => p.effects ?? []).map((e) => e.action)).toEqual([
    "call",
  ]);
  resolve();
  expect(await result).toEqual({ ok: true, data: { source: "", target: "" } });
  s.dispose();
});

test("Node default 5s timeout and custom timeout abort the host, return diagnostics and ignore late completions", async () => {
  vi.useFakeTimers();
  for (const timeout of [undefined, 25]) {
    let context!: LogicCallContext;
    let finish!: () => void;
    const setup = calls(
      [call],
      { on: "submit" },
      {
        lookup: {
          pure: false,
          availableInNode: true,
          run: () => {},
          effect: (_args, ctx) => {
            context = ctx;
            return new Promise<void>((done) => {
              finish = done;
            });
          },
        },
      },
      timeout,
    );
    const s = new FormSession({
      ...setup.compiled,
      logic: setup.compiled.logic!.replay(),
    });
    const patches: StatePatch[] = [];
    s.subscribe((p) => patches.push(p));
    let settled = false;
    const result = s.submit().then((value) => {
      settled = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync((timeout ?? 5000) - 1);
    expect(settled).toBe(false);
    expect(context.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const value = await result;
    expect(value.ok).toBe(false);
    if (!value.ok)
      expect(value.errors.map((e) => e.error.code)).toContain(
        "logic-call-timeout",
      );
    expect(context.signal.aborted).toBe(true);
    const count = patches.length;
    finish();
    await vi.runAllTimersAsync();
    expect(patches).toHaveLength(count);
    s.dispose();
  }
});

test("reset/dispose during Node submit returns aborted rather than stale success", async () => {
  for (const operation of ["reset", "dispose"] as const) {
    const setup = calls(
      [call],
      { on: "submit" },
      {
        lookup: {
          pure: false,
          availableInNode: true,
          run: () => new Promise(() => {}),
        },
      },
    );
    const s = new FormSession({
      ...setup.compiled,
      logic: setup.compiled.logic!.replay(),
    });
    const result = s.submit();
    await Promise.resolve();
    s[operation]();
    const value = await result;
    expect(value.ok).toBe(false);
    if (!value.ok)
      expect(value.errors.map((e) => e.error.code)).toContain(
        "logic-call-aborted",
      );
    s.dispose();
  }
});

test("unknown effect refs/functions fail compile and invalid timeout options are programmer errors", () => {
  const e = createEngine({ logic: createLogic() }).register(text);
  for (const action of [
    { action: "call", function: "missing" },
    { action: "focus", target: "missing" },
  ]) {
    const result = e.compile({
      ...form([field()]),
      logic: [{ id: "bad", trigger: { on: "load" }, then: [action] }],
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain(
      action.action === "call" ? "unknown-function" : "bad-ref",
    );
  }
  for (const nodeCallTimeoutMs of [0, -1, NaN, Infinity])
    expect(() => createLogic({ nodeCallTimeoutMs })).toThrow(TypeError);
});

test("failed calls and invalid effect payloads publish diagnostics with English defaults", async () => {
  for (const invalid of [false, true]) {
    const setup = calls(
      invalid
        ? [
            {
              action: "call",
              function: "lookup",
              args: [
                ["call", "large"],
                ["call", "large"],
              ],
            },
          ]
        : [call],
      undefined,
      {
        lookup: {
          pure: false,
          availableInNode: true,
          run: () => Promise.reject(Error("host unavailable")),
        },
        large: {
          pure: true,
          availableInNode: true,
          run: () => Array(60000).fill(0),
        },
      },
    );
    const s = setup.engine.createSession(setup.compiled);
    const patches: StatePatch[] = [];
    s.subscribe((p) => patches.push(p));
    s.triggerLogicEvent("go");
    await Promise.resolve();
    await Promise.resolve();
    const code = invalid ? "invalid-logic-effect" : "logic-call-unavailable";
    expect(
      patches.flatMap((p) => p.diagnostics ?? []).map((d) => d.code),
    ).toContain(code);
    const result = await s.submit();
    expect(result.ok).toBe(false);
    expect(s.localize(`of.logic.${code}`)).not.toBe(`of.logic.${code}`);
    expect(s.localize("of.validation.required", { label: "Target" })).toBe(
      "Target is required",
    );
    s.dispose();
  }
});
for (const size of [100, 500, 1000])
  test(`${size} fields/rules: named effects use the trigger index and do constant exact work`, async () => {
    const e = createEngine({ logic: createLogic() }).register(text);
    const compiled = e.compile({
      ...form(Array.from({ length: size }, (_, i) => field(`f${i}`))),
      logic: Array.from({ length: size }, (_, i) => ({
        id: `r${i}`,
        trigger: { on: "event", name: `go${i}` },
        then: [{ action: "emit", name: `done${i}`, payload: { ref: `f${i}` } }],
      })),
    });
    if (!compiled.ok) throw Error(JSON.stringify(compiled.diagnostics));
    const s = e.createSession(compiled.form);
    const before = { ...s.debug.logic! };
    const processors = { ...s.debug.processorRuns };
    let patches = 0;
    s.subscribe(() => patches++);
    s.triggerLogicEvent("go0");
    const after = s.debug.logic!;
    expect(
      Object.fromEntries(
        Object.keys(before).map((key) => [
          key,
          after[key as keyof typeof after] - before[key as keyof typeof before],
        ]),
      ),
    ).toEqual({
      sourceChecks: 0,
      valueChecks: 0,
      overrideInvalidations: 0,
      indexReads: 1,
      triggerReads: 0,
      candidates: 1,
      conditions: 0,
      actionExpressions: 1,
      writers: 0,
      edges: 1,
      writes: 0,
      cascades: 0,
      effects: 1,
    });
    expect(s.debug.processorRuns).toEqual(processors);
    expect(patches).toBe(1);
    const unrelated = { ...s.debug.logic! };
    s.triggerLogicEvent("unknown");
    expect(s.debug.logic!.candidates - unrelated.candidates).toBe(0);
    expect(s.debug.logic!.effects - unrelated.effects).toBe(0);
    expect(patches).toBe(1);
    await Promise.resolve();
    s.dispose();
  });
