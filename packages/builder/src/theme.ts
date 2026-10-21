import { defaultBuilderThemes } from "@ourform/renderer-dom";
import { defineBuilderTheme } from "@ourform/sdk";
import type {
  BuilderTheme,
  BuilderTokens,
  BuilderPrimitive,
} from "@ourform/sdk";

export interface ChromeOptions {
  theme?: "match-form" | string;
  mode?: "auto" | "light" | "dark";
  accent?: string;
  density?: "comfortable" | "compact";
}
export interface ResolvedChrome {
  readonly name: string;
  readonly mode: "light" | "dark";
  readonly density: "comfortable" | "compact";
  readonly tokens: BuilderTokens;
  readonly recipes: Readonly<Partial<Record<BuilderPrimitive, BuilderTokens>>>;
}
/** Resolve per builder instance; appearance registration never touches the engine or wire schema. */
export function resolveChrome(
  options: ChromeOptions = {},
  formTheme = "base",
  formMode = "light",
  themes: readonly BuilderTheme[] = [],
): ResolvedChrome {
  const registry = new Map(
    defaultBuilderThemes.map((theme) => [
      theme.name,
      defineBuilderTheme(theme),
    ]),
  );
  for (const theme of themes) {
    if (registry.has(theme.name))
      throw new Error(`Duplicate builder theme: ${theme.name}`);
    registry.set(theme.name, defineBuilderTheme(theme));
  }
  const matched =
    formTheme === "bootstrap"
      ? "bootstrap5"
      : formTheme === "base"
        ? "neutral"
        : formTheme;
  const name =
    !options.theme || options.theme === "match-form"
      ? registry.has(matched)
        ? matched
        : "neutral"
      : options.theme;
  const mode =
    !options.mode || options.mode === "auto"
      ? formMode === "light"
        ? "light"
        : "dark"
      : options.mode;
  const tokens: Record<`--ofb-${string}`, string> = {};
  const recipes: Partial<Record<BuilderPrimitive, BuilderTokens>> = {};
  const chain: BuilderTheme[] = [];
  const seen = new Set<string>();
  function visit(key: string) {
    if (seen.has(key))
      throw new Error(`Builder theme inheritance cycle: ${key}`);
    const theme = registry.get(key);
    if (!theme) throw new Error(`Unknown builder theme: ${key}`);
    seen.add(key);
    if (theme.extends) visit(theme.extends);
    if (key !== "neutral") chain.push(theme);
  }
  visit(name);
  chain.unshift(registry.get("neutral")!);
  for (const theme of chain) {
    Object.assign(
      tokens,
      theme.tokens,
      mode === "dark" ? theme.modes?.dark : {},
    );
    for (const [primitive, recipe] of Object.entries(theme.recipes ?? {})) {
      const key = primitive as BuilderPrimitive;
      recipes[key] = Object.freeze({ ...recipes[key], ...recipe });
    }
  }
  if (options.accent !== undefined) {
    if (!/^#[a-f0-9]{6}$/i.test(options.accent))
      throw new Error("Builder accent must be a six-digit hex color.");
    tokens["--ofb-accent"] = tokens["--ofb-focus-ring"] = options.accent;
    const rgb = [1, 3, 5]
      .map((i) => parseInt(options.accent!.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    tokens["--ofb-accent-contrast"] = luminance > 0.179 ? "#000000" : "#ffffff";
  }
  const density = options.density ?? "comfortable";
  if (density === "compact") {
    tokens["--ofb-control-height"] = "30px";
    tokens["--ofb-space"] = "8px";
    tokens["--ofb-font-size"] = "12px";
  }
  return Object.freeze({
    name,
    mode,
    density,
    tokens: Object.freeze(tokens),
    recipes: Object.freeze(recipes),
  });
}
const declarations = (tokens: BuilderTokens) =>
  Object.entries(tokens)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
export function chromeStyle(theme: ResolvedChrome, instance: string): string {
  if (!/^[a-z0-9-]+$/.test(instance))
    throw new Error("Unsafe builder appearance instance.");
  const root = `.of-builder[data-ofb-instance="${instance}"]`;
  return (
    `${root},${root} dialog::backdrop{${declarations(theme.tokens)}}\n` +
    Object.entries(theme.recipes)
      .map(
        ([name, tokens]) =>
          `${root} [data-ofb-primitive="${name}"]{${declarations(tokens)}}`,
      )
      .join("\n")
  );
}
