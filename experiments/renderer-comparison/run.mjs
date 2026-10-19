import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import ts from "typescript";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { build as bundle } from "esbuild";
const directory = new URL(".", import.meta.url).pathname;
const server = await createServer({
  root: directory,
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => process.stderr.write(e.stack + "\n"));
  await page.goto("http://127.0.0.1:4174");
  await page.waitForFunction(() => typeof window.runComparison === "function");
  const data = await page.evaluate(() => window.runComparison());
  for (const name of ["vnode", "dom"]) {
    const source = await readFile(directory + `${name}-controls.ts`, "utf8");
    const result = await bundle({
      entryPoints: [
        directory + `${name === "vnode" ? "vnode-entry" : "dom-controls"}.ts`,
      ],
      bundle: true,
      minify: true,
      write: false,
      format: "esm",
    });
    const contents = result.outputFiles[0].contents;
    data[name].authoringLines = source
      .split("\n")
      .filter(
        (line) => line.trim() && !/^[{}()[\],;]+$/.test(line.trim()),
      ).length;
    const file = ts.createSourceFile(
      "control.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const meaningful = (text) =>
      text
        .split("\n")
        .filter((line) => line.trim() && !/^[{}()[\],;]+$/.test(line.trim()))
        .length;
    data[name].fieldAuthoringLines = {};
    for (const statement of file.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.name &&
        ["text", "rating"].includes(statement.name.text)
      )
        data[name].fieldAuthoringLines[statement.name.text] = meaningful(
          statement.getText(file),
        );
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (["text", "rating"].includes(declaration.name.getText(file)))
            data[name].fieldAuthoringLines[declaration.name.getText(file)] =
              meaningful(statement.getText(file));
    }
    data[name].bundle = {
      rawBytes: contents.length,
      gzipBytes: gzipSync(contents).length,
      brotliBytes: brotliCompressSync(contents).length,
    };
  }
  const hostSource = await readFile(directory + "main.ts", "utf8");
  const hostFile = ts.createSourceFile(
    "host.ts",
    hostSource,
    ts.ScriptTarget.Latest,
    true,
  );
  data.hostAuthoringLines = {};
  for (const statement of hostFile.statements)
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name &&
      ["PortableHost", "AngularProbe"].includes(statement.name.text)
    )
      data.hostAuthoringLines[statement.name.text] = statement
        .getText(hostFile)
        .split("\n")
        .filter(
          (line) => line.trim() && !/^[{}()[\],;]+$/.test(line.trim()),
        ).length;
  if (data.dom.ssr !== data.vnode.ssr) throw new Error("SSR output differs");
  data.ssrEqual = true;
  data.environment = {
    browser: await browser.version(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    method:
      "12 rounds, 2 warmups, median of 10; 500 mixed Text/Rating; 200 updates on focused Text per round; theme updates all controls and forces layout; host probes include mount/update/input/cleanup",
  };
  await mkdir("docs/measurements", { recursive: true });
  await writeFile(
    "docs/measurements/m02-renderers.json",
    JSON.stringify(data, null, 2) + "\n",
  );
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
} finally {
  await browser.close();
  await server.close();
}
