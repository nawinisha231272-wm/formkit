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

The root scaffold integration test executes the built CLI for all three kinds, installs offline from
packed public packages and runs each unedited project's verification. Browser conformance and visual
checks in all four themes remain required before a customer component ships. See the author guides
in apps/docs and ADR-0003.
