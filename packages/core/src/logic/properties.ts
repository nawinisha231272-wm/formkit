import { isSafeKey, validateProperties } from "@ourform/schema";
import type { PropertyDefinition, LogicPropertyPath } from "../model";
import type { CompiledNode } from "../types";
import { freeze, snapshot } from "../paths";

const display = new Set([
  "label",
  "labelKey",
  "description",
  "placeholder",
  "tooltip",
  "prefix",
  "suffix",
  "ariaLabel",
]);
const bounds = new Set([
  "min",
  "max",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
]);
export interface PropertyValue {
  value: unknown;
  pattern?: RegExp;
}
export interface CompiledProperty {
  base: CompiledNode;
  name: string;
  parse(value: unknown): PropertyValue;
  apply(entry: CompiledNode, value: PropertyValue): CompiledNode;
}
/** Resolve explicit trusted capabilities; wire strings never become arbitrary object paths. */
export function compileProperty(
  entry: CompiledNode,
  requested: string,
): CompiledProperty | undefined {
  if (!requested || requested.split(".").some((key) => !isSafeKey(key) || !key))
    return;
  const configKey = requested.startsWith("properties.")
    ? requested.slice(11)
    : requested;
  const config = Object.hasOwn(entry.model.properties ?? {}, configKey)
    ? entry.model.properties![configKey]
    : undefined;
  const permission = (path: string) =>
    entry.model.logicSettable?.includes(path as LogicPropertyPath) === true;
  const configAllowed =
    !!config &&
    (config.logicSettable === true || permission(`properties.${configKey}`));
  let name: string, group: string, key: string;
  let descriptor: PropertyDefinition;
  if (display.has(requested) && permission(requested)) {
    name = requested;
    group = "";
    key = requested;
    descriptor = { kind: "string", label: key, default: "", group: "Display" };
  } else if (
    requested.startsWith("validation.") &&
    bounds.has(requested.slice(11)) &&
    permission(requested) &&
    entry.model.value
  ) {
    name = requested;
    group = "validation";
    key = requested.slice(11);
    descriptor = {
      kind: key === "pattern" ? "string" : "number",
      label: key,
      default: key === "pattern" ? "" : 0,
      group: "Validation",
      ...(key.endsWith("Length") || key.endsWith("Items") ? { min: 0 } : {}),
    };
  } else if (
    configAllowed &&
    !(bounds.has(requested) && permission(`validation.${requested}`))
  ) {
    name = `properties.${configKey}`;
    group = "properties";
    key = configKey;
    descriptor = config!;
  } else if (
    bounds.has(requested) &&
    permission(`validation.${requested}`) &&
    !configAllowed
  ) {
    return compileProperty(entry, `validation.${requested}`);
  } else return;
  return {
    base: entry,
    name,
    parse(raw) {
      const value = snapshot(raw);
      if (
        validateProperties({ value: descriptor }, { value }).length ||
        (group === "validation" &&
          (key.endsWith("Length") || key.endsWith("Items")) &&
          !Number.isInteger(value)) ||
        (name === "labelKey" && value === "")
      )
        throw new TypeError(`Invalid logic property ${name}.`);
      return freeze({
        value,
        ...(name === "validation.pattern"
          ? { pattern: new RegExp(value as string, "u") }
          : {}),
      });
    },
    apply(base, resolved) {
      const node = { ...base.node };
      if (group === "properties")
        node.properties = { ...node.properties, [key]: resolved.value };
      else if (group === "validation")
        node.validation = { ...node.validation, [key]: resolved.value };
      else Object.assign(node, { [key]: resolved.value });
      return freeze({
        ...base,
        node,
        ...(resolved.pattern ? { pattern: resolved.pattern } : {}),
      });
    },
  };
}
