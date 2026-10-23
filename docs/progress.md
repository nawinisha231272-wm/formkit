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
- **M03–M08 complete** — local and Linux evidence is recorded below. **M08 accepted by the owner under the amended author criterion** — SDK 0.x freeze accepted; closure PR #6 merged on first-run green CI. Human guide usability is required in M11; the owner approved the 24 new Yes/No screenshots. M09 is authorized after the separate plan-amendment PR.
- **M09 complete** — declarative slots, nested builder/commands, Tabs and wrappers; PR #10 merged on first-attempt green CI. M09a is merged (PR #11); M09b implementation PR #13 merged on first-attempt green [Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39785290329); owner review fixes and screenshot approval remain open. M09c and M10a/M10b are not started.
- `main` includes the reviewed M07 housekeeping bootstrap (PR #1); all milestone branches and
  m00-done…m07-done tags are preserved at their original heads.
- Housekeeping delivery: [PR #1](https://github.com/nawinisha231272-wm/formkit/pull/1) and
  [ci-linux-baseline PR #2](https://github.com/nawinisha231272-wm/formkit/pull/2). M08 delivery PR #5 is merged; the gate closure is recorded below under the revised owner decision.

## Open questions

No open questions from the pre-M08 housekeeping review. The two decisions are recorded below.

## M09b owner review fixes — 2026-10-22

Branch `m09b-owner-review`, from merged PR #13 (`f1b9ac7`). M09b stays open for screenshot approval.
Owner review replaces the initial UI contracts where stated: sentence-first synchronized expression
editing, searchable keyboard pickers, one-row desktop header, persisted Builder look, palette icons/order,
layout titles, quieter summary, supported Display metadata/header path, destinations in More, filled
Material read-only fields, focus-following selection and host-confirmed saving. Select additions receive
two editable options; Issues flags empty Select/Radio options. Preserve the trial report verbatim and
record product changes separately in fixes.md. Update only affected platform screenshots, run full pinned
verify, and send images for approval. Propose M09b+ in spec 10; do not implement it or start M09c.

Order: shared picker/expression editor → save/focus/options contracts → header/palette/dialog/styles →
regressions and scoped visual generation → full pinned verify and owner review. Risks: preserving
arbitrary expressions without lossy row conversion, atomic draft history, stale save acknowledgements,
focus on rerender and the unchanged 30 kB builder budget.

## M09b — implementation in progress

Branch m09b-builder-ux, from plan PR #12 merged as 485c7db. Its exact tested tree passed both
[PR verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39650317868) and
[push verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39650306645), attempt 1;
268 unit / 711 browser / 16 size / 5 deterministic count checks. Advisory A/B run
[39650318003](https://github.com/nawinisha231272-wm/formkit/actions/runs/39650318003) passed too.
No implementation source was changed before that merge. Local CI log: /tmp/m09b-plan-ci-39650317868.log.

Ordered work: primitives and safe --ofb-\* contracts → Neutral → Material form → matching/pinned/custom
builder themes → screens 1/2/5, commands/draft editor/Pointer Events → browser/host/contrast/visual/drag
checks → fresh guide-only author exercise → full pinned verify and owner screenshot sign-off.
Risks: atomic drawer history, native preview ownership, cached drag geometry, scope changes and locks.
Foundation evidence: initial workspace build/typecheck and seven safe-descriptor/Neutral contrast/API
checks pass (/tmp/m09b-foundation-\*.log). This does not pass browser or milestone acceptance yet. M09c/root logic remains out of scope.

Owner clarification (2026-10-21): `locked` matches component id or key with key/structure/all levels.
readOnlyKeys remains shorthand for structure. Enforce locks in builder-core, including JSON imports,
and show lock icons, explanatory disabled actions and protected properties in the dialog. Structure
permits same-scope moves and ordinary property edits; all permits only read-only JSON inspection.

Owner clarification (2026-10-21): modal additions are private drafts until Save; component and settings
commit as one Add command (for example “Add Email”). Cancel/Escape/Close discard without history or
schema events, restoring pre-drop selection and focus. Drawer additions commit on drop, with later
live edits as separate steps. openOnAdd:false commits defaults without an editor. Paste, Duplicate
and Wrap each commit once and never open settings. Acceptance checks are in progress.

### Editing and workbench checks (work continues)

Modal Add semantics are recorded in spec 10/ADR-0016 and implemented with a prepared Add command.
94 focused command/theme/message checks passed after building package exports
(/tmp/m09b-add-unit-2.log). The nine settings tests passed in Chromium, Firefox and WebKit (27 checks;
/tmp/m09b-add-browser.log, /tmp/m09b-add-browser-other.log). New workbench modes, active design tabs,
clipboard toolbar/context/shortcut routes and React native draft-context isolation passed 15 Chromium
checks (/tmp/m09b-workbench-browser-2.log). The native probe writes through useForm and confirms
that no main schema event/history entry is published. Build/Logic metadata, palette/mini-palette and
pointer refinements are still being checked; these focused results do not establish M09b completion.

Retained development failures: /tmp/m09b-add-typecheck.log and /tmp/m09b-add-unit.log used stale
built package exports before the prepared Add API was rebuilt; rebuilt exports pass. The first
workbench build still referenced the removed inline inspector renderer (fixed in build-2).
/tmp/m09b-workbench-browser.log passed 13 checks but its theme-select test used an exact wrapped-label
lookup; corrected to the actual accessible combobox name without changing its assertions. The
comparison then passed. /tmp/m09b-editors-native-unit.log caught the expected new Logic group missing
from an existing metadata-group assertion (107 passed / 1 failed); the assertion now includes Logic
while retaining the original groups and all property checks. No timeouts, thresholds or budgets changed.

A further 108 focused unit checks passed after adding Logic metadata and native-controller binding
(/tmp/m09b-checkpoint-unit.log). Full workspace typecheck passes (41 tasks plus the test project;
/tmp/m09b-checkpoint-typecheck-2.log). The first attempt caught missing Vite CSS-module declarations for
the self-hosted font imports; the browser entry now declares Vite client types explicitly.

The combined all-browser pointer/settings/workbench run passed 52/54 checks
(/tmp/m09b-pointer-browser.log). Both failures caught a real cancellation bug: mouse-up could fire a
palette click after Escape. The pointer controller now suppresses that follow-up click; its regression
checks pass in all three browsers (9 checks, /tmp/m09b-pointer-browser-2.log). The budget check also caught the builder at 30.47 kB against the unchanged 30 kB
limit (/tmp/m09b-checkpoint-size.log). Production output is now minified with source maps, and its size
and behavior are checked below. No limits or correctness assertions were relaxed.

Checkpoint: workspace lint passes (/tmp/m09b-checkpoint-lint.log); 109 focused unit tests pass
(/tmp/m09b-checkpoint-unit-2.log); all 17 package size budgets pass with the minified builder at
25.42 kB against the original 30 kB budget (/tmp/m09b-checkpoint-size-2.log). The minified build's
all-browser regression passes all 54 tests (/tmp/m09b-checkpoint-browser.log). Full pinned verify has not yet
passed this implementation. Existing builder acceptance tests still need their flows updated for the
new modal/mode UI while retaining every prior assertion's intent. Remaining M09b work includes the
outline/selected-component panel, complete keyboard slots/actions/host option coverage, the 12-field
nested task, theme/density and visual QA, the 500-field trace, fresh-author evidence and owner sign-off.

### Nested workbench follow-up (work continues)

The sidebar now provides Outline/Issues/History and compiled selected-component details. Virtual tab
and column rows expose every declared slot to keyboard paste, including inactive tabs. The approved
playground fixture has exactly 12 value fields and an SDK-only Customer reference registration.
A public `createBuilder(element, definition, options)` convenience factory is documented/tested;
phone widths use a real read-only preview and retain data/schema/history across resize.

Evidence: 63 pointer/settings/workbench checks passed in all three browsers
(/tmp/m09b-demo-outline-browser.log). Six retained builder acceptance flows and nine workbench checks
passed in Chromium (/tmp/m09b-legacy-builder-browser.log). All seven nested-builder flows passed
(/tmp/m09b-nested-browser-2.log), including mouse and keyboard four-level construction, illegal slots,
JSON/expression atomicity, descendant refusal and per-column paste/undo/redo. The existing DOM runtime
visuals pass in all four original themes with their unchanged baseline bytes and 2% threshold
(/tmp/m09b-host-dom-visual-5.log); captures retain the original runtime viewport/font/hover geometry.
Native host tests now expect one Add event for initial settings, as the owner explicitly required;
all patch replay, context, accessibility, lifecycle and focus assertions remain. Material joins the
six-host interaction/accessibility matrix. The full host matrix has not passed yet.

The twelve-field task is constructed from empty by actual pointer drops and keyboard input, without
command injection. Mouse passed in all three engines in /tmp/m09b-task-options-nested-matrix.log;
keyboard then passed in all three in /tmp/m09b-task-keyboard-matrix-3.log. Tests include six fields per
column, the exact stable-id conditional expression, custom component, 15 atomic Adds and live Preview.
Host palette/toolbar/editor/message/icon and all three lock levels passed in all browsers in the first
matrix (30 PASS / 3 keyboard task test-author failures). The keyboard test now uses native select
label typeahead rather than assuming identical native popup arrow behavior across engines.

All 20 Chromium theme/mode/density combinations pass axe with dialogs both open and closed, and
active pointer capture/drop survives appearance changes (/tmp/m09b-appearance-task-chromium.log,
22 PASS / 1 old keyboard-select test failure). Further coverage and full pinned verification remain.
The guide is apps/docs/builder-author-guide.md. `pnpm benchmark:builder` records an isolated 500-field
Chromium timeline outside verify; its actual 50ms acceptance evidence is still pending.

Retained failures: /tmp/m09b-nested-browser.log found Enter on an empty column opened its parent's
settings (fixed), a hidden/unselected handle test setup and the wrong draft error selector (fixed).
/tmp/m09b-task-options-browser.log caught Enter on toolbar buttons bubbling into Edit (fixed), plus
incorrect single-slot test selectors and expression key/id confusion. The -2 task log and keyboard
matrix -2 retained incorrect native-select assumptions; -3 passes after choosing the visible label.
Visual diagnostics /tmp/m09b-host-dom-browser.log and -visual-2/3/4 retain crop/font/hover differences;
-visual-5 compares successfully without baseline or threshold changes. A code inspection caught
repeated signal/lock decorations on restyle (removed before each decorate) and synthetic read-only
appearance on inert design controls (now schema state only). New regressions still need verification.
M09b is not complete: full verify, remaining host/visual/drag checks, independent author evidence and
owner implementation-screenshot sign-off remain. M09c has not started.

### Expanded verification and source comparison (work continues)

Frozen install, complete typecheck and lint pass (/tmp/m09b-final-install.log,
/tmp/m09b-final-typecheck.log, /tmp/m09b-final-lint.log). The full unit run passes **298 tests in 42 files**;
core coverage is **91.04%** and validation **99.25%** (/tmp/m09b-current-unit.log). All 95 Chromium
host/workbench checks pass, including original preview PNGs, Material host interactions/axe, protected
state, active tabs, phone resize and rounded/elevated Material cards (/tmp/m09b-host-workbench-chromium.log).
Each of eight actions is exercised through toolbar, context menu and shortcut, with exact undo/redo:
24 Chromium checks pass (/tmp/m09b-actions-chromium.log). These results do not replace full pinned verify.

The 500-field trace now includes pickup and existing-field movement. Initial 127.921ms palette pickup
was a real full-tree style invalidation; changing inherited selection/cursor styles is removed.
An expanded workload found a 53.985ms existing-field task; unchanged selection attributes are no longer
rewritten, roots are cached and hidden toolbars take no layout work. Final largest overlapping tasks:
**47.981ms palette, 15.856ms existing field**, including actual edge auto-scroll (80 moves each).
Retained traces, hashes, commands and interpretation are in docs/performance/m09b-builder-drag.md.
The command remains separate from verify/CI deterministic count gates; Linux calibration is untouched.

Visual inspection caught and fixed the demo's outer-page scroll, artificial read-only appearance in
inert controls, repeated signal/lock decorations, rounded Material card specificity and a design-only
wrapper that broke filled submit-button selectors. The direct button root is now inert without changing
theme DOM. Dialogs align with the source's top inset. Error preview validates only the selected subtree
and cannot call the host submission callback. Virtual slots can collapse/expand by keyboard and cannot
accidentally run their owner's Delete/context actions. Their caret icons use the same Lucide library.

New workbench images cover screens 1/2/5 at the source viewports; the screen-5 page renders one definition
in Bootstrap 4, Bootstrap 5 and Material plus a dark compact builder. Initial missing-image captures and
intermediate, unreviewed images are retained in visual-results; only these new uncommitted captures
have been replaced during design iteration. No original baseline byte or threshold changes.
Seven final macOS captures passed generation (/tmp/m09b-workbench-visual-record-final.log); they still
need the final icon capture, Linux generation/comparison and owner approval. Source-vs-implementation
comparisons are being recorded in design-qa.md. The earlier -record.log intentionally retained six
missing-image failures; -record-2/3 record explicit new-only revisions. A new inert assertion initially
expected the empty-string serialization; the corrected check asserts the actual inert DOM property.

Owner authorization for the independent trial: start an isolated sub-agent only after the verified
M09b branch is pushed, clone GitHub at a recorded SHA, provide no conversation/implementation context
or local files, and permit only builder docs, CLI help and the running builder. Forbid package sources,
specs, ADRs, tests and progress.md. Timebox 90 minutes; retain TRIAL-REPORT.md verbatim with the exact
prompt in docs/rehearsals/m09b-builder/; responses belong in fixes.md. Record provenance exactly as
“isolated sub-agent, no conversation context, clean clone at <SHA>”. Fix all gaps, re-verify and merge
before stopping for owner review. The trial has **not started** and M09b remains open.

### Final visual checkpoint and pinned verification (work continues)

All seven new macOS workbench captures are recorded. Linux generation and immediate comparison both
pass **7/7** inside the official digest-pinned Playwright 1.56.1 image
(`/tmp/m09b-linux-workbench.log`, retained `visual-results/generation.log` and `themes.log`). The
existing 338 committed screenshots are unchanged; seven platform-specific workbench images were added
on each platform. Root `design-qa.md` records full-view/focused source comparisons, fixed findings,
intentional metadata/runtime-theme differences and pending owner implementation-image approval.
The gallery's compact builder fits completely within 1440×1000 (bottom 994.90px), has no horizontal
overflow and no browser console errors. Its heading styles no longer leak into SDK content. Material
submit buttons retain content-width pills. New image generation is not owner screenshot sign-off.

Full pinned local verify is running with CI=true and fresh owned servers
(`/tmp/m09b-full-pinned-verify.log`). No verified implementation branch has been pushed yet; the
isolated author exercise remains pending until that prerequisite passes. No M09c work has begun.

### Verified checkpoint before independent author trial

**PASS — full pinned verify, exit 0**, with fresh servers and CI=true:
`npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify`.
Log: `/tmp/m09b-full-pinned-verify.log`. Lint/build/typecheck, **298 unit tests (42 files)**,
**1,017 browser tests** across Chromium/Firefox/WebKit, **17 size budgets** and **five deterministic
count checks** all pass. Core line coverage 91.04%; validation 99.25%. Builder is **27.83 kB** against
the unchanged 30 kB budget; Material is 1.20 kB against its 10 kB budget. No correctness, coverage,
visual, count, timing or size threshold was relaxed. Earlier failures remain recorded above.

The task script passes both actual pointer-only and keyboard-only routes in all three browsers.
`builder-actions.spec.ts` checks all eight toolbar/context/shortcut routes and exact history replay;
`builder-appearance.spec.ts` covers all five themes × two modes × two densities with open/closed axe,
focus/history/dialog identity and active-drag switching. `builder-hosts.spec.ts` covers six real hosts,
all five themes, native context/events/focus/teardown and original platform PNGs. Pointer/gesture,
settings, locks/options, sidebar/slots/phone and custom-component checks pass in the same full matrix.
`packages/builder/tests/theme.test.ts` checks tokens-only chrome and all-theme contrast; SDK safe-theme
and Material conformance/visual checks pass. The separate 500-field trace result remains as recorded.

This checkpoint is eligible to push for the owner's isolated guide-only trial. It is **not** M09b
closure: the trial, any resulting fixes, first-attempt current-head PR CI/merge and owner screenshot
review remain outstanding. The verbatim trial report is excluded from automatic formatting only to
honour the owner's preservation requirement. M09c has not started.

### Pushed checkpoint and native Linux CI

The complete verified tree is pushed as **90f99dd64aa58fd2b6df83d371ce2d90148ead64**. Native Linux
[Verify 39714060389](https://github.com/nawinisha231272-wm/formkit/actions/runs/39714060389) passes on
**attempt 1**: 298 unit, 1,017 browser, 17 size and five deterministic count checks. Log retained at
`/tmp/m09b-linux-ci-39714060389.log`. Existing Linux screenshots compare successfully; no baseline or
correctness threshold changed.

Retained packaging failure: the first implementation push `89fc1c7` accidentally omitted three fixture
files that were present during local verify. Post-push git-status auditing caught this before the trial.
Commit `90f99dd` adds those exact verified fixtures. The incomplete push's
[run 39714029970](https://github.com/nawinisha231272-wm/formkit/actions/runs/39714029970) failed attempt 1
on the missing customer-onboarding JSON import; it was not re-run. Failure log:
`/tmp/m09b-incomplete-push-ci-39714029970.log`. This was a staging error, not a relaxed check or a flake.

The first isolated author-agent invocation ended at the account usage limit before producing a trial
report. It supplies **no acceptance evidence**. Following the owner's continuation request, a new
no-context sub-agent starts the same exact prompt and clean GitHub SHA protocol; the saved prompt is
`docs/rehearsals/m09b-builder/prompt.txt`. Provenance for the active trial:
**isolated sub-agent, no conversation context, clean clone at 90f99dd64aa58fd2b6df83d371ce2d90148ead64**.
The report and findings/fixes are pending. M09b remains open; M09c is untouched.

### Final Material coverage review (verification pending)

A final implementation review found legacy four-theme lists in the shared Tier 1 conformance helper,
Tabs/SDK-native matrices, six-host preview visuals and three playground selectors, despite the test
kit already exporting five theme names. Material now joins those lists; current author guides and
support specifications say five themes consistently. This is required M09b theme coverage, not M09c.
The earlier green 90f99dd checkpoint and its evidence remain; an expanded full verification is now
required before merge. New Material-only screenshots will be recorded separately on macOS and inside
the pinned Linux image. Original baseline files and every threshold remain unchanged.

The author trial continues on its original immutable SHA, independently of these local changes.

### Independent author trial and responses — 2026-10-22

**PASS, with disclosed limitations — isolated sub-agent, no conversation context, clean clone at
90f99dd64aa58fd2b6df83d371ce2d90148ead64**. Author `/root/m09b_author_trial_retry` used only the
builder docs, executable help and running builder. Trial ran 11:22:56–12:14:03 UTC (51m 7s), first
visible render at 11:24:19 UTC. Both mouse-only and keyboard-only routes exported the exact 12-field
Tabs > Panel > Columns form, six fields per column, one custom component and stable-id conditional.
The verbatim report, exact prompt, original exports, screenshots and logs are in
`docs/rehearsals/m09b-builder/`; report SHA-256
`ff3238c58bba1c4f0b78a4d53c9258ef79b1bba3bc8d127493e3d46d1426923d`.

`fixes.md` separately answers every finding. Guide fixes cover the actual CLI executable, evidence
outside the checkout, native select typeahead, selection/action targets, Copy/Paste/history, Preview
readiness, Select options, pane screenshots and dev-server reload, and fetching origin/main after a
single-branch clone. A new regression checks End/Up selection before Copy/Duplicate in all browsers;
a second checks the documented Select options editor and live/saved Material preview. No product
focus failure was reproduced. The browser visibility detour was a tooling limitation.

The author preserved two local setup failures: untracked export formatting, then missing origin/main
from an added single-branch flag. At the same SHA, after moving exports and fetching main, full verify
passed (298 unit / 1,017 browser / 17 size / five count checks). These are not CI re-runs. The report
discloses an accidental BODY observation containing inline CSS (unused; no forbidden repository file
opened), partial supplementary screenshots and four dragged additions followed by palette clicks.
No hidden implementation assistance was supplied. Human SDK and builder guide usability remain M11
requirements. The trial does not approve implementation images; owner screenshot sign-off is pending.
Expanded final verification and current-head first-attempt PR CI/merge remain required below.

### Expanded focused checks and retained wrapper failure

The two trial-follow-up regressions pass all three engines: End/Up selection before Copy/Duplicate
(`/tmp/m09b-material-additions-mac-record.log`) and generated Select options/live Material preview,
saved selection and exact undo (`/tmp/m09b-select-options-browser.log`). macOS Material-only generation
passes 30 selected checks. Linux new-only generation and immediate comparison pass all 15 selected
cases each, adding 18 images per platform without modifying the 314 baselines on main.
The overwrite guard refuses a second record before invoking Docker (exit 2).

Retained orchestration failure: `/tmp/m09b-linux-material-additions.log` ends with shell exit 127 after
all container checks and image copying succeeded. The implementation agent edited the running wrapper
on disk, shifting its shell read position; the stable file passes `sh -n`. A fresh comparison-only run
of the unchanged script is required before claiming the complete command passes. No image is regenerated
and no assertion or deadline changes. Raw passed image logs are archived in
`visual-results/m09b-material-generation-passed/`. Final full pinned verify remains required.

Stable-script confirmation: `sh scripts/linux-visuals.sh check material-additions` now **PASS, exit 0**
(`/tmp/m09b-linux-material-check.log`): three Tabs, three SDK composite/native and six host cases.
The baseline inventory adds 37 PNGs per platform (Material and workbench combined). All 314 existing
main baseline files, including directory keep files, remain byte-identical. This does not grant owner
implementation-image approval. The full expanded local verification follows.

### Final expanded pinned verification — PASS

`CI=true npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify` exits **0**.
Log `/tmp/m09b-expanded-full-verify.log`: lint/format, all builds/types, **298 unit tests in 42 files**,
**1,050 browser cases**, **17 size budgets**, **five deterministic count checks** pass. Core 91.04%
and validation 99.25% line coverage; builder 27.83 kB/30 kB and Material 1.20 kB/10 kB. The expanded
Material matrix and both trial regression cases pass in all three browsers. All original baseline
files and thresholds remain unchanged. The immutable report/artifact hashes match provenance.json.

Independent author criterion: PASS with the original report's disclosed limits. Findings fixed or
clarified with evidence in `docs/rehearsals/m09b-builder/fixes.md`. Human guide usability stays M11.
The M09b implementation PR will carry these fixes and this record, with current-head first-attempt
check URLs recorded in its description and merge report. Merge only on
green first-attempt CI. No failed workflow is re-run to obtain green. Owner implementation-image
approval remains pending, so the combined visual acceptance checkbox is intentionally open.
Stop for owner review after merge. M09c is not started.

### Foundation checks (work continues)

Safe descriptor/Neutral checks passed initially (7 tests); expanded command/theme/lock/edit-session
checks passed (102 tests, /tmp/m09b-editing-unit.log). Workspace build and public typecheck pass
(/tmp/m09b-editing-build.log, /tmp/m09b-public-typecheck.log). Material browser conformance/axe/read-only
and 12 newly recorded macOS images pass in all three browsers (18 tests); comparison-only run also
passes (/tmp/m09b-material-record.log, /tmp/m09b-material-check.log). Existing committed PNGs are unchanged.
New images remain unapproved. Linux Material generation and comparison passed (12 + 12 tests,
/tmp/m09b-linux-material.log); screens 1/2/5 implementation sign-off remains pending.

Retained failures: /tmp/m09b-themes-build.log recorded a readonly-array type narrowing error in lock
options (fixed without casts to any); /tmp/m09b-material-browser.log used an over-anchored grep and
found no tests; /tmp/m09b-material-browser-2.log records missing new snapshots. All behavioral/axe
assertions reached before those missing snapshots passed. Visual inspection found help text above
the outlined input; the CSS order was fixed before recording. The unapproved first captures are kept
in visual-results/m09b-material-before-layout-fix, separate from committed baselines. No thresholds changed.

## Approved UX plan — 2026-10-21

The owner approved the builder UX designs on **2026-10-21**. Builder themes are required, not optional.
Specs 10/11 and the unchanged exported mockups are saved under docs/spec and docs/design respectively.
The reference HTML is visual evidence, not implementation code. M09a is merged as PR #11 (ef3edfd),
with final head 337999b passing first-attempt CI and full pinned verify (268 unit / 711 browser).

Plan-only PR first, merged only on first-run green CI. Then M09b order: builder primitives/--ofb-\* →
Neutral builder theme → Material form theme → other builder themes and match-form → screens 1/2/5.
M09c owns screen 3 and the root logic-rule engine; M10a adds Table and screen 4 grid/edit-grid authoring.
Existing compact expressions remain available in M09b; future unregistered palette components are not
simulated. Preserve correctness thresholds, platform baselines and the complete existing test intent.

Risks and evidence: accessible pointer/keyboard parity, atomic dialog/drawer undo behavior, theme/focus/
DOM preservation, contrast in all themes/modes/densities, no >50 ms drag task at 500 fields, independent
fresh-session author exercise and owner implementation-screenshot approval. The approved designs are
not approval of future generated baselines. No M09c implementation begins before owner review.

## M09a — Column storage and palette contract (locally verified)

Branch: m09a-columns, from merged M09 (PR #10, 5e1a5f2). Plan: introduce canonical per-column
wire storage and shared traversal; migrate legacy flat width spans without mutating input; route
compile, structural commands and submission schema through column children; filter palette by explicit
builder titles and hide demo registrations by default; add focused migration/drop/move/paste/history
and JSON Schema tests, then full pinned verify and first-attempt current-head CI before PR merge.
No M09b interaction implementation or visual polish belongs to this change.

The current builder UI is a **harness**. Spec 10 (M09b) replaces it with Pointer Events dragging,
drop indicators only while dragging, selection by click, only the active tab on the canvas, and a
tabbed edit dialog. Its existing controls remain here only to exercise engine/schema behavior.

Migration must also handle legacy multi-row grids in onboarding. Preserve field IDs, data scopes,
expressions, widths and reading order; pack old spans into rows and represent multiple mixed-width
rows as nested transparent Columns. Empty trailing space becomes an empty column. Canonical column
widths are integers 1..12 summing to 12. ADR-0015 records the wire/slot and migration decisions.

### Implementation and development checks

Canonical storage is consumed by schema migration/validation, compiled parent-slot metadata,
composite expansion, structural commands, runtime attachment and the existing authoring harness.
Ordinary layouts/Tabs retain components plus optional child slot. All column descendants remain
transparent to data scope; keyed Containers still introduce object paths. JSON Patch points at actual
columns/<index>/components arrays. The default playground excludes employeeObject, SDK card and
Root section registrations; ?demos explicitly restores the existing demo tests. A registered model
without a nonblank builder.title remains usable by the engine but is absent from the palette.

Focused evidence: `packages/schema/tests/columns.test.ts` covers legacy migration, multiple rows,
malformed/mixed storage and immutable/idempotent traversal; `packages/builder-core/tests/columns.test.ts`
covers drops, cross-column moves, exact patches/history, subtree commands, scoped uniqueness,
canonical import, submission JSON Schema and explicit palette titles. Core slots and SDK layout tests
cover effective slots and namespaced composite IDs/references inside columns. The real keyboard paste
case is `column keyboard paste uses the selected collection, replays changes and restores history`.
The existing 50 seeded command sequences now also traverse canonical columns.

Development failure records: `/tmp/m09a-columns-unit.log` (a new test collided with the built-in
hidden type), `/tmp/m09a-columns-integration.log` (a test used an ID where setValue takes a data path),
and `/tmp/m09a-browser-focused.log` (two old flat-fixture/default-demo assumptions, an off-screen
Firefox drag destination and WebKit flex-wrapper intrinsic sizing). Tests use the canonical path and
explicit ?demos; the mouse viewport accommodates both endpoints while retaining the visibility
assertion. Grid column wrappers fix the WebKit extra space, diagnosed in
`/tmp/m09a-column-sizing.log` and `/tmp/m09a-column-sizing2.log`. No screenshot baseline, timeout,
pixel tolerance, size budget or work-count expectation is changed. The interrupted
`/tmp/m09a-browser-fixed.log` exposed one remaining old Contents indicator selector; it now names
Column 1 and retains the same cycle/root-only/atomicity assertions. The corrected focused browser run
passes all 51 cases (`/tmp/m09a-browser-fixed2.log`).

### Acceptance and final local verification — PASS

| Criterion                                                                        | Status / evidence                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical per-column storage, valid width sum and immutable/idempotent migration | PASS — schema columns tests: legacy single/multiple rows, gaps/ID collisions, mixed/malformed storage and shared traversal                                                                                                        |
| Drop and move target the selected column                                         | PASS — builder-core `column drops and cross-column moves patch actual collections and undo/redo every byte`; browser `mouse drag builds four levels in declared slots with zero container-specific builder code`                  |
| Keyboard paste and exact history                                                 | PASS — browser `column keyboard paste uses the selected collection, replays changes and restores history`, all three browsers; 50 seeded command sequences include column descendants                                             |
| Submission JSON Schema and composite traversal                                   | PASS — builder-core `submission JSON Schema is transparent across columns including nested object scopes`; SDK `composite column templates migrate and namespace nested ids and references per instance`                          |
| Explicit palette title and hidden default demos                                  | PASS — builder-core `palette requires an explicit nonblank builder title independently of renderer title`; browser `default harness palette hides demos and opt-in restores their engine checks`                                  |
| Contract documentation and M09b boundary                                         | PASS — ADR-0015, specs 01/04/07/10, package READMEs and changeset; harness replacement requirements recorded above                                                                                                                |
| Full pinned verify locally (initial implementation 174663f)                      | PASS — `CI=true caffeinate -i npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify`, exit 0, `/tmp/m09a-verify.log`: 267 unit tests, 711 browser tests, 16 size budgets and 5 deterministic count checks |

Core line coverage is 91.01%; validation is 99.25%, above the unchanged 90% requirement. All 312
committed macOS/Linux PNGs are unchanged. Local visual comparisons use darwin-arm64 only; the native
Linux CI checks linux-x64 against its own baselines in the pinned official Playwright image. Wall-clock
benchmarks remain isolated advisory CI jobs. Final documentation formatting/lint is checked after
these evidence notes. The PR delivery record holds the exact current-head CI URLs and merge evidence;
merge is permitted only after first-attempt green CI, without reruns to obtain green. M09b is not started.

### Advisory timing follow-up

Initial head 174663f passed all three workflows on attempt 1:
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39637930580),
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39637909414), and the advisory
run below. The follow-up head must independently pass before merge; these runs are never rerun.

The first implementation's [isolated Linux A/B run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39637930385)
passed on attempt 1, but reported compile ratios of 1.400/1.547/1.719 for 100/500/1,000 fields. Mount,
edit and theme ratios remained approximately 1.0. This is advisory evidence, not a failed hard gate;
all baselines and this record are retained. Profiling identified repeated column-only schema
condition checks on ordinary fields. The follow-up skips those provably inapplicable conditions,
avoids a JSON copy when no legacy Columns exists, and avoids allocating intermediate collections for
ordinary child traversal. Published-schema parity tests protect the discriminator shortcut; column
shape, width and semantic checks remain intact. All 86 focused tests pass (`/tmp/m09a-fast-unit.log`). The final full unit run also
passes all 268 tests with core line coverage 91.01%; final browser/CI outcomes are in the PR delivery record.
A same-host Node 22.22.3 diagnostic with identical profiling flags measured 16.08 ms before and 11.50 ms
after for 1,000 ordinary fields (`/tmp/m09a-compile-profile.log`, `/tmp/m09a-compile-fast-profile.log`).
These diagnostic samples do not replace any stored platform baseline. The revised source gets a new
commit and first-attempt CI, never a workflow rerun. Final full local verification is logged in
`/tmp/m09a-verify-final.log`; the PR delivery record records its outcome and the final CI URLs.

## M09 — Builder with nested drag and drop

Prerequisites merged on first-run green CI: [M08 approval PR #8](https://github.com/nawinisha231272-wm/formkit/pull/8)
(2976f54) and [plan amendment PR #9](https://github.com/nawinisha231272-wm/formkit/pull/9) (ee57b3e).
Implementation branch: m09-builder. Follow ADR-0014 and the amended M09 acceptance checklist.
Plan: shared slot contracts/validation; nested commands, scoped keys and bounded history; Tabs and
renderer design mode; reusable builder UI and wrappers; automated mouse/keyboard/host/theme evidence;
full pinned verify and initial-green CI. Preserve old images/counts and stop after M09.

### Implementation and focused evidence

Shared ComponentSlot/resolveSlots and optional child slot placement are consumed by compile, commands,
renderer and UI. Slots validate names/kinds/types/capacity/root-only placement; default old layouts keep
omitted wire slots. Optional slot labelKey preserves M08 literal-by-default captions with an English fallback.
Tabs uses configurable stable option values; all panels remain mounted at runtime
and visible in design mode. The UI has generic nested indicators/palette, generated property and
expression-row editors, editable JSON, live preview, outline and mouse/keyboard authoring. The new
@ourform/builder package has only internal runtime dependencies. DOM, light/shadow custom-element,
React and Angular22/21 wrappers preserve owner context/DI and publish nonempty schema patches only.

Focused evidence (final full verification follows below):

- Headless slots, commands and runtime: `/tmp/m09-runtime-node.log`, 76 passing cases, including
  50 seeded sequences with 50 operations each, independent patch replay and byte-identical undo/redo.
- Mouse and keyboard four-level authoring, atomic generic SDK field-only slot rejection and
  authoring-button identity: `tests/e2e/nested-builder.spec.ts`; expression JSON/row regression
  `/tmp/m09-expression-fixed.log` passes. No builder code recognizes built-in container types.
- Tabs runtime: `/tmp/m09-mac-tabs-record.log`, 18 passing cases (three browsers, four themes plus
  read-only/disabled cases). Error summary links reveal hidden targets; API writes stay available.
- Native builder hosts: all 24 Chromium host/theme cases passed during baseline recording. Final
  host matrix also independently replays every emitted patch and checks controlled echoes/context,
  native generated editors, focus/caret, teardown and zero serious/critical axe violations.
- Public contracts/readmes/specs and additive SDK inventory are updated; ADR-0014 implements the
  accepted plan. Starter review row8 is closed by full commands plus command-only production UI.

Development failures are retained in `/tmp/m09-*.log`. Initial new-test assumptions used diagnostic
codes where drag preflight shows an English reason, an implicit select label instead of role/name,
and automatic field focus/initial-data reset instead of the existing summary-focus/empty-reset contract.
Corrected tests preserve those contracts. Angular's new fixture initially used untransformed decorator
syntax; it now follows the existing examples' explicit Component registration. Shared form/data fixtures
now live together under forms/nested-tabs, matching the onboarding convention; 34 affected Node cases
pass in `/tmp/m09-fixture-fixed.log`. A concurrent initial unit run hit the existing 180-second CLI proof
deadline while recording browser images; final verify runs alone. No timeout, pixel tolerance,
correctness assertion, old baseline or deterministic count is relaxed. The initial pinned Linux image
run stopped before test discovery because the new host test directly imported JSON without Node's
required import attribute (`/tmp/m09-linux-new-visuals.log`). It now reads the shared fixture with
readFileSync/JSON.parse, matching existing browser tests; the corrected run has its own log. A newly added theme
assertion then selected a descendant .of-root instead of the preview mount itself; corrected that test
selector. The interrupted diagnostic log is `/tmp/m09-linux-theme-selector-failure.log`; the final
record/comparison run is `/tmp/m09-linux-visuals-split-hosts.log`. Existing assertions are unchanged. The combined React/Tailwind host scenario
then exceeded its unchanged 30-second deadline during axe under x64 emulation. The new host suite now
separates authoring/lifecycle from accessibility, retaining every assertion and timeout; native/chrome
axe coverage still spans every host/theme/browser. A later emulated Angular bootstrap5 case observed
Base while the initial controlled-theme update was pending; the fixture's builderTheme helper now
awaits Angular ApplicationRef.whenStable before and after its signal update, rather than treating
visible child DOM as completed host initialization. `/tmp/m09-linux-angular-theme-readiness.log`
retains that failure. No timeout was extended. Ten fresh native Chromium mounts across Angular22/21
then pass in `/tmp/m09-angular-controlled-theme-repetition.log`; the emulated run must also pass. The next
emulated React case consumed its deadline after snapshot capture, before native authoring began
(`/tmp/m09-linux-host-image-authoring-timeout.log`). Dedicated image cases now preserve those same
captures, while separate full-matrix authoring/lifecycle and accessibility cases retain the original
checks and 30-second deadline. The Linux image helper runs only screenshot cases: runtime Tabs in
three browsers plus all host/theme previews in Chromium, matching the documented image matrix.
Full pnpm verify still runs all three groups for every host/theme/browser. The final image log is
`/tmp/m09-linux-visuals-only.log`. Runtime Tabs also completed both images before an
emulated WebKit case hit its deadline in a later caret assertion (`/tmp/m09-linux-tabs-combined-timeout.log`).
Tabs image capture is now its own case too; every keyboard/validation/caret/reset/axe assertion remains
in the functional matrix with the unchanged timeout. Final image evidence will be recorded from
`/tmp/m09-linux-visuals-separated.log`. Original log: `/tmp/m09-linux-host-combined-timeout.log`.

### Final verification and interaction corrections

The first full pinned verify reached 257 passing unit cases (core 92.11%, validation 99.25% line coverage)
and 698/705 passing browser cases. Its seven failures were confined to the new nested-builder
interaction tests; the original cases and every new screenshot comparison passed. Preserve the log:
`/tmp/m09-full-pinned-verify-nested-failures.log`. A preceding strict-type failure caused by Playwright's
recursive FormDefinition argument serialization was fixed by transporting the fixture as JSON text
(`/tmp/m09-full-pinned-verify-type-failure.log`). No public type was weakened.

The interaction fixes target the actual causes. The cycle test now clicks the selected tree item's own
caption, instead of its descendant-containing LI center. On macOS WebKit, keyboard-only traversal uses
Safari's native Option+Tab (Shift+Option+Tab backwards); other platforms use Tab. After a canvas paste,
Shift+Tab returns to the preceding outline without leaving the document into browser chrome. No mouse
or focus API substitutes for the keyboard-only authoring exercise.

Firefox's pinned engine starts a button drag from inner content but ignores empty button space,
matching [Mozilla bug 568313](https://bugzilla.mozilla.org/show_bug.cgi?id=568313#c23).
An invisible, aria-hidden inner span covers palette buttons and selection handles, retaining their
semantic buttons, in-flow captions, size and appearance. Real mouse gestures now start from the full
hit area, not just the text. No synthetic DragEvent or injected DataTransfer is used. Diagnostic logs
`/tmp/m09-firefox-*.log` retain the unsuccessful threshold, viewport, CSS and ancestor experiments.
The corrected nested suite passes all 15 cases across Chromium, Firefox and WebKit:
`/tmp/m09-nested-native-drag-surface.log`. No user Safari preferences were changed.

Linux visuals were generated and compared successfully in the exact official Playwright 1.56.1 image
recorded by scripts/linux-visuals.sh; final log `/tmp/m09-linux-visuals-separated.log`.
The new 96 images comprise 48 darwin-arm64 and 48 linux-x64 captures: Tabs' two panels in all four themes
and three browsers, plus six builder host modes in four themes in Chromium. AI inspection found no
clipping; this does not claim owner approval of M09 images. All 216 historical PNGs remain byte-identical
and performance baselines are unchanged (`/tmp/m09-baseline-integrity.json`).

### First CI submission and Linux drag-coordinate correction

The initial M09 head 0a446bf passed full pinned macOS verify but failed both Linux submissions on
attempt 1: [PR verify 39620569962](https://github.com/nawinisha231272-wm/formkit/actions/runs/39620569962)
and [push verify 39620546736](https://github.com/nawinisha231272-wm/formkit/actions/runs/39620546736).
Each ran 257 unit cases and 704/705 passing browser cases; the only failure was Firefox's first Tabs
palette drag. Neither run was retried. Original logs are `/tmp/m09-ci-pr-first-failure.log` and
`/tmp/m09-ci-push-first-failure.log`; GitHub retains their complete logs and error-context artifacts.
The advisory [five-pair A/B run 39620570579](https://github.com/nawinisha231272-wm/formkit/actions/runs/39620570579)
passed on attempt 1 (median PR/main ratios 0.974×–1.071×; advisory only).

Reproduced the failure in the exact pinned Linux Playwright image. The source's hover action scrolled
the long palette into view and moved the destination above the viewport (target y≈−133). Native
dragstart fired, but no drop could occur at that off-screen coordinate. The same four-level test
passes after using the existing palette search before each drag and a normal 1600×900 viewport.
The mouse helper now asserts that both bounding boxes remain fully on screen after hover, before
pressing the mouse. This preserves real gestures, every acceptance assertion and every deadline;
there is no synthetic drag, retry loop, pixel change or production-code change in this correction.

Reproduction log `/tmp/m09-linux-drag-diagnosis.log` preserves both the failing original and passing
filtered case, including geometry and native event traces. Diagnostics copied the same portable built
JavaScript into the official image and installed Linux dependencies from the frozen lockfile; they are
interaction evidence, not a new clean-build claim. The corrected complete nested suite's pinned Linux
result is PASS (15/15) in `/tmp/m09-linux-visible-endpoints.log`; the same 15/15 macOS cases pass
in `/tmp/m09-mac-visible-endpoints.log`. Lint and strict test types pass. Current-head full clean Linux build/verify
and final local verification must pass before merge; their links/results belong in the M09 PR evidence.

### Acceptance evidence — M09

| Criterion                                                               | Result | Evidence                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared slots and legacy default-slot JSON                               | PASS   | core `headless static slots are snapshotted; default legacy slots do not alter JSON`; derived-slot/schema-shape tests.                                                                                                                                                         |
| Registry-only Rating/native palette and generated properties            | PASS   | `builder.spec.ts`; every builder-host authoring case edits native generated properties without builder extension code.                                                                                                                                                         |
| Four-level mouse and independent keyboard construction                  | PASS   | `mouse drag builds four levels in declared slots with zero container-specific builder code`; `keyboard alone adds, configures, cuts into a slot, reparents, deletes and undoes`, all three browsers.                                                                           |
| Atomic visible drop refusals and SDK field-only slots                   | PASS   | core `compile validates accepts, capacity, missing slots, root placement and children of fields`; builder-core `declarative named slots build four levels; refused cycles/kinds/capacity/root-only drops preserve redo`; nested-browser generic-slot/cycle/root-only tests.    |
| All commands, scoped keys, stale paths and stable refs                  | PASS   | `cross-scope moves and ChangeKey re-check conflicts, warn stale paths and preserve ref ids`; subtree-duplicate and slot-local wrap/unwrap patch tests.                                                                                                                         |
| 50 random sequences, independent patch replay and byte-exact history    | PASS   | `seed %i: nested commands replay patches and undo/redo every JSON byte`, seeds 1–50 with 50 operations each; `bounded history and atomic JSON import retain exact snapshots and reject malformed drafts`.                                                                      |
| Accessible outline, keyboard move/delete and undo                       | PASS   | nested-builder keyboard and cycle tests use real keys; outline disclosure/selection and toolbar alternatives are covered.                                                                                                                                                      |
| Tabs conformance and visuals in all four themes/hosts                   | PASS   | `Tabs <theme>: keyboard, retained state, error reveal, reset and accessibility`; protected-write/API tests; Node validation/SSR tests; `builder-hosts.spec.ts` six host modes × four themes × three browsers.                                                                  |
| Wrappers, context/DI, replayable schema events, JSON/expression editors | PASS   | builder-host `Tabs, generated native editors, schema events, context, focus and teardown`; nested JSON/expression-row case and existing builder regression. Response edits and controlled echoes emit no schema changes.                                                       |
| Builder axe                                                             | PASS   | `native and chrome accessibility` for every host/theme/browser plus independent four-level builder axe. No serious/critical violations.                                                                                                                                        |
| Preserved baselines and deterministic budgets                           | PASS   | `/tmp/m09-baseline-integrity.json`: 216 old PNGs byte-identical, 96 new PNGs; existing count/size limits unchanged.                                                                                                                                                            |
| Full pinned verify                                                      | PASS   | `CI=true pnpm verify` with Node 22.22.3/pnpm 10.10.0 exits 0: lint, 23 builds, 39 typecheck tasks, 257 unit tests, 705 browser cases, 16 size budgets and five unchanged count cases. Core 92.11% and validation 99.25% line coverage. Log: `/tmp/m09-full-pinned-verify.log`. |

Runtime scope is explicit: schema edits recreate transient session/view state while retaining answers
for surviving field IDs; undo does not restore removed response data. Fixed composites remain
model-owned. There are no M10a/M10b features or external runtime dependencies. M11 retains the human
guide-usability pass. Delivery must pass current-head Linux verify on attempt 1 before merge; exact
remote run links are recorded in the M09 PR verification section. No workflow rerun is used for green.

## M09 plan amendment — implementation not started

The owner authorizes nested drag and drop after the M08 approval docs PR. Plan-only changes rename
M09, add the shared ComponentModel slot contract and optional child slot wire placement (ADR-0014),
move Tabs into M09, split M10 into M10a data structures and M10b advanced inputs, and retain M11/M12
numbering and human guide usability. Original M09 requirements (all commands, expression/property
editors, JSON/preview, DOM/custom-element/React/Angular wrappers, accessibility) remain in scope.

Implementation order after this plan PR merges: shared slot/schema contracts and invariants; nested
commands and bounded history; Tabs/runtime design support; reusable canvas/outline/property/JSON UI
and wrappers; mouse/keyboard/host/theme tests and new visuals; full pinned verify and first-run CI.
Risks: preserving old default-slot layouts/images, data-scope uniqueness/stale paths, subtree identity/
ref rebasing, and focus/native bridge cleanup. Mitigations are explicit tests and independent JSON
Patch replay over 50 random nested sequences. No performance/correctness/pixel thresholds change.
No M10 implementation is authorized by this milestone. Stop when M09 is complete.

## M08 owner gate and baseline approval

Owner reviewed the 24 Yes/No baseline images: approved.

The owner approved the M08 gate. The Full pinned verify checklist now cites the exit-zero log
`/tmp/m08-close-full-pinned-verify.log` and [closure PR #6 CI, attempt 1](https://github.com/nawinisha231272-wm/formkit/actions/runs/39523437523)
directly. This docs-only change records that decision; the M11 human guide-usability task remains.
The next authorized work is a separate plan-amendment PR, followed by M09 implementation.

## M08 record correction and closure checks

Corrected the gate report's stale Full pinned verify cell from Pending to PASS, matching the
existing exit-zero local run (194 unit, 444 browser, 15 size budgets, five count cases).
[Closure PR #6](https://github.com/nawinisha231272-wm/formkit/pull/6) is merged as c8d8254;
[verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39523437523) passed on
attempt 1 at its final head cb88763. GitHub also confirms the push workflow passed on attempt 1.

Codex opened all 24 added Yes/No PNGs individually (two platforms, three browsers, four themes),
and verified their bytes against the GitHub PR file blob SHAs. All labels/errors are readable;
Base/Tailwind place the No caption below the checkbox, while Bootstrap 4/5 place it beside the
checkbox. Platform typography/native controls differ. This is AI inspection only; human visual
approval was still outstanding at that checkpoint; the subsequent owner approval is recorded above. No baseline or threshold changed. The owner accepts M08 closure;
no M09 plan changes or implementation are authorized by this record correction.

## M08 accepted author trial and gate closure — 2026-10-20 (GO)

Owner decision: a fresh Codex session with no implementation context can meet the author criterion;
the owner additionally accepts this specific Yes/No continued-session trial despite its failed
fresh-session condition. Preserve the provenance correction and original No usability verdict.
A human guide-usability pass moves to M11. This supersedes earlier human-only gate restrictions.
Plan: document the complete value-adapter/shell/caption contracts, ship a nullable boolean adapter
with explicit required semantics, fix CLI help status, test Node/browser/JSON Schema parity and all
four themes, then re-verify and recommend GO/NO-GO before freezing ADR-0003. Record author/times,
original failures and fixes. Open a closure PR, merge only on initial green CI, stop for review.
M09 and M10 roadmap implementation/changes are deferred to the user's separate future prompt.

### Gate result and accepted evidence

**GO recommended. ADR-0003 accepted for the SDK 0.x freeze.** Owner acceptance of this specific
continued-session trial satisfies the amended author criterion; the original fresh-session condition
remains FAIL. Human guide usability is not claimed and remains an M11 task/acceptance criterion.

Author: Codex trial agent in “Build Slider via author guide”, with prior Slider context still present.
Clean f9587cb checkout; first command 19:38:24.920671 EDT, first toggle 19:42:30.615 EDT (reported
4m 05s); total 17m 12s. Original 34-line control passed 3 Node/24 browser tests and four-theme native/
Linux comparisons. Original No comfort verdict, failed adapter/help experiments, allowed-file audit,
source/report commits and hashes are preserved in docs/rehearsals/yes-no/. The owner explicitly
accepted the provenance exception; this is not a claim that a fresh session or human trial happened.

| M08 criterion / correction                   | Result and evidence                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SDK scenarios A–F                            | PASS — tests/sdk-scenarios.test.ts and tests/e2e/sdk-extensions.spec.ts in full verify.                                                                                                                      |
| Three unedited scaffolds                     | PASS — built CLI, packed SDK, fresh install/frozen-offline reinstall and generated verify (including 48 nested browser cases).                                                                               |
| Accepted author evidence                     | PASS by explicit owner exception, ADR-0013/M08.md; fresh-session condition FAIL remains recorded.                                                                                                            |
| Nullable/tri-state adapter and full contract | PASS — public nullableBooleanValue({requiredTrue?}); seven Node adapter/caption/schema tests, canonical rejection, session/Node/Ajv parity including object-valued adapters.                                 |
| Shell and caption guide                      | PASS — exact compiled inline example, all five shell references, literal caption defaults plus opt-in message keys/fallback. All four actual editors change the preview.                                     |
| Help status                                  | PASS — built --help/-h exit 0 and leave an empty target untouched; invalid generation arguments still fail.                                                                                                  |
| New conformance/visuals                      | PASS — 12 browser cases, four themes/three browsers. Native and pinned Linux each pass recording/comparison; 24 new PNGs. Existing 192 PNG bytes unchanged.                                                  |
| Full pinned verify                           | PASS — Node 22.22.3/pnpm 10.10.0 CI=true pnpm verify exits zero: lint, 22 builds, 37 typechecks, 194 unit tests, 444 browser cases, 15 size budgets, five count cases. Core lines 95.15%; validation 99.25%. |
| Freeze inventory                             | PASS — exact SDK TypeScript/runtime exports, including nullableBooleanValue, match docs/api/sdk-0.x.json; ADR-0003 accepted.                                                                                 |

Complete gate report: [docs/m08-gate-report.md](m08-gate-report.md). Corrective full log:
/tmp/m08-close-full-pinned-verify.log. No runtime dependency or correctness/pixel/size/coverage/count
threshold changed. Original timing baselines and failed-run history remain intact. The closure PR
records current-head initial CI and merge evidence; no failed CI workflow is re-run for green.

Limits: the trial author has not reevaluated comfort after fixes; human usability moves to M11.
Native checkbox null/false share unchecked appearance, explicitly documented with reset and alternative
three-choice guidance. Prepublication kit/initial visual-review requirements remain documented.
No M09/M10 plan change or implementation is included. Stop for owner review after the closure merge.

## M08 author rehearsal corrections — 2026-10-20 (implementation verified; human gate pending)

The Slider exercise is AI-assisted rehearsal only, never independent M08 gate evidence.
Plan: restore protected controls through a core refresh patch without data/processor changes; test
core and every host; simplify the Slider; complete provisioning, numeric/i18n examples, typed fixtures,
scaffolded browser/axe/visual checks and a metadata-driven mini builder/editor assertion helper.
Commit/push every deliverable, prove the guide from a fresh clone of the pushed branch, then rehearse
with a different component and record remaining gaps. Run full pinned verification and initial CI.
The user explicitly authorizes merging the delivery PR after green CI while keeping M08 open for the
independent human report; this supersedes the earlier draft-only delivery restriction. Do not mark
ADR-0003 accepted, tag m08-done, claim the gate passed or begin M09.

### Correction checkpoint before fresh-clone proof

- PASS — core protected-write tests cover disabled/read-only/hidden user writes: stored data and
  state identity are unchanged, no processors run, and a target-only refresh patch restores the
  control. API writes still work. Direct DOM, vanilla, React, Angular 21/22 and Web Component
  light/shadow hosts are covered by `protected-writes.spec.ts` and `authoring.spec.ts` (48 cases).
- PASS — full Quantity example is compiled and its exact guide snippet is checked by
  `tests/author-guide.test.ts`, including typed English fallback and translated output.
- PASS — new Slider/Quantity images: 12 darwin-arm64 and 12 linux-x64, all four themes and all
  three browsers. Linux recording and comparison ran in the official digest-pinned Playwright
  1.56.1 image; existing 168 PNG files are unchanged. No pixel threshold changed.
- Slider source: original 51 physical / 50 nonblank lines; simplified 46 physical / 45 nonblank.
  Excluding imports, comments, blanks and punctuation-only lines: 35 → 28 meaningful lines.
  Original source/report are retained in `docs/rehearsals/`; the new source is
  `apps/docs/examples/slider.ts`. Native range still displays its minimum while the model is null;
  key/pointer handlers retain the first-interaction commit, and reset clears the model.
- Initial focused browser run: 42 passed, six React fixture cases failed because controlled
  `data={}` correctly overrode the schema default with empty data. The protected fixture now
  supplies explicit stored initial data, and tests assert it before mutation. All 48 cases then
  pass. No production behavior or threshold was changed to hide this fixture error.

Fresh clone of pushed `5c78ddf` passed all ten guide steps with an unedited generated project
(build/typecheck, one Node test, 15 browser cases) and a clean SDK tree. The Color rehearsal then
found a real generated-Linux-command failure: pnpm relativizes local-kit tarball paths in its lockfile;
copying the project to /project changed that relationship (ENOENT /ourform-sdk-kit). The correction
preserves the original project/kit absolute directory relationship inside the disposable container,
with read-only source/kit mounts and fresh Linux node_modules. This failure is retained; the pushed
checkout proof and Linux command will be repeated after the fix.

### Pushed guide proof and different-component rehearsal

PASS — final implementation `53402c0f6ee7e2f24015e5cc5d570c1cfc160542` was cloned from GitHub
without overlays, and the exact guide was followed from step 1. All ten commands succeeded, the
SDK clone stayed clean, and hashes proved generated source/config files were unedited. The generated
project passed build/typecheck, one Node test and 15 browser cases. Both initial and corrected clean
clone records are in `docs/rehearsals/fresh-clone-*-proof.json` / `fresh-clone-proof.json`.

PASS — the Color rehearsal used a separately generated project from the corrected pushed kit.
Its portable control has 24 physical lines, placeholder/showSwatch properties and typed translation fallback;
required/pattern rules live in the host fixture, with no protected-state wrapper. Native verification
passed two Node and 15 browser cases. Explicit native and generated Linux recording each passed
15 recording plus 15 update-disabled comparison cases, four themes and three browsers, with 12 PNGs
per platform. The exact generated `pnpm visual:linux:record` succeeded in the pinned official image.
The source, tests, command outcomes, hashes, standalone commit and remaining limitations are in
[the correction report](rehearsals/author-rehearsal-corrections.md), which maps all eight findings to
PASS evidence. The initial style-object author error and Linux kit-path failure are retained there.

PASS — native Linux full pinned `pnpm verify` at `53402c0`:
[push Verify, attempt 1](https://github.com/nawinisha231272-wm/formkit/actions/runs/39509468196)
passes lint, build/typecheck, 187 unit tests, 432 browser cases, all 15 size budgets and five count-gate
cases. Core line coverage is 95.15%; validation 99.25%. CLI integration includes three unedited projects
and 48 nested browser cases. No count baseline, timing baseline, existing PNG or correctness threshold
was relaxed. The earlier `5c78ddf` implementation also passed its initial
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39508959364).

The [isolated A/B at 53402c0](https://github.com/nawinisha231272-wm/formkit/actions/runs/39509473241)
is attempt 1, status=measured, five alternating pairs. At 500 fields compile/mount/edit/theme median
paired ratios are 1.132/0.981/1.004/1.029, advisory. Final local full verification and the final delivery
head's initial CI checks are recorded in [PR #5](https://github.com/nawinisha231272-wm/formkit/pull/5).
No failed run is retried to get green; historical failures remain above/below and in the rehearsal log.

**M08 gate remains NO-GO pending the user's independent human author report and human review.**
The user separately authorizes implementation delivery to merge after green CI. ADR-0003 remains
proposed, no m08-done tag is created, and M09 is not started. AI rehearsals never substitute for human evidence.

## Pre-M08 CI redesign and decisions — 2026-10-20

User decisions (supersede the earlier open questions and wall-clock PR hard gate):

- validateSubmission supports `unknownKeys: 'reject' | 'strip'`, default `'reject'`. Strip removes
  unknown scope keys before validation/provider invocation, without mutating caller data; malformed
  known scopes, unsafe JSON, invalid canonical values and forged calculations still fail.
- Bootstrap 4 remains fully supported for 1.0, alongside base, Bootstrap 5 and Tailwind. Every new
  component must pass conformance and visual checks in all four themes.
- PR correctness hard-gates deterministic work counts. Wall-clock A/B timing is advisory in its own
  job; nightly main timing opens/updates an issue only after three consecutive >20% nights.

Plan: implement and test scope filtering; instrument real per-edit processor/DOM/render counts for
100/500/1,000 fields and onboarding; store exact expected counts; separate timing into isolated A/B
and nightly jobs; test ratio/streak/issue behavior; update standards/ADR/READMEs while preserving all
historical baselines and failures. Run full pinned verify before opening one PR. Its initial CI run
must pass; do not re-run failures for green. Fix causes with reviewed code when needed. After merge,
report this checkpoint and start M08 using its normal milestone process.

### Pre-PR verification evidence

- PASS — full pinned `CI=true pnpm verify` (Node 22.22.3/pnpm 10.10.0): lint, build/typecheck,
  167 unit tests, 357 Chromium/Firefox/WebKit browser cases (including existing visual/a11y checks),
  14 size budgets and five deterministic count-gate browser cases. Core line coverage remains 98.57%;
  validation 99.25%. An initial full run before the final playground demo also passed (354 browser cases).
- PASS — exact work expectations: 25 edits each for 100/500/1,000 fields (26 processors and renders,
  one patch, zero DOM creation/replacement), onboarding (one processor/render/patch, zero DOM work).
  `tests/work-counts/counts.spec.ts` also detects implicit/transient/detached allocations and restores hooks.
- PASS — `tests/ci-performance.test.ts`: increases and decreases, median paired ratios (not ratio of
  medians), exact 20% boundary, three consecutive nights, missing nights/recovery/new-baseline resets,
  duplicate dates, individual-metric streaks, cross-platform state rejection and managed issue updates.
- PASS — real local main-vs-candidate production-build A/B smoke: five alternating pairs, all three
  sizes, 15 samples each; measured JSON/median-ratio summary emitted. This is a harness smoke check,
  not a replacement CI baseline. CI timing runs use their own runners, with builds prepared elsewhere.
- PASS — Node unknown-key tests: default/explicit reject, nested strip, provider-visible filtered
  data, input immutability, opaque adapter objects/arrays, unsafe/malformed/type/required/calculated
  rejection. Browser/Node parity and the playground reject/strip demo pass in all three browsers.
- PASS — original timing workload, both timing baseline JSON files and all existing PNG bytes remain
  unchanged. No correctness, coverage, pixel or size threshold was relaxed. The former 20% PR timing
  rule is explicitly superseded by ADR-0010; all failed-run records below remain intact.

- PASS — release verification includes `scripts/work-count-baseline.mjs`, tested against the immutable
  PR main/base revision. Raising any expected count, removing an existing fixture or changing the
  workload format fails; reviewed decreases are allowed and still must match every measured edit.
  Final full pinned verify exits zero with this guard. The strengthened demo readiness test also passes
  all three browsers separately. No remote CI has been retried or triggered before this final commit.

Remote initial CI is now recorded in the merged checkpoint below. Actual scheduled-night observations
are not claimed before they occur. No CI re-runs were used for green.

### Merged CI checkpoint

[PR #3](https://github.com/nawinisha231272-wm/formkit/pull/3) merged as
`201b6095e3f9407e3734ac80e749a45203575ee6` after all initial checks passed, each on attempt 1:
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39486249662),
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39486224605), and
[isolated advisory A/B](https://github.com/nawinisha231272-wm/formkit/actions/runs/39486249733).
Native Linux verified 167 unit tests, 357 browser cases, 14 size budgets and five count-gate cases.
The A/B artifact has status=measured, five alternating main/candidate pairs and all 12 metric ratios;
500-field compile/mount/edit/theme ratios were 1.053/1.008/0.970/0.991. No workflow was re-run for green.
The post-merge main Verify run is [39488293769](https://github.com/nawinisha231272-wm/formkit/actions/runs/39488293769).

PASS — the user changed the default branch to main, verified through the repository API. The nightly
workflow is registered and its first manual diagnostic is [39490884430](https://github.com/nawinisha231272-wm/formkit/actions/runs/39490884430).
Manual diagnostics do not advance nightly streaks or write issues. The post-merge main Verify run
above completed successfully on attempt 1. Actual three-night observations remain prospective.
Repository ruleset 25504006 now requires PRs and the actual GitHub Actions `verify` check, with
non-fast-forward updates prohibited; verified through the branch rules API after the user corrected
the required-check name. No administrative bypass was used.

## M08 — SDK completion (in progress)

Plan: complete typed presets and declarative composites, then plugin packaging/engine installation
with semver, conflicts and requirements; add the component test kit; add verifiable CLI component,
theme and plugin scaffolds; publish author guides and an extension playground; automate scenarios A–F
and four-theme conformance/visuals. Run pinned verify, prepare the ADR-0003 export inventory and PR,
then stop for the M08 gate review. The external developer exercise requires a named independent
human and remains pending until actual guide-only evidence is supplied. Do not start M09.

Risks: expanded child ids/references and object scopes must remain stable; plugin installation must
preserve the headless/model-view boundary and per-engine isolation; generated projects must use the
pinned toolchain without relying on unpublished registry packages. Existing correctness checks and
count baselines remain enforced. Contract details will be recorded in the spec and ADR before freeze.

### M08 implementation checkpoint

Implemented presets (typed portable metadata and native-view preservation), fixed-template Address
composites with stable ids/internal references, bounded headless expansion, and per-engine plugin
installation/semver/conflicts/requirements. Added component value/validation/builder/render helpers,
CLI component/theme/plugin generators and author guides. The CLI proof packs the public packages,
installs all three fresh projects and runs each unedited pnpm verify, with a frozen/offline reinstall
proof after their initial dependency resolution. The package README,
spec 04, proposed ADR-0003, export inventory and changeset document contracts. semver 7.8.5 is the
sole new runtime dependency, to support full npm ranges rather than inventing a partial grammar.

Intermediate evidence: focused SDK/core/test-kit checks pass; the built CLI proof passes all three
scaffolds. SDK scenarios A/B/D source/unit tests pass (Rating is 29 meaningful non-import lines), and
24 browser cases passed across Chromium/Firefox/WebKit after fixing outside-submit blur coordination.
The matrix is being extended with native-component visuals in every theme before final verification.
The initial broad unit run under contention hit existing deadlines; compiler diagnostics for a
composite with no expansion also exposed a compatibility requirement, now preserved as
unsupported-component. The expensive SDK export check now parses declared names and verifies actual
runtime exports directly, preserving the inventory assertion without loading a full compiler graph.
Unit/browser concurrency is bounded; all original deadlines, tests, images and thresholds remain.
These intermediate issues are resolved by the final evidence below; the independent human exercise
and gate review remain pending, so this is not a milestone completion claim.

The user is arranging the independent author exercise and explicitly requires the gate remain pending
until their report. Gate recommendation remains **NO-GO pending that report and human review**.
The nightly diagnostic correction [PR #4](https://github.com/nawinisha231272-wm/formkit/pull/4)
merged as `e20fe437895eafb5cd4a0d938f80791aba813547` after current head
`a05c15e6e82f8672aed1ae8c707938097e724834` passed all checks on attempt 1:
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39495383732),
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39495358280),
[advisory A/B](https://github.com/nawinisha231272-wm/formkit/actions/runs/39495383915), and
[manual nightly diagnostic](https://github.com/nawinisha231272-wm/formkit/actions/runs/39495395088).
The native diagnostic measured all three sizes and 12 comparisons; the advisory measured five pairs.
Neither timing artifact reports unavailable/error. Local full pinned verify passed 168 unit tests,
357 browser cases, 14 size budgets and five count checks. Native Linux correctness passed too.
The initial failed diagnostic 39490884430 and local contention failures remain recorded below.
No CI re-runs were used. The user corrected the required check to `verify`; the live rules API now
confirms it, required PRs and prohibited non-fast-forward pushes. Post-merge main CI
[39498170756](https://github.com/nawinisha231272-wm/formkit/actions/runs/39498170756) also passed on
attempt 1. The prerequisite correction is complete.

### M08 acceptance and gate report

| Criterion                                           | Status                     | Evidence                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scenarios A–F automated                             | PASS                       | `tests/sdk-scenarios.test.ts`: Rating <30 meaningful lines, one-statement conventional registration, generated palette/max editing/undo/redo. `tests/e2e/sdk-extensions.spec.ts`: real React mappings, four-theme identity/validation/reset, actual Angular portable Rating; 27 cases pass on macOS.                 |
| Component/theme/plugin scaffolds work without edits | PASS                       | `all three unedited CLI scaffolds install from packed workspace packages and pass pinned verify`: built CLI, fresh projects, packed SDK dependencies, initial resolution and frozen/offline reinstall, build/typecheck/value/canonical-validation/generated-palette/undo/redo tests.                                 |
| Independent developer uses guide alone              | PENDING — gate cannot pass | User is arranging the exercise. Record actual name, commands/results and confusing steps after their report; no simulated or implementing-agent evidence substitutes for it.                                                                                                                                         |
| ADR-0003 freezes SDK 0.x export list                | PENDING human gate review  | `docs/adr/0003-sdk-0x-api-freeze.md` and exact `docs/api/sdk-0.x.json`; `SDK 0.x export inventory matches ADR-0003` checks declared and built runtime exports. Proposed until independent exercise/review.                                                                                                           |
| Full pinned verify                                  | PASS                       | `CI=true pnpm verify`, Node 22.22.3 / pnpm 10.10.0: lint, 22 builds, 37 typecheck tasks, 183 unit tests, 384 browser cases, all size budgets and five deterministic count cases. Core lines 95.14%; validation 99.25%. CLI budget includes every emitted JS chunk; its final tightened size check is recorded below. |

Gate recommendation: **NO-GO** until actual independent author evidence and human review. The later author-rehearsal correction request explicitly authorizes merging tested M08 implementation delivery; it does not pass the gate, accept ADR-0003 or authorize M09.

Final automated evidence — full pinned verify exits zero (`/tmp/m08-full-pinned-verify.log`). All
183 unit tests include the actual built CLI/fresh scaffold proof; all 384 browser cases include 27 SDK
cases and existing regressions. Native pinned Node imports core/SDK, installs a semver-checked plugin
and compiles its required form without DOM globals. `sh scripts/linux-visuals.sh record sdk` uses the
exact image in scripts/playwright-container.json, records 24 new Linux SDK PNGs and passes all 12
comparison-only cases. 24 Mac SDK images pass too; representative images were inspected. The existing
120 PNGs, timing workload and platform baselines remain byte-identical. CLI's new 30 kB budget covers
all emitted JS files, including its shared chunk; the follow-up pinned `pnpm size` passes all 15
budgets (CLI 3.07 kB brotlied), and `pnpm lint` passes. All prior budgets are unchanged.

Mac baseline recording with `--update-snapshots=missing` wrote the 12 new native screenshots and
reported them as missing (the pinned Playwright behavior). The subsequent update-disabled comparison
passed all 27 SDK browser cases; no existing screenshot was replaced. Linux recording is restricted
to an empty selected suite before `--update-snapshots=all`, then compared with updates disabled.

Existing 120 PNG bytes, both timing baseline JSON files and the original timing workload are verified
unchanged against main. New SDK visuals are separate platform-specific additions, with existing pixel
thresholds retained. No later-milestone builder commands or repeater/data-source UI are implemented.

### M08 initial native CI failure and scaffold setup correction

At `0ca164db10f4d9e87a1cdb26c31f8673dec4840e`, initial attempt-1
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39501212521) and
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39501195234) failed the new
scaffold integration test: `ERR_PNPM_NO_OFFLINE_META` for @types/node@22.15.29. Both pass lint,
build/typecheck and 182 other unit tests; browser/size/count stages were not reached in these runs.
The previous local full verify had passed with an existing registry metadata cache. No CI job is rerun.

Cause: a frozen workspace installation downloads package contents without necessarily storing the
registry metadata needed for a brand-new project's initial dependency resolution. The new proof now
runs the guide's normal initial install with an isolated, initially empty metadata cache, removes
each generated node_modules, then requires `pnpm install --offline --frozen-lockfile` before the same
unedited build/typecheck/value/validation/palette/undo/redo assertions. The generator still performs no
network calls. All existing assertions and deadlines are retained; the offline reinstall is stronger
with a frozen lockfile. The focused corrected proof passes both tests in 30.7 seconds locally.
Final full local/native verification of this correction is pending before claiming remote PASS.

The initial [isolated A/B](https://github.com/nawinisha231272-wm/formkit/actions/runs/39501212559)
completed on attempt 1 with status=measured, five pairs and all 12 Linux ratios. At 500 fields,
compile/mount/edit/theme ratios were 1.173/1.013/0.994/1.009; these remain advisory.
Both failed native runs are retained as evidence; the M08 gate stays NO-GO.

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
[ci-linux-baseline PR #2](https://github.com/nawinisha231272-wm/formkit/pull/2) stores the medians and
requires its own full Linux CI to pass against this baseline before merging. After merge, stop;
M08 requires the user's explicit confirmation.
No M08 or undecided product-policy changes are included.

### Initial required-enforcement CI results

The first enforcing [PR run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39474015036/attempts/1)
and [push run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39474008325/attempts/1) at
68e4ee5 pass every correctness check (159 unit tests, 351 browser cases/all 60 visual comparisons,
14 size budgets, lint/build/types), then **FAIL the unchanged Linux performance budget**.
500-field compile/mount/edit/theme: PR 8.40/78.80/194.10/140.80 ms; push
9.90/90.60/214.00/154.30 ms. Both log `linux-x64 performance baseline enforced: fail above 20%`.

No runtime, benchmark workload or harness source differs from the calibration commit; PR #2 changes
only the baseline, required policy and audit documentation. The PR's 1,000-field results remain near
the calibration medians (10.50/107.70/286.80/180.00 ms), while its 500-field phase spikes. This suggests
measurement variability but does not establish a cause. A bounded full-CI retry retains all checks,
original medians and the 20% threshold. These initial failures remain recorded; no green result or
permission to merge is claimed until required enforcement passes.

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

### Nightly diagnostic correction — 2026-10-20

After main became the default branch, the first manual diagnostic
[39490884430](https://github.com/nawinisha231272-wm/formkit/actions/runs/39490884430) failed on attempt 1:
Vite readiness timed out, so no timing verdict or nightly streak was produced. Do not re-run that run.
Reproduced using its built runtime artifact inside the exact pinned Playwright image: Vite responds
HTTP 200 to curl, while Node fetch reports `fetch failed`; the original harness consequently times out.
The direct node:http loopback probe returns {ok:true,status:200} in the same environment.

Fix: use the direct loopback HTTP client with bounded requests; retain the Vite log in uploaded
benchmark-results and include its tail and the last probe in readiness errors. Spawn failures are
handled explicitly. Manual branch diagnostics are allowed; scheduled runs and issue/streak updates
remain limited to main. The 120-second startup deadline and every performance/correctness threshold
are unchanged. Regression test `nightly probes real loopback when fetch is unavailable; rejects HTTP
errors, closed ports and timeouts` passes. The corrected full local pinned-image diagnostic completes,
records all three sizes and 12 comparisons, and confirms manual runs do not modify streaks or issues.
Those emulated local timings are harness evidence only, never Linux runner calibration values.

Final evidence: local full pinned verify passed (168 unit / 357 browser / 14 size / five count checks).
The corrected current head passed native PR/push Verify, A/B and manual nightly diagnostics on
attempt 1; PR #4 is merged. Exact run links and merge commit are recorded above.
This correction contains no M08 features. PR #3's original first-attempt green checks remain recorded.
The first local combined verify passed lint/build/types and 168 unit tests, but its browser matrix
hit existing test deadlines while multiple framework/axe workers competed with other verification.
Browser file concurrency is now explicitly one in CI (including pinned local verify), at most two
for interactive local runs, and the reporter names each case. Deadlines,
assertions and baseline bytes are unchanged; final isolated verification is required before claiming PASS.

The completed initial local matrix was 350 PASS / 7 FAIL, all existing browser deadlines (Chromium
tailwind-dark; Firefox builder native themes, Angular 21 read-only, vanilla onboarding Bootstrap 5
read-only, Bootstrap 4 default/real CSS, and DOM Tier 1 conformance). Original images and assertions are
retained. Final isolated verification uses the committed worker policy, without concurrent M08 checks.

### Proposed M09c loading split — owner direction, 2026-10-22

ADR-0018 proposes retaining the 30 kB core builder ceiling and independently budgeting lazy Logic
(10 kB), JSON editor (8 kB) and dependency map (10 kB), with a 28 kB aggregate deferred ceiling and
explicit shared-chunk accounting. Record initial and first-open network/byte closures in M09c.
Implement at the start of M09c; no split is implemented in this M09b review. Final sentence-control
regression and full pinned verify must run after the last locator correction, followed by first-attempt
current-head PR CI. Owner screenshot approval remains outstanding.

ADR-0018 accepted with owner amendments (2026-10-22): M09c starts with the lazy split after M09b
approval; target core ≤26 kB. Deferred views include Logic, JSON, dependency map, History/diff and
the command bar when added by M09b+. Measure consumer production outputs with shared chunks counted
once, across Vite/React, Angular CLI, vanilla and script-tag/assetBase; test offline strict CSP.
Add preload none/idle (default none); only idle prefetches Logic/JSON, with explicit no-request tests
for none. Command bar and History numeric chunk budgets need a proposal before those features ship.
No loading implementation or current M09b budget change is included in this documentation decision.

### Final M09b review verification — PASS

Pinned Node 22.22.3 / pnpm 10.10.0, final corrected sentence-control path: all 18 cases pass in
Chromium, Firefox and WebKit. Full `CI=true pnpm verify` exits 0: lint/build/typecheck, 306 unit
checks (43 files), 1,122 browser checks, 17 size budgets and five deterministic count checks.
Logs are archived under docs/reviews/m09b-owner-review-evidence, including the original failures.
Builder passes the unchanged 30 kB ceiling (current size-limit display rounds to 30 kB); 29.92 kB
was an earlier focused measurement, not the final measurement. No budget was raised.
Scoped pinned-image Linux generation/comparison passes. The manifest records 20 changed baseline
files, six new images and 368 unchanged files. All 32 original trial artifacts remain unchanged.
Current-head remote first-attempt CI, PR merge and owner image approval remain pending.

## M09b live review follow-up — in progress

Branch m09b-live-review from merged PR14. Fix real destination move counts, tooltip layout/placement,
and expiring/replaced announcements with explicit Undo/Redo messages; assert exact move text for
same-slot, slot-to-slot and column moves. Only changed drag images are regenerated. Full pinned verify
and first-attempt current-head PR CI precede merge; owner screenshot approval remains pending.
M09b+ approved with amendments: ADR-0018 split first, core ≤26 kB, then authoring shortcuts and the
owner polish list. M09c remains later. Risks: source/destination indexing, shared history routes,
timer cleanup and the unchanged current size ceiling.

Toast owner amendment: plain notices five seconds; action notices eight seconds with remaining-time
pause while hovered/focused; Alt+Z reaches Undo; ordinary history survives toast dismissal. Visible
expiry is independent of the polite live region. Implementation and clock-driven cross-browser tests
are being verified; no PASS claimed yet. The initial test launch found the task-owned preview port
occupied; stopped that preview before the build/test run. Other live-review fixes remain in progress.

Toast focused verification PASS: six Chromium/Firefox/WebKit checks cover hover/focus remaining-time
pause, Alt+Z focus on Undo, expiry without clearing the independent live-region text, and Ctrl/Cmd+Z
restoring the deleted field after expiry. Build passed 24 tasks. Logs: /tmp/m09b-live-build.log and
/tmp/m09b-toast-tests-3.log. The earlier timer test used an advancing clock at a one-millisecond
boundary; freezing the clock makes remaining-time assertions deterministic without changing durations.
Full verification, unchanged size ceiling, action-replacement coverage and remaining live-review fixes
still need completion before merge. No final milestone PASS is claimed.

## M09b live review round 3 — in progress

Owner requires single-line viewport-clamped toolbar tooltips in all five themes, command-derived
Undo/Redo messages (including empty history), no stale toast replay, one visible toast plus an
independent SR-only repeatable live region, 1280px selection tag/toolbar collision handling and
Material/Bootstrap 5 baselines. Replace Alt+Z with F6 region cycling to preserve text input. Fix before
recording images; full verify and first-attempt PR CI required. Do not merge before owner approval.
Prior live-review verification failed (16 browser failures); preserve the log. Most Delete failures
are ambiguous global Undo locators now that the action toast has its own Undo; scope the toolbar tests
without removing their assertions. Other failures need individual inspection. No completion claimed.

Round-3 focused verification: workspace build passes (24 tasks); headless history-label regression
passes after correcting its form metadata and same-slot insertion index. Cross-browser round-3 tests
cover single-line/clamped tooltips in five themes, shared undo/redo/empty messages, expired-toast theme
replay prevention, SR-only region geometry, F6 cycling and non-interception of Option+Z input; toast
pause/keyboard regression included. Logs /tmp/m09b-round3-browser-4.log and
/tmp/m09b-round3-label-tests-3.log. Record final suite result only after completion. Prior failed logs
are retained. Remaining work: exact move-message cases, selection/tag visual assertions at 1280px,
changed platform baselines, full verify and owner approval; do not merge. New toast Undo ambiguity is
addressed by scoping existing toolbar assertions, preserving their intent and assertion values.

## M09b live review round 4 — in progress

Owner accepted round-3 items 1–4 in live review. Remaining selection chrome stays outside content,
left tag/right toolbar on one edge, starts text at its first character, truncates with full title/ARIA,
and flips both below when scrollport lacks space; reserve below space to avoid the next heading.
Add six 1280×800 Material/Bootstrap 5 states and geometry assertions. Undo/Redo keep focus with
aria-disabled/no-op click; one-builder body shortcuts announce empty history. F6 remains the region
shortcut, preserving Option+Z text input. Reduce current builder size (30.83 kB prior measurement)
below unchanged 30 kB; report actual final size. No screenshots approved or merge authorized yet.

Round-4 size checkpoint PASS: builder 29.99 kB against unchanged 30 kB (before: 30.83 kB at the
round-3 checkpoint). All 17 package budgets pass; log /tmp/m09b-round4-size-5.log. Build-only Terser
5.44.1 uses tsup's supported minifier with three safe compression passes; no runtime dependency or
feature-loading boundary changed. Consolidated command label use and removed unused harness messages
and redundant styles. Earlier size failures remain in /tmp/m09b-round4-size{,-2,-3,-4}.log. This is
not full verification; final consumer behavior and snapshots still require the browser suite.

Round-4 regression checkpoint: 195 expanded browser cases pass across Chromium/Firefox/WebKit;
the final 48 tooltip/history/geometry/toast cases pass after removing tooltip-only width declarations
accidentally copied into the SVG icon rule. That defect made WebKit header icons 300px wide; an
explicit 16px icon-width assertion now guards it. All six previously failing WebKit routes pass.
The failed full run (six failures) is retained; the other five navigation/teardown stalls passed in
isolation, without claiming that the icon defect caused them. No deadline or assertion was relaxed.
Pinned Linux generation and comparison pass (17 workbench/control states plus three Material
read-only checks each). Current size is 29.95 kB; final full-run size remains to be recorded.

Coverage audit found the exact destination-count cases had not yet been committed. Added
`builder-move-announcements.spec.ts`: within a slot, between slots and between columns, exact
pickup/drop position and count, stored sibling order, byte-identical undo and command-derived
undo/redo text. All nine cases pass across the three browsers. Interrupted the in-progress full run
after 203 browser passes to include these additions in a fresh complete run; that interrupted log is
retained separately and is not a verification result. The final full run and owner approval remain
pending. These are local development runs, not CI re-runs.

The subsequent complete run exits 1: 307 unit checks pass, 1,171 browser cases pass and eight
WebKit cases time out (navigation, page setup/evaluate or context teardown). Retained as
`m09b-round4-final-verify.log.gz`. Power evidence records idle sleep at 19:47:35 EDT followed by
repeated sleep/dark-wake cycles through 20:17:20 during the 19:25:43–20:18:06 run; one nominal
30-second failure lasted 3.2 minutes. Sleep is a concrete environmental cause to remove, not a
reason to mark the run green. Retry the unchanged tests with command-lifetime `caffeinate -diu`
assertions; no permanent power settings, timeouts, retries or correctness checks change. That
complete local run is in progress. Size/count stages were not reached in the failed full run.

### Final round-4 local verification — PASS

The unchanged final code and tests pass full pinned `pnpm verify`, exit 0, with command-lifetime
`caffeinate -diu` on macOS arm64: lint/build/typecheck, **307 unit tests (44 files), 1,179 browser
tests across Chromium/Firefox/WebKit, 17 size budgets and five exact work-count checks**. Browser
tests use the normal local two-worker configuration; retries and deadlines are unchanged. The
successful run records no sleep/wake transitions. Its complete log, command, times and hash are
archived in `docs/reviews/m09b-round4-evidence/`; prior failed and interrupted logs remain intact.

Builder: **30.83 kB before → 29.95 kB final**, against the unchanged **30 kB** Brotli ceiling.
Only a pinned build-time minifier was added; no runtime dependency or lazy-loading split is shipped.
ADR-0018's accepted split begins M09b+ after M09b approval, superseding the older M09c placement.
Six new requested states per platform are linked in `docs/reviews/m09b-live-review-round4.md`.
Manifest: 16 existing PNGs changed, 12 new PNGs, 376 existing PNGs byte-identical to PR14.
All 32 original trial artifacts still match their provenance hashes.

The playground dev server is restarted at `http://127.0.0.1:4173/builder.html?approved` and left running.
M09b remains open: owner approval of these images and first-attempt current-head PR CI are required
before merge. No owner approval is inferred from automated geometry or visual comparisons.
