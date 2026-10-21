# OurForm — Form SDK Engineering Prototype

**Status:** experimental proof, NOT a production release. Name and npm namespace are placeholders. It is self-hosted, without a server or network-based licensing check.

## Building this project (start here)

This kit now carries the full build specification:

- `AGENTS.md` — rules for anyone (human or coding agent) changing this repo. Codex reads it automatically.
- `docs/spec/` — normative contracts (architecture, form definition, runtime, expressions, SDK, rendering/themes, adapters, builder, licensing, standards).
- `docs/milestones/M00.md` … `M12.md` — the development plan with tasks and acceptance criteria; M10 is split into M10a (data structures) and M10b (advanced inputs).
- `docs/progress.md` — the running log of what is done.
- `docs/codex-prompts.md` — prompts to drive OpenAI Codex milestone by milestone.

M08 is approved. **M09 — Builder with nested drag and drop** implements the separately merged plan
amendment. Open `/builder.html?fixture` in the playground to explore Tabs > Panel > Columns > field;
each host example also has `/builder.html`. See `docs/progress.md` for verification status.

## Run

Use Node.js 22.22.3 (the verification runtime) or a supported Angular 22 Node version (24.15+) and pnpm 10.10.0. If pnpm is unavailable, use `npx pnpm@10.10.0` in place of `pnpm`.

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
- Shared browser/Node validation, submission JSON Schema, cancellable custom/async rules and localization.
- Public custom `defineField` API and `stringProperty`/`numberProperty`/`booleanProperty` helpers.
- Text, Number, Checkbox and nullable Rating controls, typed metadata and generated property editors.
- Tier 1 Textarea, Email, Password, Radio, Select, Hidden, safe Content and action Button controls.
- A measured VNode renderer with in-place keyed updates, cleanup, composition handling and static SSR.
- Headless command builder with undo/redo, JSON Patch, discovered palette and generated property panels.
- Accessible field/group/inline/cell/none shells, focus navigation, submit error summary and one live region.
- Four compiled themes (base, Bootstrap 4, Bootstrap 5, Tailwind), isolated per form, with dark/high-contrast/RTL support.
- A development theme conformance kit with reusable Playwright/axe assertions and PNG baselines.
- Native field descriptors, vanilla/Web Component, React 19 portal and Angular 22/21 DI/CVA adapters.
- Client-only Vite demo; Node fixtures/security tests plus Playwright/axe checks in three browsers.

## Deliberately NOT implemented

- Production builder canvas and drag-drop (M05 includes basic command undo/redo).
- SSR hydration and React 18 compatibility.
- Repeaters, plugins and composites (async/custom validation and submission JSON Schema arrived in M06).
- Multi-value controls, grid/wizard semantics and exhaustive real OS IME conformance.
- Commercial licensing and distribution.

Phase 0 remains experimental. DOM shells, keyed control lifecycle, static SSR and automated accessibility
checks are implemented. Framework adapters now have cross-host conformance coverage. The mini builder is available at /builder.html. The user authorized Phase 1 after the Phase 0 gate report.

## Next development gates

1. M07 closes with the Phase 1 runtime gate report and human review.
2. Later milestones add advanced data/controls, the full builder, packaging and production readiness.

## Commercial constraints retained

- Customer hosts its own app and owns form data; no service operated by us is required to render or validate in the browser.
- Optional backend-side validation is customer-run, using @ourform/validation or generated JSON Schema for static constraints.
- Pricing, OEM redistribution, watermark scope, and paid/open runtime model are deferred commercial decisions; they do not block the architecture experiment.

## Host adapter examples (M04)

Build once with pnpm build, then run any example:

```bash
pnpm --filter @ourform/vanilla-example dev    # http://127.0.0.1:4181
pnpm --filter @ourform/react-example dev      # http://127.0.0.1:4182
pnpm --filter @ourform/angular-example dev    # http://127.0.0.1:4183 (Angular 22)
pnpm --filter @ourform/angular21-example dev  # http://127.0.0.1:4184 (Angular 21)
```

