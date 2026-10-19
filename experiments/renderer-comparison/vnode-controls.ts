import type { FieldControlProps } from "@ourform/sdk";
import { h } from "./vnode";
export const text = (
  p: FieldControlProps<string, { max: number; allowHalf: boolean }>,
) =>
  h("input", {
    id: p.a11y.id,
    value: p.value,
    class: p.theme.classFor("control"),
    oninput: (e: Event) => p.setValue((e.target as HTMLInputElement).value),
    onblur: p.onBlur,
    disabled: p.state.disabled,
  });
export const rating = (
  p: FieldControlProps<number | null, { max: number; allowHalf: boolean }>,
) =>
  h(
    "div",
    { role: "group", "aria-label": p.a11y.name },
    ...Array.from({ length: p.config.max }, (_, i) =>
      h(
        "button",
        {
          key: i,
          type: "button",
          "aria-label": `${i + 1} stars`,
          "aria-pressed": String(p.value === i + 1),
          class: p.theme.classFor("control"),
          onclick: () => p.setValue(i + 1),
          onblur: p.onBlur,
          disabled: p.state.disabled,
        },
        i + 1 <= (p.value ?? 0) ? "★" : "☆",
      ),
    ),
  );
