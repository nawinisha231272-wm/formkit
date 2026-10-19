import { defineField, h, controlAttributes, stringValue } from "@ourform/sdk";
export const textField = defineField({
  type: "text",
  title: "Text",
  value: stringValue(),
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      type: "text",
      value: p.value,
      class: p.theme.classFor("control"),
      oninput: (e: Event) => p.setValue((e.target as HTMLInputElement).value),
      onblur: p.onBlur,
    }),
});
