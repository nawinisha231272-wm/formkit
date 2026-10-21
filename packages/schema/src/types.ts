export type ExprOp =
  | "and"
  | "or"
  | "not"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "mod"
  | "if"
  | "empty"
  | "len"
  | "sum"
  | "min"
  | "max"
  | "concat"
  | "call";
export type Expr =
  | null
  | boolean
  | number
  | string
  | { ref: string }
  | { path: string }
  | [ExprOp, ...Expr[]];
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  custom?: { validator: string; args?: Record<string, Expr> }[];
}
export type ColumnWidth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export interface ComponentColumn {
  width: ColumnWidth;
  components: ComponentNode[];
}
export interface ComponentNode {
  id: string;
  type: string;
  key?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  ariaLabel?: string;
  defaultValue?: unknown;
  validation?: ValidationRules;
  visibleWhen?: Expr;
  disabledWhen?: Expr;
  calculate?: { expr: Expr; allowOverride?: boolean };
  clearOnHide?: boolean;
  properties?: Record<string, unknown>;
  layout?: { width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 };
  components?: ComponentNode[];
  columns?: ComponentColumn[];
  slot?: string;
  meta?: Record<string, unknown>;
}
export type FormField = ComponentNode;
export interface FormDefinition {
  $formVersion: "1.0";
  id: string;
  title?: string;
  display: "form" | "wizard";
  requires?: { plugin: string; version: string }[];
  settings?: { locale?: string; validateOn?: "change" | "blur" | "submit" };
  components: ComponentNode[];
}
export interface Diagnostic {
  severity: "error" | "warning";
  code: string;
  componentId?: string;
  message: string;
}
export interface DefinitionRegistry {
  get(type: string):
    | {
        value?: unknown;
        dataScope?: "none" | "object" | "array";
        properties?: Record<string, PropertyDescriptor>;
      }
    | undefined;
}

export interface PropertyDescriptor {
  kind: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: { value: string; label?: string }[];
}