All four use one native-field fixture with id/object EmployeeLookup variants. The Angular examples use
JIT for their Vite bootstrap; the library itself is built by ng-packagr for production Angular linking.
The root TypeScript 6 toolchain supports Angular 22; the Angular 21 compatibility app checks with 5.9.3.
On a machine with a different Node version, prefix commands with
`npx --yes --package=node@22.22.3 --package=pnpm@10.10.0` (for example, append `pnpm verify`).

## Mini builder and themes (M05)

Open [the mini builder](http://127.0.0.1:4173/builder.html) after pnpm dev. Add fields from the
registry palette, select a list entry, edit generated properties, undo/redo and submit the live preview.
Rating and the existing native EmployeeLookup require no component-specific builder UI. JSON and
RFC 6902 patches are visible. Schema edits preserve preview data but rebuild transient session state.
Theme changes preserve session, focus/caret and data.

Choose Base, Bootstrap 4, Bootstrap 5 or Tailwind. Both Bootstrap presets ship compiled fallback CSS;
optional real framework CSS is checked separately at versions 4.6.2 and 5.3.8. No framework JavaScript
or CDN is required. The legacy bootstrap alias still means Bootstrap 5.

Offline build proof on macOS (after dependency/toolchain installation): sh scripts/verify-offline.sh.
It denies all network operations and forces every build. Browser tests separately exercise offline
editing, native controls, validation and submission. See ADR-0007 for boundaries and the gate report.

## Validation and Tier 1 fields (M06)

Open [the Tier 1 demo](http://127.0.0.1:4173/tier1.html) for Text/Textarea/Number/Email/Password/Checkbox/
Radio/Select/Hidden/Content/Button. Choose DOM, React or Angular and any of the four themes. Try
`taken@example.com` for the host-provided async rule, and the Spanish link for localization fallback.
The page displays submission JSON Schema and performs no backend request.

@ourform/validation offers customer Node validation with the same rules as the browser. It rejects
malformed/coerced/extra data and awaits custom validators. Schemas assert static rules and annotate
runtime conditions/custom validators. Content uses a bounded allow-list of safe VNodes instead of raw
HTML. See ADR-0008 and package READMEs for exact API/serialization/annotation boundaries.

## Layouts and production foundation (M07)

Open [customer onboarding](http://127.0.0.1:4173/onboarding.html) for 40 fields, Panel/Columns/Fieldset/
Container, nested data, all four themes, static server HTML and a fresh interactive client mount. Each
host example also supports `?onboarding`, `&uncontrolled`, and `&readonly`. Bootstrap 4 and 5 remain
independent choices. Public reset clears the summary and touched state. Web Components accept observed
schema/data JSON plus theme/read-only attributes; invalid attributes emit of-error.

After pnpm build, `pnpm --filter @ourform/benchmarks dev` opens the 100/500/1,000-field performance app
on port 4190. `pnpm benchmark:counts` hard-gates deterministic processor, DOM and render work for
100/500/1,000 fields and onboarding, and is part of `pnpm verify`. Run `pnpm benchmark:check` separately
for advisory timings. PR A/B ratios run alone on one runner; nightly main alerts after three consecutive
nights more than 20% over Linux baseline. See ADR-0010 and docs/performance.

## Repository housekeeping before M08

The nine original starter findings and evidence are in docs/starter-kit-review.md. The user decided
validateSubmission supports unknownKeys reject/strip (default reject), and Bootstrap 4 remains fully
supported for 1.0. Every new component must pass conformance and visuals in all four shipped themes.

Visual snapshots select darwin-arm64/linux-x64 directories. Generate/check Linux visuals using
`sh scripts/linux-visuals.sh record` / `check` in the pinned official Playwright container. All existing
Mac/Linux timing baselines and failed-run evidence are preserved. The 20% wall-clock PR hard gate is
superseded by the deterministic gate; timing remains observable through paired and nightly reports.
See docs/progress.md for decisions and provenance.
