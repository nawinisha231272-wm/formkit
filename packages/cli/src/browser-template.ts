export const playwrightImage =
  "mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a";

export function browserFiles(
  name: string,
  sdkKit: string | undefined,
  authoredTheme = false,
): Record<string, string> {
  return {
    ".nvmrc": "22.22.3\n",
    ".npmrc": "engine-strict=true\n",
    "index.html": `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Component author preview</title></head>
<body><main><h1>Component author preview</h1>
<label>Theme <select id="theme"><option>base</option><option>bootstrap4</option><option>bootstrap5</option><option>tailwind</option></select></label>
<h2>State fixture</h2><label><input type="checkbox" id="required" checked>Required</label><label><input type="checkbox" id="disabled">Disabled</label><label><input type="checkbox" id="read-only">Read only</label>
<div id="fixture"></div><button id="submit">Submit fixture</button><button id="reset">Reset fixture</button><pre id="result" aria-live="polite"></pre>
<h2>Mini builder</h2><div id="builder"></div></main><script type="module" src="/preview.ts"></script></body></html>\n`,
    "preview.ts": `import { field${authoredTheme ? ", theme as authoredTheme" : ""} } from "./src/index";
${authoredTheme ? 'import {bootstrap4Theme} from "@ourform/theme-bootstrap4";\nimport {bootstrap5Theme} from "@ourform/theme-bootstrap5";\nimport {tailwindTheme} from "@ourform/theme-tailwind";' : ""}
import { renderComponent, mountComponentBuilder } from "@ourform/testing";
import type { RenderComponentOptions } from "@ourform/testing";
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const host = element("fixture");
const theme = element<HTMLSelectElement>("theme");
${authoredTheme ? 'const option = document.createElement("option"); option.value = authoredTheme.name; option.textContent = authoredTheme.name; theme.append(option);\nconst themes = [bootstrap4Theme,bootstrap5Theme,tailwindTheme,authoredTheme];' : ""}
let fixture: ReturnType<typeof renderComponent>;
let mini: ReturnType<typeof mountComponentBuilder>;
function render() {
  fixture?.destroy(); mini?.destroy();
  const options = {
    host, theme: theme.value, ${authoredTheme ? "themes," : ""} readOnly: element<HTMLInputElement>("read-only").checked,
    node: {label: "Sample", validation: {required: element<HTMLInputElement>("required").checked},
      disabledWhen: element<HTMLInputElement>("disabled").checked ? ["eq", 1, 1] : ["eq", 1, 0]},
  } satisfies RenderComponentOptions;
  fixture = renderComponent(field, options);
  mini = mountComponentBuilder(field, {host: element("builder"), theme: theme.value${authoredTheme ? ", themes" : ""}});
}
for (const id of ["theme", "required", "disabled", "read-only"]) element(id).addEventListener("change", render);
element("submit").addEventListener("click", async () => { element("result").textContent = JSON.stringify(await fixture.submit()); });
element("reset").addEventListener("click", () => { fixture.reset(); element("result").textContent = ""; });
render();
window.authorHarness = {get fixture() {return fixture;}, get mini() {return mini;}};
window.addEventListener("pagehide", () => {fixture.destroy(); mini.destroy();});
declare global {interface Window {authorHarness: {readonly fixture: typeof fixture; readonly mini: typeof mini}}}
`,
    "vitest.config.ts": `import { defineConfig } from "vitest/config";
export default defineConfig({test: {include: ["tests/**/*.test.ts"]}});\n`,
    "playwright.config.ts": `import { defineConfig, devices } from "@playwright/test";
import { platform, arch } from "node:os";
export default defineConfig({
  testDir: "./browser", workers: 1, reporter: "list",
  snapshotPathTemplate: \`{testDir}/__screenshots__/\${platform()}-\${arch()}/{projectName}/{arg}{ext}\`,
  use: {baseURL: "http://127.0.0.1:4175"},
  projects: [{name: "chromium", use: devices["Desktop Chrome"]}, {name: "firefox", use: devices["Desktop Firefox"]}, {name: "webkit", use: devices["Desktop Safari"]}],
  webServer: {command: "pnpm dev", url: "http://127.0.0.1:4175", reuseExistingServer: false},
});\n`,
    "browser/component.spec.ts": `import {test, expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {existsSync} from "node:fs";
import {checkPropertyEditors} from "@ourform/testing/playwright";
import type {} from "../preview";
for (const theme of ["base", "bootstrap4", "bootstrap5", "tailwind"]) {
  test(\`sample: \${theme} values, state, a11y and visual evidence\`, async ({page}, info) => {
    await page.goto("/"); await page.locator("#theme").selectOption(theme);
    const input = page.locator("#fixture input");
    await page.locator("#submit").click(); await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleName("Sample");
    await expect(input).toHaveAccessibleDescription("Sample is required");
    const violations = (await new AxeBuilder({page}).analyze()).violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""));
    expect(violations).toEqual([]);
    const snapshot = \`sample-\${theme}.png\`;
    if (info.config.updateSnapshots === "all" || existsSync(info.snapshotPath(snapshot)))
      await expect(page.locator("#fixture")).toHaveScreenshot(snapshot, {animations: "disabled", maxDiffPixelRatio: 0.02});
    else {
      await info.attach(\`UNAPPROVED-\${snapshot}\`, {body: await page.locator("#fixture").screenshot(), contentType: "image/png"});
      console.log("visual baseline missing: evidence captured, comparison pending explicit record/review");
    }
    await input.fill("hello"); await page.locator("#submit").click();
    await expect(page.locator("#result")).toContainText('"ok":true');
    await page.locator("#reset").click(); await expect(input).toHaveValue("");
    for (const toggle of ["read-only", "disabled"]) {
      await page.locator(\`#\${toggle}\`).check();
      await page.evaluate(() => window.authorHarness.fixture.session.setValue("value", "stored"));
      await input.evaluate(el => {const control = el as HTMLInputElement; control.value = "blocked"; control.dispatchEvent(new Event("input", {bubbles: true}));});
      await expect(input).toHaveValue("stored");
      expect(await page.evaluate(() => window.authorHarness.fixture.session.getValue("value"))).toBe("stored");
      await page.locator(\`#\${toggle}\`).uncheck();
    }
  });
}
${authoredTheme ? `test("authored theme is registered in the actual preview", async ({page}) => {await page.goto("/"); await page.locator("#theme").selectOption("${name}"); await expect(page.locator("#fixture")).toHaveAttribute("data-of-theme","${name}"); await expect(page.locator("#fixture input")).toHaveClass(/${name}-control/);});` : ""}
test("every generated property editor changes the preview", async ({page}) => {
  await page.goto("/"); await page.locator('#builder [data-component-type="${name}"]').click();
  await checkPropertyEditors(page, [
    {key: "placeholder", value: "Your note", verify: async preview => {await expect(preview.locator("input")).toHaveAttribute("placeholder", "Your note");}},
    {key: "maxLength", value: 12, verify: async preview => {await expect(preview.locator("input")).toHaveAttribute("maxlength", "12");}},
    {key: "showCount", value: false, verify: async preview => {await expect(preview.locator("output")).toHaveCount(0);}},
  ]);
});\n`,
    "playwright-container.json":
      JSON.stringify(
        {
          image: playwrightImage,
          node: "22.22.3",
          pnpm: "10.10.0",
          sdkKit: sdkKit ?? null,
        },
        null,
        2,
      ) + "\n",
    "scripts/visuals.mjs": `import {existsSync, readdirSync, mkdirSync, readFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {platform, arch} from "node:os";
import {spawnSync} from "node:child_process";
const mode = process.argv[2];
const linux = process.argv.includes("--linux");
if (!["record", "check"].includes(mode)) throw new Error("Use record or check");
const folder = join("browser", "__screenshots__", linux ? "linux-x64" : platform()+"-"+arch());
const hasImages = p => existsSync(p) && readdirSync(p, {withFileTypes:true}).some(f => f.isDirectory() ? hasImages(join(p,f.name)) : f.name.endsWith(".png"));
if (mode === "record" && hasImages(folder)) throw new Error("Refusing to replace existing visual baselines; inspect failures and review replacements explicitly.");
if (mode === "check" && !hasImages(folder)) throw new Error("Visual baselines missing: record and review them first.");
const run = (command, args) => {const result = spawnSync(command,args,{stdio:"inherit"}); if(result.error) throw result.error; if(result.status !== 0) process.exit(result.status ?? 1);};
if (!linux) {
  run("pnpm",["exec","playwright","test",...(mode === "record" ? ["--update-snapshots=all"] : [])]);
  if(mode === "record") run("pnpm",["exec","playwright","test"]);
} else {
  const pin = JSON.parse(readFileSync("playwright-container.json","utf8"));
  mkdirSync(folder,{recursive:true});
  const mounts = ["--mount", "type=bind,source="+process.cwd()+",target=/source,readonly", "--mount", "type=bind,source="+resolve(folder)+",target=/visual-output"];
  if (pin.sdkKit) mounts.push("--mount","type=bind,source="+pin.sdkKit+",target="+pin.sdkKit+",readonly");
  const shell = 'set -eu; mkdir /project; cd /source; tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=test-results --exclude=playwright-report -cf - . | tar -C /project -xf -; cd /project; npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile; npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm build; '+(mode === 'record' ? 'npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test --update-snapshots=all; ' : '')+'npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test; cp -R browser/__screenshots__/linux-x64/. /visual-output/';
  run("docker",["run","--rm","--init","--ipc=host","--platform","linux/amd64",...mounts,"--env","CI=true","--env","PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1",pin.image,"/bin/bash","-c",shell]);
}
`,
  };
}
