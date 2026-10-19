# Progress log

Maintained by whoever builds a milestone (human or agent). Newest entry at the top.
For each milestone: plan, what was built, acceptance criteria with PASS/FAIL + evidence,
deviations from spec, open questions.

## Current state

- Starting point: `ourform-phase0` starter kit (5 packages, relative imports, 3 Node tests passing
  with TypeScript 5.8). See the "Starter kit review" in the build specification for the nine known issues.
- **M00 complete** — clean installation and full verification pass.
- **M01 complete** — frozen install and full verification pass.
- **M02 complete** — frozen install and full verification pass (documented starter-test exception below).
- Next milestone: **M03 — FieldShell, accessibility and themes**.

## Open questions

_None yet. Add questions here instead of guessing at a contract._

## Log

M00 completed on `m00-workspace`; M01 builds directly on that verified commit.

## M00 plan — 2026-10-19

1. Separate schema, headless models and SDK views; preserve starter behavior.
2. Add pinned pnpm, Turbo, strict package builds, boundaries and tests.
3. Move playground to Vite; add fixture, browser smoke checks and CI.
4. Verify from a clean install and record evidence.

Risks: starter renderer accessibility and required Rating remain later-milestone work. The referenced nine-issue review is absent from the supplied kit.

## M00 — Workspace foundation

Implemented six ESM packages with exports and declarations, pnpm 10.10.0 lockfile, Turbo dependency ordering,
strict TypeScript, tsup, Vitest projects, Playwright/axe, ESLint import boundaries, Prettier, size-limit,
Changesets and GitHub Actions. Playground runs through Vite and shares the feedback fixture with tests.
Core now consumes headless models; SDK definitions pair models with portable views. No external runtime
dependencies were added. Package READMEs and ADR-0001 document the transitional API.

### Acceptance evidence

- PASS — original three behaviors: `tests/starter.test.ts` (registry/defaults/validation/subscriptions,
  duplicate type, duplicate key), all three tests passing.
- PASS — core has no DOM lib or SDK dependency: package tsconfig, `pnpm build`, `pnpm typecheck`.
  Additional headless lifecycle tests run in Node; core line coverage is 100% (required minimum 90%).
- PASS — relative cross-package and forbidden direction imports rejected by ESLint:
  `tests/boundaries.test.ts`, two deliberate probes against the real flat config.
- PASS — Vite smoke flow: Text, Rating, theme data preservation, validation and generated property changes
  pass in Chromium, Firefox and WebKit. axe reports zero serious/critical violations in this flow.
- PASS — all six initial packages are below their ADR-recorded 30 kB Brotli budgets: `pnpm size`.
- PASS — `git check-ignore` confirms root and nested dist, dependencies, coverage, Turbo and test output are ignored.
- PASS — full `pnpm verify` (lint, build, typecheck including tests/configs, six unit tests, three browser cases, size).
- PASS — removed every workspace node_modules/dist/.turbo directory and coverage; `CI=true npx pnpm@10.10.0 install --frozen-lockfile` followed by `npx pnpm@10.10.0 verify` succeeds (six unit tests, 100% core lines, three browser cases, six size budgets). This proves a clean local installation; remote-clone CI has not run yet.

### Deviations and limits

- Added keyboard access to the playground's scrollable JSON/output panels after Firefox axe found a serious violation.
- Vitest uses `projects`, its supported workspace configuration, rather than a deprecated workspace file.
- The shell-provided pnpm wrapper runs a different version; checks use `npx pnpm@10.10.0` and local pinned tools.
- Full renderer accessibility and reconciliation are still M02/M03 work; the smoke scan is not full conformance.
- Required Rating retains the starter's zero-empty behavior until M02 as required by M00's behavior-preservation scope.
- Supplied documentation references a nine-issue review and commercial open decisions that are absent from the archives.
- No milestone beyond M00 has been implemented.
- GitHub connector returns 404; GitHub CLI has no authenticated account. A PR cannot currently be opened.

### Review summary — M00: Workspace foundation

This change replaces global-tool starter setup with a reproducible monorepo and preserves the existing demo.
Use `pnpm install --frozen-lockfile`, install Playwright browsers, then `pnpm verify` and `pnpm dev`.
The acceptance checklist above serves as the PR summary while authenticated GitHub access is unavailable.

## M01 plan — 2026-10-19

1. Add full schema types, JSON meta-schema, safe definition diagnostics and migration harness.
2. Implement indexed compilation, object paths, bounded expressions and dependency ordering.
3. Implement immutable session snapshots, affected-field processing and synchronous built-in rules behind the Promise validation API.
4. Port the existing tests/demo to compilation and per-field state; add 20 shared fixtures and targeted regression/security tests.
5. Run coverage and complete verification, document API semantics and push M01.

