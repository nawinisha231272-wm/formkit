import { execFileSync } from "node:child_process";
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
  "validation",
  "testing",
];
for (const name of packages)
  if (!existsSync(resolve("packages", name, "dist/index.js")))
    throw new Error(`Build ${name} first with pnpm build.`);
mkdirSync(resolve(destination), { recursive: true });
for (const name of packages)
  execFileSync(
    "pnpm",
    [
      "--dir",
      resolve("packages", name),
      "pack",
      "--pack-destination",
      resolve(destination),
    ],
    { stdio: "pipe" },
  );
console.log(
  `Packed ${packages.length} SDK packages to ${resolve(destination)}.`,
);
