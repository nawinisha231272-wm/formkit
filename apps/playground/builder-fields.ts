import {
  defineField,
  stringValue,
  stringProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";
/** Public SDK-only demo: builder registration and editors need no component-specific UI code. */
export const customerReference = defineField({
  type: "acme.customer-reference",
  title: "Customer reference",
  group: "Acme components",
  value: stringValue(),
  properties: {
    hint: stringProperty({
      label: "Reference hint",
      default: "Customer reference",
      group: "Reference",
    }),
  },
  control: (p) =>
    h("input", {
      ...controlAttributes(p),
      type: "text",
      value: p.value,
      placeholder: p.config.hint,
      class: p.theme.classFor("control"),
      oninput: (event: Event) =>
        p.setValue((event.target as HTMLInputElement).value),
      onblur: p.onBlur,
    }),
});
