import type {
  ComponentModel,
  PropertyDefinition,
  ValueAdapter,
} from "@ourform/core";
export type {
  ComponentModel,
  PropertyDefinition,
  PropertyMap,
  ValueAdapter,
  PropertyKind,
  PropertyGroup,
} from "@ourform/core";
export type { FormDefinition, FormField } from "@ourform/schema";
export const stringProperty = (
  p: Omit<PropertyDefinition<string>, "kind">,
): PropertyDefinition<string> => ({ kind: "string", ...p });
export const numberProperty = (
  p: Omit<PropertyDefinition<number>, "kind">,
): PropertyDefinition<number> => ({ kind: "number", ...p });
export const booleanProperty = (
  p: Omit<PropertyDefinition<boolean>, "kind">,
): PropertyDefinition<boolean> => ({ kind: "boolean", ...p });
export const numberValue = (empty = 0): ValueAdapter<number> => ({
  empty: () => empty,
  normalize: (input) => (typeof input === "number" ? input : Number(input)),
  isEmpty: (value) => !Number.isFinite(value),
});
export const stringValue = (empty = ""): ValueAdapter<string> => ({
  empty: () => empty,
  normalize: (input) => (input == null ? empty : String(input)),
  isEmpty: (value) => value.trim().length === 0,
});
export interface ControlProps<T = unknown> {
  value: T;
  setValue(value: T): void;
  onBlur(): void;
  config: Readonly<Record<string, unknown>>;
  disabled: boolean;
  readOnly: boolean;
  id: string;
  name: string;
}
// Deliberately low-level portable DOM control contract for the Phase-0 comparison.
// We have NOT yet selected this over a VNode-based renderer.
export interface FieldDefinition<T = unknown> {
  model: ComponentModel<T>;
  views: { portable: (props: ControlProps<T>) => HTMLElement };
}
export function defineField<T>(
  definition: ComponentModel<T> & {
    control: (props: ControlProps<T>) => HTMLElement;
  },
): FieldDefinition<T> {
  const { control, ...model } = definition;
  return { model, views: { portable: control } };
}
