import { migrate, validateDefinition } from "@ourform/schema";
import type { ComponentNode } from "@ourform/schema";
import type { ComponentModel } from "./model";
import type {
  CompiledForm,
  CompiledNode,
  CompileResult,
  FunctionMap,
  Path,
} from "./types";
import { compileExpression } from "./expressions";
import { freeze, pathKey, snapshot } from "./paths";
import { orderGraph } from "./graph";
import { FormSession } from "./session";
export class Registry {
  #models = new Map<string, ComponentModel>();
  register<T>(model: ComponentModel<T>): this {
    if (this.#models.has(model.type))
      throw new Error(`Duplicate component type: ${model.type}`);
    if (!model.type) throw new Error("Component type must not be empty.");
    this.#models.set(
      model.type,
      Object.freeze({
        ...model,
        ...(model.value ? { value: Object.freeze({ ...model.value }) } : {}),
        ...(model.properties ? { properties: snapshot(model.properties) } : {}),
      }) as ComponentModel,
    );
    return this;
  }
  get(type: string): ComponentModel | undefined {
    return this.#models.get(type);
  }
  list(): ComponentModel[] {
    return [...this.#models.values()];
  }
}
export class Engine {
  readonly registry = new Registry();
  readonly functions: FunctionMap;
  #forms = new WeakSet<CompiledForm>();
  constructor(options: { functions?: FunctionMap } = {}) {
    this.functions = Object.freeze(
      Object.fromEntries(
        Object.entries(options.functions ?? {}).map(([key, fn]) => [
          key,
          Object.freeze({ ...fn }),
        ]),
      ),
    );
  }
  register<T>(model: ComponentModel<T>): this {
    this.registry.register(model);
    return this;
  }
  getField(type: string): ComponentModel | undefined {
    return this.registry.get(type);
  }
  listFields(): ComponentModel[] {
    return this.registry.list();
  }
  compile(input: unknown): CompileResult {
    try {
      return this.compileDefinition(input);
    } catch {
      return {
        ok: false,
        diagnostics: [
          {
            severity: "error",
            code: "invalid-definition",
            message: "Definition could not be compiled safely.",
          },
        ],
      };
    }
  }
  private compileDefinition(input: unknown): CompileResult {
    const diagnostics = validateDefinition(input, this.registry);
    if (diagnostics.length) return { ok: false, diagnostics };
    const definition = snapshot(migrate(input).definition);
    const error = (code: string, message: string, id?: string) =>
      diagnostics.push({
        severity: "error",
        code,
        message,
        ...(id === undefined ? {} : { componentId: id }),
      });
    if (definition.requires?.length)
      error("missing-plugin", "Plugin requirements are not available in M01.");
    const nodes: CompiledNode[] = [];
    const byId: Record<string, CompiledNode> = Object.create(null);
    const byPath: Record<string, CompiledNode> = Object.create(null);
    const dependents: Record<string, string[]> = Object.create(null);
    const visit = (
      children: ComponentNode[],
      scope: Path,
      parentId?: string,
    ): void => {
      for (const node of children) {
        const model = this.registry.get(node.type)!;
        if (model.dataScope === "array")
          error("unsupported-scope", "Array scopes require M10.", node.id);
        if (model.kind === "composite")
          error(
            "unsupported-component",
            "Composite expansion requires M08.",
            node.id,
          );
        if (model.dataScope === "object" && !node.key)
          error("missing-key", "Object scope requires a key.", node.id);
        if (node.calculate && !model.value)
          error(
            "invalid-calculation",
            "Only value components may calculate.",
            node.id,
          );
        if (node.validation?.custom?.length)
          error(
            "unsupported-validator",
            "Custom validators require M06.",
            node.id,
          );
        const path = Object.freeze(
          node.key ? [...scope, node.key] : [...scope],
        );
        const entry: CompiledNode = {
          node,
          model,
          path,
          expressions: {},
          ...(parentId === undefined ? {} : { parentId }),
          ...(node.validation?.pattern === undefined
            ? {}
            : { pattern: new RegExp(node.validation.pattern, "u") }),
        };
        nodes.push(entry);
        byId[node.id] = entry;
        dependents[node.id] = [];
        if (model.value || model.dataScope === "object")
          byPath[pathKey(path)] = entry;
        visit(
          node.components ?? [],
          model.dataScope === "object" ? path : scope,
          node.id,
        );
      }
    };
    visit(definition.components, []);
    const dependenciesFor = (target: CompiledNode): string[] =>
      target.model.value
        ? [target.node.id]
        : nodes
            .filter(
              (n) =>
                n.model.value &&
                n.path.length > target.path.length &&
                target.path.every((k, i) => k === n.path[i]),
            )
            .map((n) => n.node.id);
    for (const entry of nodes) {
      if (entry.parentId) dependents[entry.parentId]!.push(entry.node.id);
      const expressions: CompiledNode["expressions"] = {};
      for (const kind of [
        "calculate",
        "visibleWhen",
        "disabledWhen",
      ] as const) {
        const raw =
          kind === "calculate" ? entry.node.calculate?.expr : entry.node[kind];
        if (raw === undefined) continue;
        const result = compileExpression(raw, {
          byRef: (id) => (byId[id] ? dependenciesFor(byId[id]) : undefined),
          byPath: (path) =>
            byPath[pathKey(path)]
              ? dependenciesFor(byPath[pathKey(path)]!)
              : undefined,
          functions: this.functions,
        });
        diagnostics.push(
          ...result.diagnostics.map((d) => ({
            ...d,
            componentId: entry.node.id,
          })),
        );
        if (result.expression) {
          (expressions as Record<string, unknown>)[kind] = result.expression;
          for (const source of result.expression.dependencies)
            dependents[source]!.push(entry.node.id);
        }
      }
      (entry as { expressions: CompiledNode["expressions"] }).expressions =
        Object.freeze(expressions);
    }
    for (const id of Object.keys(dependents))
      dependents[id] = [...new Set(dependents[id])];
    const graph = orderGraph(
      nodes.map((n) => n.node.id),
      dependents,
    );
    for (const members of graph.cycles)
      for (const id of members)
        error("cycle", `Dependency cycle: ${members.join(", ")}`, id);
    if (diagnostics.length) return { ok: false, diagnostics };
    const form = freeze({
      definition,
      nodes,
      byId,
      byPath,
      order: graph.order,
      ranks: Object.fromEntries(graph.order.map((id, i) => [id, i])),
      dependents,
    });
    this.#forms.add(form);
    return { ok: true, form, diagnostics };
  }
  createSession(
    form: CompiledForm,
    options: { data?: unknown; mode?: "edit" | "readOnly" } = {},
  ): FormSession {
    if (!this.#forms.has(form))
      throw new Error(
        "Compiled form must belong to this engine. Call compile first.",
      );
    return new FormSession(form, options);
  }
}
export const createEngine = (options?: { functions?: FunctionMap }): Engine =>
  new Engine(options);
