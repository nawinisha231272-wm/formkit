import { browserFiles } from "./browser-template";
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";

export type ScaffoldKind = "component" | "theme" | "plugin";
export interface ScaffoldOptions {
  localPackages?: string;
}
const version = "0.0.1";
const control = (
  name: string,
) => `import { defineField, stringValue, stringProperty, numberProperty, booleanProperty, controlAttributes, h } from "@ourform/sdk";
export const field = defineField({
  type: "${name}", title: "${name}", value: stringValue(),
  properties: {
    placeholder: stringProperty({label: "Placeholder", default: "Type a value"}),
    maxLength: numberProperty({label: "Maximum length", default: 80, min: 1}),
    showCount: booleanProperty({label: "Show character count", default: true}),
  },
  control: (props) => h("div", {}, h("input", {
    ...controlAttributes(props), value: props.value,
    placeholder: props.config.placeholder, maxlength: props.config.maxLength,
    class: props.theme.classFor("control"),
    oninput: (event: Event) => props.setValue((event.target as HTMLInputElement).value),
    onblur: props.onBlur,
  }), props.config.showCount ? h("output", {}, String(props.value.length)) : null),
});
`;
const testSource = (
  kind: ScaffoldKind,
  name: string,
) => `import { test, expect } from "vitest";
import { renderVNodeToString, defaultMessage, resolveConfig } from "@ourform/sdk";
import { field${kind === "component" ? "" : `, ${kind}`} } from "../src/index";
import { componentTestEngine, checkValueAdapter, checkValidation, checkBuilderRoundTrip } from "@ourform/testing";
test("generated ${kind}: values, validation and generated builder palette/undo/redo", async () => {
  const engine = componentTestEngine([field]);
  checkValueAdapter(field.model.value!, ["", "hello"]);
  checkBuilderRoundTrip(engine, "${name}");
  await checkValidation(engine, {
    $formVersion: "1.0", id: "sample", display: "form",
    components: [{id: "sample", type: "${name}", key: "value", validation: {required: true}}],
  }, [{data: {value: ""}, valid: false, codes: ["required"]}, {data: {value: "hello"}, valid: true}]);
  expect(field.model.type).toBe("${name}");
  const resolved = resolveConfig(field.properties);
  if (!resolved.ok) throw new Error("Invalid generated defaults");
  const markup = renderVNodeToString(field.views.portable!({
    value: "hello", config: resolved.config, setValue: () => {}, onBlur: () => {}, focusRef: () => {},
    state: {disabled: false, readOnly: false, invalid: false, pending: false, required: true},
    a11y: {id: "sample", name: "value", labelledBy: "sample-label"},
    theme: {classFor: () => "control"}, t: defaultMessage,
  }));
  expect(markup).toContain('aria-labelledby="sample-label"');
  expect(markup).toContain('value="hello"');
  ${kind === "component" ? "" : kind === "theme" ? `expect(theme.name).toBe("${name}");` : `expect(plugin.components).toContain(field);`}
});
`;
/** Write a fresh standalone project. Never overwrite an existing directory or install dependencies. */
export async function createScaffold(
  kind: ScaffoldKind,
  directory: string,
  name: string,
  options: ScaffoldOptions = {},
): Promise<string> {
  if (
    !["component", "theme", "plugin"].includes(kind) ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)
  )
    throw new Error(
      "Use component/theme/plugin and a lowercase hyphenated project name.",
    );
  const target = resolve(directory);
  const dependencies: Record<string, string> = { "@ourform/sdk": version };
  const devDependencies: Record<string, string> = {
    "@ourform/testing": version,
    "@types/node": "22.15.29",
    "@playwright/test": "1.56.1",
    "@axe-core/playwright": "4.10.2",
    typescript: "6.0.2",
    tsup: "8.5.0",
    vitest: "3.2.4",
    vite: "6.3.5",
    ...(kind === "theme"
      ? {
          "@ourform/theme-bootstrap4": version,
          "@ourform/theme-bootstrap5": version,
          "@ourform/theme-tailwind": version,
        }
      : {}),
  };
  const overrides: Record<string, string> = {
    vite: "6.3.5",
    postcss: "8.5.30",
    rollup: "4.64.10",
    esbuild: "0.25.12",
  };
  if (options.localPackages) {
    const kit = resolve(options.localPackages);
    for (const file of await readdir(kit)) {
      const match = /^ourform-([a-z][a-z0-9-]*)-0\.0\.1\.tgz$/.exec(file);
      if (match) overrides[`@ourform/${match[1]}`] = `file:${join(kit, file)}`;
    }
    for (const dependency of ["@ourform/sdk", "@ourform/testing"])
      if (!overrides[dependency])
        throw new Error(`Local package kit is missing ${dependency}.`);
    dependencies["@ourform/sdk"] = overrides["@ourform/sdk"]!;
    devDependencies["@ourform/testing"] = overrides["@ourform/testing"]!;
  }
  const source =
    control(name) +
    (kind === "plugin"
      ? `
import { definePlugin } from "@ourform/sdk";
export const plugin = definePlugin({id: "${name}", version: "1.0.0", engine: "^0.0.1", components: [field]});
`
      : kind === "theme"
        ? `
import type { Theme } from "@ourform/sdk";
export const theme: Theme = {name: "${name}", extends: "base", tokens: {"--of-accent": "#2459a6"}, classes: {field: {control: "${name}-control"}}};
`
        : "");
  // Resolve/read all inputs before reserving the output directory; mkdir is the overwrite guard.
  await mkdir(dirname(target), { recursive: true });
  await mkdir(target);
  try {
    await mkdir(join(target, "src"));
    await mkdir(join(target, "tests"));
    await mkdir(join(target, "browser"));
    await mkdir(join(target, "scripts"));
    const pkg = {
      name,
      version: "0.0.0",
      private: true,
      type: "module",
      sideEffects: false,
      packageManager: "pnpm@10.10.0",
      engines: { node: "22.22.3", pnpm: "10.10.0" },
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
      scripts: {
        build: "tsup src/index.ts --format esm --dts --clean",
        typecheck: "tsc --noEmit",
        test: "vitest run --reporter=verbose",
        dev: "vite --host 127.0.0.1 --port 4175 --strictPort",
        builder: "pnpm dev --open /?builder",
        "test:browser": "playwright test",
        "visual:record": "node scripts/visuals.mjs record",
        "visual:check": "node scripts/visuals.mjs check",
        "visual:linux:record": "node scripts/visuals.mjs record --linux",
        "visual:linux:check": "node scripts/visuals.mjs check --linux",
        verify:
          "pnpm build && pnpm typecheck && pnpm test && pnpm test:browser",
      },
      dependencies,
      devDependencies,
      pnpm: { overrides },
    };
    const files: Record<string, string> = {
      ...browserFiles(
        name,
        options.localPackages ? resolve(options.localPackages) : undefined,
        kind === "theme",
      ),
      "package.json": JSON.stringify(pkg, null, 2) + "\n",
      "pnpm-workspace.yaml": "packages: []\n",
      "tsconfig.json":
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              module: "ESNext",
              moduleResolution: "Bundler",
              strict: true,
              noUncheckedIndexedAccess: true,
              exactOptionalPropertyTypes: true,
              skipLibCheck: true,
              lib: ["ES2022", "DOM"],
              ignoreDeprecations: "6.0",
              types: ["node"],
            },
            include: [
              "src/**/*.ts",
              "tests/**/*.ts",
              "browser/**/*.ts",
              "preview.ts",
              "playwright.config.ts",
              "vitest.config.ts",
            ],
          },
          null,
          2,
        ) + "\n",
      "src/index.ts": source,
      "tests/extension.test.ts": testSource(kind, name),
      ".gitignore":
        "node_modules/\ndist/\ncoverage/\ntest-results/\nplaywright-report/\n",
      "README.md": `# ${name}\n\nGenerated ${kind}. Install with pinned Node 22.22.3 and pnpm 10.10.0:\n\n\`\`\`sh\nofrun() { npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 "$@"; }\nofrun node --version\nofrun pnpm --version\nofrun pnpm install\nofrun pnpm exec playwright install chromium firefox webkit\nofrun pnpm verify\n\`\`\`\n\nRegister field.model in your engine and field.views in your renderer; the builder palette and property panel use the same model. ${kind === "plugin" ? "Alternatively install plugin with createEngine({plugins: [plugin]}), then pass its component views/themes to the host." : kind === "theme" ? "Pass theme to the renderer's themes array and select it by name; field is a sample preview control." : "See the component author guide and renderComponent test helper for DOM/a11y/theme tests."}\n\nRun pnpm exec playwright install chromium firefox webkit once, then pnpm verify runs Node and all three browsers in all four themes. pnpm builder opens the registered mini builder. Browser tests assert every generated component property editor changes the preview. Missing visual baselines capture explicitly unapproved evidence; pnpm visual:record records only a fresh platform folder, then compares it. Review and commit those images before shipping. pnpm visual:linux:record uses the exact Docker image in playwright-container.json.\n${options.localPackages ? "\nThis development project uses the local packed SDK kit selected at generation time.\n" : "\nRegistry dependencies require the matching OurForm 0.0.1 packages to be published; development kits can be selected with --local-packages.\n"}`,
    };
    for (const [path, value] of Object.entries(files))
      await writeFile(join(target, path), value, { flag: "wx" });
    return target;
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}

export async function runCli(args: readonly string[]): Promise<string> {
  if (args.length === 1 && ["--help", "-h"].includes(args[0]!))
    return "Usage: ourform create-component|create-theme|create-plugin name [--directory path] [--local-packages path]";
  const [command, name, ...flags] = args;
  const kind = command?.replace(/^create-/, "") as ScaffoldKind;
  if (!command?.startsWith("create-") || !name || flags.length % 2)
    throw new Error(
      "Usage: ourform create-component|create-theme|create-plugin name [--directory path] [--local-packages path]",
    );
  let directory = name;
  let localPackages: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < flags.length; index += 2) {
    const flag = flags[index]!;
    if (seen.has(flag) || !["--directory", "--local-packages"].includes(flag))
      throw new Error(`Invalid option: ${flag}`);
    seen.add(flag);
    if (flag === "--directory") directory = flags[index + 1]!;
    else localPackages = flags[index + 1]!;
  }
  return createScaffold(
    kind,
    directory,
    name,
    localPackages ? { localPackages } : {},
  );
}
