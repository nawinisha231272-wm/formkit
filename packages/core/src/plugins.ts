import valid from "semver/functions/valid.js";
import validRange from "semver/ranges/valid.js";
import satisfies from "semver/functions/satisfies.js";
import { version } from "../package.json";
import type { ComponentModel } from "./model";
import type { FunctionMap } from "./types";
import type { ValidatorMap } from "./validators";

export const coreVersion: string = version;
type PluginModel = Omit<ComponentModel, "value"> & {
  value?: {
    empty(): unknown;
    normalize(input: unknown): unknown;
    isEmpty(value: unknown): boolean;
    equals?(left: unknown, right: unknown): boolean;
    serialize?(value: unknown): unknown;
    jsonSchema?(config: unknown): object;
  };
};
/** Structural input lets the SDK carry views without core importing or retaining them. */
export interface PluginRegistration {
  id: string;
  version: string;
  engine: string;
  components?: readonly (PluginModel | { model: PluginModel })[];
  themes?: readonly { name: string }[];
  validators?: ValidatorMap;
  functions?: FunctionMap;
  dataSources?: Readonly<Record<string, unknown>>;
  requires?: readonly { plugin: string; version: string }[];
}
export function pluginVersions(
  plugins: readonly PluginRegistration[],
): ReadonlyMap<string, string> {
  const versions = new Map<string, string>();
  for (const plugin of plugins) {
    if (!plugin.id || !valid(plugin.version) || !validRange(plugin.engine))
      throw new Error(`Invalid plugin metadata: ${plugin.id}`);
    if (!satisfies(coreVersion, plugin.engine))
      throw new Error(
        `Plugin ${plugin.id} requires core ${plugin.engine}; installed ${coreVersion}.`,
      );
    if (versions.has(plugin.id))
      throw new Error(`Duplicate plugin: ${plugin.id}`);
    versions.set(plugin.id, plugin.version);
  }
  for (const plugin of plugins)
    for (const requirement of plugin.requires ?? [])
      if (!meetsRequirement(versions, requirement))
        throw new Error(
          `Plugin ${plugin.id} requires ${requirement.plugin} ${requirement.version}.`,
        );
  return versions;
}
export function meetsRequirement(
  versions: ReadonlyMap<string, string>,
  requirement: { plugin: string; version: string },
): boolean {
  const installed = versions.get(requirement.plugin);
  return (
    !!installed &&
    !!validRange(requirement.version) &&
    satisfies(installed, requirement.version)
  );
}
export function mergePluginMap<T>(
  target: Record<string, T>,
  input: Readonly<Record<string, T>> | undefined,
  kind: string,
): void {
  for (const [name, value] of Object.entries(input ?? {})) {
    if (
      ["__proto__", "prototype", "constructor"].includes(name) ||
      Object.hasOwn(target, name)
    )
      throw new Error(`Duplicate or reserved ${kind}: ${name}`);
    target[name] = value;
  }
}
