import {
  defineField,
  h,
  controlAttributes,
  stringValue,
  optionsProperty,
} from "@ourform/sdk";
const properties = {
  options: optionsProperty({ label: "of.options", default: [] }),
};
export const selectField = defineField({
  type: "select",
  title: "Select",
  value: stringValue(),
  validators: ["options"],
  properties,
  control: (p) =>
    h(
      "select",
      {
        ...controlAttributes(p),
        class: p.theme.classFor("control"),
        value: p.value,
        disabled: p.state.disabled || p.state.readOnly,
        onchange: (event: Event) =>
          p.setValue((event.target as HTMLSelectElement).value),
        onblur: p.onBlur,
      },
      h(
        "option",
        { value: "", selected: p.value === "" },
        p.t("of.select.placeholder"),
      ),
      p.config.options.map((option) =>
        h(
          "option",
          {
            key: option.value,
            value: option.value,
            selected: p.value === option.value,
          },
          p.t(option.label),
        ),
      ),
    ),
});
export const radioField = defineField({
  type: "radio",
  title: "Radio",
  value: stringValue(),
  validators: ["options"],
  properties,
  shell: "group",
  control: (p) =>
    h(
      "div",
      controlAttributes(p, "group"),
      p.config.options.map((option, index) => {
        const id = `${p.a11y.id}_${index}`;
        return h(
          "label",
          { key: option.value, for: id },
          h("input", {
            id,
            name: p.a11y.id,
            type: "radio",
            value: option.value,
            checked: p.value === option.value,
            disabled: p.state.disabled || p.state.readOnly,
            "aria-describedby": p.a11y.describedBy,
            ref:
              index === 0
                ? (element: HTMLElement | null) => p.focusRef(element)
                : undefined,
            onchange: () => p.setValue(option.value),
            onblur: p.onBlur,
          }),
          p.t(option.label),
        );
      }),
    ),
});
