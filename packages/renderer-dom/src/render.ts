import { bootstrap4Theme } from "@ourform/theme-bootstrap4";
import { resolveView, nativeSlot } from "./native";
import type { NativeHost } from "./native";
export { resolveView } from "./native";
export type { NativeHost, NativeUnit } from "./native";
import { bootstrap5Theme } from "@ourform/theme-bootstrap5";
import { tailwindTheme } from "@ourform/theme-tailwind";
import type { Engine, FormSession } from "@ourform/core";
import { defaultMessage, escapeHtml, renderVNodeToString } from "@ourform/sdk";
import type { FocusTarget, Theme, ThemeMode } from "@ourform/sdk";
import { fieldErrors, shellVNode } from "./shell";
import type { FieldPresentation, Views } from "./shell";
import { resolveTheme, themeStyle } from "./theme";
import type { ThemeOptions } from "./theme";
import { mountVNode } from "./vnode-dom";
export { mountVNode } from "./vnode-dom";
export { resolveTheme } from "./theme";
export type { ThemeOptions, ResolvedTheme } from "./theme";
export type { FieldPresentation, Views } from "./shell";
export type AppearanceTheme =
  | "base"
  | "bootstrap"
  | "bootstrap4"
  | "bootstrap5"
  | "tailwind";
