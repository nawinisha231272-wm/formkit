import {
  AtomicCommand,
  DuplicateComponent,
  MoveComponent,
  PasteComponent,
  UpdateComponent,
  WrapInLayout,
} from "@ourform/builder-core";
import type {
  Command,
  CommandResult,
  DropTarget,
  BuilderState,
  BuilderContext,
} from "@ourform/builder-core";
import { componentChildren } from "@ourform/schema";
import { indexEntries as entries } from "./entry-index";
import type { ComponentNode, Diagnostic, Expr } from "@ourform/schema";
import { resolveSlots } from "@ourform/sdk";

type Action = "move" | "wrap" | "duplicate" | "paste";
function rebase(node: ComponentNode, mapping: ReadonlyMap<string, string>) {
  const replace = (expr: Expr): Expr => {
    if (Array.isArray(expr))
      return expr.map((value, index) =>
        index ? replace(value as Expr) : value,
      ) as Expr;
    if (expr !== null && typeof expr === "object" && "ref" in expr) {
      const ref = mapping.get(expr.ref);
      if (ref) return { ref };
      const prefix = [...mapping.keys()]
        .filter((id) => expr.ref.startsWith(`${id}/`))
        .sort((a, b) => b.length - a.length)[0];
      if (prefix)
        return {
          ref: `${mapping.get(prefix)!}${expr.ref.slice(prefix.length)}`,
        };
    }
    return expr;
  };
  const visit = (node: ComponentNode) => {
    if (node.visibleWhen !== undefined)
      node.visibleWhen = replace(node.visibleWhen);
    if (node.disabledWhen !== undefined)
      node.disabledWhen = replace(node.disabledWhen);
    if (node.calculate) node.calculate.expr = replace(node.calculate.expr);
    for (const rule of node.validation?.custom ?? [])
      for (const [key, expr] of Object.entries(rule.args ?? {}))
        rule.args![key] = replace(expr);
    componentChildren(node).forEach(visit);
  };
  visit(node);
}
/** Internal orchestration only: all schema changes still use the existing headless commands. */
export function selectionCommand(
  action: Action,
  ids: readonly string[],
  target: DropTarget,
  messages: { scope: string; wrap: string; missing: string },
  options: { layout?: string; clipboard?: readonly ComponentNode[] } = {},
) {
  const members = [...ids];
  const clipboard = options.clipboard
    ? (JSON.parse(JSON.stringify(options.clipboard)) as ComponentNode[])
    : [];
  let selected: string[] = [];
  let runs = 0;
  const command: Command = Object.freeze({
    type: "AtomicCommand" as const,
    invert: (before: Parameters<Command["invert"]>[0]) =>
      new AtomicCommand("", []).invert(before),
    apply(state: BuilderState, context: BuilderContext): CommandResult {
      let current = state;
      const patch: CommandResult["patch"] = [];
      const diagnostics: Diagnostic[] = [];
      selected = [];
      runs = 0;
      const all = entries(state.definition, context.engine);
      const find = (id: string) =>
        entries(current.definition, context.engine).find(
          (entry) => entry.node.id === id,
        );
      const refuse = (code: string, message: string): CommandResult => ({
        state,
        patch: [],
        diagnostics: [{ severity: "error", code, message }],
      });
      const run = (child: Command) => {
        runs++;
        const result = child.apply(current, context);
        diagnostics.push(...result.diagnostics);
        if (
          result.diagnostics.some(
            (diagnostic) => diagnostic.severity === "error",
          )
        )
          return false;
        current = result.state;
        patch.push(...result.patch);
        return true;
      };
      const sources = members.map((id) =>
        all.find((entry) => entry.node.id === id),
      );
      if (action !== "paste" && sources.some((source) => !source))
        return refuse("missing-component", messages.missing);
      if (action === "move") {
        const destination = all.find(
          (entry) => entry.node.id === target.parentId,
        );
        const scope =
          destination &&
          ["object", "array"].includes(
            context.engine.getField(destination.node.type)?.dataScope ?? "none",
          )
            ? destination.node.id
            : (destination?.scope ?? "");
        if (sources.some((source) => source!.scope !== scope))
          return refuse("cross-scope-move", messages.scope);
        const first = destination
          ? resolveSlots(
              context.engine.getField(destination.node.type)!,
              destination.node,
            )[0]?.name
          : "children";
        const slot = target.slot ?? first;
        const anchor =
          target.index === undefined
            ? undefined
            : all.find(
                (entry) =>
                  entry.parent?.id === target.parentId &&
                  entry.slot === slot &&
                  entry.index >= target.index! &&
                  !members.includes(entry.node.id),
              );
        for (const id of members) {
          const source = find(id)!;
          const before = anchor ? find(anchor.node.id) : undefined;
          const index = before
            ? before.index -
              Number(
                source.parent?.id === before.parent?.id &&
                  source.slot === before.slot &&
                  source.index < before.index,
              )
            : undefined;
          const next = { ...target };
          delete next.index;
          if (index !== undefined) next.index = index;
          if (!run(new MoveComponent(id, next)))
            return { state, patch: [], diagnostics };
        }
        selected = members;
      } else if (action === "wrap") {
        const first = sources[0];
        if (
          !first ||
          sources.some(
            (source, index) =>
              source!.parent !== first.parent ||
              source!.slot !== first.slot ||
              source!.index !== first.index + index,
          )
        )
          return refuse("noncontiguous-selection", messages.wrap);
        const layout = options.layout ?? "panel";
        if (
          ["object", "array"].includes(
            context.engine.getField(layout)?.dataScope ?? "none",
          )
        )
          return refuse("cross-scope-move", messages.scope);
        if (!run(new WrapInLayout(first.node.id, layout)))
          return { state, patch: [], diagnostics };
        const wrapper = current.selection!;
        for (const id of members.slice(1))
          if (!run(new MoveComponent(id, { parentId: wrapper })))
            return { state, patch: [], diagnostics };
        selected = [wrapper];
      } else {
        const originals =
          action === "paste"
            ? clipboard
            : sources.map((source) => source!.node);
        const mapping = new Map<string, string>();
        const pair = (source: ComponentNode, copy: ComponentNode) => {
          mapping.set(source.id, copy.id);
          const children = componentChildren(copy);
          componentChildren(source).forEach((child, index) =>
            pair(child, children[index]!),
          );
        };
        try {
          for (const [index, original] of originals.entries()) {
            const child =
              action === "paste"
                ? new PasteComponent(original, {
                    ...target,
                    ...(target.index === undefined
                      ? {}
                      : { index: target.index + index }),
                  })
                : new DuplicateComponent(original.id);
            if (!run(child)) return { state, patch: [], diagnostics };
            const id = current.selection!;
            selected.push(id);
            pair(original, find(id)!.node);
          }
          for (const id of selected) {
            const original = find(id)!.node;
            const node = JSON.parse(JSON.stringify(original)) as ComponentNode;
            rebase(node, mapping);
            if (
              JSON.stringify(node) !== JSON.stringify(original) &&
              !run(new UpdateComponent(id, node))
            )
              return { state, patch: [], diagnostics };
          }
        } catch {
          return refuse("invalid-clipboard", messages.missing);
        }
      }
      return {
        state: { ...current, selection: selected.at(-1) ?? current.selection },
        patch,
        diagnostics,
      };
    },
  });
  return { command, selected: () => selected, runs: () => runs };
}
