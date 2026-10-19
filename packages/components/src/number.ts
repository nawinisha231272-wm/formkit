import { defineField, h, controlAttributes, numberValue } from "@ourform/sdk";
export const numberField = defineField({
  type: "number",
  title: "Number",
  value: numberValue({ empty: null }),
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      type: "number",
      value: p.value ?? "",
      class: p.theme.classFor("control"),
      oninput: (e: Event) => {
        const n = (e.target as HTMLInputElement).valueAsNumber;
        p.setValue(Number.isFinite(n) ? n : null);
      },
      onblur: p.onBlur,
    }),
});
