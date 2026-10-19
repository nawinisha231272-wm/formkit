import type { CompiledNode, FormSession } from "@ourform/core";
import {
  resolveConfig,
  renderVNodeToString,
  escapeHtml,
  defaultMessage,
} from "@ourform/sdk";
import type {
  FieldDefinition,
  FieldControlProps,
  FocusTarget,
} from "@ourform/sdk";
import { mountVNode } from "./vnode-dom";
export { mountVNode } from "./vnode-dom";
export type AppearanceTheme = "base" | "bootstrap" | "tailwind";
export interface FormView {
  setTheme(theme: AppearanceTheme): void;
  focus(componentId: string): void;
  destroy(): void;
}
type Views = ReadonlyMap<string, FieldDefinition["views"]>;
interface MountedField {
  wrapper: HTMLElement;
  label: HTMLLabelElement | null;
  error: HTMLElement | null;
  control: ReturnType<typeof mountVNode> | null;
  target: FocusTarget | null;
  focusRef: (target: FocusTarget | null) => void;
}
function controlProps(
  session: FormSession,
  entry: CompiledNode,
  theme: AppearanceTheme,
  focusRef: (target: FocusTarget | null) => void,
): FieldControlProps<unknown, Record<string, unknown>> {
  const state = session.getFieldState(entry.node.id);
  const result = resolveConfig(
    entry.model.properties ?? {},
    entry.node.properties ?? {},
  );
  if (!result.ok) throw new Error("Compiled config is invalid.");
  const described = [
    entry.node.description ? `${entry.node.id}_description` : null,
    state.errors.length ? `${entry.node.id}_error` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    value: state.value,
    setValue: (next) => session.setValue(state.path, next, { source: "user" }),
    onBlur: () => session.touch(state.path),
    config: result.config,
    state: {
      disabled: state.disabled,
      readOnly: state.readOnly,
      invalid: state.errors.length > 0,
      pending: state.pending,
      required: state.required,
    },
    a11y: {
      id: entry.node.id,
      name: entry.node.key!,
      labelledBy: `${entry.node.id}_label`,
      ...(described ? { describedBy: described } : {}),
      ...(state.errors.length ? { errorId: `${entry.node.id}_error` } : {}),
    },
    focusRef,
    theme: {
      classFor: (part) =>
        part === "control" ? `of-control of-control-${theme}` : "",
    },
    t: defaultMessage,
  };
}
export function renderForm(
  root: HTMLElement,
  session: FormSession,
  views: Views,
  theme: AppearanceTheme = "base",
): FormView {
  const fields = new Map<string, MountedField>();
  let destroyed = false;
  let updating = false;
  const pending = new Set<string>();
  const update = (id: string): void => {
    const entry = session.form.byId[id]!;
    const field = fields.get(id)!;
    const state = session.getFieldState(id);
    field.wrapper.hidden = !state.visible;
    if (field.error) {
      field.error.textContent = state.errors
        .map((e) =>
          e.code === "required"
            ? `${entry.node.label ?? entry.node.key} is required`
            : e.messageKey,
        )
        .join(". ");
      field.error.hidden = !state.errors.length;
    }
    if (field.control)
      field.control.update(
        views
          .get(entry.node.type)!
          .portable(controlProps(session, entry, theme, field.focusRef)),
      );
  };
  const flush = (): void => {
    if (updating || destroyed) return;
    updating = true;
    try {
      while (pending.size) {
        const ids = [...pending];
        pending.clear();
        for (const id of ids) update(id);
      }
    } finally {
      updating = false;
    }
  };
  try {
    root.className = `of-root of-theme-${theme}`;
    for (const entry of session.form.nodes) {
      const wrapper = document.createElement("div");
      wrapper.className = "of-field";
      wrapper.dataset.fieldId = entry.node.id;
      const field: MountedField = {
        wrapper,
        label: null,
        error: null,
        control: null,
        target: null,
        focusRef: (target) => {
          field.target = target;
        },
      };
      fields.set(entry.node.id, field);
      if (entry.model.value) {
        const view = views.get(entry.node.type);
        if (!view) throw new Error(`No portable view: ${entry.node.type}`);
        const label = document.createElement("label");
        label.id = `${entry.node.id}_label`;
        label.htmlFor = entry.node.id;
        label.textContent = entry.node.label ?? entry.node.key ?? entry.node.id;
        wrapper.append(label);
        field.label = label;
        const control = mountVNode(
          view.portable(controlProps(session, entry, theme, field.focusRef)),
        );
        wrapper.append(control.el);
        field.control = control;
        if (entry.node.description) {
          const description = document.createElement("small");
          description.id = `${entry.node.id}_description`;
          description.textContent = entry.node.description;
          wrapper.append(description);
        }
        const error = document.createElement("small");
        error.id = `${entry.node.id}_error`;
        error.className = "of-error";
        wrapper.append(error);
        field.error = error;
      } else if (entry.node.label) {
        const heading = document.createElement("h3");
        heading.textContent = entry.node.label;
        wrapper.append(heading);
      }
      wrapper.hidden = !session.getFieldState(entry.node.id).visible;
      (entry.parentId ? fields.get(entry.parentId)!.wrapper : root).append(
        wrapper,
      );
      pending.add(entry.node.id);
    }
    flush();
  } catch (error) {
    for (const field of fields.values()) field.control?.destroy();
    root.replaceChildren();
    throw error;
  }
  const unsubscribe = session.subscribe((patch) => {
    patch.changedFields.forEach((id) => pending.add(id));
    flush();
  });
  return {
    setTheme(next) {
      if (destroyed) throw new Error("Form view is destroyed.");
      theme = next;
      root.className = `of-root of-theme-${theme}`;
      for (const id of fields.keys()) pending.add(id);
      flush();
    },
    focus(id) {
      const field = fields.get(id);
      if (!field) throw new Error(`Unknown component id: ${id}`);
      field.target?.focus();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      for (const field of fields.values()) field.control?.destroy();
      fields.clear();
      pending.clear();
      root.replaceChildren();
    },
  };
}
export function renderToString(
  session: FormSession,
  options: { views: Views; theme?: AppearanceTheme },
): string {
  const theme = options.theme ?? "base";
  const children = new Map<string | undefined, CompiledNode[]>();
  for (const entry of session.form.nodes) {
    const list = children.get(entry.parentId) ?? [];
    list.push(entry);
    children.set(entry.parentId, list);
  }
  const render = (entry: CompiledNode): string => {
    const state = session.getFieldState(entry.node.id);
    const label = escapeHtml(
      entry.node.label ?? entry.node.key ?? entry.node.id,
    );
    let body = entry.model.value
      ? `<label id="${escapeHtml(entry.node.id)}_label" for="${escapeHtml(entry.node.id)}">${label}</label>`
      : entry.node.label
        ? `<h3>${label}</h3>`
        : "";
    if (entry.model.value) {
      const view = options.views.get(entry.node.type);
      if (!view) throw new Error(`No portable view: ${entry.node.type}`);
      body += renderVNodeToString(
        view.portable(controlProps(session, entry, theme, () => {})),
      );
      if (entry.node.description)
        body += `<small id="${escapeHtml(entry.node.id)}_description">${escapeHtml(entry.node.description)}</small>`;
      if (state.errors.length)
        body += `<small id="${escapeHtml(entry.node.id)}_error">${state.errors.map((e) => escapeHtml(e.code === "required" ? `${entry.node.label ?? entry.node.key} is required` : e.messageKey)).join(". ")}</small>`;
    }
    return `<div class="of-field" data-field-id="${escapeHtml(entry.node.id)}"${state.visible ? "" : " hidden"}>${body}${(children.get(entry.node.id) ?? []).map(render).join("")}</div>`;
  };
  return `<div class="of-root of-theme-${theme}">${(children.get(undefined) ?? []).map(render).join("")}</div>`;
}
