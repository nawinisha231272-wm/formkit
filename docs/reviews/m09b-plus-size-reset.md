# M09b+ — approved size reset and delivery evidence

Date: 2026-10-28. Branch: `m09b-plus-authoring`. PR: [#16](https://github.com/nawinisha231272-wm/formkit/pull/16).
Status: capture-clock correction passes full pinned local verification and all six pinned-Linux comparisons. First-attempt CI on the new head is checked after push; 80b4dfa failed and is retained below. Owner review pending; no merge authorized.

## Decision and accounting

The owner approved lazy bulk Move/Wrap/Duplicate/Paste preparation and the Data inspector body,
both preloaded at idle by default, with independent `none` opt-outs. Initial frames, focus,
loading/error reason/Retry and cancellation remain immediate. Clipboard handlers/buffer/system
access, Delete key, bulk Delete/Required, selection/Shift+arrows, Ctrl/Cmd+K frame, context menu and
PointerDrag remain initial. No secondary-tools chunk is shipped. Form JSON is unchanged.

All measurements use the same esbuild production consumer and Node 22.22.3 Brotli defaults as the
previous reports. UI excludes builder-core. Builder-core is the full consumer minus the identical
consumer with builder-core external, not a standalone source probe. Each shared chunk counts once.
No ownership relabelling is used. Framework examples include their host/framework overhead.

| Checkpoint                                    | Builder UI initial | Builder-core | Full initial |
| --------------------------------------------- | -----------------: | -----------: | -----------: |
| Owner's initial combined baseline             |             28,857 |        6,675 |       63,623 |
| Complete combined prototype before compaction |             32,899 |        7,243 |       68,480 |
| Retained compaction, original core restored   |             31,951 |        7,173 |       67,628 |
| First approved lazy-boundary build            |             31,069 |        7,196 |       66,818 |
| Fixed owner-reset ceilings                    |         **31,600** |    **7,300** |   **67,400** |

The reset is `ceil((measured + 500)/100)*100` for UI/full; core is the owner's fixed 7,300.
Standalone builder is aligned to **31,600**. These ceilings are fixed from the first boundary build;
polish does not recalculate them. They stay below the owner's maxima (32,000/68,500). No more
byte-hunting probes are authorized. Subsequent milestones propose allowances before implementation.
The historical [combined report](m09b-plus-combined-prototype-measurement.md) retains every rejected
probe, earlier size STOP, failed run and the restored original builder-core source accounting.

New lazy limits use the pre-approved rule: measured plus 10%, rounded up to 50, at most 5,000.
Bulk planning/Retry **1,547 → 1,750**; Data/Retry **269 → 300**. Existing bulk-editor **4,700**, command
search **4,500**, quick-add **3,750**, Settings **8,000**, Logic/JSON/map **28,000** and their union with
Settings **36,000** remain enforced. History/diff remains unbudgeted and unshipped.

The owner accepted independent-entry deferred-union growth **15,399 → 32,900**. The first new
boundary union was **36,532**. Final owned union and full consumer incremental feature closures are
reported in the final size JSON; these are not substitutes for per-feature/aggregate gates. Retry
entries count toward the union, and shared dependencies are counted once.

## Product fixes and unchanged contracts

Generated bulk editing uses the intersection of supported metadata, grouped into tabs. Property
edits use the exact set; structural commands normalize ancestors and descendants. One atomic
command publishes one patch/history step, refuses all members on errors, preserves document order,
and restores selection on undo/redo. A changed schema during cold planning refuses stale work.
Cancel, navigation and destroy prevent late mounts/mutations. Loading failures expose their reason
and Retry with keyboard focus preserved.

Pointer activation on a toolbar now retains the existing selection, including Safari's focus path.
Dragging a selected member retains the set and updates the primary. Hover chrome recognizes the
deepest hovered component, rather than mistaking its ancestor Panel for a neighbouring field.
These fixes have three-browser regressions; protected first-pointerdown behavior remains initial.

Owner polish: separate caption/type chip, content-fit live preview, inline Show/Disabled-when
conjunction, full header title with available-space truncation, bracketed-box Fieldset icon, plain
single error/list for multiple errors, and Bootstrap 4/5 help below controls using CSS order. Shared
shell DOM order/control identity is preserved. Existing condition chips, outside-content labels,
settings-only header menu and the single Preview mode tab remain.

## CI regressions repaired without changing expectations

- Missing portable-view resolution is checked before theme lookup; SDK's exact `No portable view`
  contract and existing assertion remain unchanged.
- The CLI kit packs all 15 unpublished packages and every exported entry/asset, including opt-in
  themes/lazy chunks. Fresh generated-project installs, frozen reinstalls and verify are tested.
- Inline-caption weight uses an `--ofb-*` token; builder theme expectations remain unchanged.
- Playground authoring/Yes-No and benchmark hosts now explicitly register their form themes.
  The unchanged Yes/No assertions pass in all three browsers; unchanged count fixtures pass 5/5.

The original [push run 40573443225](https://github.com/nawinisha231272-wm/formkit/actions/runs/40573443225)
retains the three reported failures. The subsequent [PR run 40574292965](https://github.com/nawinisha231272-wm/formkit/actions/runs/40574292965)
and [push run 40574286558](https://github.com/nawinisha231272-wm/formkit/actions/runs/40574286558)
failed on a duplicate message key (TS1117); the duplicate is removed. Their failed logs are archived,
not re-run. New delivery evidence must come from attempt 1 on the corrected head.

The Settings-only preload fixture explicitly disables the two new idle policies, preserving its
Settings/no-mount/no-history assertions. A separate case covers all three default idle imports.
New-test setup errors (wrong fixture id/destroy handle, Vite query matching, picker accessible name)
were corrected openly; failure logs are retained. No pixel, size, timeout or count threshold is relaxed.
The first sequential full native verify reached 337/338 unit passes but the three-scaffold proof
finished at 181.993 seconds, exceeding its unchanged 180-second limit. The retained failure log is
`native-full-scaffold-timeout.log.gz`. SDK tarballs now pack in independent batches of three;
exports/assets/install/verify assertions and both existing deadlines are unchanged. The focused
proof then passes all three fresh projects in 119.585 seconds (`bounded-pack-scaffold.log.gz`).

Prior simultaneous unit/typecheck execution caused three timeouts; unchanged isolated units passed
338/338. Final full verification runs sequentially, after Linux generation, without that contention.

## Verification and review

Final pinned verify, Linux generation/comparison, consumer sizes, screenshot manifest and CI links
will be recorded here after their commands finish. No pending check is represented as PASS.

The exact 500-field baseline is 500 index visits; each bulk Delete/Move/Required performs 500 child
commands, one publication and one history entry, with byte-identical undo/redo. Index timing is
advisory (target 50 ms); no wall-clock threshold replaces deterministic correctness counts.

## Final migration follow-up — 2026-10-29

The complete native run after bounded package packing passed 338 unit tests but failed 169 browser
cases (1,286 passed); it was not pushed. Its full log and failure map are retained in
`m09b-plus-combined-evidence/native-full-theme-migration-failures.log.gz` and
`native-theme-migration-failure-map.json`. Root causes included incomplete explicit form-theme
registration in examples, dynamically created form elements lacking the registry option, Material
outer Tabs styling missing the semantic canvas wrapper, and a removed host schema-event demo output.
The owner approved optional form-element `themes`, atomic renderer `setThemes` and corresponding
in-place React/Angular input updates, with state/focus/reconnect tests and `unknown-theme` diagnostics.

The existing drawer test locator is openly corrected from
`getByRole("complementary", { name: /Rating/ })` to
`getByRole("complementary", { name: "Customer rating", exact: true })`: the approved dialog
caption is the actual field label, not its model title. All value, undo and history assertions are
unchanged. Dynamic-element test setup now explicitly registers descriptors; assertions remain intact.
The M02 wrapper fixture uses the explicit registry API rather than relying on implicit theme imports.

The Firefox keyboard failure was isolated by removing individual stylesheet rules in a disposable
diagnostic clone: quick-add used `display:none` with a focus-dependent `display:block` rule, causing
native Tab traversal to skip the remaining canvas/outline targets. Keep markers mounted and
layout-stable with visibility concealment and roving Tab stops at the selected
component and empty destinations; those current Tab stops stay visibly available during traversal; hover/focus reveals them without changing layout
during focus traversal. Original keyboard-task and destination-paste assertions are unchanged.
Quick-add also retains its origin focus while loading, so Escape cancels before its body arrives.
A cut destination remains selectable without opening search before Paste. No diagnostic-only tests
or CSS-disabling probes are shipped.

The new cold-quick-add regression initially matched the permanent palette search as well as the
popover search; its new assertion is scoped to the mini palette, preserving the no-late-replay
intent. Both pointer and Space activation are covered. Space on an insertion marker must activate
quick-add, not pick up its containing field; the drag source resolver excludes insertion markers.

A visibility-only concealment still reproduced Firefox's native traversal failure; making every
invisible marker a Tab stop also overloaded the WebKit keyboard path. The final marker policy keeps
layout stable and roves Tab stops with the selected component/empty destinations. Other markers
remain pointer-operable on hover and become keyboard-reachable when their component is selected.
A regression checks the actual Tab-to-marker/Space/Escape path and prevents accidental drag pickup.

The exposed markers also revealed a separate focus reentrancy bug: ancestor-tab reveal temporarily
focuses a design target and restores the outline; that restoration re-entered selection/reveal in
WebKit. Guard programmatic reveal/restore focus changes so only the initiating row updates selection.
The regression also focuses the outline after quick-add cancellation and arrows to the next row.

The new outline-arrow assertion initially assumed Email followed Full name; the approved fixture
puts Phone next in Column 1 and Email in Column 2. Its expected focused id is corrected to Phone.
This changes only the newly added regression setup assumption, not any pre-existing test intent.

Visual QA caught a missing primitive marker on the settings type chip: it had the correct text/class
but did not receive the Chip recipe. The lazy Settings body now marks it as that shared primitive;
all-five-theme tests assert the marker and actual flex-layout styling. New selection images capture
the visible canvas panel rather than the taller clipped child, avoiding blank off-viewport space.
The two existing whole-page dialog comparisons now wait for the unchanged five-second transient
loading toast to expire before capturing stable settings/conditional screens. All prior assertions,
image thresholds and deadlines remain unchanged; these are capture stabilization and framing fixes.

The first final-source full run passed lint/build/typecheck and 339 units, then the newly added
chip-style assertion failed in five Chromium themes. It expected the authored `inline-flex` value;
a flex item is blockified and its computed display is `flex`. The product marker/style is correct.
Before: `toHaveCSS("display", "inline-flex")`; after: `toHaveCSS("display", "flex")`. This corrects
only the new assertion; caption/text/primitive checks and every prior expectation remain unchanged.
The run was interrupted after 322 browser passes (five failures, two interrupted, 1,150 not run),
exit 130, to correct this known test error. Its complete log is retained as
`native-full-interrupted-chip-assertion.log.gz`. A new complete pinned run is required before push.

The next full local run failed two unchanged deadlines: the security source scan (5 seconds) and
the completed three-scaffold proof (184.322 seconds versus 180). The headless file pool was still
two workers locally, allowing the source AST scan and other files to compete with the scaffold's
compiler/browser child processes. The local file policy now matches CI's existing single worker.
No test is skipped, no security exclusion is added, and the 5/120/180-second deadlines, assertions
and coverage thresholds are unchanged. Evidence: `native-full-local-unit-contention.log.gz`.

Serial files remove the security-scan timeout, but the packed proof still crossed 180 seconds.
Phase instrumentation (assertions unchanged) measured packing at 4.382 seconds, first installs at
2–3 seconds, and generated verification at 58.273 / 54.277 / 49.298 seconds. The generated harness
ran independent browser/theme contexts one at a time. It now uses two workers, while repository
headless files stay serial. Every browser/theme, axe/property check, visual policy and existing
deadline remains; no checks are removed or reused across generated projects. Phase logs are
retained in `scaffold-phase-profile-before.log.gz` and `serial-headless-scaffold-timeout.log.gz`.

The bounded generated-harness change passes the identical packed-kit/fresh-install/frozen-offline
proof and source-security checks: **4/4**, proof about **114 seconds** under the unchanged 180-second
limit (`scaffold-parallel-proof.log.gz`). All three unedited projects still verify all browsers/themes.

The next complete native run passed all 339 units and 1,471 browser checks, with eight browser
failures retained in `native-full-patch-collision-and-host-preloads.log.gz`. Five failures expose
the host audit output and lazy JSON viewer sharing `builder-patch`; the host keeps its own node
reference and hands that legacy anchor to the mounted JSON viewer. Assertions stay unchanged.
A plain Loading toast could remain paused under the pointer: only actionable toasts now pause
on hover/focus; plain notices expire at the unchanged five seconds, without clearing the SR region.
A new deterministic clock regression covers this; existing eight-second action tests remain intact.
The Angular CLI no-background-import fixture must also disable the newly approved planning/Data
preloads. Its URL now explicitly sets both to `none`; the same zero-request assertion remains.
Those independent options now forward through every builder wrapper and example. Local browser
workers match CI's single-worker policy to avoid the unchanged 30-second keyboard task competing
with another browser/axe host. No test deadline or existing assertion is changed.

The toast repair also removes the stale hover flag: pause/resume reads the element's current
hover/focus state and applies only to an actionable toast. The first draft measured
31,442 / 7,303 / 67,376 and was rejected by the unchanged builder-core gate. The smaller direct-state
implementation measures **31,355 / 7,260 / 67,318** (UI/core/full); no ceiling changes or deferrals.
The first focused repair run was interrupted because a concurrent rebuild removed the package
output it served; its results are not accepted. Build and browser verification are now sequential.

The subsequent full run passes 339 units and 796 browser checks before interruption: Firefox's
conditional review screen exposes a second toast timer bug. A mouseleave/focusout could call resume
while its timer was already running, restarting the plain notice's full five seconds. Resume now
leaves a running timer untouched; the deterministic plain-toast regression hovers for three seconds,
leaves, then asserts expiry after the remaining two (the SR message still stays). The original
five-second assertion is unchanged. Retained log: `native-full-interrupted-plain-toast-restart.log.gz`
(one failure, one interrupted, 687 not run; Playwright exit 130). No failed run is pushed.

Timer-resume repair measures **31,379 / 7,209 / 67,317** against the unchanged three gates.
A disposable focused configuration omitted the repository snapshot template: 15 behaviors passed,
but three Chromium comparisons correctly failed for missing baselines at its wrong default path.
The accidental unapproved images were removed; the comparison is repeated against the existing
platform-separated baselines, without recording. Its failed log is retained as
`toast-timer-private-config-missing-baselines.log.gz`. No repository test or baseline is weakened.

## Final local delivery results

`npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify` **PASS, exit 0**.
Evidence: [complete log](m09b-plus-combined-evidence/final-pinned-verify.log.gz) and
[source manifest](m09b-plus-combined-evidence/delivery-source-manifest.json). API additions (owner approved): optional `OurFormElement.themes`, atomic
`FormView.setThemes(registry, selectedTheme?)`, `unknown-theme` error/event codes, and forwarded `planningPreload`/`dataPreload` builder host controls. React/Angular
use their existing `themes` inputs without remounting. Both light/shadow/reconnect and all-host
state/focus/error-preservation checks pass. No form JSON changes.

No runtime source
changes follow this verification; delivery documentation and logs are then linted before commit.

| Gate                                        | Measured Brotli bytes | Fixed ceiling | Headroom |
| ------------------------------------------- | --------------------: | ------------: | -------: |
| Builder UI initial (excludes builder-core)  |                31,379 |        31,600 |      221 |
| Builder-core marginal consumer contribution |                 7,209 |         7,300 |       91 |
| Full minimal initial consumer closure       |                67,317 |        67,400 |       83 |

Delta over the owner's combined starting baseline: **+2,522 / +534 / +3,694**.
Delta after the first approved boundary build: **+310 / +13 / +499**.
No code moves into builder-core in this change; its marginal compression contribution changes with
consumer use. All 17 standalone package budgets pass, including builder at ceiling 31,600.

| Lazy consumer-built closure | Measured | Ceiling |
| --------------------------- | -------: | ------: |
| Settings                    |    7,704 |   8,000 |
| Command search              |    2,960 |   4,500 |
| Quick-add                   |    1,869 |   3,750 |
| Bulk editor                 |    4,640 |   4,700 |
| Bulk planning               |    1,547 |   1,750 |
| Data body                   |      269 |     300 |
| Logic/JSON/map              |      745 |  28,000 |
| Logic/JSON/map/Settings     |    8,449 |  36,000 |

Distinct Retry entries also pass their corresponding gates. Owned deferred union (including Retry
copies and existing unavailable placeholders) is **38,966**; this does not ship
History/diff or M09c Logic/map. The full consumer incremental closures and shared dependencies are
reported separately in [the size JSON](m09b-plus-combined-evidence/final-delivery-size.json).
[Consumer output sizes](m09b-plus-consumer-sizes.json) cover Vite/React, Angular CLI, vanilla and
all per-theme/all-themes script-tag bundles, counting each shared static asset once.

Tests: **339 unit tests; 1,485 browser checks; 17 package budgets plus all consumer/lazy
gates; 5 runtime count fixtures plus the exact 500-field authoring count test**. Core/validation
coverage thresholds remain 90%. The first Linux recording passed 24 builder and 201 form checks, then hit a 30-second WebKit
Bootstrap 5 dark timeout under emulation. Its failure log and context are retained. Exactly 170
unmodified PNG artifacts from passing checks were preserved; the timed-out image was excluded.
A fresh bounded recording completes the 24 builder and 24 WebKit theme checks. Full comparison
then covers all **24 + 216** original cases in fresh per-browser/file batches, with unchanged test
deadlines, assertions and pixel thresholds; see the complete Linux recovery/comparison log. Native Yes/No repair passes
12/12 with unchanged assertions. No pixel, timeout, correctness or count threshold is relaxed.

500-field first-use browser indexing: **13.800 ms**, advisory target 50 ms;
**500 visits**, cached reopen adds no indexing work. Each bulk Delete/Move/Required performs
**500 child commands, one publication, one history entry**, with exact undo/redo. Advisory unit
work timings are in [the work report](m09b-plus-combined-evidence/final-authoring-work.json).

Screenshots: **295 changed / 38 new / 109 byte-identical**.
[Owner review page](m09b-plus-owner-review.html) and [image fingerprints](m09b-plus-screenshots.json).
Owner approval remains pending. Final first-attempt CI links/conclusions are recorded in PR #16 after
push; prior failed heads are retained above, never re-run to obtain green. M09c/M09d are not started.

## First final-head CI outcome — 80b4dfa, attempt 1

[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/40955321646) fails
three browser cases (1,482 pass); [push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/40955316354)
fails two (1,483 pass). Both pass all 339 units. [Advisory timings](https://github.com/nawinisha231272-wm/formkit/actions/runs/40955321637)
succeeds on attempt 1. No workflow is rerun. Logs are retained in `ci-80b4dfa-*-attempt1-failed.log.gz`.

Both failing test names are `owner review: sentence-first Conditional settings with synchronized
expression disclosure` and `approved screen 2: generated modal and actual Bootstrap 5 error-state
preview`. Their new real-time capture waits race a five-second toast against a five-second assertion
deadline. The deterministic expiry and action pause regressions pass in all three browsers in both
CI runs. This is a capture setup error introduced here, not evidence to relax the toast contract.

Install Playwright's clock before navigation in these two captures, advance it 5,001 ms immediately
before the existing toast-hidden assertion, and keep every expression, invalid-state, screenshot and
axe assertion unchanged. Runtime expiry remains 5,000 ms (8,000 for an actionable toast); no product
source, assertion deadline, baseline image or pixel threshold changes. New full pinned verification
is required before the correction is pushed; no passing CI is claimed for 80b4dfa.

The clock-controlled captures pass all **6/6** native browser cases against the existing images
(`capture-clock-six-native.log.gz`). Assertions and baseline hashes are unchanged.

## Capture-clock correction: final local proof

Full pinned `pnpm verify` **PASS (exit 0)** again: **339 units / 1,485 browser checks / 17 package +
19 consumer/lazy size gates / 5 runtime counts**. The exact 500-field authoring test also passes.
The two corrected captures compare **6/6** in the pinned official Linux image, without updating
any image. Every one of the **442 baseline hashes** is unchanged since 80b4dfa; its complete
48-recording/240-comparison proof is retained separately. No assertion, deadline, pixel threshold
or runtime source changes. The four added test setup lines install/advance time only.

All three measured byte deltas are **0 / 0 / 0**: UI **31,379/31,600**, core **7,209/7,300**,
full **67,317/67,400**. Existing lazy/aggregate ceilings pass; no ceiling changes. Latest isolated
500-field index: **15.300 ms**, 500 visits, cached reopen. Bulk counts remain
500 child commands / one publication / one history entry for each of Delete/Move/Required.

Evidence: updated `final-pinned-verify.log.gz`, `capture-clock-six-linux.log.gz`, source manifest
and count/index JSON in `m09b-plus-combined-evidence/`. Remote CI on the correction is required
after push; no rerun of either failed 80b4dfa workflow is permitted. No merge.
