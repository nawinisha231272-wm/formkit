import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
const destination = process.argv[2];
if (!destination) throw new Error("Usage: pnpm sdk:pack /absolute/path/to/kit");
const packages = [
  "schema",
  "core",
  "sdk",
  "components",
  "builder-core",
  "renderer-dom",
  "theme-base",
  "theme-bootstrap4",
  "theme-bootstrap5",
  "theme-tailwind",
  "theme-material",
  "themes",
  "builder",
  "validation",
  "testing",
];
for (const name of packages)
  if (!existsSync(resolve("packages", name, "dist/index.js")))
    throw new Error(`Build ${name} first with pnpm build.`);
mkdirSync(resolve(destination), { recursive: true });
const pack = promisify(execFile);
// Package directories and tarball names are independent. Bound concurrent pnpm startup/IO;
// await every batch before consumers inspect the complete kit.
for (let offset = 0; offset < packages.length; offset += 3)
  await Promise.all(
    packages
      .slice(offset, offset + 3)
      .map((name) =>
        pack("pnpm", [
          "--dir",
          resolve("packages", name),
          "pack",
          "--pack-destination",
          resolve(destination),
        ]),
      ),
  );
console.log(
  `Packed ${packages.length} SDK packages to ${resolve(destination)}.`,
);
