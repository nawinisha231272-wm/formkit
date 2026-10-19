export type {
  ComponentModel,
  PropertyDefinition,
  PropertyMap,
  PropertyKind,
  PropertyGroup,
  ValueAdapter,
  ConfigOf,
} from "@ourform/core";
export type { FormDefinition, FormField, Expr } from "@ourform/schema";
export type { FieldControlProps, FocusTarget, ShellVariant } from "./contracts";
export { stringValue, numberValue, booleanValue } from "./value";
export {
  stringProperty,
  numberProperty,
  booleanProperty,
  selectProperty,
  exprProperty,
  optionsProperty,
  jsonProperty,
} from "./properties";
export { resolveConfig } from "./config";
export { defineField, controlAttributes } from "./define-field";
export type { FieldDefinition, PortableControl } from "./define-field";
export { h, renderVNodeToString, escapeHtml } from "./vnode";
export type { VNode, VNodeChild, VNodeProps, VNodeAttribute } from "./vnode";

export { defaultMessage } from "./messages";

export type { Theme, ThemeOverride, ThemeMode, FieldPart } from "./theme";
export { registerNativeField, mapNativeProps } from "./native";
export type {
  NativeFieldOptions,
  NativeView,
  ComponentViews,
  RegisteredField,
} from "./native";
export type { NativeRegistrationArgs, PrimitiveNativeValue } from "./native";
