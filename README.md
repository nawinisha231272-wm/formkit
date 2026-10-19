# OurForm — Phase 0 Engineering Spike

**Status:** experimental proof, NOT a production release. Name and npm namespace are placeholders. It is self-hosted, without a server or network-based licensing check.

## Building this project (start here)

This kit now carries the full build specification:

- `AGENTS.md` — rules for anyone (human or coding agent) changing this repo. Codex reads it automatically.
- `docs/spec/` — normative contracts (architecture, form definition, runtime, expressions, SDK, rendering/themes, adapters, builder, licensing, standards).
- `docs/milestones/M00.md` … `M12.md` — the development plan, one milestone per file, with tasks and acceptance criteria.
- `docs/progress.md` — the running log of what is done.
- `docs/codex-prompts.md` — prompts to drive OpenAI Codex milestone by milestone.

Current development milestone: **M00 — Workspace foundation**. See `docs/progress.md` for verification status.

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

The playground demonstrates Text, Rating, theme presets and generated property editors.
Package source lives in `packages/*`; shared forms in `fixtures/forms`; CI in `.github/workflows`.

## Implemented

- Headless engine-scoped component registry and flat form session, independent of the DOM.
- Simple serializable JSON form definitions with stable IDs and keys.
- Value normalization, required validation, subscriptions, duplicate-registration checks.
- Public custom `defineField` API and `stringProperty`/`numberProperty`/`booleanProperty` helpers.
- Text field and Rating field examples, with no inheritance or separate edit form.
- Automatic editable builder property model generated from definitions.
- Basic DOM renderer with FieldShell-style label/description/error and three cosmetic theme presets.
- Client-only demo and three passing Node tests.

## Deliberately NOT implemented

- Production builder canvas, drag-drop, undo/redo.
- Angular/React component bridges, Web Component wrapper, SSR.
- Nested containers, repeaters, expression AST, dependency tracking, async validation, server-side schema generation.
- Full accessible focus management, ARIA invalid/error wiring, multi-value semantics, IME conformance.
- Complete Bootstrap or Tailwind compatible theme packages (demo presets only).
- Renderer implementation comparison (VNode vs DOM).
- Commercial licensing and distribution.

Do not label Phase 0 passed. The current DOM renderer avoids replacing focused controls, but still needs a robust reconciliation lifecycle and proper accessibility tests. This is scaffolding for the Phase-0 experiments, not the final implementation.

## Next development gates

1. Define full SDK value/control contract, including focus, blur, composition, shell variants and multi-value adapters.
2. React-native bridge for existing `EmployeeLookup` and equivalent Angular bridge.
3. Alternate tiny VNode renderer proof and score against DOM runtime.
4. Builder property metadata generator with type-safe config validation, stable schema mutation commands.
5. Accessibility and cross-framework conformance suite; then decide whether to continue this implementation or replace it.

## Commercial constraints retained

- Customer hosts its own app and owns form data; no service operated by us is required to render or validate in the browser.
- Optional backend-side validation is customer-run, using our core or standard JSON Schema when added.
- Pricing, OEM redistribution, watermark scope, and paid/open runtime model are deferred commercial decisions; they do not block the architecture experiment.
