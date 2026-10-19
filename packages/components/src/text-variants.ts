import { defineField, h, controlAttributes, stringValue } from "@ourform/sdk";
import type { FieldControlProps } from "@ourform/sdk";
const inputProps = (p: FieldControlProps<string, object>) => ({
  ...controlAttributes(p),
  value: p.value,
  class: p.theme.classFor("control"),
  oninput: (event: Event) =>
    p.setValue((event.target as HTMLInputElement).value),
  onblur: p.onBlur,
});
export const textareaField = defineField({
  type: "textarea",
  title: "Textarea",
  value: stringValue(),
  control: (p) => h("textarea", { ...inputProps(p), rows: 3 }, p.value),
});
export const emailField = defineField({
  type: "email",
  title: "Email",
  value: stringValue(),
  validators: ["email"],
  control: (p) =>
    h("input", { ...inputProps(p), type: "email", autocomplete: "email" }),
});
export const passwordField = defineField({
  type: "password",
  title: "Password",
  value: stringValue(),
  control: (p) =>
    h("input", {
      ...inputProps(p),
      type: "password",
      autocomplete: "new-password",
    }),
});
export const hiddenField = defineField({
  type: "hidden",
  title: "Hidden",
  value: stringValue(),
  shell: "none",
  control: (p) =>
    h("input", { type: "hidden", name: p.a11y.name, value: p.value }),
});
