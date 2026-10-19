export type PropertyKind = "string" | "number" | "boolean";
export type PropertyGroup =
  | "Display"
  | "Behavior"
  | "Data"
  | "Validation"
  | "Layout";
export interface PropertyDefinition<T = unknown> {
  kind: PropertyKind;
  label: string;
  default: T;
  group: PropertyGroup;
  min?: number;
  max?: number;
}
export type PropertyMap = Record<string, PropertyDefinition>;
export interface ValueAdapter<T> {
  empty: () => T;
  normalize: (input: unknown) => T;
  isEmpty: (value: T) => boolean;
  equals?: (a: T, b: T) => boolean;
  serialize?: (value: T) => unknown;
  jsonSchema?: (config: unknown) => object;
}

export interface ComponentModel<T = unknown> {
  type: string;
  title: string;
  kind?: "field" | "layout" | "composite";
  dataScope?: "none" | "object" | "array";
  value?: ValueAdapter<T>;
  properties?: PropertyMap;
}
