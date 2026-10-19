import type { FieldControlProps } from "@ourform/sdk";
type Props<V> = FieldControlProps<V, { max: number; allowHalf: boolean }>;
export function text(initial: Props<string>) {
  let p = initial;
  const el = document.createElement("input");
  el.id = p.a11y.id;
  const input = () => p.setValue(el.value);
  const blur = () => p.onBlur();
  el.addEventListener("input", input);
  el.addEventListener("blur", blur);
  const update = (next: Props<string>) => {
    p = next;
    if (el.value !== p.value) el.value = p.value;
    el.className = p.theme.classFor("control");
    el.disabled = p.state.disabled;
  };
  update(p);
  return {
    el,
    update,
    destroy() {
      el.removeEventListener("input", input);
      el.removeEventListener("blur", blur);
      el.remove();
    },
  };
}
export function rating(initial: Props<number | null>) {
  let p = initial;
  const el = document.createElement("div");
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", p.a11y.name);
  const handlers: (() => void)[] = [];
  const buttons: HTMLButtonElement[] = [];
  for (let i = 1; i <= p.config.max; i++) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${i} stars`);
    const click = () => p.setValue(i);
    const blur = () => p.onBlur();
    button.addEventListener("click", click);
    button.addEventListener("blur", blur);
    handlers.push(() => {
      button.removeEventListener("click", click);
      button.removeEventListener("blur", blur);
    });
    buttons.push(button);
    el.append(button);
  }
  const update = (next: Props<number | null>) => {
    p = next;
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]!;
      button.textContent = i + 1 <= (p.value ?? 0) ? "★" : "☆";
      button.setAttribute("aria-pressed", String(p.value === i + 1));
      button.className = p.theme.classFor("control");
      button.disabled = p.state.disabled;
    }
  };
  update(p);
  return {
    el,
    update,
    destroy() {
      handlers.forEach((h) => h());
      el.remove();
    },
  };
}
export function ssrText(p: Props<string>): string {
  return `<input id="${escape(p.a11y.id)}" value="${escape(p.value)}" class="${escape(p.theme.classFor("control"))}">`;
}
export function ssrRating(p: Props<number | null>): string {
  return `<div role="group" aria-label="${escape(p.a11y.name)}">${Array.from({ length: p.config.max }, (_, i) => `<button type="button" aria-label="${i + 1} stars" aria-pressed="${p.value === i + 1}" class="${escape(p.theme.classFor("control"))}">${i + 1 <= (p.value ?? 0) ? "★" : "☆"}</button>`).join("")}</div>`;
}
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
