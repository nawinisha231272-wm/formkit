import type { FormField } from "@ourform/schema";
import type { ComponentModel, PropertyDefinition } from "@ourform/core";
export { createBuilder } from "./builder";
export type {
  Builder,
  BuilderOptions,
  PaletteGroup,
  DispatchOptions,
} from "./builder";
export {
  AddComponent,
  RemoveComponent,
  UpdateProperty,
  UpdateComponent,
} from "./commands";
export type {
  BuilderState,
  BuilderContext,
  Command,
  CommandResult,
  JsonPatchOp,
  AddOptions,
} from "./commands";
export type { PanelProperty, PropertyPanelModel } from "./property-panel";
export interface EditorProperty {
  key: string;
  kind: string;
  label: string;
  group: string;
  value: unknown;
  min?: number;
  max?: number;
}
const base: Record<string, PropertyDefinition> = {
  label: { kind: "string", label: "Label", default: "", group: "Display" },
  key: { kind: "string", label: "Data key", default: "", group: "Data" },
  required: {
    kind: "boolean",
    label: "Required",
    default: false,
    group: "Validation",
  },
};
export function getEditorProperties<T>(
  field: FormField,
  definition: ComponentModel<T>,
): EditorProperty[] {
  const settings = { ...base, ...definition.properties };
  return Object.entries(settings).map(([key, property]) => ({
    key,
    kind: property.kind,
    label: property.label,
    group: property.group,
    value:
      key === "required"
        ? (field.validation?.required ?? false)
        : key === "label"
          ? field.label
          : key === "key"
            ? field.key
            : (field.properties?.[key] ?? property.default),
    ...(property.min === undefined ? {} : { min: property.min }),
    ...(property.max === undefined ? {} : { max: property.max }),
  }));
}
export function applyEditorProperty(
  field: FormField,
  key: string,
  value: unknown,
): FormField {
  if (key === "label" || key === "key")
    return { ...field, [key]: String(value) };
  if (key === "required")
    return {
      ...field,
      validation: { ...field.validation, required: Boolean(value) },
    };
  return { ...field, properties: { ...field.properties, [key]: value } };
}

export {
  MoveComponent,
  DuplicateComponent,
  PasteComponent,
  ChangeKey,
  WrapInLayout,
  Unwrap,
  ReplaceDefinition,
} from "./structural-commands";
export { checkDrop } from "./structure";
export type { DropTarget } from "./structure";
export type { MoveOptions } from "./structural-commands";
export type { LockLevel, ComponentLocks, LockOptions } from "./locks";
