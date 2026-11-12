import type { LogicTrigger, Diagnostic } from "@ourform/schema";
import type { FunctionMap } from "../types";
import type {
  LogicCallContext,
  LogicEffect,
  LogicEffectRequest,
  LogicSession,
  LogicWorkCounts,
} from "../logic-contract";
import { freeze, snapshot } from "../paths";

const messages: Readonly<Record<string, string>> = Object.freeze({
  "of.logic.logic-cascade-limit": "Logic exceeded the safe cascade limit.",
  "of.logic.invalid-logic-value": "A rule produced an invalid field value.",
  "of.logic.invalid-logic-effect": "A rule produced invalid effect data.",
  "of.logic.logic-call-aborted": "The rule call was cancelled. Submit again.",
  "of.logic.logic-call-timeout": "The rule call timed out. Try again.",
  "of.logic.logic-call-unavailable": "The rule call is unavailable. Try again.",
});
export const logicMessage = (key: string): string | undefined =>
  Object.hasOwn(messages, key) ? messages[key] : undefined;
/** Session-local outbox. Only explicit trusted registrations can execute a call. */
export function createEffects(
  session: LogicSession,
  submission: boolean,
  functions: FunctionMap,
  timeout: number,
  counts: () => LogicWorkCounts,
  diagnostics: Diagnostic[],
) {
  let active = true;
  let event: LogicCallContext["event"];
  const pending = new Set<Promise<void>>();
  const aborts = new Set<() => void>();
  let outbox: { effect: LogicEffect; start?: () => void }[] = [];
  const error = (code: string, ruleId: string) => {
    diagnostics.push({
      severity: "error",
      code,
      message: `Rule ${ruleId}: ${code}.`,
    });
  };
  return {
    get hasEffects() {
      return outbox.length > 0;
    },
    begin(trigger: LogicTrigger, payload: unknown) {
      event =
        trigger.on === "event"
          ? freeze({
              name: trigger.name,
              ...(payload === undefined ? {} : { payload }),
            })
          : undefined;
    },
    enqueue(ruleId: string, plan: LogicEffectRequest) {
      if (
        !active ||
        (submission && (plan.action === "focus" || plan.action === "emit"))
      )
        return;
      const fn = functions[plan.name];
      if (plan.action === "call" && submission && !fn?.availableInNode) return;
      let values: readonly unknown[];
      try {
        values = snapshot(
          plan.expressions.map((expr) => {
            counts().actionExpressions++;
            return expr.evaluate(session.context());
          }),
        );
      } catch {
        error("invalid-logic-effect", ruleId);
        return;
      }
      const base = { ruleId, data: session.data() };
      const effect: LogicEffect = freeze(
        plan.action === "call"
          ? { ...base, action: "call", function: plan.name, args: values }
          : plan.action === "emit"
            ? {
                ...base,
                action: "emit",
                name: plan.name,
                ...(values.length ? { payload: values[0] } : {}),
              }
            : { ...base, action: plan.action, target: plan.target },
      );
      counts().effects++;
      if (plan.action !== "call") {
        outbox.push({ effect });
        return;
      }
      const controller = new AbortController();
      const context: LogicCallContext = Object.freeze({
        ruleId,
        data: base.data,
        signal: controller.signal,
        ...(event ? { event } : {}),
      });
      let finish!: () => void;
      const job = new Promise<void>((resolve) => {
        finish = resolve;
      });
      pending.add(job);
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const complete = (code?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        aborts.delete(abort);
        pending.delete(job);
        if (code) error(code, ruleId);
        finish();
        if (code && active) session.publish();
      };
      const abort = () => {
        controller.abort();
        complete(submission ? "logic-call-aborted" : undefined);
      };
      aborts.add(abort);
      outbox.push({
        effect,
        start: () => {
          if (!active || settled) return;
          if (submission)
            timer = setTimeout(() => {
              controller.abort();
              complete("logic-call-timeout");
            }, timeout);
          try {
            Promise.resolve(
              fn!.effect ? fn!.effect(values, context) : fn!.run(...values),
            ).then(
              () => complete(),
              () => complete(active ? "logic-call-unavailable" : undefined),
            );
          } catch {
            complete("logic-call-unavailable");
          }
        },
      });
    },
    patch() {
      const batch = outbox;
      outbox = [];
      if (batch.length)
        queueMicrotask(() => {
          if (active) for (const item of batch) item.start?.();
        });
      return batch.length ? { effects: batch.map((item) => item.effect) } : {};
    },
    deferLoad() {
      if (outbox.length)
        queueMicrotask(() => {
          if (active && outbox.length) session.publish();
        });
    },
    async settle() {
      if (submission) while (pending.size) await Promise.all(pending);
    },
    dispose() {
      active = false;
      outbox = [];
      for (const abort of aborts) abort();
    },
  };
}
