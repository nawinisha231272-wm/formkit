/** Feature code is shared by ESM; promises and lifecycle belong to this builder instance. */
export interface FeatureModules {
  settings: typeof import("./settings");
  json: typeof import("./features/json");
  history: typeof import("./features/history");
  logic: typeof import("./features/logic");
  map: typeof import("./features/map");
  commands: typeof import("./features/commands");
}
export type FeatureName = keyof FeatureModules;
export interface FeatureOptions {
  /** Base directory containing the self-hosted features/*.js and shared chunks. */
  assetBase?: string;
  /** Fetch Logic/JSON after idle; neither view is mounted. Default: none. */
  preload?: "none" | "idle";
  /** Fetch generated Settings after first render. Default: idle. */
  settingsPreload?: "none" | "idle";
}
type Imports = { [K in FeatureName]: (attempt: number) => Promise<FeatureModules[K]> };
const imports: Imports = {
  settings: (attempt) =>
    attempt === 0 ? import("./settings") : import("./features/settings-retry"),
  json: () => import("./features/json"),
  history: () => import("./features/history"),
  logic: () => import("./features/logic"),
  map: () => import("./features/map"),
  commands: () => import("./features/commands"),
};
export interface IdleScheduler {
  schedule(callback: () => void): () => void;
}
export function createFeatureLoader(
  options: FeatureOptions,
  baseURI: string,
  signal: AbortSignal,
  idle: IdleScheduler,
  factories: Imports = imports,
  importURL: (url: string) => Promise<unknown> = (url) => import(/* @vite-ignore */ url),
) {
  for (const key of ["preload", "settingsPreload"] as const)
    if (options[key] !== undefined && !["none", "idle"].includes(options[key]))
      throw new Error(`Builder ${key} must be none or idle.`);
  let base: URL | undefined;
  if (options.assetBase !== undefined) {
    base = new URL(options.assetBase, baseURI);
    if (!['https:', 'http:'].includes(base.protocol) || base.search || base.hash)
      throw new Error("Builder assetBase must be an HTTP(S) asset directory.");
    if (!base.pathname.endsWith('/')) base.pathname += '/';
  }
  const pending = new Map<FeatureName, Promise<unknown>>();
  const attempts = new Map<FeatureName, number>();
  function load<K extends FeatureName>(name: K): Promise<FeatureModules[K]> {
    signal.throwIfAborted();
    const previous = pending.get(name);
    if (previous) return previous as Promise<FeatureModules[K]>;
    const attempt = attempts.get(name) ?? 0;
    const request: Promise<FeatureModules[K]> = Promise.resolve().then(() => {
      signal.throwIfAborted();
      if (!base) return factories[name](attempt);
      const url = new URL(`features/${name}.js`, base);
      if (attempt > 0) url.searchParams.set("retry", String(attempt));
      return importURL(url.href).then(module => module as FeatureModules[K]);
    }).then((module: FeatureModules[K]) => {
      signal.throwIfAborted();
      return module;
    }).catch((error: unknown) => {
      pending.delete(name);
      attempts.set(name, attempt + 1);
      throw error;
    });
    pending.set(name, request);
    return request;
  }
  if (
    options.preload === "idle" ||
    options.settingsPreload !== "none"
  ) {
    const cancel = idle.schedule(() => {
      if (!signal.aborted) {
        // A preload failure must not poison a later explicit activation/retry.
        const names: FeatureName[] = [];
        if (options.settingsPreload !== "none") names.push("settings");
        if (options.preload === "idle") names.push("logic", "json");
        for (const name of names) void load(name).catch(() => {});
      }
    });
    signal.addEventListener("abort", cancel, { once: true });
  }
  return { load };
}
export type FeatureLoader = ReturnType<typeof createFeatureLoader>;
