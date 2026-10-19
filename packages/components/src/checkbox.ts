import { defineField, h, controlAttributes, booleanValue } from "@ourform/sdk";
export const checkboxField = defineField({
  type: "checkbox",
  title: "Checkbox",
  value: booleanValue(),
  shell: "inline",
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      type: "checkbox",
      checked: p.value,
      class: p.theme.classFor("control"),
      onchange: (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (p.state.readOnly) input.checked = p.value;
        else p.setValue(input.checked);
      },
      onblur: p.onBlur,
    }),
});
