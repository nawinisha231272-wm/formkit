import type { Diagnostic, FormDefinition } from "@ourform/schema";
import { inspectJson } from "@ourform/schema";
import type { Engine } from "@ourform/core";
import { copy, freeze, locate, AtomicCommand } from "./commands";
import { checkDrop, keyFromLabel, uniqueKey, entries } from "./structure";
import type { DropTarget } from "./structure";
import { pathWarnings, MoveComponent } from "./structural-commands";
import type { BuilderState, Command, JsonPatchOp } from "./commands";
import { createPropertyPanel } from "./property-panel";
import type { PropertyPanelModel } from "./property-panel";
import { createLocks, checkLocks, lockedDrop } from "./locks";
import type { LockOptions, LockLevel } from "./locks";

export interface PaletteGroup {
  name: string;
  components: { type: string; title: string; order: number; icon?: string }[];
}
export interface BuilderOptions extends LockOptions {
  historyLimit?: number;
}
export interface DispatchOptions {
  historyGroup?: string;
}
export interface Builder {
  suggestKey(componentId: string, label: string): string | undefined;
  lockLevel(componentId: string): LockLevel | undefined;
  canDrop(type: string, target: DropTarget, movingId?: string): Diagnostic[];
  getState(): BuilderState;
  commandLabel(command: Command): { action: Command["type"]; label: string };
  select(componentId: string | null): void;
  dispatch(command: Command, options?: DispatchOptions): Diagnostic[];
  undo(): Diagnostic[];
  redo(): Diagnostic[];
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
  const locks = createLocks({
    ...(options.locked ? { locked: options.locked } : {}),
    ...(options.readOnlyKeys ? { readOnlyKeys: options.readOnlyKeys } : {}),
  });
  if (!initial.ok)
    throw new Error(
      `Invalid initial builder definition: ${JSON.stringify(initial.diagnostics)}`,
    );
  const labels = new WeakMap<
    Command,
    { action: Command["type"]; label: string }
  >();
  let state: BuilderState = freeze({
    definition: copy(initial.form.definition),
    selection: null,
    history: { past: [], future: [] },
  });
  const past: { command: Command; forward: Command; inverse: Command }[] = [];
  const future: typeof past = [];
  const listeners = new Set<
    (state: BuilderState, patch: JsonPatchOp[]) => void
  >();
  let editGroup: { key: string; time: number } | undefined;
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
    suggestKey: (id, label) => {
      const entry = entries(state.definition, engine).find(
        (entry) => entry.node.id === id,
      );
      if (!entry) throw new Error(`Unknown component: ${id}`);
      if (!entry.node.key) return undefined;
      return uniqueKey(
        state.definition,
        engine,
        keyFromLabel(label),
        entry.scope,
        new Set([id]),
        "",
      );
    },
    lockLevel: (id) => {
      let found = locate(state.definition, id);
      const level = found ? locks(found.node) : undefined;
      while (found?.parentId) {
        found = locate(state.definition, found.parentId);
        if (found && locks(found.node) === "all") return "all";
      }
      return level;
    },
    getState: () => state,
    canDrop: (type, target, movingId) => {
      const diagnostics = [
        ...checkDrop(engine, state.definition, type, target, movingId),
        ...lockedDrop(state.definition, engine, locks, target, movingId),
      ];
      if (!diagnostics.length && movingId) {
        const result = new MoveComponent(movingId, target).apply(state, {
          engine,
        });
        diagnostics.push(
          ...checkLocks(
            state.definition,
            result.state.definition,
            engine,
            locks,
          ),
        );
      }
      return diagnostics;
    },
    select(id) {
      if (id && !locate(state.definition, id))
        throw new Error(`Unknown component: ${id}`);
      if (id !== state.selection) editGroup = undefined;
      publish({ ...state, selection: id }, []);
    },
    commandLabel(command) {
      return labels.get(command) ?? { action: command.type, label: "" };
    },
    dispatch(command, dispatchOptions = {}) {
      const group = dispatchOptions.historyGroup;
      if (
        group !== undefined &&
        (!group.trim() ||
          !["UpdateProperty", "UpdateComponent"].includes(command.type))
      )
        throw new Error(
          "History grouping requires a named property/component edit session.",
        );
      const result = command.apply(state, { engine });
      const jsonErrors = inspectJson(result.state.definition);
      if (!jsonErrors.length) {
        const violations = checkLocks(
          state.definition,
          result.state.definition,
          engine,
          locks,
        );
        if (violations.length) return violations;
      }
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
        command.type === "UpdateComponent" ||
        (command.type === "UpdateProperty" &&
          "key" in command &&
          command.key === "key");
      const changingPaths =
        renaming ||
        ["MoveComponent", "WrapInLayout", "Unwrap"].includes(command.type);
      const removes = (candidate: Command): boolean =>
        candidate.type === "RemoveComponent" ||
        candidate.type === "Unwrap" ||
        (candidate instanceof AtomicCommand &&
          candidate.commands.some(removes));
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
                removes(command) ||
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
      const id =
        "componentId" in command && typeof command.componentId === "string"
          ? command.componentId
          : result.state.selection;
      const node = id
        ? (locate(state.definition, id)?.node ??
          locate(result.state.definition, id)?.node)
        : undefined;
      labels.set(command, {
        action: command.type,
        label:
          (command.type === "AtomicCommand" &&
          "label" in command &&
          typeof command.label === "string"
            ? command.label
            : "") ||
          node?.label?.trim() ||
          (node
            ? (engine.getField(node.type)?.builder?.title ??
              engine.getField(node.type)?.title)
            : "") ||
          state.definition.title?.trim() ||
          "",
      });
      if (
        JSON.stringify(state.definition) ===
        JSON.stringify(result.state.definition)
      )
        return diagnostics;
      const inverse = command.invert(state);
      // Snapshot the successful forward state too: redo never generates new ids or defaults.
      const forward = inverse.invert(result.state);
      const previous = past.at(-1);
      const now = Date.now();
      if (
        previous &&
        group !== undefined &&
        editGroup?.key === group &&
        now - editGroup.time < 500
      )
        past[past.length - 1] = { command, forward, inverse: previous.inverse };
      else past.push({ command, forward, inverse });
      editGroup = group === undefined ? undefined : { key: group, time: now };
      if (past.length > historyLimit) past.shift();
      future.length = 0;
      publish(result.state, result.patch);
      return diagnostics;
    },
    undo() {
      editGroup = undefined;
      const entry = past.at(-1);
      if (!entry) return [];
      const result = entry.inverse.apply(state, { engine });
      const violations = checkLocks(
        state.definition,
        result.state.definition,
        engine,
        locks,
      );
      if (violations.length) return violations;
      past.pop();
      future.push(entry);
      publish(result.state, result.patch);
      return [];
    },
    redo() {
      editGroup = undefined;
      const entry = future.at(-1);
      if (!entry) return [];
      const result = entry.forward.apply(state, { engine });
      const violations = checkLocks(
        state.definition,
        result.state.definition,
        engine,
        locks,
      );
      if (violations.length) return violations;
      future.pop();
      past.push(entry);
      publish(result.state, result.patch);
      return [];
    },
    palette() {
      const groups: PaletteGroup[] = [];
      for (const model of engine.listFields()) {
        if (
          typeof model.builder?.title !== "string" ||
          !model.builder.title.trim()
        )
          continue;
        const name = model.builder?.group ?? "Fields";
        let group = groups.find((g) => g.name === name);
        if (!group) groups.push((group = { name, components: [] }));
        group.components.push({
          type: model.type,
          title: model.builder.title,
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
