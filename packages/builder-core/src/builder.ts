import type { Diagnostic, FormDefinition } from "@ourform/schema";
import { inspectJson } from "@ourform/schema";
import type { Engine } from "@ourform/core";
import { copy, freeze, locate } from "./commands";
import { checkDrop } from "./structure";
import type { DropTarget } from "./structure";
import { pathWarnings } from "./structural-commands";
import type { BuilderState, Command, JsonPatchOp } from "./commands";
import { createPropertyPanel } from "./property-panel";
import type { PropertyPanelModel } from "./property-panel";

export interface PaletteGroup {
  name: string;
  components: { type: string; title: string; order: number; icon?: string }[];
}
export interface BuilderOptions {
  historyLimit?: number;
}
export interface Builder {
  canDrop(type: string, target: DropTarget, movingId?: string): Diagnostic[];
  getState(): BuilderState;
  select(componentId: string | null): void;
  dispatch(command: Command): Diagnostic[];
  undo(): void;
  redo(): void;
  palette(): PaletteGroup[];
  propertyPanel(componentId: string): PropertyPanelModel;
  subscribe(
    listener: (state: BuilderState, patch: JsonPatchOp[]) => void,
  ): () => void;
}
/** Headless Phase 0 authoring. Invalid edits leave both definition and history unchanged. */
export function createBuilder(
  engine: Engine,
  definition: FormDefinition,
  options: BuilderOptions = {},
): Builder {
  const historyLimit = options.historyLimit ?? 100;
  if (
    !Number.isInteger(historyLimit) ||
    historyLimit < 1 ||
    historyLimit > 1000
  )
    throw new Error("historyLimit must be an integer between 1 and 1000.");
  const initial = engine.compile(definition);
  if (!initial.ok)
    throw new Error(
      `Invalid initial builder definition: ${JSON.stringify(initial.diagnostics)}`,
    );
  let state: BuilderState = freeze({
    definition: copy(definition),
    selection: null,
    history: { past: [], future: [] },
  });
  const past: { command: Command; forward: Command; inverse: Command }[] = [];
  const future: typeof past = [];
  const listeners = new Set<
    (state: BuilderState, patch: JsonPatchOp[]) => void
  >();
  const publish = (next: BuilderState, patch: JsonPatchOp[]) => {
    state = freeze({
      ...next,
      history: {
        past: past.map((p) => p.command),
        future: future.map((p) => p.command),
      },
    });
    for (const listener of [...listeners]) listener(state, freeze(patch));
  };
  return {
    getState: () => state,
    canDrop: (type, target, movingId) =>
      checkDrop(engine, state.definition, type, target, movingId),
    select(id) {
      if (id && !locate(state.definition, id))
        throw new Error(`Unknown component: ${id}`);
      publish({ ...state, selection: id }, []);
    },
    dispatch(command) {
      const result = command.apply(state, { engine });
      const jsonErrors = inspectJson(result.state.definition);
      const compiled = jsonErrors.length
        ? { diagnostics: jsonErrors }
        : engine.compile(result.state.definition);
      const signature = (d: Diagnostic) =>
        JSON.stringify([d.code, d.componentId, d.message]);
      const existing = new Set(
        command.type === "ReplaceDefinition"
          ? []
          : engine.compile(state.definition).diagnostics.map(signature),
      );
      const renaming =
        command.type === "ChangeKey" ||
        (command.type === "UpdateProperty" &&
          "key" in command &&
          command.key === "key");
      const changingPaths =
        renaming ||
        ["MoveComponent", "WrapInLayout", "Unwrap"].includes(command.type);
      const warnings = changingPaths
        ? pathWarnings(state.definition, result.state.definition, engine)
        : [];
      const diagnostics = [
        ...result.diagnostics,
        ...warnings,
        ...compiled.diagnostics
          .map(
            (d): Diagnostic =>
              (d.code === "bad-ref" || d.code === "bad-path") &&
              (existing.has(signature(d)) ||
                command.type === "RemoveComponent" ||
                command.type === "Unwrap" ||
                (changingPaths && d.code === "bad-path"))
                ? {
                    ...d,
                    severity: "warning",
                    code:
                      changingPaths && d.code === "bad-path"
                        ? "stale-path"
                        : "dangling-ref",
                  }
                : d,
          )
          .filter(
            (d) =>
              !(
                d.code === "stale-path" &&
                warnings.some((w) => w.componentId === d.componentId)
              ),
          ),
      ];
      if (diagnostics.some((d) => d.severity === "error")) return diagnostics;
      if (
        JSON.stringify(state.definition) ===
        JSON.stringify(result.state.definition)
      )
        return diagnostics;
      const inverse = command.invert(state);
      // Snapshot the successful forward state too: redo never generates new ids or defaults.
      const forward = inverse.invert(result.state);
      past.push({ command, forward, inverse });
      if (past.length > historyLimit) past.shift();
      future.length = 0;
      publish(result.state, result.patch);
      return diagnostics;
    },
    undo() {
      const entry = past.pop();
      if (!entry) return;
      const result = entry.inverse.apply(state, { engine });
      future.push(entry);
      publish(result.state, result.patch);
    },
    redo() {
      const entry = future.pop();
      if (!entry) return;
      const result = entry.forward.apply(state, { engine });
      past.push(entry);
      publish(result.state, result.patch);
    },
    palette() {
      const groups: PaletteGroup[] = [];
      for (const model of engine.listFields()) {
        const name = model.builder?.group ?? "Fields";
        let group = groups.find((g) => g.name === name);
        if (!group) groups.push((group = { name, components: [] }));
        group.components.push({
          type: model.type,
          title: model.builder?.title ?? model.title,
          order: model.builder?.order ?? 0,
          ...(model.builder?.icon ? { icon: model.builder.icon } : {}),
        });
      }
      for (const group of groups)
        group.components.sort(
          (a, b) => a.order - b.order || a.title.localeCompare(b.title),
        );
      return groups;
    },
    propertyPanel(id) {
      const node = locate(state.definition, id)?.node;
      if (!node) throw new Error(`Unknown component: ${id}`);
      return createPropertyPanel(node, engine.getField(node.type)!);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
