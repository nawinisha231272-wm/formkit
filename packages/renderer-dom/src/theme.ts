import type {
  FieldPart,
  ShellVariant,
  Theme,
  ThemeMode,
  ThemeOverride,
} from "@ourform/sdk";
export interface ThemeOptions {
  themes?: readonly Theme[];
  appTheme?: ThemeOverride;
  formTheme?: ThemeOverride;
  componentThemes?: Readonly<Record<string, ThemeOverride>>;
  themeMode?: ThemeMode;
}
export interface ResolvedTheme {
  name: string;
  tokens: Record<string, string>;
  css: string;
  classFor(variant: ShellVariant, part: FieldPart): string;
}
export function resolveTheme(
  theme: Theme | string = "base",
  options: ThemeOptions = {},
  componentId?: string,
): ResolvedTheme {
  const installed = new Map<string, Theme>();
  for (const item of options.themes ?? []) {
    if (installed.has(item.name))
      throw new Error(`Duplicate theme: ${item.name}`);
    installed.set(item.name, item);
  }
  if (typeof theme !== "string") installed.set(theme.name, theme);
  const name =
    typeof theme === "string"
      ? theme === "bootstrap"
        ? "bootstrap5"
        : theme
      : theme.name;
  const chain: (Theme | ThemeOverride)[] = [];
  const seen = new Set<string>();
  const visit = (key: string): void => {
    if (seen.has(key)) throw new Error(`Theme inheritance cycle: ${key}`);
    const item = installed.get(key);
    if (!item) throw new Error(`Unknown theme: ${key}`);
    seen.add(key);
    if (item.extends) visit(item.extends);
    chain.push(item);
  };
  visit(name);
  for (const override of [
    options.appTheme,
    options.formTheme,
    componentId ? options.componentThemes?.[componentId] : undefined,
  ])
    if (override) chain.push(override);
  const tokens: Record<string, string> = {};
  const classes: Theme["classes"] = {};
  for (const item of chain) {
    Object.assign(
      tokens,
      item.tokens,
      options.themeMode && options.themeMode !== "light"
        ? item.modes?.[options.themeMode]
        : {},
    );
    for (const [variant, parts] of Object.entries(item.classes)) {
      const key = variant as ShellVariant;
      classes[key] = { ...classes[key], ...parts };
    }
  }
  tokenDeclarations(tokens);
  const css = chain
    .map((item) => ("css" in item ? (item.css ?? "") : ""))
    .join("\n");
  if (/<\/style/i.test(css))
    throw new Error("Theme CSS cannot close a style element.");
  return {
    name,
    tokens,
    css,
    classFor: (variant, part) =>
      [
        part === "root"
          ? `of-field of-${variant}`
          : `of-${part.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
        classes[variant]?.[part],
      ]
        .filter(Boolean)
        .join(" "),
  };
}
export function tokenDeclarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([key, value]) => {
      if (!/^--of-[a-z0-9-]+$/.test(key) || /[{};<>]/.test(value))
        throw new Error(`Invalid theme token: ${key}`);
      return `${key}:${value}`;
    })
    .join(";");
}
export function themeStyle(theme: ResolvedTheme, instance: string): string {
  const selector = `.of-root[data-of-instance="${instance}"]`;
  return `${selector}{${tokenDeclarations(theme.tokens)}}\n${theme.css.replaceAll(".of-root", selector)}`;
}
