import type { FormDefinition, FormField } from "@ourform/schema";
export type PropertyKind = "string" | "number" | "boolean";
export type PropertyGroup =
  | "Display"
  | "Behavior"
  | "Data"
  | "Validation"
  | "Layout";
export interface PropertyDefinition<T = unknown> {
  kind: PropertyKind;
  label: string;
  default: T;
  group: PropertyGroup;
  min?: number;
  max?: number;
}
export type PropertyMap = Record<string, PropertyDefinition>;
export interface ValueAdapter<T> {
  empty: () => T;
  normalize: (input: unknown) => T;
  isEmpty: (value: T) => boolean;
}

export interface ComponentModel<T = unknown> {
  type: string;
  title: string;
  value: ValueAdapter<T>;
  properties?: PropertyMap;
}
export interface FieldError {
  path: string;
  code: "required";
  message: string;
}
export type ChangeListener = (event: {
  data: Readonly<Record<string, unknown>>;
  changedPaths: string[];
}) => void;

export class Engine {
  private readonly fields = new Map<string, ComponentModel<unknown>>();
  register<T>(field: ComponentModel<T>): this {
    if (this.fields.has(field.type))
      throw new Error(`Duplicate component type: ${field.type}`);
    this.fields.set(field.type, field as ComponentModel<unknown>);
    return this;
  }
  getField(type: string): ComponentModel<unknown> | undefined {
    return this.fields.get(type);
  }
  listFields(): ComponentModel<unknown>[] {
    return [...this.fields.values()];
  }
  createSession(
    schema: FormDefinition,
    initial: Record<string, unknown> = {},
  ): FormSession {
    if (schema.$formVersion !== "1.0")
      throw new Error("Unsupported form version");
    const ids = new Set<string>();
    const keys = new Set<string>();
    for (const f of schema.components) {
      if (!f.id || !f.key)
        throw new Error("Each field requires stable id and key");
      if (ids.has(f.id) || keys.has(f.key))
        throw new Error(`Duplicate id/key: ${f.id}/${f.key}`);
      if (!this.fields.has(f.type))
        throw new Error(`Unregistered field type: ${f.type}`);
      ids.add(f.id);
      keys.add(f.key);
    }
    return new FormSession(this, schema, initial);
  }
}
export const createEngine = (): Engine => new Engine();

export class FormSession {
  private readonly data: Record<string, unknown>;
  private readonly listeners = new Set<ChangeListener>();
  private readonly touched = new Set<string>();
  constructor(
    readonly engine: Engine,
    readonly schema: FormDefinition,
    initial: Record<string, unknown>,
  ) {
    this.data = {};
    for (const field of schema.components) {
      const def = this.definition(field);
      const raw = Object.hasOwn(initial, field.key)
        ? initial[field.key]
        : (field.defaultValue ?? def.value.empty());
      this.data[field.key] = def.value.normalize(raw);
    }
  }
  definition(field: FormField): ComponentModel<unknown> {
    const def = this.engine.getField(field.type);
    if (!def) throw new Error(`Unregistered field type: ${field.type}`);
    return def;
  }
  getValue(path: string): unknown {
    return this.data[path];
  }
  getData(): Readonly<Record<string, unknown>> {
    return { ...this.data };
  }
  setValue(path: string, value: unknown): void {
    const field = this.schema.components.find((f) => f.key === path);
    if (!field) throw new Error(`Unknown field path: ${path}`);
    const next = this.definition(field).value.normalize(value);
    if (Object.is(next, this.data[path])) return;
    this.data[path] = next;
    for (const callback of this.listeners)
      callback({ data: this.getData(), changedPaths: [path] });
  }
  markTouched(path: string): void {
    this.touched.add(path);
  }
  isTouched(path: string): boolean {
    return this.touched.has(path);
  }
  validate(): FieldError[] {
    const errors: FieldError[] = [];
    for (const field of this.schema.components) {
      if (
        field.validation?.required &&
        this.definition(field).value.isEmpty(this.data[field.key])
      ) {
        errors.push({
          path: field.key,
          code: "required",
          message: `${field.label} is required`,
        });
      }
    }
    return errors;
  }
  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
