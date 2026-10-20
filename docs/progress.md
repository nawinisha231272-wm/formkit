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
- **M03–M07 complete** — local evidence is recorded below. M08 is not started.
- `main` includes the reviewed M07 housekeeping bootstrap (PR #1); all milestone branches and
  m00-done…m07-done tags are preserved at their original heads.
- Current work: Linux CI calibration on `ci-linux-baseline`; M08 remains unstarted.

## Open questions

1. **validateSubmission unknown-key policy:** proposal `unknownKeys: 'reject' | 'strip'`, default
   `'reject'`. Awaiting the user's answer. Keep the existing rejection behavior; do not implement strip.
2. **Bootstrap 4 theme status for 1.0:** keep / legacy-frozen / remove. Awaiting the user's answer.
   Keep the current theme unchanged until a decision is provided.

## Linux calibration follow-up — 2026-10-20

[Housekeeping PR #1](https://github.com/nawinisha231272-wm/formkit/pull/1) merged only after both
[PR CI](https://github.com/nawinisha231272-wm/formkit/actions/runs/39469856409) and
[push CI](https://github.com/nawinisha231272-wm/formkit/actions/runs/39469846896) were green at cbddf40:
159 unit tests, all 351 browser cases (60 Linux visual comparisons), all 14 size budgets, lint,
build/type checks and benchmark correctness assertions. Both used the pinned official image and
ubuntu-24.04. Pending Linux performance was explicitly record-only and logged
`linux baseline missing: not enforced`; no performance regression verdict was claimed.

Three successful workflow_dispatch runs measured unchanged main commit
`e89eb62176932a9d35f08b484b9ac3fd2d855381` on ubuntu-24.04:

1. https://github.com/nawinisha231272-wm/formkit/actions/runs/39471823710
2. https://github.com/nawinisha231272-wm/formkit/actions/runs/39471831492
3. https://github.com/nawinisha231272-wm/formkit/actions/runs/39471839601

PASS — no intervening code changes on main; every report identifies a clean checkout of that exact
commit and linux-x64/Chromium. The CLI `scripts/aggregate-ci-baseline.mjs` verifies successful main
run metadata and ubuntu-24.04 job labels through the GitHub API. Each run passes full pinned verify,
including all 159 unit tests, 351 browser cases, 60 Linux comparisons and 14 size budgets. The automatic
main push run also passed but is not one of the three selected calibration reports.

Per-metric medians of the three run medians (milliseconds; JSON retains full precision):

| Fields | Compile | Mount  | 25 edits | Theme changes |
| ------ | ------- | ------ | -------- | ------------- |
| 100    | 2.40    | 11.10  | 57.10    | 16.90         |
| 500    | 5.90    | 52.30  | 136.20   | 91.30         |
| 1000   | 11.00   | 104.10 | 292.70   | 175.70        |

`docs/performance/baselines/linux-x64.json` stores these medians and all three run URLs.
`scripts/performance-policy.json` now sets linuxBaselineRequired=true: the bootstrap exception is
closed. The 500-field gate fails at more than 20% over its Linux baseline; exact ceilings are
7.08/62.76/163.44/109.56 ms for compile/mount/edit/theme. Mac continues enforcing its unchanged artifact.
The `ci-linux-baseline` PR must pass its own full Linux CI against this baseline before merging.
No M08 or undecided product-policy changes are included.

Latest local full pinned `CI=true pnpm verify` at cbddf40 passes all correctness stages above but
**fails the unchanged Mac timing gate**: compile/mount/edit/theme 6.20/49.50/128.40/86.00 ms versus
ceilings 5.40/44.64/119.52/75.48 ms. A separate pinned `CI=true pnpm benchmark:check` passes at
4.50/36.50/98.70/62.90 ms. These are separate results; the latest combined command is not claimed green.
All 60 Mac PNG bytes and every original Mac timing value remain unchanged. No runtime benchmark
workload, threshold, retry setting or user application was changed to obtain the isolated pass.

## Repository housekeeping — 2026-10-20 (CI/calibration pending)

Scope authorized by the user: platform-select visual/performance baselines, generate Linux-x64 visuals
in the matching official Playwright Docker image, verify the supplied nine starter-kit findings, record
the two open questions, run pinned local verification and push housekeeping. Preserve the M00–M07
branches/tags. No M08 features or changes to either undecided product policy. Linux performance numbers
must remain explicitly pending until three clean CI measurements are available; never borrow macOS
numbers. GitHub CLI repository/Actions access now works (the connector still returns 404). Test
thresholds remain unchanged.

Main's push did trigger [Verify run 39430723757](https://github.com/nawinisha231272-wm/formkit/actions/runs/39430723757)
at cd6517e. It failed with 302 browser cases passing and 49 theme cases failing (Linux compared to Mac
images, plus native dark Submit contrast). This is the original M07 CI result, not a green result or
performance measurement for housekeeping.

Calibration sequencing was resolved by the user's explicit Option 1 approval on 2026-10-20:
merge PR #1 only after all Linux correctness checks pass, with the pending Linux performance stage
record-only and a visible "linux baseline missing: not enforced" line. Mac retains enforcement.
Then collect three successful clean main runs at one unchanged commit on ubuntu-24.04. A second PR,
`ci-linux-baseline`, stores per-metric medians and enables required Linux enforcement (>20%). Merge
it only after its own CI passes, record all three runs/medians/both PRs, and stop before M08.
This supersedes the earlier fail-closed pending-Linux policy and the historical blockers below.

Built: exact platform visual paths; digest/version-pinned official Linux Playwright container and
reproduction wrapper; unchanged Mac baselines; exact-platform performance selection with a pending
Linux artifact; explicit calibration reports and a three-run median aggregator that verifies main
run provenance through the API. The theme conformance page now gives its host-owned Submit button
a light native color scheme and matching ButtonText system color: Linux WebKit's native dark button
otherwise reports 1.81:1 contrast. Explicit background colors were rejected after local verification
showed they change Mac WebKit's native height by three pixels. The final rule retains native geometry.
No runtime SDK source, pixel/timing threshold or existing test assertion is weakened.

The supplied nine findings are audited in docs/starter-kit-review.md: eight PASS, builder commands
PARTIAL until M09.

### Local verification evidence

- PASS — frozen install with Node 22.22.3/pnpm 10.10.0.
- PASS — official pinned linux/amd64 Docker generation: all 60 visual cases with one worker (10.7m).
  Initial emulated two-worker attempts timed out; serialization retains the existing test timeouts.
  PNGs were copied for review after generation; their manifest leaves the independent comparison
  explicitly pending native CI. The wrapper reproduces generation followed by comparison serially.
- PASS — all 60 original Mac PNGs are byte-identical to M07 after relocation; every original Mac
  baseline value is unchanged. No pixel or performance threshold is changed.
- PASS — final native-button fix: all 20 Mac WebKit visual cases pass against existing images.
  A pinned Linux WebKit probe confirms unchanged button geometry and no serious/critical axe issues,
  including inherited Bootstrap-like text styles. Full Linux comparison remains CI evidence.
- PASS — full pinned `CI=true pnpm verify` reaches and passes lint, all builds/typechecks, 158 unit
  tests, 351 browser cases and all 14 size budgets. Core line coverage is 98.57%, validation 99.15%.
- RETRY/PASS — that combined run's Mac benchmark stage initially exceeded the unchanged ceilings
  (500-field compile/mount/edit/theme: 6.40/46.90/126.80/81.40 ms). A separate pinned
  `CI=true pnpm benchmark:check` passes at 4.50/37.60/98.70/63.00 ms after other checks finish.
  The full command's first result is not claimed green; the isolated retry is recorded separately.
  No runtime/workload code or stored timings were changed to obtain the passing check.
- PASS — a final complete pinned `CI=true pnpm verify` on committed 2e2c8e4 exits successfully in one
  run: all stages above plus the Mac performance gate at 4.40/36.70/99.60/63.30 ms. This rerun had no
  Docker work alongside it. The earlier failure/retry remains documented rather than omitted.
- PASS — platform selection/pending-baseline rejection, strict 20% boundary, API-provenanced three-run
  median aggregation and official container/package version alignment pass in the unit suite.

Remote PR, no-update Linux visual comparison and three clean main CI performance runs remain pending.
Under the now-authorized bootstrap, pending Linux verification is record-only; this is not a green
performance regression verdict. Main advances only after all correctness checks pass. M08 is not started.

### Native CI follow-up

[PR #1](https://github.com/nawinisha231272-wm/formkit/pull/1) is open as a draft from housekeeping to main.
The first [push run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39460791176) and
[PR run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39460822825) each pass 234 Chromium/WebKit
cases, including all 40 of their Linux visual comparisons. All 117 Firefox cases fail before launch:
Actions provides a home owned by pwuser while the official container runs as root. The workflow now
matches that disposable directory's ownership to the actual container user; HOME, sandbox flags,
baselines and assertions remain unchanged. A controlled pinned-image probe reproduces the failure
with mismatched ownership and successfully launches Firefox after ownership is restored.

The corrected [PR run 39462700675](https://github.com/nawinisha231272-wm/formkit/actions/runs/39462700675)
passes all 158 unit tests, **351 browser cases (all 60 Linux visual comparisons)** and 14 size budgets.
The screenshot manifest now records the no-update comparison as PASS at 6c71f05. The workflow then
fails reading Git provenance because the host-owned checkout needs an explicit safe.directory entry
in the container user's Git configuration. Only the actual GITHUB_WORKSPACE is trusted; an early
rev-parse/clean-status check is added. No wildcard trust, HOME reassignment, test/threshold change or
baseline timing update is used. The final native rerun is pending.

At 00c1dbf, [push run 39464178487](https://github.com/nawinisha231272-wm/formkit/actions/runs/39464178487)
passes 158 unit tests, all 351 browser cases and 14 size budgets, emits clean linux-x64 provenance,
then fails only on the explicit pending Linux budget. Its report is not eligible for calibration.
The parallel [PR run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39464185762) has one
intermittent Firefox React failure: the flow did not wait for the email provider to finish and remove
an error above the later pointer target. The shared development conformance helper now asserts email aria-busy=false
and aria-invalid=false before proceeding. The original checkbox check and every other assertion remain;
no retry, timeout, pixel allowance or runtime behavior changes. All ten focused Firefox repetitions
pass (`tests/e2e/tier1.spec.ts`, react shared-conformance case, --repeat-each=10).

Final local verification on 354585e again passes lint, builds/types, all 158 unit tests, all 351 browser
cases and 14 size budgets. Its Mac benchmark fails only compile (5.60 ms versus the unchanged 5.40 ms
ceiling); mount/edit/theme pass at 42.90/114.70/73.40 ms. A separate pinned benchmark retry passes at
4.50/36.80/99.80/64.20 ms. The latest combined command is therefore **not claimed green**, although a
complete earlier combined run on 2e2c8e4 passes and both isolated checks pass. Runtime benchmark source
and baseline values are unchanged. Timing variability after the full suite remains explicit.

Native verification of the strengthened readiness assertions passes in both
[push run 39467103066](https://github.com/nawinisha231272-wm/formkit/actions/runs/39467103066) and
[PR run 39467110555](https://github.com/nawinisha231272-wm/formkit/actions/runs/39467110555) at 354585e:
158 unit tests, all 351 browser cases (all 60 Linux comparisons), 14 size budgets and clean linux-x64
provenance. **Both workflows fail only on the explicit pending Linux baseline.** Their housekeeping
timings are not used as calibration evidence: zero of the three required successful main runs exist.
The screenshot manifest records the latest comparison evidence; Mac bytes/timings remain unchanged.

### Authorized bootstrap implementation

The pending-Linux exception is restricted to the exact platform and an explicit
scripts/performance-policy.json switch. Measured Linux and Mac enforce their own baseline. Closing
the switch in PR #2 makes pending Linux fail again. There is no generic measurement bypass.
Unit evidence: `bootstrap records only pending Linux; Mac and measured Linux enforce and calibration
can be closed`; the aggregation test also rejects a different runner type using API job labels.
The workflow retains the pinned image, all correctness checks and benchmark artifact uploads.

PR #1 and the three required main runs are being completed under the approved sequence. No M08 or
product-policy implementation is included. Historical CI failures above remain documented.

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

## M03 plan — shells, accessibility and themes

1. Add theme contracts and three compiled presets; document explicit per-mount view/theme registration.
2. Share shell output between DOM/SSR; wire accessible names, descriptions, errors, focus and submit summary.
3. Add scoped token/class resolution and modes without replacing controls, plus playground controls.
4. Add the testing package, state/keyboard/axe/visual checks and run full verification.

Risks: nested control focus, cross-form CSS isolation and screenshot portability. M04 bridges and future
wizard/repeater behavior stay outside this milestone. M02 is published but not merged: this branch stacks
on the verified M02 branch, as before.

## M03 — FieldShell, accessibility and themes

### Built

- Shared DOM/SSR shell generation for field, group (fieldset/legend), inline, cell and none.
  Description, help, prefix/suffix, required, errors and host-provided cell names use common anatomy.
- Scoped ids, labels, described-by/invalid/required/busy/read-only attributes, group required description,
  a single polite live region, failed-submit summary and focus links through focusRef/group fallback.
  `mount` verifies engine ownership; `view.submit`, native submit, setMode and unmount are available.
- Explicit per-mount view/theme registries and base → inherited preset → application → form → component
  resolution. Tokens, classes and dark/high-contrast modes update in place; ids and CSS are isolated by mount.
- Three compiled preset packages with no external production dependency or host CSS scanner requirement.
  Bootstrap 5 fallback includes coexistence rules for checkbox layout and visible error messages.
- `@ourform/testing` supplies browser fixtures/matrices plus a separate `/playwright` assertion entry point.
  Playwright and axe are optional pinned development peers. Bootstrap 5.3.8 is development-only and used
  to test its actual stylesheet; its JavaScript is not imported into the product.
- Playground theme, appearance, direction and submit controls; conformance route at `/theme-probe.html`.
  SDK/renderer READMEs, normative contracts, ADR-0005 and changeset document the public API.

### Decisions and limitations

ADR-0005 records explicit view registration alongside the headless engine and the narrow renderer →
shipped-presets import allowance (preset → SDK types only, no runtime cycle). Legacy renderForm retains
raw ids and its theme names; new mounts generate isolated ids. Static SSR needs a distinct idPrefix per
form on a shared page. Themes are trusted host CSS scoped with `.of-root`, not executable schema data.

Theme appearance uses `themeMode`; native adapter selection and renderer design mode remain with their
own milestones. Multi-value, grids, wizards and async work have no implementations to exercise yet.
Tests preserve every current FieldState and data snapshot, including dirty/touched/errors/pending flags;
this is not a claim about future wizard/row/async implementations. Real OS IME coverage remains broader
than the synthetic regression checks. The browser suite uses Safari's native Option-Tab on macOS for
keyboard traversal, as documented in [Apple's keyboard shortcuts](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac).

The 39 PNG baselines cover three themes/modes, read-only states and the actual Bootstrap stylesheet in
three browsers. They were generated/reviewed on macOS with a 2% pixel tolerance for font rasterization;
Linux CI results still require the remote run. DOM/axe/state assertions run independently of pixel checks.
Core/schema and Rating source remain unchanged from M02. No native bridges or builder canvas were added.

M03 stacks on verified M02, since there is still no merged main branch. GitHub CLI authentication is
unavailable (`gh auth status`); the acceptance checklist below serves as the PR review summary.

### Acceptance evidence

- PASS — all three themes/light+dark have zero serious/critical axe violations in the playground:
  `base|bootstrap5|tailwind light|dark: playground axe and unchanged Rating` in all three browsers.
  The package's `checkThemeConformance` also scans the invalid/disabled/focused/hovered fixture in
  light, dark and high-contrast/RTL modes.
- PASS — typing continues at the retained caret after switching through all themes:
  `theme switches preserve typing, focus, caret, field identity and all current session state` checks
  stable DOM identity, focus, selection, data and every FieldState, then types `abcXd` at position 3.
  Existing composition/unrelated-control/cleanup regressions continue to pass.
- PASS — Rating has a fieldset/legend accessible name and a required/error description:
  `checkThemeConformance` asserts name `Rating`, description `Rating is required (required)`, and
  focus navigation to its first enabled button. Axe scans the same DOM. `git diff b12f7f3 --
packages/components/src/rating.ts` is empty; its original 29-line SDK definition remains unchanged.
- PASS — unchanged Rating renders/selects correctly in all presets; the shared fixture's nine
  theme/mode scenarios plus read-only scenarios compare reviewed PNGs in Chromium/Firefox/WebKit.
  `Bootstrap preset works with the real Bootstrap 5 stylesheet installed` additionally checks actual
  Bootstrap CSS, visible errors, a working checkbox and its position within the shell.
- PASS — `keyboard-only feedback completion and submission` traverses the real document keyboard
  order, enters a name, selects four stars, and submits successfully in all three browsers.
- PASS — `failed native submission focuses summary; its links focus through focusRef`, plus the
  two-mount isolation and M02 compatibility/unmount cases, verify navigation and cleanup.
- PASS — `CI=true npx pnpm@10.10.0 verify`: lint/format, builds, strict typechecks, 103 Node tests,
  98.59% core line coverage, 102 browser cases, 39 PNG comparisons and all nine size budgets.
  `npx pnpm@10.10.0 install --frozen-lockfile` also passes. No test was skipped/deleted and no
  threshold was relaxed. The read-only fixture now explicitly blurs and waits for invalid state
  before photographing it; hover checks wait for Bootstrap's real CSS transition to finish.
- PASS — Brotli sizes: schema 3.04 kB, core 6.63 kB, SDK 2.47 kB, components 828 B,
  renderer-dom 5.42 kB, builder-core 459 B (30 kB each); base 989 B, Bootstrap 5 1.17 kB,
  Tailwind 1.07 kB (new 10 kB preset budgets). Existing budgets remain unchanged.

### Review summary — M03: FieldShell, accessibility and themes

Field authors now receive accessible shells and theme parts automatically. Three compiled themes
support scoped, state-preserving theme/mode switching; failed submissions link errors to focus targets.
The development conformance package supplies reusable assertions and fixtures, with the acceptance
checks above as the PR checklist. Run frozen install and `pnpm verify`; `pnpm dev` opens the updated
playground. Static SSR, registration/override rules and compatibility are documented in ADR-0005.
M03 is complete. M04 native bridges and host adapters are next and have not been started.

## M04 plan — native bridges and host adapters

1. Add native descriptors, conventional mappings, safe primitive inference and renderer-owned control slots.
2. Add shared host lifecycle/controlled-data synchronization, then vanilla/Web Component and React adapters.
3. Build the Angular standalone adapter with ng-packagr, host DI and conventional/CVA control support.
4. Add one shared fixture and three real example apps, including native id/object EmployeeLookup controls.
5. Verify cross-host data/errors, context/DI, state, cleanup and all existing checks; publish this milestone only.

Risks: portal ownership/StrictMode cleanup, Angular version/toolchain compatibility and controlled echo loops.
Angular 22 is current and 21 previous (official release/compatibility references checked). The Angular package
uses its supported compiler/TypeScript toolchain; Node 22.22.3 is the reproducible verification runtime.
React 19 is the supported target; React 18 is not claimed without a separate compatibility run.
This branch stacks on verified M03 (still unmerged), matching the existing milestone branch workflow.

## M04 — Native bridges and host adapters

### Built

- Framework-neutral native descriptors, conventional/override prop mappings, explicit runtime primitive
  choices, complex-value adapters and type checks. No implicit global model/view registry exists.
- Opaque native control slots share M03 shells, ARIA/error/focus handling and in-place themes. Native →
  pack → portable resolution is fixed at mount, with type/adapter names in missing-view errors.
- Shared host compilation/session/subscription lifecycle and controlled changed-leaf synchronization.
  Native and imperative submits share the result callback; identical controlled echoes do no work.
- `@ourform/element`: vanilla helper, native property/CustomEvent bridge, explicit configurable custom tag,
  light/Shadow DOM, ready/change/submit events, imperative methods and data-preserving reconnect.
- `@ourform/react`: Form/provider/hooks, actual React portals (with stable field keys), host context,
  controlled/uncontrolled modes and React 19 StrictMode lifecycle. Inputs accept current callbacks.
- `@ourform/angular`: standalone OnPush wrapper, signal-backed readiness, multi-provider registration,
  host element/environment injectors, setInput/output metadata and CVA callbacks with changed-value writes.
  ng-packagr emits partial-compiled FESM/declarations. All examples bootstrap without zone.js.
- Shared native fixture and vanilla/React/Angular examples, plus an Angular 21 compatibility example.
  Each has native EmployeeLookup id and object variants; Angular's object widget exercises CVA.
  `checkHostConformance` compares complete results/errors and normalized accessible control semantics.
- Root toolchain updated to Angular 22.2.3, ng-packagr 22.2.4, TypeScript 6.0.2 and compatible ESLint
  TypeScript parser. Angular 21.2.25 also has its own TypeScript 5.9.3 check. CI pins Node 22.22.3.

### Decisions and limitations

ADR-0006 documents descriptor registration, host-owned registries, opaque control slots and lifetimes.
React/Angular types reject object controls without an adapter. JavaScript cannot inspect erased prop
shapes: string is the runtime default, and non-string inference choices are explicit (number/boolean/
primitive-array). Object emissions without a value adapter fail with a clear message. A native view can
augment a portable type by sharing its model; conflicting models/duplicate adapter views throw.

Angular 22/21 are the current/previous majors in the official release table checked during this milestone:
[releases](https://angular.dev/reference/releases), [toolchain compatibility](https://angular.dev/reference/versions).
Both actual runtime versions are asserted in browser tests. ng-packagr builds the Angular library; the
plain Vite examples intentionally import JIT for their example components. The production library does
not import the compiler. Example JIT bundles produce Vite's size advisory; library budgets are separate.
Angular's only added non-framework production runtime dependency is tslib 2.8.1 for compiler helpers.
React/Angular/RxJS are peers. Angular tooling and compatibility/example frameworks are development tools.

React 19 is tested; React 18 is not claimed. `useForm()` is nullable before readiness; `useForm(ref)` reads
its current imperative handle without subscribing to ref mutations (prefer onReady/context for readiness).
Native fields are client-rendered; native SSR/hydration, plugin resolution and builder UI remain deferred.
Native controls own their internal ARIA/state implementation. CVA read-only falls back to disabled when
no readOnly input exists; the supplied examples implement state forwarding. Framework Shadow DOM control
internals beyond the documented focus/ARIA conventions are not an exhaustive certification claim.

The shared fixture is under fixtures/forms/native because core-only fixture tests do not register native
models. Those original fixtures/tests and Rating source remain unchanged. M03's 39 visual baselines and
pixel thresholds remain unchanged. Verification here is local macOS; remote Linux CI remains a separate run.
This branch stacks on verified M03 (no merged main yet). Git transport works, while `gh auth status` is
unauthenticated; the acceptance/review summary below substitutes for a PR. M05 has not been started.

### Acceptance evidence

- PASS — `all hosts return identical data/errors and equivalent accessible field semantics` compares
  full submissions, full initial error sets and normalized native input semantics in vanilla, React,
  Angular 22 and Angular 21. Each host's `same fixture, errors, native id/object values and submitted
data` also selects id/object employees, rates feedback, asserts exact data and runs axe with zero
  serious/critical violations. The Angular pages assert the actual 22.x/21.x runtime version.
- PASS — per-host `native change/blur, disabled state, context and stable controlled updates` checks
  touched state, disabled propagation, external value updates, stable focus and hook state. `readOnly
props prevent native changes` checks both conventional and object-valued controls. The Angular object
  control exercises CVA; its changed-value writes preserve search input during blur updates.
- PASS — conventional registrations are single statements in all examples: registerElementField,
  registerReactField and provideFormField for employee; only the object variants add a value adapter.
  SDK mapping tests also cover unusual event signatures/prop names and complex-value runtime guards.
- PASS — `primitive models normalize values and enforce the complex-value adapter boundary`, plus
  React/Angular @ts-expect-error checks and the working object examples. Typed non-string registrations
  require explicit valueType/value choices. Unsafe native property mappings are also rejected.
- PASS — React's native Lookup reads `React host context` through a real createPortal. The per-host
  state/context test asserts it; the example runs inside StrictMode and exercises useForm/useField.
- PASS — both Angular versions' native Lookup reads `Angular host context` from a component-local
  provider, proving host element DI alongside the EnvironmentInjector. Both examples are zoneless.
- PASS — all four hosts' `native typing and caret survive theme changes`; all four unmount cases;
  custom-element light/shadow property/event/method/reconnect cases. Existing M03 IME/focus/lifecycle
  regressions remain unchanged and pass. View precedence, model sharing/duplicate rejection, controlled
  echo no-ops and Node-safe element import have unit coverage.
- PASS — exact reproducible command:
  `CI=true npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify`.
  Lint/format, all builds (including ng-packagr), strict checks (including TS 5.9 Angular 21), 112 Node
  tests, 98.59% core line coverage, 171 browser cases in three browsers and all 12 size budgets pass.
  Frozen-lockfile installation also passes. No test was skipped/deleted, core regression was changed,
  visual baseline was regenerated or threshold was relaxed during this milestone.
- PASS — Brotli sizes: schema 3.04 kB, core 6.63 kB, SDK 3.3 kB, components 828 B,
  renderer-dom 6.58 kB, builder-core 459 B; element 1.5 kB, React 1.4 kB, Angular 2.38 kB
  (30 kB each). Presets remain base 989 B, Bootstrap 1.17 kB, Tailwind 1.07 kB (10 kB each).

### Review summary — M04: Native bridges and host adapters

Native controls now share the existing shells/session while retaining React context and Angular host DI.
The three adapters and examples support controlled updates, state forwarding, submission and cleanup.
The checklist above is the PR acceptance summary. Build with Node 22.22.3/pnpm 10.10.0, run verify, then
start an example on ports 4181–4184; the playground links to the primary examples. ADR-0006 and package
READMEs describe registration/inference, framework support and client-rendering limits. M04 is complete.
M05 mini builder and Phase 0 gate is next; it has not been started and requires human review when built.

## M05 — Mini builder and Phase 0 gate (implementation complete; review pending)

Plan: implement immutable headless AddComponent/UpdateProperty/RemoveComponent commands, inverses,
JSON patches and undo/redo; discover the palette and generated property panels from engine metadata.
Add a simple list-based playground builder with Rating and the existing native EmployeeLookup,
live preview and JSON. Add Bootstrap 4 alongside Bootstrap 5 at the user's explicit request, with
compiled fallback and real framework stylesheet checks. Run the complete Phase 0 acceptance suite,
offline build/runtime checks and size measurements; write the gate report and stop before M06.
Risks: command rejection must not corrupt history, builder edits must preserve valid schema, existing
native/framework regressions and visual baselines must remain valid, and the phase gate requires review.
This branch stacks on verified M04 because the earlier milestone branches have not been merged.

### Built

- Headless createBuilder with immutable snapshots, selection, AddComponent/UpdateProperty/RemoveComponent,
  inverses, undo/redo, diagnostic rejection, registry-discovered palettes and generated grouped panels.
- RFC 6902 definition patches: component add/remove/replace and root replace for exact history replay.
  Seeded randomized command sequences independently replay patches and verify every undo/redo snapshot.
  Key generation accounts for transparent layouts/object scopes even in unresolved-reference drafts.
- Mini builder at /builder.html: grouped palette, selectable list, generated generic editors, live native
  preview, JSON and latest patch, undo/redo/removal, responsive chrome and all four theme choices.
- Existing native EmployeeLookup extracted from the vanilla example into a shared module. It and Rating
  register through normal field descriptors/metadata; no component-specific builder UI exists. The native
  searchPlaceholder property demonstrates automatically generated editing with an observable preview change.
- New Bootstrap 4 preset beside Bootstrap 5, base and Tailwind. Both Bootstrap presets include compiled
  fallback CSS and are checked against real, independently loaded framework stylesheets (4.6.2/5.3.8).
  No framework JS is loaded or added to library runtime dependencies. Bootstrap's npm package auto-installs
  jQuery/Popper peers for the development stylesheet dependency only; these are not imported by the preset.
- New optional ariaLabel wire property keeps meta uninterpreted; shared shells preserve visible labels and
  forward accessible overrides to portable/native controls. Standard placeholder is forwarded through SDK
  control props. Neither change rewrites Rating. SDK defaults cover generated base property labels.
- macOS OS-enforced offline build proof, including an explicit outbound TCP denial check. All 19 package
  scripts run without Turbo caching; browser tests separately go offline and exercise native editing,
  theme switching, client validation and submission.

### Decisions, findings and limits

ADR-0007 and the updated specs document the M05 contract. Hidden aliases visibleWhen=false; clearing it
removes that expression. Custom editor ids are metadata only, expressions/options use generic JSON text,
layout width is stored for later layout rendering. Full builder UI/drag-drop/other commands remain M09.
History stores unbounded before/after snapshots for this proof; production memory bounds belong to M09.
Schema edits recreate preview sessions with current data, resetting transient touched/errors; theme/mode
changes retain session and DOM state. Unresolved-reference drafts cannot preview until repaired or undone.
The compiler reports reference problems before deeper graph diagnostics; repair references to expose any
additional compile issues. This remains a strict engine boundary, with no rendering of invalid drafts.

The first axe run found an ARIA label on the empty preview output pre without a region role; roles were
added rather than suppressing the rule. Explicit null JSON property values are retained in generated
editors. Clearing absent nested properties is a history no-op. Duplicate/reserved keys, bad expression
input and invalid metadata edits remain rejected. No core or Rating source or existing PNG was changed.
The 21 new Bootstrap 4 PNGs were reviewed across all three browsers; the existing 39 remain unchanged.

Turbo could not spawn jobs under macOS's deny-network policy. The offline proof therefore runs every
package's same build script directly using pnpm's dependency order, bypassing Turbo/cache; ordinary verify
still exercises Turbo. Dependency installation requires cached/local packages for the offline proof.
No licensing service exists in Phase 0. This verifies independence from network licensing, not production
commercial licensing functionality. Remote Linux CI and branch merges remain separate from local checks.

### Acceptance evidence

- PASS — same JSON renders in vanilla, React and Angular: hosts.spec.ts test `all hosts return identical
data/errors and equivalent accessible field semantics` compares full data/error sets and normalized
  accessible controls across vanilla, React 19, Angular 22 and Angular 21. Each host also submits the shared
  fixture with conventional and object native controls. Existing host tests remain unchanged.
- PASS — composition-only custom Rating: SDK test `Rating stays under thirty meaningful authoring lines`
  counts 29 lines, and Rating's source remains unchanged from the earlier proof.
- PASS — native React receives value/blur/disabled state: its `native change/blur, disabled state, context
and stable controlled updates` case plus readOnly/caret/unmount cases, under real portals/StrictMode.
- PASS — native Angular equivalent: the same host tests exercise actual Angular 22/21 runtimes, component
  DI, outputs and the object ControlValueAccessor. The framework examples and their assertions are retained.
- PASS — automatic palette: unit `palette and property groups discover arbitrary native metadata, options
and visibility without global registration`; browser `registry palette and generated Rating/native editors
drive JSON, preview, patches and history` discovers Rating and EmployeeLookup.
- PASS — automatic custom property editors: those tests edit Rating's max and native searchPlaceholder,
  assert native value/touched/disabled and exact preview changes. No field-specific builder editor exists.
  `generated JSON editors retain explicit null values rather than substituting defaults` covers null JSON.
- PASS — base/Bootstrap 4/Bootstrap 5/Tailwind with unchanged Rating: four-theme conformance/axe/snapshot
  matrix, real Bootstrap 4 CSS in light/dark/high-contrast, and retained real Bootstrap 5 CSS case.
  The new 21 PNGs were deliberately created/reviewed; no existing PNG or pixel threshold was changed.
- PASS — themes preserve state: `theme switches preserve typing, focus, caret, field identity and all
current session state` includes Bootstrap 4; builder `all preview themes preserve focused native typing,
caret and complete session state` includes both Bootstrap versions; native host caret regressions pass.
- PASS — backend-free client validation: `offline runtime: native builder editing and client validation/
submission need no backend or licensing endpoint` exercises required failure and successful submission
  with native data while offline. All three browsers pass. `base placeholder, required validation and
hidden editors affect the shared preview` covers base authoring controls.
- PASS — offline build/runtime: `sh scripts/verify-offline.sh` returns success, logs outbound TCP blocked
  (EPERM) and builds all 19 package scripts with all network operations denied. The browser offline test
  additionally rejects external requests and asserts no external request attempt occurred.
- PASS — pinned full verification:
  `CI=true npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify`.
  Lint/format, all 19 builds, strict checks (including Angular 21's TS 5.9 check), 123 unit tests,
  98.59% core line coverage, 216 browser cases and 13 size budgets pass. Frozen-lockfile install passes.
  Randomized command testing uses 25 seeds × 50 commands with independent JSON Patch replay and exact
  undo/redo comparisons. Invalid/rejected edits preserve history and subscriptions. New draft-key/no-op
  regressions cover the final API review fixes. No test was weakened, skipped or deleted.
- PASS — current Brotli sizes (limits unchanged): schema 3.06 kB, core 6.63 kB, SDK 3.54 kB,
  components 828 B, renderer 6.68 kB, builder-core 4 kB, element 1.5 kB, React 1.4 kB, Angular 2.38 kB
  (30 kB budgets); base 989 B, Bootstrap 4 1.19 kB, Bootstrap 5 1.17 kB, Tailwind 1.07 kB (10 kB each).

### Review summary — M05: Mini builder and Phase 0 gate

The mini builder proves model discovery, generated panels, native preview, commands and exact history.
Bootstrap 4 is now an independent shipped theme alongside Bootstrap 5. Open /builder.html after starting
pnpm dev, add/edit Rating and EmployeeLookup, switch themes and inspect JSON/patches. ADR-0007, package
READMEs and the changeset describe the public contracts and proof boundaries. Git transport works;
`gh auth status` reports no authenticated host, so this summary substitutes for a PR.

M05 implementation and verification are complete. docs/phase0-report.md recommends GO to Phase 1 after
human review. No architectural blocker remains for that proof, with the documented memory/preview/draft
limits. **Stop here: AGENTS.md and M05 explicitly require human sign-off before M06.** M06 has not begun.

## M06 — Validation package and Tier 1 fields

The user's instruction to proceed after the M05 report authorizes Phase 1. Plan: add a headless
validation facade and submission JSON Schema, shared custom/async validators with cancellation and
pending state, localization, then the Tier 1 controls and reusable cross-host conformance coverage.
Add fixtures and a playground demo, retain all four themes including Bootstrap 4/5, run complete
verification with per-package core/validation coverage, and document API decisions/evidence.
Risks: async races must never publish stale errors; server validation must reject malformed payloads;
schema generation must retain annotations for runtime-only conditions and custom rules; Content must
use an allow-list without writing untrusted HTML. This branch stacks on verified M05 (671e5e5), as prior
milestone branches are still unmerged. No layouts/arrays or other later-milestone features are planned.

### Built

- Headless @ourform/validation with compileForm and validateSubmission, sharing the session's exact
  rules in customer Node and browsers. Untrusted payloads are checked before host validators: unsafe
  JSON, extra keys, malformed scopes, coercions, missing required defaults and forged calculations fail.
  Custom serialized values, including null, retain their normalize/serialize round-trip contract.
- Draft 2020-12 toSubmissionSchema with scoped objects, adapter hints, static required/bounds/patterns,
  email/options and Unicode code-point lengths. Every valid legacy definition has explicit good/bad
  submission companions, alongside the new Tier 1 registration fixture.
- Per-engine custom validator registry alongside existing host functions; compiled argument dependencies,
  actual AbortSignal, pending state, cancellation and stale-result protection. Reset, disposal, hiding,
  newer validation and dependency changes abort obsolete runs, even if the provider ignores its signal.
  Superseded async submissions fail closed. Host failures become stable validation errors.
- Localization provider and shared English message catalog, retaining existing renderer translations.
  Textarea, Email, Password, Radio, Select, Hidden, Content and Button join Text, Number and Checkbox.
  Content renders a bounded allow-list to safe VNodes; submit/reset/custom buttons reuse host/session
  behavior. Non-value controls require no dummy data keys. All adapters share the built-in registry,
  which also makes the builder discover the new control metadata automatically.
- Reusable component conformance kit and /tier1.html demo with actual DOM, React and Angular hosts,
  host-provided async email validation, Spanish overrides, JSON Schema/submission output, and all four
  themes. Bootstrap 4 and Bootstrap 5 remain independent themes alongside base and Tailwind.

### Decisions, findings and limits

ADR-0008 and the package READMEs/specs define the new contracts. There is no new external runtime
dependency; Ajv remains development-only. Core/validation still compile without the DOM library and
import no Node runtime module. Development Node types describe the shared AbortSignal globals.
Dynamic visibility/validation, calculations and custom rules remain explicit x-ourform-\* annotations;
bare Ajv does not execute them. Arbitrary custom adapter emptiness/domain semantics require appropriate
adapter schema hints and model validators. Content supports the documented markup subset; it is not
a general HTML5 parser or an HTML-string sanitizer for other sinks. Host providers own I/O and timeouts.

Real radio clicks exposed blur validation removing error rows between pointer down and activation.
The renderer now defers pointer-driven touches until activation ends, retains immediate keyboard blur,
and cleans up its listeners/timers. Reset clears queued touches, preserving freshly reset field state;
the cross-host conformance test resets directly from a focused input and checks every touched flag.
Select values are installed after their options. Theme action-button
styling applies only to direct action controls, so transparent containers cannot recolor nested Rating
buttons. Tests retain real clicks and existing assertions. Rating remains unchanged at 29 authoring
lines. No existing visual baseline, test assertion or pixel threshold was relaxed or regenerated.
Schema review also caught an Email field's explicit host pattern being overwritten by the built-in
email constraint. Both now remain in the schema; a regression compares Ajv/runtime results for a valid
address, another domain and malformed syntax. The previous successful full run was repeated after
these final fixes; an intermediate run was deliberately interrupted to rebuild the corrected schema.

### Acceptance evidence

- PASS — browser/Node parity for every fixture: tier1.spec.ts `all shared fixtures yield byte-equivalent
validation results in browser and customer Node` compares complete compile diagnostics and validation
  results across legacy definitions/default data, all explicit legacy good/bad companions, and Tier 1
  samples. All three browsers pass. Headless `every legacy fixture compiles/diagnoses consistently;
canonical data yields identical session/submission results` separately compares session/facade results.
- PASS — generated JSON Schema: `explicit good/bad data companions for every legacy fixture pass/fail
both SDK and Ajv` covers all 16 valid legacy definitions; `Tier 1 generated schema accepts all good samples
and rejects every bad sample in Ajv and runtime` covers registration. Ajv uses Draft 2020-12. Nested
  required scopes, optional empties, Unicode lengths, isolated schema snapshots, custom serialization,
  null empties and combined explicit/email patterns have independent regressions.
- PASS — all Tier 1 fields in all three hosts: shared checkComponentConformance executes unchanged in
  actual DOM, React and Angular under `every Tier 1 field passes shared conformance, actions and reset`.
  It fills/submits every value type, checks Hidden/Content, validation summary/focus, custom action and
  reset, including untouched state after resetting a focused control. axe runs in base, Bootstrap 4,
  Bootstrap 5 and Tailwind. Separate per-host tests cover read-only/disabled controls, pending async
  results, stale signals, unmount/listener cleanup and theme identity/focus/caret preservation.
- PASS — safe Content: components unit `Content uses a bounded allow-list of tags and anchor attributes,
never raw HTML` covers the attack corpus; `Content strips executable markup and unsafe URLs in the real
DOM` checks each host for absent executable nodes/events/javascript URLs, retained safe links and no
  executed script flag, in all three browsers.
- PASS — custom/async registries, cancellation and localization: 12 core async-validation tests cover
  pending, superseded submit, ignored signals, reset/dispose/hiding, compiled argument dependencies,
  host failures/malformed results, registry isolation/diagnostics, localization and safe catalog lookup.
  Existing host-function expression tests remain unchanged. Browser Spanish-provider and cross-host
  async tests verify rendered behavior; customer Node providers are covered by validation tests.
- PASS — validation line coverage 99.15%; core 98.57%. Each package independently enforces at least 90%
  through Vitest coverage thresholds. No threshold was lowered and no test was weakened/skipped/deleted.
- PASS — full pinned verification:
  `CI=true npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify` exits 0.
  Lint/format, all 20 builds, strict checks including Angular 21's TypeScript 5.9 check, 150 unit tests,
  267 browser cases and all 14 size budgets pass. The 60 existing PNG baselines remain unchanged.
  Frozen-lockfile installation also passes. This is local macOS evidence, not a remote Linux CI claim.
- PASS — Brotli sizes: schema 4.18 kB, core 8.9 kB, SDK 3.16 kB, components 2.81 kB, renderer 7.23 kB,
  builder-core 4 kB, element 1.47 kB, React 1.39 kB, Angular 2.36 kB, validation 1.05 kB (30 kB each);
  base 1.08 kB, Bootstrap 4 1.27 kB, Bootstrap 5 1.26 kB, Tailwind 1.17 kB (10 kB each).

### Review summary — M06: Validation package and Tier 1 fields

Customer Node and browser validation now share canonical submission checks and cancellable validators.
Static submission schemas and the complete Tier 1 field set are available through public packages,
with localization, safe Content, portable actions and all four themes. /tier1.html demonstrates actual
DOM/React/Angular hosts and host-provided async validation without backend calls. Package READMEs,
updated specs, ADR-0008 and the changeset describe the public contracts and static-schema/Content limits.
The acceptance checklist above is the review body. Git transport works, but `gh auth status` reports no
authenticated host, so this summary substitutes for a PR. The branch remains stacked on unmerged M05.

M06 is complete. No open contract question remains for this scope. M07 — Layouts and production adapters
has not begun; its Phase 1 gate will require a separate report and human review.

## M07 — Layouts and production adapters

Plan: add SDK-composed Panel/Columns/Fieldset/Container layouts with semantic DOM/SSR and 12-column
widths; strengthen controlled/uncontrolled adapter and element attribute/property synchronization;
share a realistic 40-value customer onboarding fixture across examples; exercise read-only, summary,
reset and static SSR/client remount; add the 100/500/1,000-field benchmark app and a measured 500-field
baseline with a strict 20% CI regression check. Retain all four themes and existing visual baselines.
Run full verification and the offline sample-app proof, document APIs/decisions and the Phase 1 gate,
then stop for review. Risks: layout refresh must retain child DOM/focus, controlled echoes must not
overwrite rapid typing, attributes must not reenter setters, and timing measurements need repeatable
sampling with explicit platform limits. This branch stacks on verified M06 (2bd5755); prior branches
remain unmerged. No wizard/tabs/arrays or later-milestone work is included.

### Built

- Public composition-based defineLayout plus Panel, Columns, Fieldset and object-scoped Container.
  Independent child units survive parent/theme updates; semantic section/legend/group headings share
  escaped DOM/SSR generation. A 12-track responsive grid consumes node.layout.width and stacks at 640px.
  Base layout CSS is inherited by Bootstrap 4, Bootstrap 5 and Tailwind. builtinFields remains compatible;
  builtinLayouts/builtinComponents provide explicit expanded registries for hosts and the builder.
- Shared realistic customer onboarding: 40 value controls across contact/company/address/preferences,
  nested object data, static options, required rules, numeric bounds, Hidden defaults and action buttons.
  Vanilla, React, Angular 22 and Angular 21 examples expose ?onboarding, uncontrolled and read-only modes.
- Renderer-aware public reset clears summary/submitted state and deferred blur touches. Element attributes
  observe schema/data JSON, theme and read-only; property reflection preserves editing on theme changes.
  Invalid schema/appearance input retains the last valid property and emits of-error; schema removal
  clears the controller, with data retained for a later mount. Disconnect/reconnect retains data.
- Static portable SSR in the built playground onboarding HTML, followed by an explicit fresh client
  mount. Production preview checks JS-disabled readability, duplicate-free remount and offline editing,
  validation, both Bootstrap themes, submission and reset. Native control SSR/hydration remains deferred.
- Separate benchmarks app with 100/500/1,000 real controls, 25 dependent calculations and forced layout.
  Recorded 15-sample medians after three warm-ups. A separate one-worker Chromium gate checks every
  500-field metric against baseline ×1.20; verify/CI includes it and uploads benchmark reports.

### Findings and decisions

ADR-0009 documents APIs and proof limits. SSR initially appended child markup only for div/fieldset;
semantic section roots now retain all children, with a 54-unit/40-value fixture regression and a real
JS-disabled production-page check. Named div layouts use role=group for a valid accessible name.
Host compatibility checks kind/dataScope as well as normalization identity, preventing conflicting
non-value layout registrations. Invalid attribute updates are transactional for schema/appearance;
later read-only changes and remount remain usable after a rejected input.

An initial randomized builder timeout occurred while builds/browser/unit checks ran concurrently;
verification was sequenced without changing its timeout or assertions. A development-server import
error during package rebuild was likewise removed by sequencing builds before browser checks. Final
review corrections interrupted intermediate verification; the complete suite is rerun on the final tree.
No external runtime dependency was added. Existing visual baselines and test thresholds are retained.
The first full browser matrix passed 313/315 cases; two new Firefox cases exceeded the default test
time while performing four complete 40-field axe scans. These theme cases are now parameterized into
separate tests, retaining every state/data/focus/caret/axe assertion and the original time limits.
No axe rule, timeout, assertion or visual baseline was relaxed to resolve it.

### Acceptance evidence

- PASS — 40-field fixture filled/validated/submitted in all hosts: onboarding.spec.ts cases
  `<host> <mode>: 40-field onboarding, rapid typing, scoped submit and public reset` run in vanilla,
  React, Angular 22 and Angular 21, in all three browsers. Exact submitted nested data matches the shared
  customer.data.json. They verify failed-submit summary focus, successful submit and public reset state.
  The vanilla host is imperative; controlled/uncontrolled ownership is exercised in React/Angular.
- PASS — controlled data without lost keystrokes: those cases type with delay 0, assert the complete
  typed value, then submit the full fixture. Both React/Angular ownership modes pass. Each host/theme's
  separate read-only case preserves data, focused input identity and caret and runs axe with no serious
  or critical violation. Existing native controlled/portal/DI/CVA/IME tests remain unchanged.
- PASS — layouts: `40-field onboarding uses transparent layouts, an object container and consistent
escaped semantic SSR` asserts 40 value nodes, all 54 rendered component units, four object keys and
  customer Node validation. `defineLayout composes frozen per-definition metadata without a value
adapter`, conflicting-scope registration and escaped named-group tests cover the public API. Browser
  `responsive columns retain document order and child identity on resize and theme updates` checks
  12-column placement, mobile stacking, focused DOM identity, retained value and no horizontal overflow.
- PASS — element property/attribute sync: `custom element attributes/properties sync data, theme and
read-only without losing reconnect state` covers initial JSON/appearance attributes, rapid editing,
  incoming data, reflected theme/readOnly, caret, reconnect, JSON/compile/theme rejection without
  poisoning the valid properties, continued use after rejection, reset, schema removal and remount.
- PASS — SSR/remount: `built static SSR is readable without JS and client remount replaces it without
duplicate controls` loads the actual production HTML with JS disabled, checks labels/legend, then
  checks a fresh interactive mount with one control per id and one form live region. Node SSR tests
  retain the section/fieldset hierarchy, escaped labels and every child. Native-view SSR is not claimed.
- PASS — recorded 500-field baseline and >20% CI rejection: docs/performance/m07-baseline.json records
  actual 100/500/1,000-control medians (3 warm-ups, 15 samples each). `performance budget accepts the
20% boundary and rejects each metric beyond it` tests the exact boundary, each over-budget metric and
  non-finite input. The one-worker `measured 100/500/1000-field baseline and strict 500-field performance
budget` gate passes, including 650 affected processors, count, focus/identity and cleanup assertions.
  pnpm verify/CI runs the gate; the workflow uploads benchmark JSON. Check never rewrites the baseline.
- PASS — offline production sample gate: `Phase 1 gate: built onboarding edits, themes, validates,
submits and resets with networking disabled` loads built package/app output, disables networking,
  checks failed validation/focus, fills all 40 values, switches Bootstrap 4 → 5, submits exact nested
  data and resets, without an external request. All three browsers pass. `sh scripts/verify-offline.sh`
  separately logs outbound TCP denied by OS policy (EPERM), bypasses Turbo caches and successfully
  builds every one of the 21 package/app scripts under macOS network denial.
- PASS — full pinned verification:
  `CI=true npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify` exits 0.
  Lint/format, 21 builds, strict checks including Angular 21's TypeScript 5.9 check, 155 unit tests,
  core 98.57% / validation 99.15% line coverage, 351 browser cases, 14 size budgets and the separate
  performance gate pass. Frozen-lockfile offline installation passes. All 60 prior PNGs and their
  thresholds remain unchanged. No original test was deleted, skipped or weakened; Rating is unchanged.
- PASS — API documentation: package READMEs provide runnable layout/SSR/host examples, with playground
  and benchmark commands. ADR-0009, specs 04/05/06/09 and the changeset document the final contracts.

### Phase 1 gate report — M07

Recommendation: **GO to M08 after human review.** M07 implementation and local verification are complete.
The shared form runs end to end in vanilla, React and Angular with only customer-owned code/data. It
retains accessible validation/focus/reset behavior, nested object scopes, read-only controls and all four
themes. Production HTML supports static portable SSR and a fresh client mount; the built sample runs
offline. No external runtime dependency, telemetry, backend or network licensing path was introduced.

Measured Chromium medians on darwin-arm64, milliseconds:

| 500-field workload              | Stored baseline | Final verify | 20% ceiling |
| ------------------------------- | --------------: | -----------: | ----------: |
| Compile                         |            4.50 |         4.40 |        5.40 |
| Mount + layout                  |           37.20 |        36.40 |       44.64 |
| 25 edits + layout               |           99.60 |        99.50 |      119.52 |
| Two appearance changes + layout |           62.90 |        62.50 |       75.48 |

Each edit reaches exactly 26 fields, for 650 processors per batch, at all three measured sizes. The
stored 100/1,000-field numbers and complete measurement method are in docs/performance and ADR-0009.
Absolute timing depends on hardware/OS/browser/load/power. The initial baseline is local macOS evidence;
remote Linux CI results are not claimed. No baseline was inflated or regenerated after check failure.

Scope limits remain explicit: experimental 0.x packages, React 19 with Angular 22/21, portable-only
static SSR and client remount (no native SSR/hydration), no wizard/tabs/repeaters, no commercial licensing
implementation and no production release claim. Those limits belong to later milestones. Branches remain
stacked and unmerged. No open contract question or architectural blocker remains within M07's scope.

Brotli sizes: schema 4.18 kB, core 8.9 kB, SDK 3.28 kB, components 2.96 kB, renderer 7.49 kB,
builder-core 4 kB, element 1.9 kB, React 1.39 kB, Angular 2.36 kB, validation 1.05 kB (30 kB limits);
base 1.23 kB, Bootstrap 4 1.27 kB, Bootstrap 5 1.26 kB, Tailwind 1.17 kB (10 kB limits).

### Review summary — M07: Layouts and production adapters

Semantic, responsive layouts and consistent adapter behavior now support the complete 40-value
onboarding flow. Review /onboarding.html and each host's ?onboarding/ownership/read-only variants,
then the benchmark report and acceptance checklist above. The checklist is the review body; public
contracts and boundaries are in ADR-0009, package READMEs/specs and the changeset. Git transport works,
but `gh auth status` still reports no authenticated host, so this summary substitutes for a PR.

**Stop for human review, as AGENTS.md and M07 require. M08 has not begun.**
