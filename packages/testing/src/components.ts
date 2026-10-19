import { createEngine } from "@ourform/core";
import type { EngineOptions } from "@ourform/core";
import { builtinFields } from "@ourform/components";
/** Engine shared by Node/browser fixture checks; containers are the existing headless object/transparent scopes. */
export function createConformanceEngine(options: EngineOptions = {}) {
  const engine = createEngine(options);
  for (const field of builtinFields) engine.register(field.model);
  return engine
    .register({
      type: "container",
      title: "Container",
      kind: "layout",
      dataScope: "object",
    })
    .register({
      type: "panel",
      title: "Panel",
      kind: "layout",
      dataScope: "none",
    });
}
