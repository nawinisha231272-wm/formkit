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

## M01 implementation boundary

ADR-0004 defines exact M01 semantics. `compile` accepts unknown input and returns stable diagnostics.
`CompiledForm` has frozen `nodes`, `byId`, `byPath` (JSON-encoded Path keys), `order`, `ranks` and
`dependents` indexes, plus its definition. Session mutations sort only affected ids by precomputed rank.
`debug.processorRuns` provides per-component counters. Model/value/property contracts remain exported
from core to keep the dependency direction headless. The transitional `Engine.register/getField/listFields`
and session `schema/definition` conveniences are retained; session creation requires a compiled form.

Only object scopes and synchronous built-in validation execute in M01. Array scopes, composites, plugin
requirements and custom validators return explicit diagnostics until their planned milestones. No row
mutation API or async validator is implemented early. Snapshots are always frozen. Submission validates
and serializes its invocation snapshot. `validate` computes its result before notifying subscribers.

## M06 validation and provider contract (ADR-0008)

EngineOptions now includes validators: ValidatorMap and providers: Providers, alongside functions.
Each validator exposes validate(value, context) → null | FieldError | readonly FieldError[] | Promise
of that result. Context contains componentId/path, frozen invocation data/config/args, an AbortSignal
and host providers. ComponentModel.validators names default rules; node.validation.custom names rules
and expression args. Unknown names retain unsupported-validator diagnostics. Built-in email/options
names are reserved; host registries are per engine. Argument dependencies revalidate affected fields;
self references are permitted, cross-field graph cycles are diagnosed.

Pending is true for async work. Changes/new validation/reset/hiding/dispose abort older runs, race
uncooperative hosts and prevent stale state writes. Canceled validate/submit waiters return aborted
errors; exceptions/rejections/malformed results return unavailable errors. Optional empties skip custom
rules. Duplicate validation paths start only one run. Synchronous notification/snapshot contracts remain.
Hosts own provider I/O/timeouts; packages make no network call. AbortSignal is supported by Node 22 and
browsers; headless packages compile with ES2022/Node development types and no DOM lib.

Providers.localization(key, params, locale) returns text or undefined. session.localize resolves it with
an English catalog fallback; renderer t remains compatible. Validation strings remain keys/parameters.
String length rules count Unicode code points (not UTF-16 code units), matching JSON Schema.

## Submission unknown-key policy (ADR-0011)

@ourform/validation exports ValidateSubmissionOptions with providers? and
`unknownKeys?: 'reject' | 'strip'` (default reject). validateSubmission first inspects all input for safe,
bounded JSON, then rejects or filters unknown root/object-scope keys before constructing its temporary
session. Providers and calculations observe the filtered data in strip mode. Caller input stays unchanged;
ValidationResult does not contain sanitized data. Adapter-owned values are opaque to scope filtering.
Known scope/type/required/calculation constraints are unchanged. Invalid option strings are programmer
errors; invalid submitted data still returns diagnostics. Browser and customer Node behavior is identical.

## M08 protected user edits (ADR-0012)

User-sourced setValue on a disabled, read-only or hidden field leaves data, field state, validation and
processor counters unchanged. It emits one refresh StatePatch: changedFields contains only that field,
changedPaths is empty, and data is the same stored snapshot. Renderers restore the control's live value
from state without replacing its DOM node. Default/API-sourced writes continue to work. Equal API writes
still emit nothing. This closes optimistic-control restoration without adding guards to field authors.

Required validation calls ValueAdapter.isEmpty on canonical values. With nullableBooleanValue,
ordinary answers accept false as nonempty; consent explicitly opts into requiredTrue:true, where
false/null fail required but are never rewritten to true or dropped. Optional false remains valid.
Generated boolean/null submission schemas mirror all empty states (ADR-0013).

## Static protection (M09b owner review, ADR-0017)

ComponentNode.disabled combines with disabledWhen and ancestor disabled state. ComponentNode.readOnly
combines with ancestor read-only state and the host's read-only mode. A child cannot clear inherited
protection. Protected user writes emit a refresh for the stored value without normalization, processors
or dirty state changes; API writes continue to propagate normally. No DOM dependency enters core.

## M09c pay-for-use rule execution (ADR-0022, accepted 2026-11-10)

Keep the existing visibleWhen/disabledWhen/calculate compiler/session path in the root core entry.
Root-rule execution lives only in **@ourform/core/logic**, with an explicit per-engine registration:

```ts
import { createEngine } from "@ourform/core";
import { createLogic } from "@ourform/core/logic";

const engine = createEngine({ logic: createLogic() });
// Customer Node uses the same registration before compileForm/validateSubmission:
const nodeEngine = createEngine({
  logic: createLogic({ nodeCallTimeoutMs: 5_000 }),
});
```

