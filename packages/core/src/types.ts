import type {
  ComponentNode,
  Diagnostic,
  FormDefinition,
} from "@ourform/schema";
import type { ComponentModel } from "./model";
import type { CompiledValidator } from "./validators";
import type { CompiledExpression } from "./expressions";
export type Path = readonly (string | { row: string })[];
export type PathInput = Path | string;
export interface FieldError {
  code: string;
  messageKey: string;
  params?: Record<string, unknown>;
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
export interface StatePatch {
  changedPaths: Path[];
  changedFields: string[];
  data: unknown;
}
export interface ValidationResult {
  valid: boolean;
  errors: { path: Path; componentId: string; error: FieldError }[];
}
export type SubmitResult =
  | { ok: true; data: unknown }
  | { ok: false; errors: ValidationResult["errors"] };
export interface HostFunction {
  pure: boolean;
  availableInNode: boolean;
  run: (...args: unknown[]) => unknown;
}
export type FunctionMap = Record<string, HostFunction>;
export interface CompiledNode {
  node: ComponentNode;
  model: ComponentModel;
  path: Path;
  parentId?: string;
  expressions: Readonly<
    Partial<
      Record<"calculate" | "visibleWhen" | "disabledWhen", CompiledExpression>
    >
  >;
  pattern?: RegExp;
  validators: readonly CompiledValidator[];
}
export interface CompiledForm {
  definition: FormDefinition;
  nodes: readonly CompiledNode[];
  byId: Readonly<Record<string, CompiledNode>>;
  byPath: Readonly<Record<string, CompiledNode>>;
  order: readonly string[];
  ranks: Readonly<Record<string, number>>;
  dependents: Readonly<Record<string, readonly string[]>>;
}
export type CompileResult =
  | { ok: true; form: CompiledForm; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };
