import { numberField } from "@ourform/components";
/** Fixture control: unlike the permissive built-in, malformed derived input is an error. */
export const strictNumber = {
  ...numberField,
  model: Object.freeze({
    ...numberField.model,
    type: "strict-number",
    title: "Strict number",
    value: Object.freeze({
      ...numberField.model.value!,
      normalize(value: unknown) {
        if (value === null) return null;
        if (typeof value !== "number" || !Number.isFinite(value))
          throw new TypeError("Expected a number or null");
        return value;
      },
    }),
  }),
};
