import { inspectJson, isSafeKey } from "@ourform/schema";
import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import type { Engine } from "@ourform/core";
import { createPropertyPanel } from "./property-panel";

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
    | "RestoreSnapshot";
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
export function locate(definition: FormDefinition, id: string) {
  function walk(
    nodes: ComponentNode[],
    path: string,
  ):
    | {
        node: ComponentNode;
        nodes: ComponentNode[];
        index: number;
        path: string;
      }
    | undefined {
    for (const [index, node] of nodes.entries()) {
      const pointer = `${path}/${index}`;
      if (node.id === id) return { node, nodes, index, path: pointer };
      const found =
        node.components && walk(node.components, `${pointer}/components`);
      if (found) return found;
    }
    return undefined;
  }
  return walk(definition.components, "/components");
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
    readonly options: { parentId?: string; index?: number } = {},
  ) {
    this.options = Object.freeze({ ...options });
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const model = engine.getField(this.componentType);
    if (!model)
      return failure(state, `Unknown component type: ${this.componentType}`);
    const definition = copy(state.definition);
    const parent = this.options.parentId
      ? locate(definition, this.options.parentId)
      : undefined;
    if (
      this.options.parentId &&
      (!parent ||
        (parent.node.type && engine.getField(parent.node.type)?.value))
    )
      return failure(state, "Parent must be an existing layout component.");
    const nodes = parent
      ? (parent.node.components ??= [])
      : definition.components;
    const index = this.options.index ?? nodes.length;
    if (!Number.isInteger(index) || index < 0 || index > nodes.length)
      return failure(state, "Invalid insertion index.");
    let id: string;
    do {
      id = `cmp_${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
    } while (locate(definition, id));
    const title = model.builder?.title ?? model.title;
    const node: ComponentNode = { id, type: model.type, label: title };
    if (model.value || model.dataScope === "object") {
      const slug = title
        .replace(/[^A-Za-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/^[^A-Za-z_]/, "_$&")
        .toLowerCase();
      const stem = isSafeKey(slug) ? slug : "field";
      // Find data scopes structurally so unresolved-reference drafts remain editable.
      let scopeNodes = definition.components;
      function findScope(
        children: ComponentNode[],
        scope: ComponentNode[],
      ): boolean {
        for (const child of children) {
          const nextScope =
            engine.getField(child.type)?.dataScope === "object"
              ? (child.components ?? [])
              : scope;
          if (child.id === parent?.node.id) {
            scopeNodes = nextScope;
            return true;
          }
          if (findScope(child.components ?? [], nextScope)) return true;
        }
        return false;
      }
      if (parent) findScope(definition.components, definition.components);
      const keys = new Set<string>();
      function collect(children: ComponentNode[]): void {
        for (const child of children) {
          if (child.key) keys.add(child.key);
          if (engine.getField(child.type)?.dataScope !== "object")
            collect(child.components ?? []);
        }
      }
      collect(scopeNodes);
      let key = stem;
      for (let suffix = 2; keys.has(key); suffix++) key = `${stem}_${suffix}`;
      node.key = key;
    }
    nodes.splice(index, 0, node);
    const path = parent ? `${parent.path}/components` : "/components";
    // RFC 6902 requires creating a previously absent parent array before inserting into it.
    const originalParent = this.options.parentId
      ? locate(state.definition, this.options.parentId)
      : undefined;
    return {
      state: { ...state, definition, selection: id },
      patch:
        originalParent && !originalParent.node.components
          ? [{ op: "add", path, value: nodes }]
          : [{ op: "add", path: `${path}/${index}`, value: node }],
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
