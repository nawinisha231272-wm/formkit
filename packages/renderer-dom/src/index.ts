import type { FormField } from "@ourform/schema";
import type { FormSession } from "@ourform/core";
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
  const redraw = () => {
    root.replaceChildren();
    root.className = `of-root of-theme-${theme}`;
    for (const field of session.schema.components)
      root.append(renderField(session, field, views));
  };
  const unsubscribe = session.subscribe((event) => {
    for (const path of event.changedPaths) {
      const field = session.schema.components.find((f) => f.key === path);
      if (!field) continue;
      // Do not replace a focused text input while the user types or composes IME text.
      const current = root.querySelector(
        `[data-field-id="${CSS.escape(field.id)}"]`,
      );
      if (!current || current.contains(document.activeElement)) continue;
      current.replaceWith(renderField(session, field, views));
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
      root.replaceChildren();
    },
  };
}
function renderField(
  session: FormSession,
  field: FormField,
  views: ReadonlyMap<string, FieldDefinition["views"]>,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "of-field";
  wrapper.dataset.fieldId = field.id;
  const label = document.createElement("label");
  label.textContent = field.label;
  label.htmlFor = field.id;
  wrapper.append(label);
  const def = session.definition(field);
  const config: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(def.properties ?? {}))
    config[key] = field.properties?.[key] ?? prop.default;
  const view = views.get(field.type);
  if (!view) throw new Error(`No portable view: ${field.type}`);
  wrapper.append(
    view.portable({
      value: session.getValue(field.key),
      setValue: (next) => session.setValue(field.key, next),
      onBlur: () => session.markTouched(field.key),
      config,
      disabled: false,
      readOnly: false,
      id: field.id,
      name: field.key,
    }),
  );
  if (field.description) {
    const help = document.createElement("small");
    help.textContent = field.description;
    wrapper.append(help);
  }
  const errors = session.validate().filter((e) => e.path === field.key);
  if (session.isTouched(field.key) && errors.length) {
    const message = document.createElement("small");
    message.className = "of-error";
    message.textContent = errors[0]!.message;
    wrapper.append(message);
  }
  return wrapper;
}
