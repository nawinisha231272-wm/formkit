import { inspectJson } from "@ourform/schema";
import type {
  ComponentNode,
  Expr,
  FormDefinition,
  Diagnostic,
} from "@ourform/schema";
import type { Engine } from "@ourform/core";
import {
  copy,
  freeze,
  failure,
  restoreSnapshot,
  UpdateProperty,
} from "./commands";
import type {
  BuilderState,
  Command,
  BuilderContext,
  CommandResult,
  JsonPatchOp,
} from "./commands";
import {
  locate,
  checkDrop,
  destination,
  insertNode,
  createNode,
  newId,
  entries,
  uniqueKey,
} from "./structure";
import type { DropTarget } from "./structure";

abstract class SnapshotCommand {
  invert(before: BuilderState): Command {
    return restoreSnapshot(before);
  }
}
function visit(node: ComponentNode, fn: (node: ComponentNode) => void) {
  fn(node);
  node.components?.forEach((child) => visit(child, fn));
}
function transform(
  expr: Expr,
  map: (leaf: { ref: string } | { path: string }) => Expr,
): Expr {
  if (Array.isArray(expr))
    return expr.map((child, index) =>
      index === 0 ? child : transform(child as Expr, map),
    ) as Expr;
  if (expr !== null && typeof expr === "object") return map(expr);
  return expr;
}
function expressions(
  node: ComponentNode,
  map: (leaf: { ref: string } | { path: string }) => Expr,
) {
  if (node.visibleWhen !== undefined)
    node.visibleWhen = transform(node.visibleWhen, map);
  if (node.disabledWhen !== undefined)
    node.disabledWhen = transform(node.disabledWhen, map);
  if (node.calculate) node.calculate.expr = transform(node.calculate.expr, map);
  for (const rule of node.validation?.custom ?? [])
    for (const [key, expr] of Object.entries(rule.args ?? {}))
      rule.args![key] = transform(expr, map);
}
export function pathWarnings(
  before: FormDefinition,
  after: FormDefinition,
  engine: Engine,
): Diagnostic[] {
  const previous = entries(before, engine);
  const next = new Map(entries(after, engine).map((e) => [e.node.id, e]));
  const changed = previous.filter((e) => {
    const model = engine.getField(e.node.type);
    return (
      (model?.value || model?.dataScope === "object") &&
      next.has(e.node.id) &&
      JSON.stringify(e.path) !== JSON.stringify(next.get(e.node.id)!.path)
    );
  });
  const warnings: Diagnostic[] = [];
  for (const { node } of entries(after, engine)) {
    const seen = new Set<string>();
    expressions(copy(node), (leaf) => {
      if ("path" in leaf)
        for (const entry of changed) {
          const old = `data.${entry.path.join(".")}`;
          if (
            !seen.has(leaf.path) &&
            (leaf.path === old || leaf.path.startsWith(`${old}.`))
          ) {
            seen.add(leaf.path);
            warnings.push({
              severity: "warning",
              code: "stale-path",
              componentId: node.id,
              message: `Data path '${old}' changed to 'data.${next.get(entry.node.id)!.path.join(".")}'. Update this expression.`,
            });
          }
        }
      return leaf;
    });
  }
  return warnings;
}
export class MoveComponent extends SnapshotCommand implements Command {
  readonly type = "MoveComponent";
  readonly options: DropTarget;
  constructor(
    readonly componentId: string,
    options: DropTarget = {},
  ) {
    super();
    this.options = Object.freeze({ ...options });
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const source = locate(state.definition, this.componentId);
    if (!source)
      return failure(state, `Unknown component: ${this.componentId}`);
    const diagnostics = checkDrop(
      engine,
      state.definition,
      source.node.type,
      this.options,
      this.componentId,
    );
    if (diagnostics.length) return { state, patch: [], diagnostics };
    const from = destination(state.definition, engine, {
      ...(source.parentId === undefined
        ? {}
        : {
            parentId: source.parentId,
            ...(source.node.slot === undefined
              ? {}
              : { slot: source.node.slot }),
          }),
    });
    const to = destination(state.definition, engine, this.options);
    const ordinal = from.nodes
      .filter((n) => (n.slot ?? from.first) === from.slot.name)
      .findIndex((n) => n.id === this.componentId);
    const count = to.nodes.filter(
      (n) => (n.slot ?? to.first) === to.slot.name && n.id !== this.componentId,
    ).length;
    if (
      source.parentId === this.options.parentId &&
      from.slot.name === to.slot.name &&
      ordinal === (this.options.index ?? count)
    )
      return { state, patch: [], diagnostics: [] };
    const definition = copy(state.definition);
    const found = locate(definition, this.componentId)!;
    found.nodes.splice(found.index, 1);
    const inserted = insertNode(definition, engine, found.node, this.options);
    const patch: JsonPatchOp[] = [
      { op: "remove", path: found.path },
      inserted.created
        ? { op: "add", path: inserted.arrayPath, value: inserted.nodes }
        : { op: "add", path: inserted.path, value: found.node },
    ];
    return {
      state: { ...state, definition, selection: this.componentId },
      patch,
      diagnostics: [],
    };
  }
}
export class ChangeKey extends SnapshotCommand implements Command {
  readonly type = "ChangeKey";
  constructor(
    readonly componentId: string,
    readonly key: string,
  ) {
    super();
    Object.freeze(this);
  }
  apply(state: BuilderState, context: BuilderContext): CommandResult {
    return new UpdateProperty(this.componentId, "key", this.key).apply(
      state,
      context,
    );
  }
}
export class DuplicateComponent extends SnapshotCommand implements Command {
  readonly type = "DuplicateComponent";
  readonly options: DropTarget | undefined;
  constructor(
    readonly componentId: string,
    options?: DropTarget,
  ) {
    super();
    this.options = options ? Object.freeze({ ...options }) : undefined;
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const source = locate(state.definition, this.componentId);
    if (!source)
      return failure(state, `Unknown component: ${this.componentId}`);
    const original = destination(state.definition, engine, {
      ...(source.parentId === undefined
        ? {}
        : {
            parentId: source.parentId,
            ...(source.node.slot === undefined
              ? {}
              : { slot: source.node.slot }),
          }),
    });
    const ordinal = original.nodes
      .filter((n) => (n.slot ?? original.first) === original.slot.name)
      .findIndex((n) => n.id === source.node.id);
    const target = this.options ?? {
      ...(source.parentId === undefined
        ? {}
        : {
            parentId: source.parentId,
            ...(source.node.slot === undefined
              ? {}
              : { slot: source.node.slot }),
          }),
      index: ordinal + 1,
    };
    const diagnostics = checkDrop(
      engine,
      state.definition,
      source.node.type,
      target,
    );
    if (diagnostics.length) return { state, patch: [], diagnostics };
    const definition = copy(state.definition);
    const cloned = copy(source.node);
    const mapping = new Map<string, string>();
    const compositeIds: string[] = [];
    const reserved = new Set(entries(definition, engine).map((e) => e.node.id));
    visit(cloned, (node) => {
      const old = node.id;
      const id = newId(definition, reserved);
      reserved.add(id);
      mapping.set(old, id);
      if (engine.getField(node.type)?.kind === "composite")
        compositeIds.push(old);
      node.id = id;
    });
    const wireIds = new Set(
      entries(state.definition, engine).map((e) => e.node.id),
    );
    visit(cloned, (node) =>
      expressions(node, (leaf) => {
        if (!("ref" in leaf)) return leaf;
        const exact = mapping.get(leaf.ref);
        if (exact) return { ref: exact };
        if (!wireIds.has(leaf.ref)) {
          const composite = compositeIds.find((id) =>
            leaf.ref.startsWith(`${id}/`),
          );
          if (composite)
            return {
              ref: `${mapping.get(composite)!}${leaf.ref.slice(composite.length)}`,
            };
        }
        return leaf;
      }),
    );
    const inserted = insertNode(definition, engine, cloned, target);
    const unprocessed = new Set(mapping.values());
    for (const entry of entries(definition, engine))
      if (unprocessed.has(entry.node.id)) {
        if (entry.node.key)
          entry.node.key = uniqueKey(
            definition,
            engine,
            entry.node.key,
            entry.scope,
            unprocessed,
          );
        unprocessed.delete(entry.node.id);
      }
    return {
      state: { ...state, definition, selection: cloned.id },
      patch: [
        inserted.created
          ? { op: "add", path: inserted.arrayPath, value: inserted.nodes }
          : { op: "add", path: inserted.path, value: cloned },
      ],
      diagnostics: [],
    };
  }
}
export class WrapInLayout extends SnapshotCommand implements Command {
  readonly type = "WrapInLayout";
  constructor(
    readonly componentId: string,
    readonly layoutType: string,
    readonly slot?: string,
  ) {
    super();
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const definition = copy(state.definition);
    const found = locate(definition, this.componentId);
    const model = engine.getField(this.layoutType);
    if (!found || model?.kind !== "layout")
      return failure(
        state,
        "Wrapping requires an existing component and a registered layout.",
      );
    const wrapper = createNode(
      definition,
      engine,
      this.layoutType,
      found.parentId,
    );
    if (found.node.slot !== undefined) wrapper.slot = found.node.slot;
    found.nodes[found.index] = wrapper;
    const target: DropTarget = {
      parentId: wrapper.id,
      ...(this.slot === undefined ? {} : { slot: this.slot }),
    };
    const diagnostics = checkDrop(engine, definition, found.node.type, target);
    if (diagnostics.length) return { state, patch: [], diagnostics };
    insertNode(definition, engine, found.node, target);
    return {
      state: { ...state, definition, selection: wrapper.id },
      patch: [{ op: "replace", path: found.path, value: wrapper }],
      diagnostics: [],
    };
  }
}
export class Unwrap extends SnapshotCommand implements Command {
  readonly type = "Unwrap";
  constructor(readonly componentId: string) {
    super();
    Object.freeze(this);
  }
  apply(state: BuilderState, { engine }: BuilderContext): CommandResult {
    const definition = copy(state.definition);
    const found = locate(definition, this.componentId);
    if (!found || engine.getField(found.node.type)?.kind !== "layout")
      return failure(state, "Only an existing layout can be unwrapped.");
    const children = found.node.components ?? [];
    for (const child of children) {
      if (found.node.slot === undefined) delete child.slot;
      else child.slot = found.node.slot;
    }
    found.nodes.splice(found.index, 1, ...children);
    return {
      state: { ...state, definition, selection: children[0]?.id ?? null },
      patch: [
        { op: "remove", path: found.path },
        ...children.map(
          (child, index): JsonPatchOp => ({
            op: "add",
            path: `${found.path.slice(0, found.path.lastIndexOf("/"))}/${found.index + index}`,
            value: child,
          }),
        ),
      ],
      diagnostics: [],
    };
  }
}
export class ReplaceDefinition extends SnapshotCommand implements Command {
  readonly type = "ReplaceDefinition";
  readonly definition: unknown;
  constructor(definition: unknown) {
    super();
    if (inspectJson(definition).length)
      throw new Error("Definition must be safe bounded JSON.");
    this.definition = freeze(copy(definition));
    Object.freeze(this);
  }
  apply(state: BuilderState): CommandResult {
    return {
      state: {
        ...state,
        definition: this.definition as FormDefinition,
        selection: null,
      },
      patch: [{ op: "replace", path: "", value: this.definition }],
      diagnostics: [],
    };
  }
}
