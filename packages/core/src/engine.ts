import { builtinValidators } from "./validators";
import type { CompiledValidator, Providers, ValidatorMap } from "./validators";
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
import { expandComposites } from "./composites";
import { pluginVersions, meetsRequirement, mergePluginMap } from "./plugins";
import type { PluginRegistration } from "./plugins";
import { resolveSlots } from "./slots";
export class Registry {
  #models = new Map<string, ComponentModel>();
  register<T>(model: ComponentModel<T>): this {
    if (this.#models.has(model.type))
      throw new Error(`Duplicate component type: ${model.type}`);
    if (!model.type) throw new Error("Component type must not be empty.");
    if (Array.isArray(model.slots))
      resolveSlots(model, { id: "registration", type: model.type });
    this.#models.set(
      model.type,
      Object.freeze({
        ...model,
        ...(model.value ? { value: Object.freeze({ ...model.value }) } : {}),
        ...(model.properties ? { properties: snapshot(model.properties) } : {}),
        ...(model.builder ? { builder: snapshot(model.builder) } : {}),
        ...(model.slots && typeof model.slots !== "function"
          ? { slots: snapshot(model.slots) }
          : {}),
        ...(model.validators
          ? { validators: Object.freeze([...model.validators]) }
          : {}),
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
export interface EngineOptions {
  functions?: FunctionMap;
  validators?: ValidatorMap;
  providers?: Providers;
  plugins?: readonly PluginRegistration[];
}
export class Engine {
  readonly registry = new Registry();
  readonly functions: FunctionMap;
  readonly validators: Readonly<ValidatorMap>;
  readonly providers: Readonly<Providers>;
  #forms = new WeakSet<CompiledForm>();
  #plugins: ReadonlyMap<string, string>;
  constructor(options: EngineOptions = {}) {
    this.#plugins = pluginVersions(options.plugins ?? []);
    const functions: FunctionMap = { ...options.functions };
    const validators: ValidatorMap = { ...options.validators };
    const dataSources: Record<string, unknown> = {};
    const themes = new Set<string>();
    for (const plugin of options.plugins ?? []) {
      for (const component of plugin.components ?? [])
        this.register("model" in component ? component.model : component);
      mergePluginMap(functions, plugin.functions, "function");
      mergePluginMap(validators, plugin.validators, "validator");
      mergePluginMap(dataSources, plugin.dataSources, "data source");
      for (const theme of plugin.themes ?? []) {
        if (!theme.name || themes.has(theme.name))
          throw new Error(`Duplicate theme: ${theme.name}`);
        themes.add(theme.name);
      }
    }
    const providers = { ...options.providers };
    if (Object.keys(dataSources).length) {
      const configured = providers.dataSources;
      if (
        configured !== undefined &&
        (configured === null ||
          typeof configured !== "object" ||
          Array.isArray(configured))
      )
        throw new Error("providers.dataSources must be a named provider map.");
      mergePluginMap(
        dataSources,
        configured as Record<string, unknown> | undefined,
        "data source",
      );
      providers.dataSources = Object.freeze(dataSources);
    }
    this.providers = Object.freeze(providers);
    for (const name of Object.keys(validators))
      if (
        Object.hasOwn(builtinValidators, name) ||
        ["__proto__", "prototype", "constructor"].includes(name)
      )
        throw new Error(`Reserved validator name: ${name}`);
    this.validators = Object.freeze(
      Object.fromEntries(
        Object.entries({ ...builtinValidators, ...validators }).map(
          ([name, validator]) => [name, Object.freeze({ ...validator })],
        ),
      ),
    );
    this.functions = Object.freeze(
      Object.fromEntries(
        Object.entries(functions).map(([key, fn]) => [
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
    const migration = migrate(input);
    const shapeDiagnostics = migration.diagnostics.filter(
      (d) => d.code !== "bad-ref",
    );
    if (shapeDiagnostics.length)
      return { ok: false, diagnostics: shapeDiagnostics };
    const definition = snapshot(migration.definition);
    let hasComposites = false;
    // References to generated children are checked after registered composites expand.
    const diagnostics = validateDefinition(definition, {
      get: (type) => {
        const model = this.registry.get(type);
        if (model?.kind === "composite") hasComposites = true;
        return model;
      },
    }).filter((d) => !hasComposites || d.code !== "bad-ref");
    const error = (code: string, message: string, id?: string) =>
      diagnostics.push({
        severity: "error",
        code,
        message,
        ...(id === undefined ? {} : { componentId: id }),
      });
    for (const requirement of definition.requires ?? [])
      if (!meetsRequirement(this.#plugins, requirement))
        error(
          "missing-plugin",
          `Form requires ${requirement.plugin} ${requirement.version}.`,
        );
    if (diagnostics.length) return { ok: false, diagnostics };
    const expanded = hasComposites
      ? expandComposites(definition, this.registry)
      : { components: definition.components, diagnostics: [] };
    if (expanded.diagnostics.length)
      return { ok: false, diagnostics: expanded.diagnostics };
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
        if (model.dataScope === "object" && !node.key)
          error("missing-key", "Object scope requires a key.", node.id);
        if (node.calculate && !model.value)
          error(
            "invalid-calculation",
            "Only value components may calculate.",
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
          validators: [],
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
    visit(snapshot(expanded.components), []);
    for (const entry of nodes) {
      if (!entry.parentId && entry.node.slot !== undefined)
        error(
          "invalid-slot",
          "Root components cannot select a parent slot.",
          entry.node.id,
        );
      if (entry.parentId && entry.model.builder?.rootOnly)
        error(
          "root-only",
          "This component can only be placed at the form root.",
          entry.node.id,
        );
      if (!entry.model.slots && !entry.node.components?.length) continue;
      try {
        const slots = resolveSlots(entry.model, entry.node);
        // Fixed composite children are expanded by the model, not author-editable slots.
        if (entry.model.kind === "composite" && !entry.model.slots) continue;
        if (
          !slots.length &&
          !entry.model.slots &&
          !entry.model.value &&
          !(entry.node.components ?? []).some(
            (child) => child.slot !== undefined,
          )
        )
          continue;
        const counts = new Map<string, number>();
        for (const child of entry.node.components ?? []) {
          const name = child.slot ?? slots[0]?.name;
          const slot = slots.find((s) => s.name === name);
          if (!slot) {
            error(
              "invalid-slot",
              `Unknown parent slot '${name ?? "(none)"}'. Move children before removing or renaming slots.`,
              child.id,
            );
            continue;
          }
          const model = this.registry.get(child.type)!;
          if (
            !slot.accepts.includes(model.kind ?? "field") &&
            !slot.accepts.includes(model.type)
          )
            error(
              "slot-accepts",
              `Slot '${slot.label}' does not accept ${model.type}.`,
              child.id,
            );
          const count = (counts.get(slot.name) ?? 0) + 1;
          counts.set(slot.name, count);
          if (slot.max !== undefined && count > slot.max)
            error(
              "slot-capacity",
              `Slot '${slot.label}' accepts at most ${slot.max} children.`,
              child.id,
            );
        }
      } catch (cause) {
        error(
          "invalid-slot",
          cause instanceof Error ? cause.message : "Invalid slot metadata.",
          entry.node.id,
        );
      }
    }
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
    for (const entry of nodes) {
      const compiledValidators: CompiledValidator[] = [];
      const rules = [
        ...(entry.model.validators ?? []).map((validator) => ({ validator })),
        ...(entry.node.validation?.custom ?? []),
      ];
      for (const rule of rules) {
        const validator = Object.hasOwn(this.validators, rule.validator)
          ? this.validators[rule.validator]
          : undefined;
        if (!validator) {
          error(
            "unsupported-validator",
            `Unknown validator: ${rule.validator}`,
            entry.node.id,
          );
          continue;
        }
        const args: Record<string, import("./expressions").CompiledExpression> =
          {};
        for (const [key, expr] of Object.entries(
          "args" in rule ? (rule.args ?? {}) : {},
        )) {
          const result = compileExpression(expr, {
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
            args[key] = result.expression;
            for (const source of result.expression.dependencies)
              if (source !== entry.node.id)
                dependents[source]!.push(entry.node.id);
          }
        }
        compiledValidators.push({ name: rule.validator, validator, args });
      }
      (entry as { validators: readonly CompiledValidator[] }).validators =
        compiledValidators;
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
    options: {
      data?: unknown;
      mode?: "edit" | "readOnly";
      providers?: Providers;
    } = {},
  ): FormSession {
    if (!this.#forms.has(form))
      throw new Error(
        "Compiled form must belong to this engine. Call compile first.",
      );
    return new FormSession(form, {
      ...options,
      providers: options.providers ?? this.providers,
    });
  }
}
export const createEngine = (options?: EngineOptions): Engine =>
  new Engine(options);
