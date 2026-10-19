import type { Expr } from "@ourform/schema";
export type PropertyKind =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "expr"
  | "options"
  | "json";
export type PropertyGroup =
  | "Display"
  | "Data"
  | "Validation"
  | "Conditional"
  | "Layout"
  | "Accessibility"
  | (string & {});
export interface PropertyDefinition<T = unknown> {
  kind: PropertyKind;
  label: string;
  default: T;
  group: PropertyGroup;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  description?: string;
  visibleWhen?: Expr;
  editor?: string;
}
export type PropertyMap = Record<string, PropertyDefinition>;
export type ConfigOf<P extends PropertyMap> = {
  [K in keyof P]: P[K] extends PropertyDefinition<infer T> ? T : never;
};
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
  validators?: readonly string[];
  properties?: PropertyMap;
  builder?: { title: string; group: string; icon?: string; order?: number };
}
