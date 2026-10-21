import { test, expect } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createScaffold, runCli } from "../src/index";

test("CLI rejects invalid arguments and existing targets without modifying caller files", async () => {
  const root = await mkdtemp(join(tmpdir(), "ourform-cli-errors-"));
  try {
    for (const flag of ["--help", "-h"]) {
      expect(await runCli([flag])).toContain("Usage: ourform");
      // execFileSync throws on nonzero exit; test the executable authors invoke.
      const help = execFileSync(
        process.execPath,
        [resolve("packages/cli/dist/cli.js"), flag],
        { cwd: root, encoding: "utf8" },
      );
      expect(help).toContain("create-component|create-theme|create-plugin");
    }
    expect(await readdir(root)).toEqual([]);
    await expect(runCli([])).rejects.toThrow("Usage");
    await expect(
      runCli(["create-component", "name", "--directory"]),
    ).rejects.toThrow("Usage");
    await expect(
      runCli(["create-component", "name", "--bad", "value"]),
    ).rejects.toThrow("Invalid option");
    await expect(
      runCli([
        "create-component",
        "name",
        "--directory",
        "a",
        "--directory",
        "b",
      ]),
    ).rejects.toThrow("Invalid option");
    await expect(
      createScaffold("component", join(root, "bad"), "../escape"),
    ).rejects.toThrow("lowercase");
    await expect(
      createScaffold("component", join(root, "bad"), "name", {
        localPackages: root,
      }),
    ).rejects.toThrow("missing");
    await expect(createScaffold("component", root, "name")).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
    await runCli([
      "create-component",
      "sample",
      "--directory",
      join(root, "plain"),
    ]);
    const pkg = JSON.parse(
      await readFile(join(root, "plain/package.json"), "utf8"),
    );
    expect(pkg.dependencies["@ourform/sdk"]).toBe("0.0.1");
    expect(pkg.packageManager).toBe("pnpm@10.10.0");
    expect(pkg.engines).toEqual({ node: "22.22.3", pnpm: "10.10.0" });
    expect(await readFile(join(root, "plain/.nvmrc"), "utf8")).toBe(
      "22.22.3\n",
    );
    expect(pkg.scripts.verify).toContain("pnpm test:browser");
    expect(pkg.scripts.builder).toContain("--open");
    const pin = JSON.parse(
      await readFile(join(root, "plain/playwright-container.json"), "utf8"),
    );
    expect(pin.image).toBe(
      JSON.parse(await readFile("scripts/playwright-container.json", "utf8"))
        .image,
    );
    await expect(
      runCli(["create-theme", "sample", "--directory", join(root, "plain")]),
    ).rejects.toThrow();
    expect(
      JSON.parse(await readFile(join(root, "plain/package.json"), "utf8")),
    ).toEqual(pkg);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("all three unedited CLI scaffolds install from packed workspace packages and pass pinned verify", async () => {
  const root = await mkdtemp(join(tmpdir(), "ourform-cli-proof-"));
  const kit = join(root, "kit");
  const run = (args: string[], cwd = resolve(".")) => {
    try {
      return execFileSync("pnpm", args, {
        cwd,
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 5 * 1024 * 1024,
        // Initial dependency resolution may use the registry; the explicit offline
        // install below must succeed after removing node_modules. npx --offline
        // pins the test runner and must not disable this documented setup step.
        env: { ...process.env, CI: "true", npm_config_offline: "false" },
      });
    } catch (error) {
      if (error instanceof Error && "stdout" in error)
        throw new Error(`${error.message}\n${String(error.stdout)}`);
      throw error;
    }
  };
  try {
    run(["sdk:pack", kit]);
    for (const kind of ["component", "theme", "plugin"] as const) {
      const directory = join(root, kind);
      // Exercise the built executable users receive, not only the in-process generator.
      execFileSync(
        process.execPath,
        [
          resolve("packages/cli/dist/cli.js"),
          `create-${kind}`,
          `sample-${kind}`,
          "--directory",
          directory,
          "--local-packages",
          kit,
        ],
        { encoding: "utf8" },
      );
      const cache = join(root, "registry-cache");
      // A frozen workspace install caches contents but need not cache registry
      // metadata for a new project's first resolution. Exercise the documented
      // initial install with a fresh metadata cache, then prove frozen/offline use.
      run(["install", "--prefer-offline", "--cache-dir", cache], directory);
      await rm(join(directory, "node_modules"), {
        recursive: true,
        force: true,
      });
      run(
        ["install", "--offline", "--frozen-lockfile", "--cache-dir", cache],
        directory,
      );
      const result = run(["verify"], directory);
      expect(result).toContain("1 passed");
      expect(result).toContain("generated builder palette/undo/redo");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 180000);