export interface RenderOptions extends ThemeOptions {
  views: Views;
  adapter?: string;
  nativeHost?: NativeHost;
  onSubmit?: (result: Awaited<ReturnType<FormSession["submit"]>>) => void;
  onAction?: (event: {
    name: string;
    componentId: string;
    data: unknown;
  }) => void;
  theme?: Theme | string;
  idPrefix?: string;
  presentation?: Readonly<Record<string, FieldPresentation>>;
  t?: typeof defaultMessage;
}
export interface FormView {
  setTheme(theme: Theme | string): void;
  setMode(mode: ThemeMode): void;
  focus(componentId: string): void;
  submit(): ReturnType<FormSession["submit"]>;
  destroy(): void;
  unmount(): void;
}
export function mount(
  root: Element,
  session: FormSession,
  options: RenderOptions & { engine: Engine },
): FormView {
  for (const entry of session.form.nodes)
    if (options.engine.getField(entry.node.type) !== entry.model)
      throw new Error("Session and renderer must use the same engine.");
  return mountForm(root, session, options);
}
function mountForm(
  root: Element,
  session: FormSession,
  options: RenderOptions,
): FormView {
  const document = root.ownerDocument;
  const instance = `of-${Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16)).join("-")}`;
  const prefix = options.idPrefix ?? `${instance}-`;
  const t =
    options.t ??
    ((key: string, params?: Record<string, unknown>) =>
      session.localize(key, params, defaultMessage));
  let theme = options.theme ?? "base";
  let mode = options.themeMode ?? "light";
  let destroyed = false;
  let submitted = false;
  let updating = false;
  const pending = new Set<string>();
  const fields = new Map<
    string,
    {
      unit: ReturnType<typeof mountVNode>;
      views: Views;
      native?: ReturnType<typeof nativeSlot>;
      target: FocusTarget | null;
      ref: (target: FocusTarget | null) => void;
    }
  >();
  const style = document.createElement("style");
  const summary = document.createElement("div");
  summary.className = "of-summary";
  summary.tabIndex = -1;
  summary.hidden = true;
  summary.setAttribute("role", "region");
  summary.setAttribute("aria-label", t("of.errorSummary"));
  const live = document.createElement("div");
  live.className = "of-sr-only";
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  const originalClass = root.getAttribute("class");
  const originalAttributes = [
    "data-of-theme",
    "data-of-mode",
    "data-of-instance",
  ].map((key) => [key, root.getAttribute(key)] as const);
  root.classList.add("of-root");
  root.setAttribute("data-of-instance", instance);
  root.replaceChildren(style, summary);
  const themeOptions = () => ({ ...options, themeMode: mode });
  const applyTheme = (): void => {
    const resolved = resolveTheme(theme, themeOptions());
    root.setAttribute("data-of-theme", resolved.name);
    root.setAttribute("data-of-mode", mode);
    style.textContent = themeStyle(resolved, instance);
  };
  const focus = (id: string): void => {
    const field = fields.get(id);
    if (!field) throw new Error(`Unknown component id: ${id}`);
    field.target?.focus();
    if (!field.unit.el.contains(document.activeElement))
      field.unit.el
        .querySelector<HTMLElement>(
          'input:not(:disabled),button:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        )
        ?.focus();
  };
  const updateSummary = (): void => {
    if (!submitted) return;
    summary.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = t("of.errorSummary");
    const list = document.createElement("ul");
    for (const entry of session.form.nodes)
      for (const message of fieldErrors(session, entry, t)) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${prefix}${entry.node.id}`;
        link.dataset.focusId = entry.node.id;
        link.textContent = message;
        item.append(link);
        list.append(item);
      }
    summary.append(heading, list);
    summary.hidden = !list.children.length;
    summary.setAttribute("aria-label", t("of.errorSummary"));
    live.textContent = session.form.nodes.some(
      (entry) => session.getFieldState(entry.node.id).pending,
    )
      ? t("of.validation.pending")
      : list.children.length
        ? t("of.errorCount", { count: list.children.length })
        : t("of.noErrors");
  };
  const onSummaryClick = (event: Event): void => {
    const target = event.target as Element | null;
    const link = target?.closest<HTMLAnchorElement>("a[data-focus-id]");
    if (link) {
      event.preventDefault();
      focus(link.dataset.focusId!);
    }
  };
  const flush = (): void => {
    if (updating || destroyed) return;
    updating = true;
    try {
      while (pending.size) {
        const ids = [...pending];
        pending.clear();
        for (const id of ids) {
          const entry = session.form.byId[id]!;
          const field = fields.get(id)!;
          field.unit.update(
            shellVNode(
              session,
              entry,
              field.views,
              resolveTheme(theme, themeOptions(), id),
              prefix,
              field.ref,
              options.presentation?.[id],
              t,
              actions(id),
              blur(id),
            ),
          );
          field.native?.update();
        }
      }
      updateSummary();
      if (!submitted)
        live.textContent = session.form.nodes.some(
          (entry) => session.getFieldState(entry.node.id).pending,
        )
          ? t("of.validation.pending")
          : session.form.nodes
              .flatMap((entry) => fieldErrors(session, entry, t))
              .join(". ");
    } finally {
      updating = false;
    }
  };
  // A blur can remove errors above the pointer target between down/up. Touch after
  // the activation completes so validation layout never cancels the user's click.
  const pointers = new Set<number>();
  const deferredTouches = new Set<string>();
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  const flushTouches = () => {
    if (destroyed) return;
    const ids = [...deferredTouches];
    deferredTouches.clear();
    for (const id of ids) session.touch(session.form.byId[id]!.path);
  };
  const pointerDown = (event: Event) =>
    pointers.add((event as PointerEvent).pointerId);
  const pointerEnd = (event: Event) => {
    if (!pointers.delete((event as PointerEvent).pointerId) || pointers.size)
      return;
    clearTimeout(blurTimer);
    blurTimer = setTimeout(flushTouches, 0);
  };
  const windowBlur = () => {
    pointers.clear();
    clearTimeout(blurTimer);
    blurTimer = setTimeout(flushTouches, 0);
  };
  const blur = (id: string) => () => {
    if (!session.form.byId[id]!.model.value) return;
    if (pointers.size) deferredTouches.add(id);
    else session.touch(session.form.byId[id]!.path);
  };
  let unsubscribe = () => {};
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    unsubscribe();
    clearTimeout(blurTimer);
    deferredTouches.clear();
    pointers.clear();
    root.removeEventListener("pointerdown", pointerDown, true);
    document.removeEventListener("pointerup", pointerEnd, true);
    document.removeEventListener("pointercancel", pointerEnd, true);
    document.defaultView?.removeEventListener("blur", windowBlur);
    summary.removeEventListener("click", onSummaryClick);
    root.removeEventListener("submit", onSubmit);
    for (const field of fields.values()) {
      field.native?.destroy();
      field.unit.destroy();
    }
    fields.clear();
    pending.clear();
    root.replaceChildren();
    if (originalClass === null) root.removeAttribute("class");
    else root.setAttribute("class", originalClass);
    for (const [key, value] of originalAttributes)
      if (value === null) root.removeAttribute(key);
      else root.setAttribute(key, value);
  };
  const submit = async (): ReturnType<FormSession["submit"]> => {
    if (destroyed) throw new Error("Form view is destroyed.");
    submitted = true;
    const result = await session.submit();
    if (!destroyed) {
      updateSummary();
      if (!result.ok) summary.focus();
      options.onSubmit?.(result);
    }
    return result;
  };
  const actions = (componentId: string) => ({
    submit: () => {
      void submit();
    },
    reset: () => {
      clearTimeout(blurTimer);
      deferredTouches.clear();
      submitted = false;
      summary.hidden = true;
      session.reset();
    },
    emit: (name: string) => {
      const detail = { name, componentId, data: session.getData() };
      options.onAction?.(detail);
      root.dispatchEvent(
        new CustomEvent("of-action", { detail, bubbles: true, composed: true }),
      );
    },
  });
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    void submit();
  };
  try {
    applyTheme();
    for (const entry of session.form.nodes) {
      const source = options.views.get(entry.node.type);
      const resolved =
        entry.model.value || source?.portable || source?.native
          ? resolveView(entry.node.type, source, options.adapter ?? "dom")
          : undefined;
      if (resolved && typeof resolved !== "function" && !options.nativeHost)
        throw new Error(
          `no-view: Native host required for ${entry.node.type} in adapter ${options.adapter ?? "dom"}`,
        );
      const native =
        resolved && typeof resolved !== "function"
          ? nativeSlot(resolved, options.nativeHost!)
          : undefined;
      const fieldViews: Views = resolved
        ? new Map([
            [
              entry.node.type,
              {
                ...source,
                portable:
                  typeof resolved === "function" ? resolved : native!.portable,
              },
            ],
          ])
        : options.views;
      const field = {
        unit: null as unknown as ReturnType<typeof mountVNode>,
        views: fieldViews,
        ...(native ? { native } : {}),
        target: null as FocusTarget | null,
        ref: (target: FocusTarget | null) => {
          field.target = target;
        },
      };
      field.unit = mountVNode(
        shellVNode(
          session,
          entry,
          field.views,
          resolveTheme(theme, themeOptions(), entry.node.id),
          prefix,
          field.ref,
          options.presentation?.[entry.node.id],
          t,
          actions(entry.node.id),
          blur(entry.node.id),
        ),
      );
      fields.set(entry.node.id, field);
      (entry.parentId ? fields.get(entry.parentId)!.unit.el : root).append(
        field.unit.el,
      );
    }
    root.append(live);
    summary.addEventListener("click", onSummaryClick);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointerup", pointerEnd, true);
    document.addEventListener("pointercancel", pointerEnd, true);
    document.defaultView?.addEventListener("blur", windowBlur);
    unsubscribe = session.subscribe((patch) => {
      patch.changedFields.forEach((id) => pending.add(id));
      flush();
    });
  } catch (error) {
    destroy();
    throw error;
  }
  const refresh = (): void => {
    if (destroyed) throw new Error("Form view is destroyed.");
    applyTheme();
    fields.forEach((_field, id) => pending.add(id));
    flush();
  };
  return {
    setTheme(next) {
      resolveTheme(next, themeOptions());
      theme = next;
      refresh();
    },
    setMode(next) {
      mode = next;
      refresh();
    },
    focus,
    submit,
    destroy,
    unmount: destroy,
  };
}
/** M02 compatibility entry point; new integrations use mount with an engine and explicit view registry. */
export function renderForm(
  root: HTMLElement,
  session: FormSession,
  views: Views,
  theme: AppearanceTheme = "base",
): FormView {
  return mountForm(root, session, {
    views,
    theme,
    themes: [bootstrap4Theme, bootstrap5Theme, tailwindTheme],
    idPrefix: "",
  });
}
export function renderToString(
  session: FormSession,
  options: RenderOptions,
): string {
  const instance = options.idPrefix ?? "of-ssr";
  if (!/^[a-zA-Z0-9_-]+$/.test(instance))
    throw new Error(
      "SSR idPrefix must contain letters, digits, underscores or hyphens.",
    );
  const resolved = resolveTheme(options.theme, options);
  const children = new Map<string | undefined, string[]>();
  for (const entry of [...session.form.nodes].reverse()) {
    const shell = shellVNode(
      session,
      entry,
      options.views,
      resolveTheme(options.theme, options, entry.node.id),
      `${instance}-`,
      () => {},
      options.presentation?.[entry.node.id],
      options.t ??
        ((key, params) => session.localize(key, params, defaultMessage)),
    );
    const html = renderVNodeToString(shell);
    // Nested containers append already-escaped rendered child markup, never definition HTML.
    const nested = html.replace(
      /<\/(div|fieldset)>$/,
      (closing) => `${(children.get(entry.node.id) ?? []).join("")}${closing}`,
    );
    const siblings = children.get(entry.parentId) ?? [];
    siblings.unshift(nested);
    children.set(entry.parentId, siblings);
  }
  return `<div class="of-root" data-of-theme="${escapeHtml(resolved.name)}" data-of-mode="${escapeHtml(options.themeMode ?? "light")}" data-of-instance="${instance}"><style>${themeStyle(resolved, instance)}</style>${(children.get(undefined) ?? []).join("")}<div class="of-sr-only" aria-live="polite" aria-atomic="true"></div></div>`;
}
