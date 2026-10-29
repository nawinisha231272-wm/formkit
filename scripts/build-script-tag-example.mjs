import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const app = resolve(root, "apps/script-tag-example");
const outdir = resolve(app, "dist/assets");
await rm(resolve(app, "dist"), { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp(resolve(app, "index.html"), resolve(app, "dist/index.html"));

const names = ["base", "bootstrap4", "bootstrap5", "tailwind", "material"];
const entryPoints = Object.fromEntries([
  ...names.map((name) => [`ourform-builder.${name}.min`, `theme:${name}`]),
  ["ourform-builder.all-themes.min", "theme:all-themes"],
  ["app", "apps/script-tag-example/src/main.ts"],
  ["features/settings", "packages/builder/src/settings.ts"],
  ["features/json", "packages/builder/src/features/json.ts"],
  ["features/history", "packages/builder/src/features/history.ts"],
  ["features/logic", "packages/builder/src/features/logic.ts"],
  ["features/map", "packages/builder/src/features/map.ts"],
  ["features/commands", "packages/builder/src/features/commands.ts"],
  [
    "features/commands-retry",
    "packages/builder/src/features/commands-retry.ts",
  ],
  ["features/bulk-editor", "packages/builder/src/features/bulk-editor.ts"],
  ["features/bulk-plan", "packages/builder/src/features/bulk-plan.ts"],
  [
    "features/bulk-plan-retry",
    "packages/builder/src/features/bulk-plan-retry.ts",
  ],
  ["features/data", "packages/builder/src/features/data.ts"],
  ["features/data-retry", "packages/builder/src/features/data-retry.ts"],
  [
    "features/bulk-editor-retry",
    "packages/builder/src/features/bulk-editor-retry.ts",
  ],
  ["features/quick-add", "packages/builder/src/features/quick-add.ts"],
  [
    "features/quick-add-retry",
    "packages/builder/src/features/quick-add-retry.ts",
  ],
]);

const themeSource = (selection) => {
  const selected = selection === "all-themes" ? names : [selection];
  const formNames = selected.flatMap((name) =>
    name === "material" ? ["base", "material"] : [name],
  );
  const uniqueForms = [...new Set(formNames)];
  const imports = uniqueForms
    .map((name) => `import { ${name}Theme } from "@ourform/themes/${name}";`)
    .join("\n");
  const recipeNames = selected.filter((name) => name !== "base");
  const recipeImports = recipeNames
    .map(
      (name) =>
        `import { ${name}BuilderTheme } from "@ourform/builder/themes/${name}";`,
    )
    .join("\n");
  return `
import { createBuilder as create } from "@ourform/builder";
import { builtinComponents } from "@ourform/components";
${imports}
${recipeImports}
const themes = [${uniqueForms.map((name) => `${name}Theme`).join(",")}];
const builderThemes = [${recipeNames.map((name) => `${name}BuilderTheme`).join(",")}];
const createBuilder = (root, schema, options = {}) => create(root, schema, {
  ...options,
  fields: [...builtinComponents, ...(options.fields ?? [])],
  themes: [...themes, ...(options.themes ?? [])],
  builderThemes: [...builderThemes, ...(options.builderThemes ?? [])],
  theme: options.theme ?? ${JSON.stringify(selected.at(-1))},
});
globalThis.OurFormBuilder = Object.freeze({ createBuilder, themes: Object.freeze(themes.map(theme => theme.name)) });
export { createBuilder, themes, builderThemes };
`;
};

await build({
  absWorkingDir: root,
  entryPoints,
  outdir,
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: true,
  entryNames: "[dir]/[name]",
  chunkNames: "chunks/[name]-[hash]",
  assetNames: "assets/[name]-[hash]",
  plugins: [
    {
      name: "ourform-script-tag-themes",
      setup(context) {
        context.onResolve({ filter: /^theme:/ }, (args) => ({
          path: args.path.slice("theme:".length),
          namespace: "ourform-theme-entry",
        }));
        context.onLoad(
          { filter: /.*/, namespace: "ourform-theme-entry" },
          (args) => ({
            contents: themeSource(args.path),
            loader: "js",
            resolveDir: root,
          }),
        );
      },
    },
  ],
  logLevel: "info",
});
