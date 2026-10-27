import { build } from "esbuild";
import { brotliCompressSync } from "node:zlib";
import { resolve } from "node:path";

const entrySource =
  'import { createBuilder } from "@ourform/builder"; import { bootstrap5Theme } from "@ourform/themes/bootstrap5"; import { bootstrap5BuilderTheme } from "@ourform/builder/themes/bootstrap5"; globalThis.mountOurFormBuilder = [createBuilder, bootstrap5Theme, bootstrap5BuilderTheme];';
const limits = {
  builderOwnedInitial: 29_000,
  fullInitial: 64_613,
  logic: 10_000,
  json: 8_000,
  map: 10_000,
  logicJsonMap: 28_000,
  settings: 8_000,
  quickAdd: 3_750,
  logicJsonMapSettings: 36_000,
};

async function bundle(external) {
  return build({
    stdin: {
      contents: entrySource,
      resolveDir: process.cwd(),
      sourcefile: "minimal-builder-consumer.js",
    },
    bundle: true,
    format: "esm",
    minify: true,
    target: "es2022",
    splitting: true,
    outdir: "/tmp/ourform-builder-size",
    write: false,
    metafile: true,
    ...(external
      ? {
          packages: "external",
          plugins: [
            {
              name: "ourform-builder-owned",
              setup(context) {
                context.onResolve({ filter: /^@ourform\/builder$/ }, () => ({
                  path: resolve("packages/builder/dist/index.js"),
                }));
                context.onResolve(
                  { filter: /^@ourform\/builder\/themes\/bootstrap5$/ },
                  () => ({
                    path: resolve("packages/builder/dist/themes/bootstrap5.js"),
                  }),
                );
                context.onResolve({ filter: /^@ourform\/theme-base$/ }, () => ({
                  path: resolve("packages/theme-base/dist/index.js"),
                }));
              },
            },
          ],
        }
      : {}),
  });
}

function analyze(result) {
  const outputs = result.metafile.outputs;
  const bytes = new Map(
    result.outputFiles.map((file) => [
      file.path,
      {
        raw: file.contents.length,
        brotli: brotliCompressSync(file.contents).length,
      },
    ]),
  );
  const pathFor = (output) => resolve(output);
  const closure = (roots) => {
    const seen = new Set();
    const visit = (output) => {
      if (seen.has(output)) return;
      seen.add(output);
      for (const dependency of outputs[output].imports)
        if (!dependency.external && dependency.kind !== "dynamic-import")
          visit(dependency.path);
    };
    for (const root of roots) visit(root);
    const files = [...seen].sort().map((output) => ({
      file: output.split("/").at(-1),
      ...bytes.get(pathFor(output)),
    }));
    return {
      files,
      raw: files.reduce((total, file) => total + file.raw, 0),
      brotli: files.reduce((total, file) => total + file.brotli, 0),
    };
  };
  const initial = Object.keys(outputs).find(
    (output) => outputs[output].entryPoint === "minimal-builder-consumer.js",
  );
  if (!initial)
    throw new Error("Builder size probe did not emit its consumer entry.");
  const featureRoot = (name) => {
    const suffix = `/features/${name}.js`;
    const output = Object.keys(outputs).find((candidate) =>
      outputs[candidate].entryPoint?.endsWith(suffix),
    );
    if (!output) throw new Error(`Builder size probe did not emit ${name}.`);
    return output;
  };
  const features = Object.fromEntries(
    [
      "settings",
      "settings-retry",
      "logic",
      "json",
      "map",
      "history",
      "commands",
      "quick-add",
      "quick-add-retry",
    ].map((name) => [name, closure([featureRoot(name)])]),
  );
  const deferredRoots = Object.keys(outputs).filter(
    (output) =>
      outputs[output].entryPoint &&
      outputs[output].entryPoint !== "minimal-builder-consumer.js",
  );
  return {
    initial: closure([initial]),
    features,
    logicJsonMap: closure(["logic", "json", "map"].map(featureRoot)),
    logicJsonMapSettings: closure(
      ["logic", "json", "map", "settings"].map(featureRoot),
    ),
    allDeferred: closure(deferredRoots),
  };
}

const [owned, full] = await Promise.all([bundle(true), bundle(false)]);
const ownedReport = analyze(owned);
const fullReport = analyze(full);
const report = {
  method: {
    tool: "esbuild 0.25.12 consumer production build + node:zlib Brotli",
    entrySource,
    sharedChunks: "counted once per closure",
  },
  limits,
  builderOwned: ownedReport,
  fullInitial: fullReport.initial,
};
console.log(JSON.stringify(report, null, 2));

const checks = [
  [
    "builder-owned initial",
    ownedReport.initial.brotli,
    limits.builderOwnedInitial,
  ],
  ["full initial closure", fullReport.initial.brotli, limits.fullInitial],
  ["Logic", ownedReport.features.logic.brotli, limits.logic],
  ["JSON", ownedReport.features.json.brotli, limits.json],
  ["dependency map", ownedReport.features.map.brotli, limits.map],
  [
    "Logic/JSON/map union",
    ownedReport.logicJsonMap.brotli,
    limits.logicJsonMap,
  ],
  ["Settings", ownedReport.features.settings.brotli, limits.settings],
  ["Quick-add", ownedReport.features["quick-add"].brotli, limits.quickAdd],
  [
    "Quick-add retry",
    ownedReport.features["quick-add-retry"].brotli,
    limits.quickAdd,
  ],
  [
    "Logic/JSON/map/Settings union",
    ownedReport.logicJsonMapSettings.brotli,
    limits.logicJsonMapSettings,
  ],
];
const failures = checks.filter(([, actual, limit]) => actual > limit);
if (failures.length) {
  for (const [name, actual, limit] of failures)
    console.error(`${name}: ${actual} Brotli bytes exceeds ${limit}`);
  process.exitCode = 1;
}
