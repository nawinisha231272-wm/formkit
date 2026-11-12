import { build } from "esbuild";
import { brotliCompressSync } from "node:zlib";

export const logicConsumerLimits = Object.freeze({
  mainNoLogic: 28_232,
  noLogic: 28_897,
  increment: 6_000,
  noLogicFull: 68_500,
});

export async function measureLogicConsumers(resolveDir = process.cwd()) {
  const probe = async (enabled) => {
    // Same runnable form fixture as the owner-reviewed prototype and immutable main.
    const source = `import {createEngine} from '@ourform/core';
import {createFormController} from '@ourform/renderer-dom';
import {builtinComponents} from '@ourform/components';
import {bootstrap5Theme} from '@ourform/themes/bootstrap5';
${enabled ? "import {createLogic} from '@ourform/core/logic';" : ""}
export function create(root, schema, data) {
 const engine=createEngine(${enabled ? "{logic:createLogic()}" : ""});
 return createFormController(root,{schema,data,engine,fields:builtinComponents,themes:[bootstrap5Theme],theme:'bootstrap5'});
}`;
    const result = await build({
      stdin: { contents: source, resolveDir, sourcefile: "form-consumer.js" },
      bundle: true,
      format: "esm",
      target: "es2022",
      minify: true,
      write: false,
      outdir: "/tmp/ourform-logic-form",
      metafile: true,
    });
    const files = result.outputFiles.map((file) => ({
      file: file.path.split("/").at(-1),
      raw: file.contents.length,
      brotli: brotliCompressSync(file.contents).length,
    }));
    return {
      source,
      files,
      brotli: files.reduce((total, file) => total + file.brotli, 0),
      inputs: Object.keys(result.metafile.inputs),
      includesLogicBody: Object.keys(result.metafile.inputs).some((file) =>
        file.endsWith("core/dist/logic/index.js"),
      ),
      includesRuleMetaSchema: result.outputFiles.some((file) =>
        file.text.includes("#/$defs/logicRule"),
      ),
    };
  };
  const noLogic = await probe(false);
  const enabled = await probe(true);
  return {
    method:
      "Matched production form consumers, esbuild 0.25.12 + Node Brotli; shared files once",
    baselineSHA: "cd6d0b679027da328da9f5e4f63480437d6c765b",
    limits: logicConsumerLimits,
    noLogic,
    enabled,
    noLogicDelta: noLogic.brotli - logicConsumerLimits.mainNoLogic,
    increment: enabled.brotli - noLogic.brotli,
  };
}

export function checkLogicConsumers(report) {
  const failures = [];
  if (report.noLogic.brotli > logicConsumerLimits.noLogic)
    failures.push(
      `matched no-logic form: ${report.noLogic.brotli} > ${logicConsumerLimits.noLogic}`,
    );
  if (report.noLogic.brotli > logicConsumerLimits.noLogicFull)
    failures.push(
      `no-logic full: ${report.noLogic.brotli} > ${logicConsumerLimits.noLogicFull}`,
    );
  if (report.increment > logicConsumerLimits.increment)
    failures.push(
      `opt-in logic increment: ${report.increment} > ${logicConsumerLimits.increment}`,
    );
  if (report.noLogic.includesLogicBody || report.noLogic.includesRuleMetaSchema)
    failures.push("no-logic form includes rule execution or wire meta-schema");
  if (
    !report.enabled.includesLogicBody ||
    !report.enabled.includesRuleMetaSchema
  )
    failures.push("enabled form is missing rule execution or wire validation");
  return failures;
}
