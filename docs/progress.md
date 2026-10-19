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