Risks/clarifications: M00 is the only remote branch and there is no main branch yet, so M01 starts from its verified commit. Arrays, custom/async validators and plugins remain later milestones; definitions requesting unsupported execution capabilities will receive explicit diagnostics. Expression arity/type semantics and calculation overrides will be recorded in an ADR before implementation.

## M01 — Schema and core engine

### Built

- Full 1.0 definition/expression/validation types, Draft 2020-12 meta-schema, safe JSON checks,
  stable structural/semantic diagnostics and the migration harness.
- Per-engine registry and diagnostic-only compilation, frozen definition/model snapshots,
  object scopes, id/path indexes, topological ordering and strongly connected cycle reports.
- Bounded typed expression evaluation with short-circuiting, registered host functions,
  dependency extraction and strict JSONLogic-subset conversion.
- Copy-on-write session snapshots, per-field state, affected-only processing, timing-aware built-in
  validation, touch/validate/submit/reset/dispose, one StatePatch per mutation and processor counters.
- Twenty new shared fixtures (21 including feedback). Renderer reads FieldState and handles
  patches by id; playground compiles definitions and preserves its working form on invalid edits.
- Package docs, spec implementation notes, ADR-0004 and a changeset. Ajv 8.17.1 is dev-only for
  independent meta-schema checks. No external runtime dependencies were added.

### Acceptance evidence

- PASS — all core/schema tests run in Vitest's `headless` Node project without DOM environment;
  strict package builds/typechecks omit DOM libs for schema/core/builder-core.
- PASS — `one change in the 200-field fixture processes only transitive dependents`:
  only f0/f1/f2 counters change and exactly one patch names those fields/paths.
- PASS — `calculation cycles name all and only actual cycle members` reports both a and b,
  excluding the downstream node; self cycles are also diagnosed.
- PASS — `hidden fields clear, skip validation and restore defaults; preserve opts out` plus
  ancestor-state and explicit-null tests verify hide/reappear behavior.
- PASS — `repository executable sources contain no eval, Function construction or with statements`
  parses executable source ASTs, excluding generated output.
- PASS — `prototype-polluting keys and expression paths are compile diagnostics` covers
  **proto**/constructor/prototype object keys and paths and checks no prototype was modified.
- PASS — final unit run: 83 tests; core line coverage 98.59% (minimum 90%), including standalone
  validation/migration of nested scopes. `pnpm install --frozen-lockfile` also passes.
- PASS — six Playwright cases across Chromium/Firefox/WebKit cover feedback, theme switching,
  generated properties, zero serious/critical axe findings in the smoke flow, and invalid-edit recovery.
- PASS — all six size budgets: schema about 2.79 kB and core about 6.63 kB Brotli, below 30 kB each.
- PASS — `CI=true npx pnpm@10.10.0 verify`: lint/format, builds, typechecks including tests,
  Node unit/security tests, browser tests and sizes, rerun successfully on the final implementation.

### Clarifications and limitations

ADR-0004 records expression arities/type behavior, override expiry, object-only paths, snapshot ownership
and submission consistency. Submitting while later edits occur returns the validated invocation snapshot.
Standalone schema validation defers unknown nested scope semantics to the registry-aware compile pass.
M01 diagnoses unsupported arrays, composites, plugins and custom validators instead of executing them.
Existing tests were ported to compile diagnostics, Promise validation and parsed paths; their original
behavioral assertions remain. A renderer guard prevents blur-triggered reentry during theme redraw.
Full control reconciliation, IME handling, shells and accessibility conformance remain M02/M03.

M00 was the only remote branch and main did not exist, so this branch starts from the M00 commit.
GitHub CLI is unauthenticated and the connector still returns 404 for this repository, so a PR
cannot be opened. Git transport remains available for publishing the milestone branch.
No M02 implementation is included.

### Review summary — M01: Schema and core engine

Form definitions now compile safely before session creation. Sessions update only affected fields,
keep immutable nested data snapshots and expose validation/state independently of rendering.
Use `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`. The checklist above is the
review summary if PR creation remains unavailable.

## M02 plan — 2026-10-19

1. Complete typed metadata, config/default validation, value helpers and shared control props.
2. Build equivalent Text/Rating VNode and DOM-factory spikes; measure 500-field mount/update/theme,
   authoring size, SSR and real React/Angular embedding before selecting a representation.
3. Record ADR-0002 with raw measurements and reproduction instructions; remove the losing spike.
4. Port four controls, add lifecycle/IME/focus/SSR/type/config tests, keep the playground working.
5. Run pnpm verify and publish the M02 branch only.

Clarification: the M01 starter test hard-codes Rating's buggy default of zero. M02 expressly requires null,
so that single expected value must change; core/schema regression tests remain untouched and a required
unset-Rating test will replace the old accidental acceptance with the specified behavior. No M03 shells,
theme packages or M04 adapter APIs will be implemented. React/Angular work is limited to measured probes.

