export { emailPattern } from "@ourform/schema";
import { inspectJson, emailPattern } from "@ourform/schema";
import type { CompiledExpression } from "./expressions";
import type { ExpressionContext } from "./expressions";
import type { FieldError, Path } from "./types";
export interface Providers {
  localization?: (
    key: string,
    params: Record<string, unknown>,
    locale: string,
  ) => string | undefined;
  [name: string]: unknown;
}
export interface ValidatorContext {
  readonly componentId: string;
  readonly path: Path;
  readonly data: unknown;
  readonly config: Readonly<Record<string, unknown>>;
  readonly args: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
  readonly providers: Readonly<Providers>;
}
export type ValidatorResult = FieldError | readonly FieldError[] | null;
export interface Validator {
  validate(
    value: unknown,
    context: ValidatorContext,
  ): ValidatorResult | Promise<ValidatorResult>;
}
export type ValidatorMap = Record<string, Validator>;
export interface CompiledValidator {
  readonly name: string;
  readonly validator: Validator;
  readonly args: Readonly<Record<string, CompiledExpression>>;
}
const error = (code: string): FieldError => ({
  code,
  messageKey: `of.validation.${code}`,
});
export const builtinValidators: Readonly<ValidatorMap> = Object.freeze({
  email: {
    validate: (value: unknown) =>
      value === "" ||
      (typeof value === "string" && new RegExp(emailPattern, "u").test(value))
        ? null
        : error("email"),
  },
  options: {
    validate: (value: unknown, ctx: ValidatorContext) =>
      value === "" ||
      (ctx.config.options as { value: string }[]).some(
        (option) => option.value === value,
      )
        ? null
        : error("option"),
  },
});
function normalize(result: ValidatorResult): FieldError[] {
  if (result === null) return [];
  const errors = Array.isArray(result) ? result : [result];
  return errors.map((e) => {
    if (!e || typeof e.code !== "string" || typeof e.messageKey !== "string")
      throw new Error("Invalid validator result.");
    if (inspectJson(e).length)
      throw new Error("Validator errors must be safe JSON.");
    return JSON.parse(JSON.stringify(e)) as FieldError;
  });
}
/** Invoke trusted validators against one captured data snapshot; race cancellation even if a host ignores it. */
export function runCustomValidators(
  validators: readonly CompiledValidator[],
  value: unknown,
  context: Omit<ValidatorContext, "args">,
  expressions: ExpressionContext,
): { errors: FieldError[]; pending?: Promise<FieldError[]> } {
  const immediate: FieldError[] = [];
  const jobs: (FieldError[] | Promise<FieldError[]>)[] = [];
  for (const compiled of validators) {
    const args = Object.freeze(
      Object.fromEntries(
        Object.entries(compiled.args).map(([key, expr]) => [
          key,
          expr.evaluate(expressions),
        ]),
      ),
    );
    try {
      const result = compiled.validator.validate(value, { ...context, args });
      if (
        result &&
        typeof (result as Promise<ValidatorResult>).then === "function"
      )
        jobs.push(
          Promise.resolve(result)
            .then(normalize)
            .catch(() => [error("unavailable")]),
        );
      else {
        const errors = normalize(result as ValidatorResult);
        immediate.push(...errors);
        jobs.push(errors);
      }
    } catch {
      const errors = [error("unavailable")];
      immediate.push(...errors);
      jobs.push(errors);
    }
  }
  if (!jobs.some((job) => job instanceof Promise)) return { errors: immediate };
  const pending = new Promise<FieldError[]>((resolve) => {
    const abort = () => resolve([error("aborted")]);
    if (context.signal.aborted) {
      abort();
      return;
    }
    context.signal.addEventListener("abort", abort, { once: true });
    void Promise.all(jobs).then((errors) => {
      context.signal.removeEventListener("abort", abort);
      resolve(errors.flat());
    });
  });
  return { errors: immediate, pending };
}
