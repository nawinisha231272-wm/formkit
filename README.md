# OurForm — Phase 0 Engineering Spike

**Status:** experimental proof, NOT a production release. Name and npm namespace are placeholders. It is self-hosted, without a server or network-based licensing check.

## Building this project (start here)

This kit now carries the full build specification:

- `AGENTS.md` — rules for anyone (human or coding agent) changing this repo. Codex reads it automatically.
- `docs/spec/` — normative contracts (architecture, form definition, runtime, expressions, SDK, rendering/themes, adapters, builder, licensing, standards).
- `docs/milestones/M00.md` … `M12.md` — the development plan, one milestone per file, with tasks and acceptance criteria.
- `docs/progress.md` — the running log of what is done.
- `docs/codex-prompts.md` — prompts to drive OpenAI Codex milestone by milestone.

Current development milestone: **M03 — FieldShell, accessibility and themes**. See `docs/progress.md` for verification status.

## Run

Use Node.js 22+ and pnpm 10.10.0. If pnpm is unavailable, use `npx pnpm@10.10.0` in place of `pnpm`.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm verify
pnpm dev
```

Open http://127.0.0.1:4173. Development builds packages before starting Vite; restart after editing a package.

Commands: `pnpm build` (Turbo + tsup/Vite), `pnpm typecheck`, `pnpm lint`, `pnpm format`,
`pnpm test` (Vitest + core coverage), `pnpm test:e2e` (three browsers + axe), `pnpm size`,
and `pnpm changeset`. `pnpm verify` runs every required check. Tool versions are pinned locally.

The playground demonstrates Text, Rating, theme presets and generated property editors. Use its SDK link (`/?sdk`) to add Number and Checkbox. ADR-0002 records the renderer measurements.
Package source lives in `packages/*`; shared forms in `fixtures/forms`; CI in `.github/workflows`.

## Implemented

- Headless per-engine registry, safe compiler, indexed nested object paths and immutable session snapshots.
- Versioned JSON definitions, Draft 2020-12 meta-schema, diagnostic validation and migration harness.
- Bounded expression ASTs, dependency graphs, cycle diagnostics and affected-field change processing.
- Per-field state, value normalization, built-in validation, Promise-based submission, reset and disposal.
- Public custom `defineField` API and `stringProperty`/`numberProperty`/`booleanProperty` helpers.
- Text, Number, Checkbox and nullable Rating controls, typed metadata and generated property editors.
- A measured VNode renderer with in-place keyed updates, cleanup, composition handling and static SSR.
- Automatic editable builder property model generated from definitions.
- Accessible field/group/inline/cell/none shells, focus navigation, submit error summary and one live region.
- Three compiled themes (base, Bootstrap 5, Tailwind), isolated per form, with dark/high-contrast/RTL support.
- A development theme conformance kit with reusable Playwright/axe assertions and PNG baselines.
- Client-only Vite demo; Node fixtures/security tests plus Playwright/axe checks in three browsers.

## Deliberately NOT implemented

- Production builder canvas, drag-drop, undo/redo.
- Angular/React native component bridges, Web Component wrapper and SSR hydration.
- Repeaters, async/custom validation, plugins, composites and submission JSON Schema generation.
- Multi-value controls, grid/wizard semantics and exhaustive real OS IME conformance.
- Native adapter APIs (M04).
- Commercial licensing and distribution.

Phase 0 remains experimental. DOM shells, keyed control lifecycle, static SSR and automated accessibility
checks are implemented. Framework-native adapters and the mini-builder/gate review remain ahead.

## Next development gates

1. M04: native component registration and Web Component, React and Angular host adapters.
2. M05: mini builder and human review of the Phase 0 architecture proof.
3. Later milestones add runtime/validation, full builder, packaging and production readiness.

## Commercial constraints retained

- Customer hosts its own app and owns form data; no service operated by us is required to render or validate in the browser.
- Optional backend-side validation is customer-run, using our core or standard JSON Schema when added.
- Pricing, OEM redistribution, watermark scope, and paid/open runtime model are deferred commercial decisions; they do not block the architecture experiment.
