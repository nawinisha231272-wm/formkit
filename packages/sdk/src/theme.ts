import type { ShellVariant } from "./contracts";
export type FieldPart =
  | "root"
  | "label"
  | "required"
  | "description"
  | "controlWrapper"
  | "prefix"
  | "control"
  | "suffix"
  | "help"
  | "errors"
  | "error";
export type ThemeMode = "light" | "dark" | "high-contrast";
export interface Theme {
  name: string;
  extends?: string;
  tokens: Record<`--of-${string}`, string>;
  classes: Partial<Record<ShellVariant, Partial<Record<FieldPart, string>>>>;
  css?: string;
  modes?: Partial<
    Record<Exclude<ThemeMode, "light">, Record<`--of-${string}`, string>>
  >;
}
export type ThemeOverride = Pick<Theme, "tokens" | "classes"> &
  Pick<Partial<Theme>, "modes">;
