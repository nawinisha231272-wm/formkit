import type { Diagnostic } from "./types";
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype ||
    Object.getPrototypeOf(v) === null);
export const isSafeKey = (key: string): boolean =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
  !["__proto__", "constructor", "prototype"].includes(key);
export function inspectJson(value: unknown): Diagnostic[] {
  const seen = new Set<object>();
  let count = 0;
  function visit(v: unknown, depth: number): string | null {
    if (++count > 100000 || depth > 140) return "invalid-definition";
    if (
      v === null ||
      typeof v === "string" ||
      typeof v === "boolean" ||
      (typeof v === "number" && Number.isFinite(v))
    )
      return null;
    if (
      typeof v !== "object" ||
      (!Array.isArray(v) && !isRecord(v)) ||
      seen.has(v)
    )
      return "invalid-definition";
    seen.add(v);
    for (const [key, child] of Object.entries(v)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        return "unsafe-key";
      const error = visit(child, depth + 1);
      if (error) return error;
    }
    seen.delete(v);
    return null;
  }
  try {
    const code = visit(value, 0);
    return code
      ? [
          {
            severity: "error",
            code,
            message:
              "Definition must be bounded JSON without unsafe property names.",
          },
        ]
      : [];
  } catch {
    return [
      {
        severity: "error",
        code: "invalid-definition",
        message: "Unable to inspect definition.",
      },
    ];
  }
}
