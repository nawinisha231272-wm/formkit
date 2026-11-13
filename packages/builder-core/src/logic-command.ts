import { inspectJson } from "@ourform/schema";
import type { LogicRule } from "@ourform/schema";
import { copy, freeze, restoreSnapshot } from "./commands";
import type { BuilderState, Command, CommandResult } from "./commands";

/** Add, edit, reorder, duplicate or remove rules in one validated history step. */
export class UpdateLogic implements Command {
  readonly type = "UpdateLogic";
  readonly rules: readonly LogicRule[];
  constructor(
    rules: readonly LogicRule[],
    readonly label = "",
  ) {
    if (!Array.isArray(rules) || inspectJson(rules).length)
      throw new Error("Rules must be a safe JSON array.");
    this.rules = freeze(copy(rules));
    Object.freeze(this);
  }
  apply(state: BuilderState): CommandResult {
    const rules = [...this.rules];
    return {
      state: { ...state, definition: { ...state.definition, logic: rules } },
      patch: [
        {
          op: Object.hasOwn(state.definition, "logic") ? "replace" : "add",
          path: "/logic",
          value: rules,
        },
      ],
      diagnostics: [],
    };
  }
  invert(before: BuilderState): Command {
    return restoreSnapshot(before);
  }
}
