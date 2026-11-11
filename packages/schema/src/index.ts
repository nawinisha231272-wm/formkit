export type {
  Expr,
  ExprOp,
  ComponentNode,
  ComponentColumn,
  ColumnWidth,
  FormField,
  FormDefinition,
  LogicRule,
  LogicAction,
  LogicTrigger,
  ValidationRules,
  Diagnostic,
  DefinitionRegistry,
} from "./types";
export {
  formDefinitionSchema,
  validateDefinition,
  migrate,
} from "./full-definition";
export { validateStructure, migrateStructure } from "./validate-definition";
export { isRecord, isSafeKey, inspectJson } from "./json";

export { validateProperties } from "./properties";
export type { PropertyDescriptor } from "./types";

export { toSubmissionSchema, emailPattern } from "./submission-schema";
export type { JSONSchema, SubmissionSchemaSource } from "./submission-schema";

export { childCollections, componentChildren, childSlot } from "./children";
