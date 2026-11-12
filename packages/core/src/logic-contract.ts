import type {
  Diagnostic,
  Expr,
  FormDefinition,
  LogicTrigger,
  JSONSchema,
  SubmissionSchemaSource,
} from "@ourform/schema";
import type { CompiledExpression, ExpressionContext } from "./expressions";
import type {
  CompiledNode,
  CompiledForm,
  FieldState,
  ValidationResult,
  FunctionMap,
  StatePatch,
} from "./types";

export interface LogicCallContext {
  readonly signal: AbortSignal;
  readonly ruleId: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly event?: { readonly name: string; readonly payload?: unknown };
}
export type LogicEffect = Readonly<
  { ruleId: string; data: Readonly<Record<string, unknown>> } & (
    | { action: "focus" | "refreshOptions"; target: string }
    | { action: "emit"; name: string; payload?: unknown }
    | { action: "call"; function: string; args: readonly unknown[] }
  )
>;
export interface LogicProvenance {
  ruleId: string;
  authoritative: boolean;
}
export interface LogicWorkCounts {
  sourceChecks: number;
  valueChecks: number;
  overrideInvalidations: number;
  indexReads: number;
  triggerReads: number;
  candidates: number;
  conditions: number;
  actionExpressions: number;
  writers: number;
  edges: number;
  writes: number;
  cascades: number;
  effects: number;
}
export interface LogicState {
  calculate?: CompiledExpression | undefined;
  finalize?: (state: FieldState) => FieldState;
  visible?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
}
export interface LogicHost {
  readonly submission: boolean | undefined;
  context(): ExpressionContext;
  equal(id: string, left: unknown, right: unknown): boolean;
  write(
    id: string,
    value: unknown,
    provenance: LogicProvenance,
    dirty: boolean,
  ): boolean | undefined;
  empty(id: string): unknown;
  /** Reprocess only these targets and their legacy dependants; return actual value changes. */
  process(
    ids: readonly string[],
    skipCalculate: ReadonlySet<string>,
    changed: ReadonlySet<string>,
  ): readonly string[];
  diagnostic(diagnostic: Diagnostic): void;
  effect(ruleId: string, effect: LogicEffectRequest): void;
}
/** Compiled, trusted request; never serialized into form JSON. */
export interface LogicEffectRequest {
  readonly action: "focus" | "refreshOptions" | "emit" | "call";
  readonly target: string;
  readonly name: string;
  readonly expressions: readonly CompiledExpression[];
}
export interface LogicSession {
  readonly initialData: Record<string, unknown>;
  readonly overrides: Set<string>;
  readonly form: CompiledForm;
  readonly states: Map<string, FieldState>;
  context(): ExpressionContext;
  data(): Record<string, unknown>;
  publish(ids?: readonly string[]): void;
  updateData(data: Record<string, unknown>): void;
  affected(ids: readonly string[]): readonly string[];
  stateChanged(before: FieldState, after: FieldState): boolean;
  process(id: string, skipCalculate: boolean): void;
}
export interface LogicRuntime {
  readonly counts: LogicWorkCounts;
  readonly diagnostics: Diagnostic[];
  event(name: string, payload: unknown): void;
  patch(): Pick<StatePatch, "diagnostics" | "effects">;
  settle(validation: Promise<ValidationResult>): Promise<ValidationResult>;
  dispose(): void;
  validationErrors(): ValidationResult["errors"];
  state(id: string): Readonly<LogicState> | undefined;
  edited(id: string): void;
  run(
    trigger: LogicTrigger,
    changed?: readonly string[],
    payload?: unknown,
  ): readonly string[];
}
export interface LogicProgram {
  message(key: string): string | undefined;
  deliver(
    patch: StatePatch,
    host: { focus(id: string): void; notify(effect: LogicEffect): void },
  ): void;
  replay(): LogicProgram;
  submissionSchema(
    build: (source: SubmissionSchemaSource) => JSONSchema,
  ): JSONSchema;
  readonly dependents: Readonly<Record<string, readonly string[]>>;
  readonly edges: readonly { source: string; target: string; ruleId: string }[];
  describeCycle(members: readonly string[]): string;
  create(session: LogicSession): LogicRuntime;
}
export interface LogicCompileContext {
  functions: FunctionMap;
  definition: FormDefinition;
  nodes: readonly CompiledNode[];
  byId: Readonly<Record<string, CompiledNode>>;
  dependents: Readonly<Record<string, readonly string[]>>;
  expression(input: Expr): {
    expression?: CompiledExpression;
    diagnostics: Diagnostic[];
  };
}
/** Trusted, per-engine capability. Implementations are imported only from the opt-in entry. */
export interface LogicRegistration {
  compile(context: LogicCompileContext): {
    program?: LogicProgram;
    diagnostics: Diagnostic[];
  };
}
