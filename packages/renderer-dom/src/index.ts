import type { CompiledNode, FormSession } from "@ourform/core";
import type { FieldDefinition } from "@ourform/sdk";
export type AppearanceTheme = "base" | "bootstrap" | "tailwind";
export interface FormView {
  setTheme(theme: AppearanceTheme): void;
  destroy(): void;
}
export function renderForm(
  root: HTMLElement,
  session: FormSession,
  views: ReadonlyMap<string, FieldDefinition["views"]>,
  theme: AppearanceTheme = "base",
): FormView {
  const elements = new Map<string, HTMLElement>();
  let redrawing = false;
  function redraw(): void {
    redrawing = true;
    root.replaceChildren();
    elements.clear();
    root.className = `of-root of-theme-${theme}`;
    for (const entry of session.form.nodes) {
      const element = renderField(session, entry, views);
      elements.set(entry.node.id, element);
      (entry.parentId ? elements.get(entry.parentId)! : root).append(element);
    }
    redrawing = false;
  }
  const unsubscribe = session.subscribe((patch) => {
    if (redrawing) return;
    for (const id of patch.changedFields) {
      const entry = session.form.byId[id]!;
      const current = elements.get(id);
      if (!current) continue;
      const state = session.getFieldState(id);
      current.hidden = !state.visible;
      if (!entry.model.value || current.contains(document.activeElement))
        continue;
      const next = renderField(session, entry, views);
      current.replaceWith(next);
      elements.set(id, next);
    }
  });
  redraw();
  return {
    setTheme(next) {
      theme = next;
      redraw();
    },
    destroy() {
      unsubscribe();
      elements.clear();
      root.replaceChildren();
    },
  };
}
function renderField(
  session: FormSession,
  entry: CompiledNode,
  views: ReadonlyMap<string, FieldDefinition["views"]>,
): HTMLElement {
  const field = entry.node;
  const state = session.getFieldState(field.id);
  const wrapper = document.createElement("div");
  wrapper.className = "of-field";
  wrapper.dataset.fieldId = field.id;
  wrapper.hidden = !state.visible;
  if (!entry.model.value) {
    if (field.label) {
      const heading = document.createElement("h3");
      heading.textContent = field.label;
      wrapper.append(heading);
    }
    return wrapper;
  }
  const label = document.createElement("label");
  label.textContent = field.label ?? field.key ?? field.id;
  label.htmlFor = field.id;
  wrapper.append(label);
  const config: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(entry.model.properties ?? {}))
    config[key] = field.properties?.[key] ?? property.default;
  const view = views.get(field.type);
  if (!view) throw new Error(`No portable view: ${field.type}`);
  wrapper.append(
    view.portable({
      value: state.value,
      setValue: (next) =>
        session.setValue(state.path, next, { source: "user" }),
      onBlur: () => session.touch(state.path),
      config,
      disabled: state.disabled,
      readOnly: state.readOnly,
      id: field.id,
      name: field.key!,
    }),
  );
  if (field.description) {
    const help = document.createElement("small");
    help.textContent = field.description;
    wrapper.append(help);
  }
  if (state.errors.length) {
    const message = document.createElement("small");
    message.className = "of-error";
    message.textContent = state.errors
      .map((e) =>
        e.code === "required"
          ? `${field.label ?? field.key} is required`
          : e.messageKey,
      )
      .join(". ");
    wrapper.append(message);
  }
  return wrapper;
}
