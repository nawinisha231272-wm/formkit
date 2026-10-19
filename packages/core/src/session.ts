import { isRecord } from "@ourform/schema";
import type { ComponentNode } from "@ourform/schema";
import type {
  CompiledForm,
  CompiledNode,
  FieldState,
  Path,
  PathInput,
  StatePatch,
  SubmitResult,
  ValidationResult,
} from "./types";
import {
  freeze,
  parsePath,
  pathKey,
  readPath,
  snapshot,
  writePath,
} from "./paths";
import { validateValue } from "./validation";
export class FormSession {
  readonly debug = {
    processorRuns: Object.create(null) as Record<string, number>,
  };
  #data: Record<string, unknown> = Object.freeze({});
  #states = new Map<string, FieldState>();
  #listeners = new Set<(patch: StatePatch) => void>();
  #overrides = new Set<string>();
  #disposed = false;
  readonly mode: "edit" | "readOnly";
  constructor(
    readonly form: CompiledForm,
    options: { data?: unknown; mode?: "edit" | "readOnly" } = {},
  ) {
    this.mode = options.mode ?? "edit";
    this.initialize(options.data ?? {});
  }
  get schema() {
    return this.form.definition;
  }
  private assertActive(): void {
    if (this.#disposed) throw new Error("Session is disposed.");
  }
  private entry(input: PathInput): CompiledNode {
    const entry = this.form.byPath[pathKey(parsePath(input))];
    if (!entry) throw new Error("Unknown field path.");
    return entry;
  }
  private normalize(entry: CompiledNode, value: unknown): unknown {
    return snapshot(entry.model.value!.normalize(value));
  }
  private initialize(input: unknown): void {
    const data = snapshot(input);
    if (!isRecord(data)) throw new Error("Initial data must be an object.");
    this.#data = Object.freeze({});
    this.#states.clear();
    this.#overrides.clear();
    for (const entry of this.form.nodes) {
      if (entry.model.dataScope === "object")
        this.#data = writePath(this.#data, entry.path, Object.freeze({}));
      if (entry.model.value) {
        const raw = readPath(data, entry.path);
        const value = this.normalize(
          entry,
          raw === undefined
            ? Object.hasOwn(entry.node, "defaultValue")
              ? entry.node.defaultValue
              : entry.model.value.empty()
            : raw,
        );
        this.#data = writePath(this.#data, entry.path, value);
      }
      this.#states.set(
        entry.node.id,
        freeze({
          componentId: entry.node.id,
          path: entry.path,
          value: readPath(this.#data, entry.path),
          visible: true,
          disabled: false,
          readOnly: this.mode === "readOnly",
          required: entry.node.validation?.required ?? false,
          dirty: false,
          touched: false,
          pending: false,
          errors: [],
        }),
      );
      this.debug.processorRuns[entry.node.id] = 0;
    }
    for (const id of this.form.order)
      this.process(this.form.byId[id]!, false, true);
  }
  private context() {
    return {
      getRef: (id: string) => readPath(this.#data, this.form.byId[id]!.path),
      getPath: (path: Path) => readPath(this.#data, path),
      mode: this.mode,
    };
  }
  private process(
    entry: CompiledNode,
    forceValidation: boolean,
    initial = false,
  ): void {
    const id = entry.node.id;
    this.debug.processorRuns[id] = (this.debug.processorRuns[id] ?? 0) + 1;
    const old = this.#states.get(id)!;
    const parent = entry.parentId
      ? this.#states.get(entry.parentId)
      : undefined;
    let value = readPath(this.#data, entry.path);
    const context = this.context();
    const calc = entry.expressions.calculate;
    if (calc && !this.#overrides.has(id))
      value = this.normalize(entry, calc.evaluate(context));
    // Conditions can reference a field's own newly calculated value.
    if (
      entry.model.value &&
      !Object.is(value, readPath(this.#data, entry.path))
    )
      this.#data = writePath(this.#data, entry.path, value);
    const visible =
      (parent?.visible ?? true) &&
      (entry.expressions.visibleWhen
        ? Boolean(entry.expressions.visibleWhen.evaluate(this.context()))
        : true);
    const disabled =
      (parent?.disabled ?? false) ||
      (entry.expressions.disabledWhen
        ? Boolean(entry.expressions.disabledWhen.evaluate(this.context()))
        : false);
    if (entry.model.value && entry.node.clearOnHide !== false) {
      if (!visible) value = this.normalize(entry, entry.model.value.empty());
      else if (!old.visible && !calc)
        value = this.normalize(
          entry,
          Object.hasOwn(entry.node, "defaultValue")
            ? entry.node.defaultValue
            : entry.model.value.empty(),
        );
    }
    if (
      entry.model.value &&
      !Object.is(value, readPath(this.#data, entry.path))
    )
      this.#data = writePath(this.#data, entry.path, value);
    const timing = this.schema.settings?.validateOn ?? "blur";
    const errors = !visible
      ? []
      : forceValidation ||
          timing === "change" ||
          (timing === "blur" && old.touched)
        ? validateValue(entry, value)
        : old.errors;
    this.#states.set(
      id,
      freeze({
        ...old,
        value,
        visible,
        disabled,
        dirty: initial ? false : old.dirty,
        errors,
      }),
    );
  }
  private emit(ids: readonly string[]): void {
    const paths: Path[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      const entry = this.form.byId[id]!;
      if (
        entry.path.length &&
        (entry.model.value || entry.model.dataScope === "object") &&
        !seen.has(pathKey(entry.path))
      ) {
        paths.push(entry.path);
        seen.add(pathKey(entry.path));
      }
    }
    const patch = freeze({
      changedFields: [...ids],
      changedPaths: paths,
      data: this.#data,
    });
    for (const listener of [...this.#listeners]) listener(patch);
  }
  getData(): Readonly<Record<string, unknown>> {
    return this.#data;
  }
  getValue(input: PathInput): unknown {
    return readPath(this.#data, this.entry(input).path);
  }
  getFieldState(id: string): FieldState {
    const state = this.#states.get(id);
    if (!state) throw new Error(`Unknown component id: ${id}`);
    return state.value === readPath(this.#data, state.path)
      ? state
      : freeze({ ...state, value: readPath(this.#data, state.path) });
  }
  definition(node: ComponentNode) {
    const entry = this.form.byId[node.id];
    if (!entry || entry.node.type !== node.type)
      throw new Error(`Unregistered field type: ${node.type}`);
    return entry.model;
  }
  setValue(
    input: PathInput,
    raw: unknown,
    options: { source?: "user" | "api" } = {},
  ): void {
    this.assertActive();
    const entry = this.entry(input);
    const adapter = entry.model.value;
    if (!adapter) throw new Error("Cannot set a non-value component.");
    const old = this.#states.get(entry.node.id)!;
    if (
      options.source === "user" &&
      (old.disabled || old.readOnly || !old.visible)
    )
      return;
    const normalized = adapter.normalize(raw);
    if (
      (adapter.equals ?? Object.is)(
        readPath(this.#data, entry.path),
        normalized,
      )
    )
      return;
    const value = snapshot(normalized);
    this.#data = writePath(this.#data, entry.path, value);
    const affected = new Set([entry.node.id]);
    const queue = [entry.node.id];
    for (let i = 0; i < queue.length; i++)
      for (const dependent of this.form.dependents[queue[i]!] ?? [])
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
    for (const id of affected) this.#overrides.delete(id);
    if (options.source === "user" && entry.node.calculate?.allowOverride)
      this.#overrides.add(entry.node.id);
    this.#states.set(entry.node.id, freeze({ ...old, dirty: true }));
    const changed: string[] = [];
    // Sort only affected nodes. Ranks avoid scanning the full form on each change.
    const ordered = [...affected].sort(
      (a, b) => this.ranks[a]! - this.ranks[b]!,
    );
    for (const id of ordered) {
      const before = this.#states.get(id)!;
      const previous = before.value;
      this.process(this.form.byId[id]!, false);
      const after = this.#states.get(id)!;
      if (
        id === entry.node.id ||
        !Object.is(previous, after.value) ||
        before.visible !== after.visible ||
        before.disabled !== after.disabled ||
        JSON.stringify(before.errors) !== JSON.stringify(after.errors)
      )
        changed.push(id);
    }
    this.emit(changed);
  }
  private get ranks(): Readonly<Record<string, number>> {
    return this.form.ranks;
  }
  touch(input: PathInput): void {
    this.assertActive();
    const entry = this.entry(input);
    const state = this.#states.get(entry.node.id)!;
    this.#states.set(
      entry.node.id,
      freeze({
        ...state,
        touched: true,
        errors: !state.visible
          ? []
          : this.schema.settings?.validateOn !== "submit"
            ? validateValue(entry, readPath(this.#data, entry.path))
            : state.errors,
      }),
    );
    this.emit([entry.node.id]);
  }
  async validate(
    options: { paths?: PathInput[] } = {},
  ): Promise<ValidationResult> {
    this.assertActive();
    const entries = options.paths
      ? options.paths.map((p) => this.entry(p))
      : this.form.nodes;
    for (const entry of entries) {
      const state = this.#states.get(entry.node.id)!;
      this.#states.set(
        entry.node.id,
        freeze({
          ...state,
          errors: state.visible
            ? validateValue(entry, readPath(this.#data, entry.path))
            : [],
        }),
      );
    }
    const errors: ValidationResult["errors"] = [];
    for (const entry of entries)
      for (const error of this.#states.get(entry.node.id)!.errors)
        errors.push({ path: entry.path, componentId: entry.node.id, error });
    const result = freeze({ valid: errors.length === 0, errors });
    this.emit([...new Set(entries.map((e) => e.node.id))]);
    return result;
  }
  async submit(): Promise<SubmitResult> {
    const submittedData = this.#data;
    const result = await this.validate();
    if (!result.valid) return { ok: false, errors: result.errors };
    let data = submittedData;
    for (const entry of this.form.nodes) {
      const serialize = entry.model.value?.serialize;
      if (serialize)
        data = writePath(
          data,
          entry.path,
          snapshot(serialize(readPath(submittedData, entry.path))),
        );
    }
    return freeze({ ok: true, data });
  }
  reset(data: unknown = {}): void {
    this.assertActive();
    this.initialize(data);
    this.emit(this.form.order);
  }
  subscribe(listener: (patch: StatePatch) => void): () => void {
    this.assertActive();
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
  dispose(): void {
    this.#listeners.clear();
    this.#overrides.clear();
    this.#disposed = true;
  }
}
