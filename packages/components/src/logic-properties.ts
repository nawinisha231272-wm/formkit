import type { LogicPropertyPath } from "@ourform/sdk";
export const layoutLogicProperties: readonly LogicPropertyPath[] =
  Object.freeze(["label", "labelKey", "description", "tooltip", "ariaLabel"]);
export const fieldLogicProperties: readonly LogicPropertyPath[] = Object.freeze(
  [...layoutLogicProperties, "placeholder", "prefix", "suffix"],
);
export const textLogicProperties: readonly LogicPropertyPath[] = Object.freeze([
  ...fieldLogicProperties,
  "validation.minLength",
  "validation.maxLength",
  "validation.pattern",
]);
export const numberLogicProperties: readonly LogicPropertyPath[] =
  Object.freeze([...fieldLogicProperties, "validation.min", "validation.max"]);

export const ratingLogicProperties: readonly LogicPropertyPath[] =
  Object.freeze([
    ...numberLogicProperties,
    "properties.max",
    "properties.allowHalf",
  ]);
