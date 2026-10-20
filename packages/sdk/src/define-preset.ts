import type { ConfigOf, PropertyMap } from "@ourform/core";
import type { RegisteredField } from "./native";
import { resolveConfig } from "./config";

/** A distinct type with new property defaults, sharing the original adapter and views. */
export function definePreset<
  D extends RegisteredField & { properties: PropertyMap },
>(
  type: string,
  spec: {
    base: D;
    defaults: Partial<ConfigOf<NoInfer<D["properties"]>>>;
    title: string;
  },
): D;
export function definePreset(
  type: string,
  spec: {
    base: RegisteredField & { properties?: never };
    defaults: Record<string, unknown>;
    title: string;
  },
): RegisteredField;
export function definePreset(
  type: string,
  spec: {
    base: RegisteredField;
    defaults: Record<string, unknown>;
    title: string;
  },
): RegisteredField {
  if (!type || type === spec.base.model.type)
    throw new Error("A preset requires a distinct nonempty component type.");
  const metadata = spec.base.model.properties ?? {};
  const resolved = resolveConfig(metadata, spec.defaults);
  if (!resolved.ok)
    throw new Error(resolved.diagnostics.map((d) => d.message).join("; "));
  const properties: PropertyMap = JSON.parse(JSON.stringify(metadata));
  for (const [key, property] of Object.entries(properties))
    property.default = resolved.config[key];
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  };
  freeze(properties);
  return Object.freeze({
    ...spec.base,
    ...("properties" in spec.base ? { properties } : {}),
    model: Object.freeze({
      ...spec.base.model,
      type,
      title: spec.title,
      properties,
      builder: Object.freeze({
        group: "Fields",
        ...spec.base.model.builder,
        title: spec.title,
      }),
    }),
  });
}
