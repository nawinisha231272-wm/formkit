import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";

/** Trusted, local fixture function; arrays remain data returned by a registered function. */
export function createLogicPropertiesEngine() {
  return createEngine({
    logic: createLogic(),
    functions: {
      propertyOptions: {
        pure: true,
        availableInNode: true,
        run: () => [{ value: "new", label: "Replacement" }],
      },
    },
  });
}
