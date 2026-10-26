import { brotliCompressSync } from "node:zlib";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const staticImportPattern =
  /\b(?:import|export)\s*(?:[^"'();]*?\bfrom\s*)?["']([^"']+)["']/g;

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else files.push(path);
  }
  return files;
}

async function closure(roots) {
  const seen = new Set();
  const visit = async (path) => {
    const absolute = resolve(path);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    const source = await readFile(absolute);
    if (!absolute.endsWith(".js")) return;
    const text = source.toString("utf8");
    for (const match of text.matchAll(staticImportPattern)) {
      const specifier = match[1];
      if (specifier?.startsWith("."))
        await visit(resolve(dirname(absolute), specifier));
    }
  };
  for (const rootPath of roots) await visit(rootPath);
  const files = [];
  for (const path of [...seen].sort()) {
    const contents = await readFile(path);
    files.push({
      file: relative(root, path),
      raw: contents.length,
      brotli: brotliCompressSync(contents).length,
    });
  }
  return {
    files,
    raw: files.reduce((sum, file) => sum + file.raw, 0),
    brotli: files.reduce((sum, file) => sum + file.brotli, 0),
  };
}

async function htmlRoots(htmlPath) {
  const html = await readFile(htmlPath, "utf8");
  const urls = [
    ...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g),
    ...html.matchAll(
      /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["'][^>]*>/g,
    ),
  ].map((match) => match[1]);
  const base = dirname(htmlPath);
  return [...new Set(urls)].map((url) =>
    resolve(base, url.startsWith("/") ? `.${url}` : url),
  );
}

async function htmlConsumer(name, htmlPath) {
  return [name, await closure(await htmlRoots(htmlPath))];
}

const scriptAssets = resolve(root, "apps/script-tag-example/dist/assets");
const scriptEntries = (await filesIn(scriptAssets)).filter((path) =>
  /ourform-builder\.(?:base|bootstrap4|bootstrap5|tailwind|material|all-themes)\.min\.js$/.test(
    path,
  ),
);

const consumers = Object.fromEntries(
  await Promise.all([
    htmlConsumer(
      "vite-vanilla",
      resolve(root, "apps/vanilla-example/dist/builder.html"),
    ),
    htmlConsumer(
      "vite-react",
      resolve(root, "apps/react-example/dist/builder.html"),
    ),
    htmlConsumer(
      "angular-cli",
      resolve(root, "apps/angular-cli-example/dist/browser/index.html"),
    ),
  ]),
);

const scriptTag = Object.fromEntries(
  await Promise.all(
    scriptEntries.sort().map(async (entry) => {
      const name = entry.match(/ourform-builder\.(.+)\.min\.js$/)?.[1];
      if (!name)
        throw new Error(`Could not identify script-tag theme for ${entry}`);
      return [name, await closure([entry])];
    }),
  ),
);

const report = {
  generatedAt: new Date().toISOString(),
  method: {
    compression: "node:zlib Brotli defaults",
    closure:
      "production HTML entry plus static imports/modulepreloads; dynamic imports excluded until activated; every shared file counted once",
    note: "Framework consumer totals include host/framework code. ADR-0018 gates remain the canonical builder-owned and full minimal-consumer measurements from builder-size-gate.mjs.",
  },
  consumers,
  scriptTag,
};

const json = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--write")) {
  await writeFile(
    resolve(root, "docs/reviews/m09b-plus-consumer-sizes.json"),
    json,
  );
}
console.log(json);
