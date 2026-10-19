# 02 — Runtime: engine, compile, session

Status: normative. Package: `@ourform/core` (no DOM).

## Engine

```ts
export function createEngine(options?: {
  plugins?: Plugin[];
  providers?: Providers; // dataSource, fileStorage, lookup, localization
  functions?: FunctionMap; // trusted host functions callable from expressions
  validators?: ValidatorMap;
}): Engine;

export interface Engine {
  readonly registry: Registry; // per engine; register() throws on duplicate type
  compile(def: FormDefinition): CompileResult; // never throws on user input
  createSession(
    form: CompiledForm,
    opts?: { data?: unknown; mode?: "edit" | "readOnly" },
  ): FormSession;
}

export type CompileResult =
  | { ok: true; form: CompiledForm; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };
```

## Compile steps

1. `validateDefinition` → stop on errors.
2. `migrate` to current version.
3. Resolve every node's `ComponentModel` from the registry; expand composites.
4. Build the node tree, data scopes and the path index (componentId → path template; path → componentId).
5. Compile expressions and record dependencies (see 03).
6. Build the dependency graph; detect cycles (error `cycle` naming every component in it).
7. Freeze → `CompiledForm`.

## Session

```ts
export interface FormSession {
  getData(): unknown; // structurally shared, frozen in dev
  getValue(path: PathInput): unknown;
  setValue(
    path: PathInput,
    value: unknown,
    opts?: { source?: "user" | "api" },
  ): void;
  getFieldState(componentId: string, rowId?: string): FieldState;
  touch(path: PathInput): void;
  validate(opts?: { paths?: PathInput[] }): Promise<ValidationResult>;
  submit(): Promise<SubmitResult>; // validate all + serialize; sends nothing
  reset(data?: unknown): void;
  addRow(path: PathInput, value?: unknown): string; // returns rowId
  removeRow(path: PathInput, rowId: string): void;
  moveRow(path: PathInput, rowId: string, toIndex: number): void;
  subscribe(listener: (patch: StatePatch) => void): () => void;
  dispose(): void;
}

export interface FieldState {
  componentId: string;
  path: Path;
  rowId?: string;
  value: unknown;
  visible: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  dirty: boolean;
  touched: boolean;
  pending: boolean;
  errors: FieldError[];
}

export interface FieldError {
  code: string;
  messageKey: string;
  params?: Record<string, unknown>;
}
export interface StatePatch {
  changedPaths: Path[];
  changedFields: string[];
  data: unknown;
}
export type ValidationResult = {
  valid: boolean;
  errors: { path: Path; componentId: string; error: FieldError }[];
};
export type SubmitResult =
  | { ok: true; data: unknown }
  | { ok: false; errors: ValidationResult["errors"] };
```

## Paths

- `type Path = readonly (string | { row: string })[]` — keys and row ids.
- `parsePath('orders[2].price', session)` resolves an index to a rowId; `formatPath(path, session)` renders indexes.
- `PathInput = Path | string`.
- Lookups by path are O(1) via the compiled index; never scan `components` per change.

## Change processing

For `setValue(path, v)`:

1. Normalize with the model's `ValueAdapter.normalize`. If `equals(old, new)`, stop.
2. Write to the store (copy-on-write along the path only).
3. Collect affected nodes from the dependency graph (transitively).
4. For affected nodes in topological order: calculate (unless overridden by user when `allowOverride`),
   visibility/disabled, clear-on-hide (hidden + `clearOnHide` → empty value), validation per `validateOn`.
5. Emit exactly one `StatePatch` with every changed path and field.

Instrumentation: in tests, the session exposes a debug counter of processor runs per node so tests
can assert that unrelated fields were not reprocessed.

## Validation rules (core)

Built-in: `required` (uses `ValueAdapter.isEmpty`), `minLength`, `maxLength`, `min`, `max`, `pattern`,
`minItems`, `maxItems`, plus `custom` validators from the registry. Hidden fields are not validated.
Async validators receive an `AbortSignal`; a newer run aborts an older one; `pending` is true meanwhile.
Error messages are keys (`of.validation.required`, …) with params; text comes from the localization provider.

## Processors

Built-in order is fixed. Plugins may add processors with `{ phase, before?, after? }` but cannot
remove or reorder built-ins.
