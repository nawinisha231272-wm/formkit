export type {
  Expr,
  ExprOp,
  ComponentNode,
  FormField,
  FormDefinition,
  ValidationRules,
  Diagnostic,
  DefinitionRegistry,
} from "./types";
export {
  formDefinitionSchema,
  validateDefinition,
  migrate,
} from "./validate-definition";
export { isRecord, isSafeKey, inspectJson } from "./json";

export { validateProperties } from "./properties";
export type { PropertyDescriptor } from "./types";

export { toSubmissionSchema, emailPattern } from "./submission-schema";
export type { JSONSchema, SubmissionSchemaSource } from "./submission-schema";
