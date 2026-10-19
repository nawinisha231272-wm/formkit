import type { ComponentModel, PropertyMap, ValueAdapter } from "@ourform/core";
import type { FieldControlProps, ShellVariant } from "./contracts";
import type { PortableControl } from "./define-field";
import { stringValue, numberValue, booleanValue } from "./value";
export interface NativeFieldOptions<V = unknown> {
  value?: ValueAdapter<V>;
  valueType?: "string" | "number" | "boolean" | "array";
  model?: ComponentModel<V>;
  title?: string;
  properties?: PropertyMap;
  shell?: ShellVariant;
  valueProp?: string;
  changeProp?: string;
  blurProp?: string;
  disabledProp?: string;
  readOnlyProp?: string;
  mapChange?: (...args: unknown[]) => V;
}
export interface NativeView {
  component: unknown;
  mapping: Required<
    Pick<
      NativeFieldOptions,
      "valueProp" | "changeProp" | "blurProp" | "disabledProp" | "readOnlyProp"
    >
  >;
  mapChange?: (...args: unknown[]) => unknown;
}
export interface ComponentViews {
  shell?: ShellVariant;
  portable?: PortableControl;
  native?: Readonly<Record<string, NativeView>>;
  packs?: Readonly<Record<string, PortableControl>>;
}
export interface RegisteredField {
  model: Omit<ComponentModel, "value"> & {
    value?: {
      empty(): unknown;
      normalize(input: unknown): unknown;
      isEmpty(value: unknown): boolean;
      equals?(left: unknown, right: unknown): boolean;
      serialize?(value: unknown): unknown;
      jsonSchema?(config: unknown): object;
    };
  };
  views: ComponentViews;
}
export function registerNativeField<V = string>(
  adapter: string,
  type: string,
  component: unknown,
  options: NativeFieldOptions<V> = {},
): RegisteredField {
  if (!adapter || !type || !component)
    throw new Error("Native registration needs adapter, type and component.");
  if (
    options.valueType &&
    !["string", "number", "boolean", "array"].includes(options.valueType)
  )
    throw new Error("Object-valued native controls require a value adapter.");
  const inferred =
    options.valueType === "number"
      ? numberValue({ empty: null })
      : options.valueType === "boolean"
        ? booleanValue()
        : options.valueType === "array"
          ? {
              empty: () => [],
              normalize: (input: unknown) => {
                if (input == null) return [];
                if (
                  !Array.isArray(input) ||
                  input.some(
                    (v) =>
                      !["string", "number", "boolean"].includes(typeof v) ||
                      (typeof v === "number" && !Number.isFinite(v)),
                  )
                )
                  throw new Error(
                    "Native arrays must contain primitives; object values require a value adapter.",
                  );
                return [...input];
              },
              isEmpty: (value: unknown[]) => value.length === 0,
            }
          : stringValue();
  const value = options.value ??
    options.model?.value ?? {
      ...inferred,
      normalize(input: unknown) {
        if (
          input != null &&
          !["string", "number", "boolean"].includes(typeof input) &&
          options.valueType !== "array"
        )
          throw new Error(
            "Object-valued native controls require a value adapter.",
          );
        return inferred.normalize(input);
      },
    };
  const unsafe =
    /^(?:__proto__|prototype|constructor|innerHTML|outerHTML|srcdoc|dangerouslySetInnerHTML)$/i;
  for (const key of [
    ...Object.keys(options.properties ?? options.model?.properties ?? {}),
    options.valueProp,
    options.changeProp,
    options.blurProp,
    options.disabledProp,
    options.readOnlyProp,
  ])
    if (key && unsafe.test(key))
      throw new Error(`Unsafe native property: ${key}`);
  const mapping = Object.freeze({
    valueProp: options.valueProp ?? "value",
    changeProp:
      options.changeProp ??
      (adapter === "react"
        ? "onValueChange"
        : adapter === "element"
          ? "value-change"
          : "valueChange"),
    blurProp: options.blurProp ?? (adapter === "react" ? "onBlur" : "blur"),
    disabledProp: options.disabledProp ?? "disabled",
    readOnlyProp: options.readOnlyProp ?? "readOnly",
  });
  const native: NativeView = Object.freeze({
    component,
    mapping,
    ...(options.mapChange ? { mapChange: options.mapChange } : {}),
  });
  const model: RegisteredField["model"] = options.model
    ? { ...options.model, value: value as ValueAdapter<unknown> }
    : {
        type,
        title: options.title ?? type,
        kind: "field",
        value: value as ValueAdapter<unknown>,
        properties: options.properties ?? {},
        builder: { title: options.title ?? type, group: "Fields" },
      };
  if (model.type !== type)
    throw new Error("Native model type must match registration type.");
  return Object.freeze({
    model: Object.freeze(model),
    views: Object.freeze({
      shell: options.shell ?? "field",
      native: Object.freeze({ [adapter]: native }),
    }),
  });
}
export function mapNativeProps(
  view: NativeView,
  p: FieldControlProps<unknown, Record<string, unknown>>,
): Record<string, unknown> {
  return {
    ...p.config,
    [view.mapping.valueProp]: p.value,
    [view.mapping.changeProp]: (...args: unknown[]) => {
      if (!p.state.disabled && !p.state.readOnly)
        p.setValue(view.mapChange ? view.mapChange(...args) : args[0]);
    },
    [view.mapping.blurProp]: p.onBlur,
    [view.mapping.disabledProp]: p.state.disabled,
    [view.mapping.readOnlyProp]: p.state.readOnly,
    id: p.a11y.id,
    name: p.a11y.name,
    labelledBy: p.a11y.labelledBy,
    describedBy: p.a11y.describedBy,
    invalid: p.state.invalid,
    required: p.state.required,
    "aria-labelledby": p.a11y.labelledBy,
    "aria-describedby": p.a11y.describedBy,
    "aria-invalid": String(p.state.invalid),
    "aria-required": String(p.state.required),
    "aria-busy": String(p.state.pending),
    className: p.theme.classFor("control"),
    focusRef: p.focusRef,
  };
}
export type PrimitiveNativeValue = string | number | boolean | null | undefined;
export type NativeRegistrationArgs<V> = [V] extends [string | null | undefined]
  ? [options?: NativeFieldOptions<V>]
  : [V] extends [number | null | undefined]
    ? [
        options: NativeFieldOptions<V> &
          ({ valueType: "number" } | { value: ValueAdapter<V> }),
      ]
    : [V] extends [boolean | null | undefined]
      ? [
          options: NativeFieldOptions<V> &
            ({ valueType: "boolean" } | { value: ValueAdapter<V> }),
        ]
      : [V] extends [readonly (string | number | boolean)[] | null | undefined]
        ? [
            options: NativeFieldOptions<V> &
              ({ valueType: "array" } | { value: ValueAdapter<V> }),
          ]
        : [options: NativeFieldOptions<V> & { value: ValueAdapter<V> }];
