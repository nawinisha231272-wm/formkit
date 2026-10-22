# @ourform/cli

`ourform create-component|create-theme|create-plugin name [--directory path] [--local-packages kit]`
generates a standalone project with exact Node/pnpm/TypeScript/tsup/Vitest pins, bundler overrides,
strict types and `pnpm verify`. It never installs or calls a network service and refuses existing
directories. A theme includes a preview field; a plugin packages its sample field. Generated tests
prove canonical values, required validation and generated builder palette/edit/undo/redo plus SSR control ARIA.

Public Node helpers: `createScaffold(kind,directory,name,options?)` and `runCli(args)` return the output
path asynchronously; programmer/IO failures throw. Types: ScaffoldKind and ScaffoldOptions.
After generation run `pnpm install`, commit the lockfile, then use frozen installs. Published mode
requires the matching OurForm 0.0.1 packages. Before publication:

```sh
pnpm build
pnpm sdk:pack /tmp/ourform-sdk-kit
node packages/cli/dist/cli.js create-component acme-note --directory /tmp/acme-note --local-packages /tmp/ourform-sdk-kit
cd /tmp/acme-note
pnpm install
pnpm verify
```

The root scaffold integration test executes the built CLI for all three kinds, installs from packed
public packages with a fresh metadata cache, then removes node_modules and proves a frozen/offline
reinstall before running each unedited project's verification. The initial dependency resolution
uses the registry, like the documented pnpm install; no pre-existing metadata cache is assumed. Browser conformance and visual
checks in all five themes remain required before a customer component ships. See the author guides
in apps/docs and ADR-0003.

Scaffolds also include .nvmrc, exact Node/pnpm engines with engine-strict, a Vite preview,
Playwright/axe in all five themes/three browsers, and `pnpm builder` to open the registered mini builder.
`pnpm verify` includes browser tests. The sample asserts every custom property editor's observable
preview effect. Missing visual baselines are captured as explicitly unapproved evidence; explicit
`pnpm visual:record` / `pnpm visual:linux:record` record only fresh platform folders and then compare.
The Linux image reference/digest and pins are in the generated playwright-container.json. Existing
images are never automatically replaced. Install browsers once via the pinned Playwright command in
the complete component author guide; initial dependency setup uses the registry before frozen installs.

`ourform --help` and `ourform -h` print usage and exit 0 without creating a scaffold or making network
calls. runCli(["--help"]) returns the same usage text. Missing/invalid generation arguments still fail.
