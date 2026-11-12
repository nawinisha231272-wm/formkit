import { createEngine } from "@ourform/core";
import type { LogicCallContext, LogicEffect } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";

/** Shared self-hosted effects fixture for framework lifecycle parity. */
export function createLogicEffectsDemo() {
  const effects: LogicEffect[] = [];
  const outputs: LogicEffect[] = [];
  const deliveryOrder: ("provider" | "output")[] = [];
  const listeners: number[] = [];
  const calls: {
    args: readonly unknown[];
    context: LogicCallContext;
    complete(): void;
  }[] = [];
  const engine = createEngine({
    logic: createLogic(),
    functions: {
      lookup: {
        pure: false,
        availableInNode: true,
        run: () => {},
        effect: (args, context) =>
          new Promise<void>((resolve) => {
            calls.push({ args, context, complete: resolve });
          }),
      },
    },
  });
  return { engine, effects, outputs, deliveryOrder, listeners, calls };
}

declare global {
  interface Window {
    logicEffectsDemo: ReturnType<typeof createLogicEffectsDemo>;
  }
}
