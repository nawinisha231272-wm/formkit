import { defineConfig } from "tsup";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "features/json": "src/features/json.ts",
    "features/settings": "src/settings.ts",
    "features/settings-retry": "src/features/settings-retry.ts",
    "features/history": "src/features/history.ts",
    "features/logic": "src/features/logic.ts",
    "features/map": "src/features/map.ts",
    "features/commands": "src/features/commands.ts",
    "themes/base": "src/themes/base.ts",
    "themes/bootstrap4": "src/themes/bootstrap4.ts",
    "themes/bootstrap5": "src/themes/bootstrap5.ts",
    "themes/tailwind": "src/themes/tailwind.ts",
    "themes/material": "src/themes/material.ts",
  },
  format: ["esm"],
  dts: {
    entry: {
      index: "src/index.ts",
      "themes/base": "src/themes/base.ts",
      "themes/bootstrap4": "src/themes/bootstrap4.ts",
      "themes/bootstrap5": "src/themes/bootstrap5.ts",
      "themes/tailwind": "src/themes/tailwind.ts",
      "themes/material": "src/themes/material.ts",
    },
  },
  clean: true,
  sourcemap: true,
  splitting: true,
  esbuildPlugins: [{
    name: "static-builder-css",
    setup(build) {
      build.onLoad({ filter: /(?:^|[/\\])(?:.*-style|style)\.ts$/ }, async ({ path }) => {
        const source = await readFile(path, "utf8");
        const match = /^export const (\w+) = `([\s\S]*)`;\s*$/.exec(source);
        if (!match || match[2]!.includes("${")) return undefined;
        const css = await transform(match[2]!, { loader: "css", minify: true, target: "es2022" });
        return { contents: `export const ${match[1]} = ${JSON.stringify(css.code)};`, loader: "ts" };
      });
    },
  }],
  minify: "terser",
  terserOptions: {
    module: true,
    compress: { passes: 10 },
    mangle: { properties: { regex: /^_ofb/ } },
    format: { comments: /@vite-ignore/ },
  },
});
