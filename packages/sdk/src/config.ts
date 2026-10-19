import type { ConfigOf, PropertyMap } from "@ourform/core";
import { inspectJson, validateProperties } from "@ourform/schema";
import type { Diagnostic } from "@ourform/schema";
export function resolveConfig<P extends PropertyMap>(
  properties: P,
  input: unknown = {},
):
  | { ok: true; config: Readonly<ConfigOf<P>>; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] } {
  const diagnostics = validateProperties(properties, input);
  if (diagnostics.length) return { ok: false, diagnostics };
  const config = {
    ...Object.fromEntries(
      Object.entries(properties).map(([key, p]) => [key, p.default]),
    ),
    ...(input as Record<string, unknown>),
  };
  const errors = validateProperties(properties, config);
  if (errors.length || inspectJson(config).length)
    return {
      ok: false,
      diagnostics: errors.length
        ? errors
        : [
            {
              severity: "error",
              code: "invalid-property",
              message: "Invalid property defaults.",
            },
          ],
    };
  const freeze = (v: unknown): void => {
    if (v !== null && typeof v === "object") {
      for (const child of Object.values(v)) freeze(child);
      Object.freeze(v);
    }
  };
  const copy: ConfigOf<P> = JSON.parse(JSON.stringify(config));
  freeze(copy);
  return { ok: true, config: copy, diagnostics: [] };
}
