import { inspectJson, isSafeKey } from "@ourform/schema";

export type BuilderPrimitive =
  | "Button"
  | "IconButton"
  | "Input"
  | "Select"
  | "Switch"
  | "Checkbox"
  | "Tabs"
  | "SegmentedControl"
  | "Dialog"
  | "Drawer"
  | "Menu"
  | "Tooltip"
  | "Toast"
  | "Tree"
  | "Chip";
export type BuilderTokens = Readonly<Record<`--ofb-${string}`, string>>;
/** Recipes override tokens on a primitive, keeping all chrome CSS theme-independent. */
export interface BuilderTheme {
  readonly name: string;
  readonly extends?: string;
  readonly tokens: BuilderTokens;
  readonly modes?: { readonly dark?: BuilderTokens };
  readonly recipes?: Readonly<Partial<Record<BuilderPrimitive, BuilderTokens>>>;
}
const primitives: readonly BuilderPrimitive[] = [
  "Button",
  "IconButton",
  "Input",
  "Select",
  "Switch",
  "Checkbox",
  "Tabs",
  "SegmentedControl",
  "Dialog",
  "Drawer",
  "Menu",
  "Tooltip",
  "Toast",
  "Tree",
  "Chip",
];
/** Snapshot a trusted appearance descriptor; never accepts selectors or executable CSS. */
export function defineBuilderTheme(spec: BuilderTheme): BuilderTheme {
  if (
    inspectJson(spec).length ||
    !/^[a-z][a-z0-9-]*$/.test(spec.name) ||
    (spec.extends !== undefined && !/^[a-z][a-z0-9-]*$/.test(spec.extends))
  )
    throw new Error("Invalid builder theme descriptor.");
  const tokens = (input: BuilderTokens): BuilderTokens => {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("Builder tokens must be an object.");
    for (const [key, value] of Object.entries(input))
      if (
        !/^--ofb-[a-z0-9-]+$/.test(key) ||
        typeof value !== "string" ||
        /[{};<>]/.test(value) ||
        /(?:url|expression)\s*\(/i.test(value)
      )
        throw new Error(`Invalid builder theme token: ${key}`);
    return Object.freeze({ ...input });
  };
  const recipes: Partial<Record<BuilderPrimitive, BuilderTokens>> = {};
  for (const [name, recipe] of Object.entries(spec.recipes ?? {})) {
    if (!isSafeKey(name) || !primitives.includes(name as BuilderPrimitive))
      throw new Error(`Unknown builder primitive: ${name}`);
    recipes[name as BuilderPrimitive] = tokens(recipe);
  }
  for (const key of Object.keys(spec.modes ?? {}))
    if (key !== "dark") throw new Error(`Unknown builder theme mode: ${key}`);
  return Object.freeze({
    name: spec.name,
    ...(spec.extends === undefined ? {} : { extends: spec.extends }),
    tokens: tokens(spec.tokens),
    ...(spec.modes?.dark
      ? { modes: Object.freeze({ dark: tokens(spec.modes.dark) }) }
      : {}),
    recipes: Object.freeze(recipes),
  });
}
