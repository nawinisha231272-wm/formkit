import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { mount } from "@ourform/renderer-dom";
import type { FormDefinition } from "@ourform/sdk";
const engine = createEngine();
for (const field of builtinComponents) engine.register(field.model);
const views = new Map(
  builtinComponents.map((field) => [field.model.type, field.views]),
);
const root = document.querySelector<HTMLElement>("#form")!;
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
export async function runBenchmark(count: number, samples = 9) {
  if (![100, 500, 1000].includes(count))
    throw new Error("Unsupported field count");
  const definition: FormDefinition = {
    $formVersion: "1.0",
    id: `benchmark-${count}`,
    display: "form",
    settings: { validateOn: "change" },
    components: Array.from({ length: count }, (_, index) => ({
      id: `field-${index}`,
      key: `field${index}`,
      type: "text",
      label: `Field ${index + 1}`,
      ...(index > 0 && index <= 25
        ? {
            calculate: {
              expr: ["concat", { ref: "field-0" }, `-${index}`] as const,
            },
          }
        : {}),
    })),
  };
  const compile: number[] = [],
    mountTimes: number[] = [],
    edit: number[] = [],
    theme: number[] = [];
  let processorRuns = 0;
  for (let sample = -3; sample < samples; sample++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    let start = performance.now();
    const compiled = engine.compile(definition);
    const compileMS = performance.now() - start;
    if (!compiled.ok) throw new Error("Benchmark compile failed");
    const session = engine.createSession(compiled.form);
    start = performance.now();
    const view = mount(root, session, { engine, views });
    void root.offsetHeight;
    const mountMS = performance.now() - start;
    const input = root.querySelector<HTMLInputElement>("input")!;
    input.focus();
    const before = Object.values(session.debug.processorRuns).reduce(
      (a, b) => a + b,
      0,
    );
    start = performance.now();
    for (let index = 0; index < 25; index++) {
      session.setValue("field0", `Edit ${index}`);
      void root.offsetHeight;
    }
    const editMS = performance.now() - start;
    processorRuns =
      Object.values(session.debug.processorRuns).reduce((a, b) => a + b, 0) -
      before;
    start = performance.now();
    view.setMode("dark");
    void root.offsetHeight;
    view.setMode("light");
    void root.offsetHeight;
    const themeMS = performance.now() - start;
    if (
      root.querySelectorAll("input").length !== count ||
      root.querySelector("input") !== input ||
      document.activeElement !== input
    )
      throw new Error("Control identity/count/focus regression");
    view.unmount();
    session.dispose();
    if (root.childNodes.length)
      throw new Error("Benchmark leaked mounted nodes");
    if (sample >= 0) {
      compile.push(compileMS);
      mountTimes.push(mountMS);
      edit.push(editMS);
      theme.push(themeMS);
    }
  }
  return {
    count,
    samples,
    compileMS: median(compile),
    mountMS: median(mountTimes),
    editMS: median(edit),
    themeMS: median(theme),
    processorRuns,
  };
}
window.ourformBenchmark = runBenchmark;
document.querySelector("#run")!.addEventListener("click", async () => {
  const output = document.querySelector("#result")!;
  output.textContent = "Measuring…";
  const result = await runBenchmark(
    Number(document.querySelector<HTMLSelectElement>("#count")!.value),
  );
  output.textContent = JSON.stringify(result, null, 2);
});
declare global {
  interface Window {
    ourformBenchmark: typeof runBenchmark;
  }
}
