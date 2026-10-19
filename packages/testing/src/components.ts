import { createEngine } from "@ourform/core";
import type { EngineOptions } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
/** Engine shared by Node/browser fixture checks; includes the shipped layouts and object scopes. */
export function createConformanceEngine(options: EngineOptions = {}) {
  const engine = createEngine(options);
  for (const field of builtinComponents) engine.register(field.model);
  return engine;
}
