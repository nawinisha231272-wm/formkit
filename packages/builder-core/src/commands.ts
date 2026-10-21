import { inspectJson, isSafeKey } from "@ourform/schema";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
import type { Engine } from "@ourform/core";
import { createPropertyPanel } from "./property-panel";
import { locate, checkDrop, createNode, insertNode } from "./structure";
import type { DropTarget } from "./structure";
export { locate } from "./structure";

export type JsonPatchOp =
  | { op: "add" | "replace"; path: string; value: unknown }
  | { op: "remove"; path: string };
export interface BuilderState {
  readonly definition: FormDefinition;
  readonly selection: string | null;
  readonly history: {
    readonly past: readonly Command[];
    readonly future: readonly Command[];
  };
}
export interface BuilderContext {
  engine: Engine;
}
export interface CommandResult {
  state: BuilderState;
  patch: JsonPatchOp[];
  diagnostics: Diagnostic[];
}
export interface Command {
  readonly type:
    | "AddComponent"
    | "UpdateProperty"
    | "RemoveComponent"
    | "RestoreSnapshot"
    | "MoveComponent"
    | "DuplicateComponent"
    | "ChangeKey"
    | "WrapInLayout"
    | "Unwrap"
    | "ReplaceDefinition";
  apply(state: BuilderState, ctx: BuilderContext): CommandResult;
  invert(before: BuilderState): Command;
}
export function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function failure(state: BuilderState, message: string): CommandResult {
  return {
    state,
    patch: [],
    diagnostics: [{ severity: "error", code: "builder-command", message }],
  };
}
class RestoreSnapshot implements Command {
  readonly type = "RestoreSnapshot";
  readonly definition: FormDefinition;
  readonly selection: string | null;
  constructor(before: BuilderState) {
    this.definition = freeze(copy(before.definition));
    this.selection = before.selection;
    Object.freeze(this);
  }
  apply(state: BuilderState): CommandResult {
    return {
      state: {
        ...state,
        definition: this.definition,
        selection: this.selection,
      },
      patch: [{ op: "replace", path: "", value: this.definition }],
      diagnostics: [],
    };
  }
  invert(before: BuilderState): Command {
    return new RestoreSnapshot(before);
  }
}
export class AddComponent implements Command {
  readonly type = "AddComponent";
  constructor(
    readonly componentType: string,
    readonly options: DropTarget = {},
  ) {
    this.options = Object.freeze({ ...options });
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const diagnostics = checkDrop(
      engine,
      state.definition,
      this.componentType,
      this.options,
    );
    if (diagnostics.length) return { state, patch: [], diagnostics };
    const definition = copy(state.definition);
    const node = createNode(
      definition,
      engine,
      this.componentType,
      this.options.parentId,
    );
    const inserted = insertNode(definition, engine, node, this.options);
    return {
      state: { ...state, definition, selection: node.id },
      patch: inserted.created
        ? [{ op: "add", path: inserted.arrayPath, value: inserted.nodes }]
        : [{ op: "add", path: inserted.path, value: node }],
      diagnostics: [],
    };
  }

  invert(before: BuilderState): Command {
    return new RestoreSnapshot(before);
  }
}
export class RemoveComponent implements Command {
  readonly type = "RemoveComponent";
  constructor(readonly componentId: string) {
    Object.freeze(this);
  }
  apply(state: BuilderState): CommandResult {
    const definition = copy(state.definition);
    const found = locate(definition, this.componentId);
    if (!found) return failure(state, `Unknown component: ${this.componentId}`);
    found.nodes.splice(found.index, 1);
    return {
      state: {
        ...state,
        definition,
        selection:
          state.selection && locate(definition, state.selection)
            ? state.selection
            : null,
      },
      patch: [{ op: "remove", path: found.path }],
      diagnostics: [],
    };
  }
  invert(before: BuilderState): Command {
    return new RestoreSnapshot(before);
  }
}
export class UpdateProperty implements Command {
  readonly type = "UpdateProperty";
  readonly value: unknown;
  constructor(
    readonly componentId: string,
    readonly key: string,
    value: unknown,
  ) {
    if (value !== undefined && inspectJson(value).length)
      throw new Error("Property value must be safe JSON.");
    this.value = value === undefined ? undefined : freeze(copy(value));
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const definition = copy(state.definition);
    const found = locate(definition, this.componentId);
    if (!found) return failure(state, `Unknown component: ${this.componentId}`);
    const model = engine.getField(found.node.type)!;
    const entry = createPropertyPanel(found.node, model)
      .groups.flatMap((g) => g.properties)
      .find((p) => p.key === this.key);
    if (!entry || this.key.split(".").some((part) => !isSafeKey(part)))
      return failure(state, "Unknown or unsafe property.");
    if (
      this.value !== undefined &&
      ((entry.kind === "boolean" && typeof this.value !== "boolean") ||
        (entry.kind === "string" && typeof this.value !== "string") ||
        (entry.kind === "number" && typeof this.value !== "number"))
    )
      return failure(state, "Property value has the wrong type.");
    const key = this.key === "hidden" ? "visibleWhen" : this.key;
    const value =
      this.key === "hidden" ? (this.value ? false : undefined) : this.value;
    const parts = key.split(".");
    let target = found.node as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      if (target[part] === undefined && value === undefined)
        return { state, patch: [], diagnostics: [] };
      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }
    const last = parts.at(-1)!;
    if (value === undefined) delete target[last];
    else target[last] = copy(value);
    return {
      state: { ...state, definition },
      patch: [{ op: "replace", path: found.path, value: found.node }],
      diagnostics: [],
    };
  }
  invert(before: BuilderState): Command {
    return new RestoreSnapshot(before);
  }
}

export function restoreSnapshot(before: BuilderState): Command {
  return new RestoreSnapshot(before);
}
