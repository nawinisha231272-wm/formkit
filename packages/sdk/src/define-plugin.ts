import type { PluginRegistration } from "@ourform/core";
import type { RegisteredField } from "./native";
import type { Theme } from "./theme";

export interface Plugin
  extends Omit<PluginRegistration, "components" | "themes"> {
  readonly components: readonly (RegisteredField | RegisteredField["model"])[];
  readonly themes: readonly Theme[];
}
/** Package trusted registrations; engine installation checks semver, dependencies and conflicts. */
export function definePlugin(
  spec: Omit<Plugin, "components" | "themes"> & {
    components?: readonly (RegisteredField | RegisteredField["model"])[];
    themes?: readonly Theme[];
  },
): Plugin {
  if (!spec.id || !spec.version || !spec.engine)
    throw new Error("Plugin id, version and engine range are required.");
  return Object.freeze({
    ...spec,
    components: Object.freeze([...(spec.components ?? [])]),
    themes: Object.freeze([...(spec.themes ?? [])]),
    ...(spec.requires
      ? {
          requires: Object.freeze(
            spec.requires.map((requirement) =>
              Object.freeze({ ...requirement }),
            ),
          ),
        }
      : {}),
    ...(spec.validators
      ? { validators: Object.freeze({ ...spec.validators }) }
      : {}),
    ...(spec.functions
      ? { functions: Object.freeze({ ...spec.functions }) }
      : {}),
    ...(spec.dataSources
      ? { dataSources: Object.freeze({ ...spec.dataSources }) }
      : {}),
  });
}
