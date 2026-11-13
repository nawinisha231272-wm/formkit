import { ratingLogicProperties } from "./logic-properties";
import {
  defineField,
  h,
  controlAttributes,
  numberValue,
  numberProperty,
  booleanProperty,
} from "@ourform/sdk";
export const ratingField = defineField({
  type: "rating",
  logicSettable: ratingLogicProperties,
  title: "Rating",
  value: numberValue({ empty: null }),
  shell: "group",
  properties: {
    max: numberProperty({ label: "of.ratingMax", default: 5, min: 1, max: 10 }),
    allowHalf: booleanProperty({ label: "Allow half stars", default: false }),
  },
  control: (p) => {
    const { max, allowHalf } = p.config;
    return h(
      "div",
      controlAttributes(p, "group"),
      Array.from({ length: Math.floor(max) * (allowHalf ? 2 : 1) }, (_, i) => {
        const score = (i + 1) / (allowHalf ? 2 : 1);
        return h(
          "button",
          {
            key: score,
            type: "button",
            "aria-label": p.t("of.rating.stars", {
              score,
              max,
            }),
            "aria-pressed": String(p.value === score),
            class: p.theme.classFor("control"),
            disabled: p.state.disabled || p.state.readOnly,
            onclick: () => p.setValue(score),
            onblur: p.onBlur,
          },
          score <= (p.value ?? 0) ? "★" : "☆",
        );
      }),
    );
  },
});
