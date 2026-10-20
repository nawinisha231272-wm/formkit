import {
  defineField,
  numberValue,
  numberProperty,
  booleanProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";

// prettier-ignore
export const field = defineField({
  type: "acme-slider",
  title: "Slider",
  value: numberValue(),
  properties: {
    min: numberProperty({ label: "Minimum", default: 0 }),
    max: numberProperty({ label: "Maximum", default: 100 }),
    step: numberProperty({ label: "Step", default: 1 }),
    showValue: booleanProperty({ label: "Show value", default: true }),
  },
  control: (p) => h("div", {},
    h("input", {
      ...controlAttributes(p),
      type: "range",
      min: p.config.min,
      max: p.config.max,
      step: p.config.step,
      value: p.value ?? p.config.min,
      class: p.theme.classFor("control"),
      oninput: (event: Event) => p.setValue((event.target as HTMLInputElement).valueAsNumber),
      onkeyup: (event: Event) => {
        if (p.value === null &&
            ["Home", "End", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes((event as KeyboardEvent).key)) {
          p.setValue((event.target as HTMLInputElement).valueAsNumber);
        }
      },
      onpointerup: (event: Event) => {
        if (p.value === null) {
          p.setValue((event.target as HTMLInputElement).valueAsNumber);
        }
      },
      onblur: p.onBlur,
    }),
    p.config.showValue ? h("output", {}, p.value === null ? "" : String(p.value)) : null,
  ),
});
