import {
  defineField,
  nullableBooleanValue,
  stringProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";
type Translate = FieldControlProps<
  boolean | null,
  Record<string, unknown>
>["t"];
export function caption(t: Translate, literal: string, key: string): string {
  if (!key) return literal;
  const translated = t(key);
  return translated === key ? literal : translated;
}
export const field = defineField({
  type: "acme-yes-no",
  title: "Yes/No toggle",
  shell: "inline",
  value: nullableBooleanValue({ requiredTrue: true }),
  properties: {
    yesLabel: stringProperty({ label: "Yes caption", default: "Yes" }),
    noLabel: stringProperty({ label: "No caption", default: "No" }),
    yesLabelKey: stringProperty({ label: "Yes message key", default: "" }),
    noLabelKey: stringProperty({ label: "No message key", default: "" }),
  },
  control: (p) =>
    h(
      "div",
      {},
      h("input", {
        ...controlAttributes(p),
        type: "checkbox",
        checked: p.value === true,
        class: p.theme.classFor("control"),
        oninput: (event: Event) =>
          p.setValue((event.target as HTMLInputElement).checked),
        onblur: p.onBlur,
      }),
      h(
        "span",
        { "data-answer-label": "" },
        p.value === true
          ? caption(p.t, p.config.yesLabel, p.config.yesLabelKey)
          : caption(p.t, p.config.noLabel, p.config.noLabelKey),
      ),
    ),
});
