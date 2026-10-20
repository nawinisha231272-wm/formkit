import {
  defineField,
  numberValue,
  numberProperty,
  booleanProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";

const english = { "acme.quantity.unset": "Not set" } as const;
type Translate = FieldControlProps<number | null, Record<string, unknown>>["t"];
function message(t: Translate, key: keyof typeof english): string {
  const translated = t(key);
  return translated === key ? english[key] : translated;
}
export const field = defineField({
  type: "acme-quantity",
  title: "Quantity",
  value: numberValue({ empty: null }),
  properties: {
    min: numberProperty({ label: "Minimum", default: 0 }),
    max: numberProperty({ label: "Maximum", default: 100 }),
    step: numberProperty({ label: "Step", default: 1, min: 0.01 }),
    showValue: booleanProperty({ label: "Show value", default: true }),
  },
  control: (p) =>
    h(
      "div",
      {},
      h("input", {
        ...controlAttributes(p),
        type: "number",
        value: p.value ?? "",
        min: p.config.min,
        max: p.config.max,
        step: p.config.step,
        class: p.theme.classFor("control"),
        oninput: (event: Event) => {
          const value = (event.target as HTMLInputElement).valueAsNumber;
          p.setValue(Number.isFinite(value) ? value : null);
        },
        onblur: p.onBlur,
      }),
      p.config.showValue
        ? h(
            "output",
            {},
            p.value === null
              ? message(p.t, "acme.quantity.unset")
              : String(p.value),
          )
        : null,
    ),
});
