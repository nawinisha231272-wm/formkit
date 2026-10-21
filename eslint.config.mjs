import js from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
const allowed = {
  schema: [],
  core: ["schema"],
  validation: ["schema", "core"],
  sdk: ["schema", "core"],
  components: ["sdk"],
  "renderer-dom": [
    "schema",
    "core",
    "sdk",
    "theme-base",
    "theme-bootstrap4",
    "theme-bootstrap5",
    "theme-tailwind",
  ],
  "builder-core": ["schema", "core", "sdk"],
  builder: ["builder-core", "renderer-dom", "sdk", "core", "schema"],
  element: ["renderer-dom", "builder", "sdk", "core", "schema", "components"],
  react: ["renderer-dom", "builder", "sdk", "core", "schema", "components"],
  angular: ["renderer-dom", "builder", "sdk", "core", "schema", "components"],
  licensing: [],
  cli: ["sdk", "schema"],
};
export const boundaryRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { boundary: "Disallowed package import: {{source}}" },
  },
  create(context) {
    const filename = context.filename;
    const current = filename.split("/packages/")[1]?.split("/")[0];
    function check(node) {
      const source = node.source?.value;
      if (!current || !filename.includes("/src/") || typeof source !== "string")
        return;
      let bad = false;
      if (source.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), source);
        bad = !target.startsWith(path.resolve("packages", current) + path.sep);
      } else if (source.startsWith("@ourform/")) {
        const target = source.slice(9);
        bad =
          target.includes("/") ||
          (current !== "testing" &&
            !(
              allowed[current] ?? (current.startsWith("theme-") ? ["sdk"] : [])
            ).includes(target));
        if (current.startsWith("theme-") && node.importKind !== "type")
          bad = true;
      }
      if (bad)
        context.report({ node, messageId: "boundary", data: { source } });
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.turbo/**",
      "test-results/**",
      "playwright-report/**",
      "benchmark-results/**",
      "visual-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts}"],
    languageOptions: {
      globals: {
        document: "readonly",
        HTMLElement: "readonly",
        CSS: "readonly",
        console: "readonly",
        process: "readonly",
        structuredClone: "readonly",
      },
    },
    plugins: { ourform: { rules: { boundaries: boundaryRule } } },
    rules: {
      "ourform/boundaries": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
    },
  },
];
