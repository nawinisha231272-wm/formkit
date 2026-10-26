import { describe, it, expect, vi } from "vitest";
import { createFeatureLoader } from "../src/feature-loader";

type Factories = NonNullable<Parameters<typeof createFeatureLoader>[4]>;
function setup(options: Parameters<typeof createFeatureLoader>[0] = {}) {
  const modules = {
    settings: { Settings: class {}, settingsStyle: "" },
    json: { mountJsonPanel: vi.fn(() => ({ update: vi.fn(), focus: vi.fn() })), mountComponentJson: vi.fn() },
    history: { mountHistory: vi.fn(() => ({ update: vi.fn() })) },
    logic: { available: false as const }, map: { available: false as const }, commands: { available: false as const },
  };
  const factories = Object.fromEntries(Object.entries(modules).map(([name, module]) => [name, vi.fn(() => Promise.resolve(module))])) as unknown as Factories;
  const abort = new AbortController();
  let idle: (() => void) | undefined;
  const cancel = vi.fn();
  const schedule = vi.fn((callback: () => void) => { idle = callback; return cancel; });
  const importURL = vi.fn(() => Promise.resolve(modules.json));
  const loader = createFeatureLoader(options, "https://app.example/forms/", abort.signal, { schedule }, factories, importURL);
  return { loader, factories, modules, abort, cancel, schedule, importURL, idle: () => idle?.() };
}
describe("builder feature loading", () => {
  it("settings preloads at idle by default while none can opt out", async () => {
    const defaults = setup(); defaults.idle(); await Promise.resolve(); await Promise.resolve();
    expect(defaults.factories.settings).toHaveBeenCalledTimes(1);
    for (const name of ["json", "history", "logic", "map", "commands"] as const)
      expect(defaults.factories[name]).not.toHaveBeenCalled();
    for (const options of [
      { settingsPreload: "none" as const },
      { preload: "none" as const, settingsPreload: "none" as const },
    ]) {
      const state = setup(options); state.idle(); await Promise.resolve();
      expect(state.schedule).not.toHaveBeenCalled();
      for (const factory of Object.values(state.factories)) expect(factory).not.toHaveBeenCalled();
      expect(state.importURL).not.toHaveBeenCalled();
    }
  });
  it("idle fetches only Logic and JSON without mounting either, and cancellation stops scheduling", async () => {
    const state = setup({ preload: "idle", settingsPreload: "none" }); state.idle();
    await state.loader.load("json"); await state.loader.load("logic");
    expect(state.factories.json).toHaveBeenCalledTimes(1); expect(state.factories.logic).toHaveBeenCalledTimes(1);
    for (const name of ["settings", "history", "map", "commands"] as const) expect(state.factories[name]).not.toHaveBeenCalled();
    expect(state.modules.json.mountJsonPanel).not.toHaveBeenCalled();
    expect(state.modules.json.mountComponentJson).not.toHaveBeenCalled();
    const cancelled = setup({ preload: "idle", settingsPreload: "none" }); cancelled.abort.abort(); cancelled.idle();
    expect(cancelled.cancel).toHaveBeenCalledTimes(1); expect(cancelled.factories.json).not.toHaveBeenCalled();
  });
  it("concurrent opens and reopening share one request within an instance", async () => {
    const { loader, factories, modules } = setup();
    const one = loader.load("json"), two = loader.load("json"); expect(one).toBe(two);
    expect(await one).toBe(modules.json); expect(await loader.load("json")).toBe(modules.json);
    expect(factories.json).toHaveBeenCalledTimes(1);
  });
  it("a failed request is retried without poisoning the cache", async () => {
    const state = setup(); vi.mocked(state.factories.json).mockRejectedValueOnce(new Error("offline"));
    await expect(state.loader.load("json")).rejects.toThrow("offline");
    expect(await state.loader.load("json")).toBe(state.modules.json);
    expect(state.factories.json).toHaveBeenCalledTimes(2);
    expect(state.factories.json).toHaveBeenNthCalledWith(1, 0);
    expect(state.factories.json).toHaveBeenNthCalledWith(2, 1);
  });
  it("abort prevents a pending module from completing and later opens from starting", async () => {
    const state = setup(); let resolve!: (module: typeof state.modules.json) => void;
    vi.mocked(state.factories.json).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const request = state.loader.load("json"); await Promise.resolve();
    state.abort.abort(); resolve(state.modules.json);
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(() => state.loader.load("history")).toThrow();
    expect(state.factories.history).not.toHaveBeenCalled();
  });
  it("different builders do not share request or teardown state", async () => {
    const one = setup(), two = setup(); one.abort.abort();
    expect(await two.loader.load("history")).toBe(two.modules.history);
    expect(two.factories.history).toHaveBeenCalledTimes(1); expect(one.factories.history).not.toHaveBeenCalled();
  });
  it("assetBase resolves fixed feature paths through the configured self-hosted directory", async () => {
    const state = setup({ assetBase: "/mirrored/ourform" });
    await state.loader.load("json");
    expect(state.importURL).toHaveBeenCalledExactlyOnceWith("https://app.example/mirrored/ourform/features/json.js");
    expect(state.factories.json).not.toHaveBeenCalled();
  });
  it("assetBase retries use a fresh URL while retaining the fixed feature path", async () => {
    const state = setup({ assetBase: "/mirrored/ourform" });
    state.importURL.mockRejectedValueOnce(new Error("offline"));
    await expect(state.loader.load("settings")).rejects.toThrow("offline");
    await state.loader.load("settings");
    expect(state.importURL).toHaveBeenNthCalledWith(
      1,
      "https://app.example/mirrored/ourform/features/settings.js",
    );
    expect(state.importURL).toHaveBeenNthCalledWith(
      2,
      "https://app.example/mirrored/ourform/features/settings.js?retry=1",
    );
  });
  it("invalid loading configuration throws without importing anything", () => {
    for (const assetBase of ["javascript:alert(1)", "data:text/javascript,", "https://cdn.example/?feature=x", "https://cdn.example/#x"])
      expect(() => setup({ assetBase })).toThrow("assetBase");
    expect(() => setup({ preload: "bad" as "none" })).toThrow("preload");
    expect(() => setup({ settingsPreload: "bad" as "none" })).toThrow("settingsPreload");
  });
});