## M02 — SDK contracts and renderer decision

### Built

- Typed FieldControlProps, ConfigOf, consistent string/nullable-number/boolean value helpers,
  seven property helpers and frozen config resolution from shared metadata validation.
- defineField returns a frozen headless model, builder metadata, properties, shell metadata and
  portable view. Group metadata stays separate from control authoring; no handwritten Rating editor.
- Two actual candidate implementations measured in Chromium: 500 mixed Text/Rating controls,
  focused updates, all-control theme switches, source/bundle size, SSR and real React/Angular probes.
  ADR-0002 selects VNodes with the full tradeoff table and reproduction checkpoint `0f00f17`.
  Both comparison spikes are removed from the final working tree; history retains reproducible source.
- Text, Number, Checkbox and nullable Rating use h() controls. Rating supports max/allowHalf metadata
  and required validation fails for unset/null. Its complete definition is 29 meaningful lines.
- Keyed in-place DOM updates, focus/caret retention, current event callbacks, ref/listener cleanup,
  composition buffering, static escaped SSR and per-field patch updates without render-time validation.
- Playground SDK demo (`/?sdk`) adds Number/Checkbox; development host/lifecycle page checks production
  controls inside React 19.2 and Angular 20.3. Those frameworks/compiler and esbuild are dev dependencies
  for probes/measurement. No external runtime dependencies or public native bridge APIs were added.

### Acceptance evidence

- PASS — Rating <30 meaningful lines: `Rating stays under thirty meaningful authoring lines` counts 29;
  ADR-0002 documents the exact counting method and includes metadata/control without hidden Rating helpers.
- PASS — required Rating with no selection: `required unset Rating fails validation and typed metadata drives defaults`.
- PASS — ADR-0002 contains measured mount/update/theme, authoring, React/Angular effort, SSR and bundle results,
  raw samples and a clear selection. Both hosts verify value updates, callback delivery and cleanup.
- PASS — `expectTypeOf<ConfigOf<typeof ratingField.properties>>()` proves `{ max: number; allowHalf: boolean }`.
- PASS — parameterized invalid-property tests cover wrong number/boolean kinds, min/max bounds and unknown keys;
  all metadata helper kinds/defaults/override copying are also checked.
- DEVIATION — the literal “all M1 tests unchanged” conflicts with M02's required null-empty Rating fix.
  `git diff 378e063 -- packages/core/tests packages/schema/tests` is empty. All 83 existing regression cases
  still pass; the sole starter default assertion changes zero to null. A new required-unset test verifies
  the corrected contract. No test was skipped/deleted or weakened to preserve the old bug.
- PASS — `CI=true npx pnpm@10.10.0 verify`: strict builds/typechecks, lint/format, 95 Node unit tests,
  98.59% core line coverage, 27 browser cases across Chromium/Firefox/WebKit, all six size budgets.
- PASS — browser cases prove stable focused/unrelated controls, caret-preserving themes/keyed reorder,
  composition input handling, form/control cleanup, real host mounting and zero serious/critical axe
  findings in both feedback and the four-control probe. Rendering never calls session.validate().
- PASS — size-limit: schema 3.04 kB, core 6.63 kB, SDK 2.25 kB, components 828 B,
  renderer-dom 3.21 kB, builder-core 459 B Brotli (30 kB budget each).

### Decisions and limitations

ADR-0002 records the representation and the original microbenchmark's scope/limits. DOM factories had
faster isolated props updates/SSR; VNodes reduced author code and theme work with comparable mount cost.
The production patcher adds safety/lifecycle handling beyond the measured minimal spikes; final sizes
are recorded above. Framework single-run cold/warm timings are descriptive and are not scored.

The four-control axe scan exposed aria-required=true on a group role. controlAttributes' group mode now
omits the unsupported attribute, keeping required in control state/core validation. Full required
announcements, group/inline/cell shells, keyboard conformance and real theme packages remain M03.
Synthetic composition events pass in all browsers; this is not a claim of exhaustive real OS IME coverage.

M02 starts from the verified M01 branch because the repository still has no main branch. PR creation
remains unavailable through the unauthenticated GitHub CLI / connector; Git transport publishes the branch.
M03 has not been started.

### Review summary — M02: SDK contracts and renderer decision

Field authors now return typed VNodes, with metadata driving config validation and property editors.
Four controls share the same contract, update in place and support static SSR. Rating's required bug is fixed.
Run `pnpm install --frozen-lockfile`, `pnpm verify`, then `pnpm dev`; use the SDK demo link for all controls.
The acceptance checklist above is the review summary if an authenticated PR cannot be created.
