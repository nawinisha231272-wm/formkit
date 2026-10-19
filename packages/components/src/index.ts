import {
  defineField,
  numberProperty,
  numberValue,
  stringValue,
  type ControlProps,
} from "@ourform/sdk";

export const textField = defineField<string>({
  type: "text",
  title: "Text",
  value: stringValue(),
  control(props: ControlProps<string>) {
    const el = document.createElement("input");
    el.type = "text";
    el.id = props.id;
    el.name = props.name;
    el.value = props.value;
    el.disabled = props.disabled;
    el.readOnly = props.readOnly;
    el.addEventListener("input", () => props.setValue(el.value));
    el.addEventListener("blur", props.onBlur);
    return el;
  },
});

export const ratingField = defineField<number>({
  type: "rating",
  title: "Rating",
  value: numberValue(),
  properties: {
    max: numberProperty({
      label: "Number of stars",
      default: 5,
      min: 1,
      max: 10,
      group: "Display",
    }),
  },
  control(props: ControlProps<number>) {
    const root = document.createElement("div");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", props.name);
    const max = Number(props.config.max ?? 5);
    for (let n = 1; n <= max; n++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = n <= props.value ? "★" : "☆";
      button.setAttribute("aria-label", `${n} of ${max} stars`);
      button.setAttribute("aria-pressed", String(props.value === n));
      button.disabled = props.disabled || props.readOnly;
      button.addEventListener("click", () => {
        props.setValue(n);
        for (const [index, sibling] of Array.from(
          root.querySelectorAll("button"),
        ).entries()) {
          sibling.textContent = index < n ? "★" : "☆";
          sibling.setAttribute("aria-pressed", String(index + 1 === n));
        }
      });
      button.addEventListener("blur", props.onBlur);
      root.append(button);
    }
    return root;
  },
});
