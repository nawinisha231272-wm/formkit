export { textField } from "./text";
export { numberField } from "./number";
export { checkboxField } from "./checkbox";
export { ratingField } from "./rating";

export {
  textareaField,
  emailField,
  passwordField,
  hiddenField,
} from "./text-variants";
export { selectField, radioField } from "./choices";
export { contentField, sanitizeContent } from "./content";
export { buttonField } from "./button";
export { tabsLayout } from "./tabs";
import { textField } from "./text";
import { numberField } from "./number";
import { checkboxField } from "./checkbox";
import { ratingField } from "./rating";
import {
  textareaField,
  emailField,
  passwordField,
  hiddenField,
} from "./text-variants";
import { selectField, radioField } from "./choices";
import { contentField } from "./content";
import { buttonField } from "./button";
import type { RegisteredField } from "@ourform/sdk";
export const builtinFields: readonly RegisteredField[] = Object.freeze([
  textField,
  numberField,
  checkboxField,
  ratingField,
  textareaField,
  emailField,
  passwordField,
  hiddenField,
  selectField,
  radioField,
  contentField,
  buttonField,
]);

export {
  panelLayout,
  columnsLayout,
  fieldsetLayout,
  containerLayout,
  builtinLayouts,
} from "./layouts";
import { builtinLayouts } from "./layouts";
export const builtinComponents: readonly RegisteredField[] = Object.freeze([
  ...builtinFields,
  ...builtinLayouts,
]);