`EngineOptions.logic?: LogicRegistration` is an optional typed hook. `createLogic` is a named export
of the opt-in subpath only, never a runtime re-export/import of core's root. Root core may expose
registration types without pulling in the implementation. No global registry or DOM detection.
Registration/compiled/session state is isolated per engine. The builder always registers it before
compilation/preview; ordinary form and customer-Node hosts must explicitly opt in. Validation reuses
the registration attached to the compiled form rather than auto-importing or duplicating execution.
Any root `logic` without registration fails compile with **missing-logic**, never silent fallback.

Only small registration/diagnostic hooks affect no-logic consumers. Edge actions, otherwise/revert,
cascading, effect/event processing and value provenance stay in the opt-in entry. Composition with
legacy calculations/state preserves existing behavior and one synchronous StatePatch per transaction;
async validation completions retain their existing lifecycle. Indexed rules evaluate only affected
conditions/targets, preserving ordered state priority and legacy conditions at implicit position zero.

### Replay and effects

State actions are always recomputed/enforced in browser and Node. Calculations and load/submit-triggered
assignments are authoritative; reject forged authoritative results. Change/event setValue/clear remain
user-editable and are not forgery; Node does not guess prior client events. Authoritative replay can
still assign the same target later. Required/hidden clearing, unknown keys and adapter safety remain.

StatePatch gains optional typed `effects`; session gains `triggerLogicEvent(name, payload?)`. Effects
run once per originating transaction after state publication, with immutable invocation snapshots.
Hosts deliver browser focus/emit and configured refresh hooks; Node skips focus/emit and invokes call
only for trusted functions marked availableInNode. An async call never delays the originating patch
or implicitly mutates data. Explicit subsequent writes begin their own transaction.

During customer-Node submit/validation, await permitted calls with host-configurable
`createLogic({ nodeCallTimeoutMs })`, **default 5,000 ms**. Timeout returns a diagnostic, not a hang or
success; pending work is cancelled on session dispose/host destroy, and late results cannot publish
or apply effects. Host implementations receive cancellation; no browser global enters headless core.
Add package READMEs, typed exports, changeset and Node/browser/all-host lifecycle tests with code.
These are accepted M09c contracts, not APIs implemented by the plan PR.

### Runtime acceptance and initial cost

Owner amendment (2026-11-11): enforce **74,500 logic-enabled builder full / 32,600 builder UI /
8,300 builder-core**. The identical matched no-logic form consumer is at most **28,832** (main
28,232 +600), and opt-in logic adds at most **6,000**. No-logic full remains 68,500; all package
and lazy ceilings remain. Earlier prototype-pending text below is historical and superseded.

The no-logic compiler uses schema `validateStructure`/`migrateStructure` primitives and detects a
root logic declaration without loading its rule wire/meta-schema or execution. These primitives
keep bounded safe-JSON/component/legacy validation and are not complete root-rule validation.
The registered `core/logic` compiler runs the complete public definition validation before reading
any rule. The full public schema/validation/migration APIs preserve their contracts; their complete
metadata is only retained by consumers requesting it. Rule-only session normalization/provenance,
diagnostics, store bridging and cycle descriptions live in the opt-in entry. Root session code
retains generic optional dispatch, protected writes and its unchanged legacy processing contract.

No-logic and legacy-condition/calculation fixtures each stay ≤1.10 paired edit ratio versus immutable
merged main at 100/500/1,000 fields. Exact rule-index/condition/action/writer/write/effect/cascade work
counts are hard gates; timings remain advisory CI but a delivery GO requires the ≤10% evidence.
No-logic full ceiling is 68,500 Brotli bytes; the logic-enabled consumer closure needs a measured
prototype and separate owner-approved ceiling (expected ≤6,000 incremental) before shipping. Existing
runtime package budgets remain unchanged. Actual builder closures are logic-enabled because builder
always registers the runtime; report them rather than externalizing required code from a full build.

### M09c registration and prototype observability

`Engine.logic` is the optional readonly capability; `engine.registerLogic(registration)` installs it
on an existing engine and rejects a duplicate. Builder setup uses this explicit per-instance hook
when the host supplied an engine without the capability; it preserves an existing registration.
No global registry or implicit root import is introduced. The factory remains a subpath-only export.

Optional `FieldState.logic: {ruleId,authoritative}` records the last root value writer. A later user/API
edit removes that provenance; authoritative calculations are recomputed. Optional
`StatePatch.diagnostics` reports root runtime diagnostics, including cascade limit. Prototype
`session.debug.logic` counts real index reads, candidate rules, conditions, action expressions,
cached writers, trigger edges, actual writes, cascade rounds and effects. These are not timing gates.
The prototype rejects unfinished effects/property overlays explicitly; their acceptance remains open.
