import { createEngine } from "@ourform/core";
import type {
  Engine,
  FormSession,
  StatePatch,
  SubmitResult,
} from "@ourform/core";
import type { RegisteredField } from "@ourform/sdk";
import { mount } from "./render";
import type { FormView, RenderOptions } from "./render";
import type { Views } from "./shell";
/** @deprecated Themes are explicit host configuration. Retained empty during migration. */
export const defaultThemes = Object.freeze([]);
/** @deprecated Builder recipes are explicit per builder instance. */
export const defaultBuilderThemes = Object.freeze([]);
export interface HostOptions extends Omit<RenderOptions, "views" | "onSubmit"> {
  schema: unknown;
  engine?: Engine;
  fields?: readonly RegisteredField[];
  data?: unknown;
  defaultData?: unknown;
  readOnly?: boolean;
  onChange?: (patch: StatePatch) => void;
  onSubmit?: (result: SubmitResult) => void;
}
export interface FormController {
  engine: Engine;
  session: FormSession;
  view: FormView;
  submit(): Promise<SubmitResult>;
  validate(): ReturnType<FormSession["validate"]>;
  reset(data?: unknown): void;
  focusField(id: string): void;
  setData(data: unknown): void;
  destroy(): void;
}
export function createFormHost(
  fields: readonly RegisteredField[],
  engine: Engine = createEngine(),
): { engine: Engine; views: Views } {
  const views = new Map<string, RegisteredField["views"]>();
  for (const field of fields) {
    const type = field.model.type;
    const previous = views.get(type);
    if (previous?.portable && field.views.portable)
      throw new Error(`Duplicate component registration: ${type}`);
    for (const key of ["native", "packs"] as const)
      for (const adapter of Object.keys(field.views[key] ?? {}))
        if (previous?.[key]?.[adapter])
          throw new Error(`Duplicate ${key} view: ${type} in ${adapter}`);
    const existing = engine.getField(type);
    if (!existing) engine.register(field.model);
    else if (
      existing.value?.normalize !== field.model.value?.normalize ||
      (existing.kind ?? "field") !== (field.model.kind ?? "field") ||
      (existing.dataScope ?? "none") !== (field.model.dataScope ?? "none") ||
      existing.builder?.rootOnly !== field.model.builder?.rootOnly ||
      (typeof existing.slots === "function" ||
      typeof field.model.slots === "function"
        ? existing.slots !== field.model.slots
        : JSON.stringify(existing.slots) !== JSON.stringify(field.model.slots))
    )
      throw new Error(`Conflicting engine model: ${type}`);
    views.set(
      type,
      previous
        ? {
            ...previous,
            ...field.views,
            native: { ...previous.native, ...field.views.native },
            packs: { ...previous.packs, ...field.views.packs },
          }
        : field.views,
    );
  }
  return { engine, views };
}
export function syncData(session: FormSession, data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Controlled data must be an object.");
  for (const entry of session.form.nodes) {
    if (!entry.model.value) continue;
    let incoming: unknown = data;
    for (const segment of entry.path)
      incoming =
        typeof segment === "string" &&
        incoming &&
        typeof incoming === "object" &&
        Object.hasOwn(incoming, segment)
          ? (incoming as Record<string, unknown>)[segment]
          : undefined;
    const normalized = entry.model.value.normalize(
      incoming === undefined ? entry.model.value.empty() : incoming,
    );
    if (
      JSON.stringify(normalized) !==
      JSON.stringify(session.getValue(entry.path))
    )
      session.setValue(entry.path, normalized, { source: "api" });
  }
}
export function createFormController(
  root: Element,
  options: HostOptions,
): FormController {
  const { engine, views } = createFormHost(
    options.fields ?? [],
    options.engine,
  );
  const compiled = engine.compile(options.schema);
  if (!compiled.ok)
    throw new Error(
      compiled.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; "),
    );
  const session = engine.createSession(compiled.form, {
    data: options.data ?? options.defaultData ?? {},
    mode: options.readOnly ? "readOnly" : "edit",
  });
  let view: FormView;
  let destroyed = false;
  let unsubscribe = () => {};
  const controller: FormController = {
    engine,
    session,
    get view() {
      return view;
    },
    submit: () => view.submit(),
    validate: () => session.validate(),
    reset: (data) => view.reset(data),
    focusField: (id) => view.focus(id),
    setData: (data) => syncData(session, data),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      view.unmount();
      session.dispose();
    },
  };
  try {
    const nativeHost =
      options.nativeHost?.forController?.(controller) ?? options.nativeHost;
    view = mount(root, session, {
      ...options,
      ...(nativeHost ? { nativeHost } : {}),
      themes: options.themes ?? [],
      engine,
      views,
    });
  } catch (error) {
    session.dispose();
    throw error;
  }
  unsubscribe = session.subscribe((patch) => options.onChange?.(patch));
  return controller;
}
