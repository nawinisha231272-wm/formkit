# M09b+ — owner follow-up, 2026-11-09

Status: **local acceptance PASS; immutable first-attempt CI evidence is linked in PR #16 after push. Owner re-review required; do not merge.**
Current UI/core/full: **31,769 / 7,120 / 67,674**, fixed ceilings **31,800 / 7,300 / 67,700**.
The owner approved targeted and standing behavior-preserving compaction on 2026-11-09, with no
CSS rule/selector, ARIA attribute, message or test removal, and full browser/menu/selection checks.

**Do not merge.** The owner reviewed `cc05111` screenshots as OK in principle, with these four
items still required. No later milestone has started.

## 1. Context selection

PASS: right-click within a selection retains the entire set and exposes “Delete 2 components”
and “Duplicate 2 components”. Right-click outside selects only that target. The gesture no longer
focuses and collapses the set before opening the menu. The handler uses the nearest treeitem,
so a component nested inside an outline slot is not confused with that ancestor slot. Locks are retained.

`builder-bulk-actions.spec.ts`: “context-click canvas preserves selected members and replaces
selection outside it” and the corresponding outline case. Both cases PASS in Chromium, Firefox and
WebKit, native and pinned Linux. They also assert no schema/history change from opening the menu.

## 2. Runtime edit investigation

The advisory is **form-runtime field editing**, not builder editing. The unchanged workload in
`apps/benchmarks/main.ts` calls `session.setValue("field0", ...)` 25 times, forces layout after each
edit with `root.offsetHeight`, and recalculates 25 dependent fields. Each build uses three warm-ups
and 15 measured samples per size; five main/branch pairs alternate on one runner/browser.
`editMS` is the entire 25-edit batch. Absolute medians and the corresponding per-edit values follow.
The ratio is the median of paired ratios, so it need not equal the quotient of the two absolute medians.

| Evidence / platform            | Fields | Main batch ms | Branch batch ms | Main / branch ms per edit | Paired ratio |
| ------------------------------ | ------ | ------------- | --------------- | ------------------------- | ------------ |
| previousLinux (linux-x64)      | 100    | 33.200        | 43.900          | 1.328 / 1.756             | 1.388×       |
| previousLinux (linux-x64)      | 500    | 73.600        | 101.800         | 2.944 / 4.072             | 1.376×       |
| previousLinux (linux-x64)      | 1000   | 163.800       | 222.100         | 6.552 / 8.884             | 1.364×       |
| fixedNative (darwin-arm64)     | 100    | 42.300        | 41.900          | 1.692 / 1.676             | 0.991×       |
| fixedNative (darwin-arm64)     | 500    | 102.500       | 103.000         | 4.100 / 4.120             | 1.008×       |
| fixedNative (darwin-arm64)     | 1000   | 238.300       | 240.800         | 9.532 / 9.632             | 1.006×       |
| fixedLinuxEmulated (linux-x64) | 100    | 94.700        | 86.200          | 3.788 / 3.448             | 0.971×       |
| fixedLinuxEmulated (linux-x64) | 500    | 196.600       | 171.700         | 7.864 / 6.868             | 0.873×       |
| fixedLinuxEmulated (linux-x64) | 1000   | 367.400       | 368.300         | 14.696 / 14.732           | 1.063×       |

Original native-Linux evidence: [advisory run 42395643377](https://github.com/nawinisha231272-wm/formkit/actions/runs/42395643377), attempt 1,
and [raw report](m09b-plus-followup-evidence/previous-ci-ab.json). The new Linux measurement uses the
same official pinned image under x64 emulation on the Mac; it is not presented as a native CI run.
Production builds of main `0b3b452` and the candidate ran alone during each A/B workload. Final-head
CI will report another native-Linux A/B; it has not been rerun to obtain a favorable timing result.

**Cause and fix:** the CSP-safe renderer wrote each field rule's identical `cssText` on every render,
invalidating styles before the benchmark's forced layout. Retain the last raw declaration string per
mounted rule and write only when it changes. Theme/mode/registry changes still apply new declarations;
there is no theme fallback, global cache or rendering contract change.

PASS: all new local paired edit ratios are within 10% of main (native worst 1.008×; emulated Linux
worst 1.063×). The negative control on the prior renderer reproduces exactly 650 redundant writes
per numbered fixture and 25 in onboarding. The fixed renderer performs **zero redundant writes**
across each 25-edit run. `runtime-styles.spec.ts` checks initial-rule totals 100/500/1,000/124 and no
subsequent rewrites; the existing exact processor/DOM/patch/render counts remain unchanged. All nine
runtime count tests PASS on both platforms. Original focus, input identity, count and teardown checks remain.

## 3. Completed loading announcements

PASS in the focused native matrix: finishing or cancelling a lazy activation clears its matching live-region message as well as
its visible loading toast. The cancellation callback checks ownership before clearing, so a newer
message is retained. Ordinary timed toast expiry still leaves the screen-reader announcement alone.

`builder-loading.spec.ts`: “completed command loading clears the live region and later commands
announce normally” holds the Commands import, observes “Loading Commands…”, releases it, asserts the
mounted search plus empty live region/hidden loading toast, then verifies keyboard Undo announces
“Nothing to undo”. All three browsers PASS natively and in pinned Linux (the Linux log retains the
first descriptive title; assertions are identical).

The final audit found lazy themes also left their loading announcement behind. They now use the
same owned cleanup callback on success; the existing theme success and failure/Retry cases retain
all their original assertions and add empty-live-region/hidden-toast assertions. All 15 focused
native cases PASS across Chromium/Firefox/WebKit. All 15 focused cases also PASS in pinned Linux. This addition caused the now-resolved budget STOP below.

## 4. Requested host captures

PASS: park the pointer at `(0, 0)` and assert the Preview root is not hovered before capture.
Re-recorded **only the requested 43 images: 30 macOS + 13 Linux**. No image dimensions changed;
**429 other baseline files retain their hashes**, with zero new baseline files. Existing screenshot
thresholds, viewport crop, labels, values and functional assertions are unchanged.

[Focused 43-image review](m09b-plus-owner-followup.html) shows main, the reviewed `cc05111`, the parked
capture and exact main/after diff. [Whole gallery](m09b-plus-owner-review.html) retains the earlier
approved-in-principle product changes. Source images from main are immutable. Compared with main,
remaining differences are hover control borders and subpixel/crop rasterization, not new product
appearance changes. Material's old capture visibly hovered Notes rather than Email; parking fixes
the incidental pointer state for every theme/host. Exact per-image pixels/dimensions are retained in
[image-audit.json](m09b-plus-followup-evidence/image-audit.json).

The diagnostic [raster audit](m09b-plus-followup-evidence/raster-audit.json) checks all distinct image
pairs: pixels outside the documented control-border bands match within a one-pixel neighborhood
and RGB L1 distance 90 (antialias/crop analysis only). No remaining unmatched pixels occur outside
those border bands. This analysis changes **no Playwright threshold** and does not constitute owner
approval. The gallery's audit also corrects a bounds-only reporting bug: rightmost changed x now uses
the maximum across all rows; image comparison pixels and screenshot assertions were unaffected.

## Size, failures and delivery

Historical pre-theme-cleanup measurement UI/core/full: **31,746 / 7,209 / 67,699**, ceilings **31,800 / 7,300 / 67,700**.
Delta from `cc05111`: **+13 / +41 / +42 bytes**; no moved code, API addition, new runtime dependency,
new lazy chunk, form-JSON change or ceiling change. Existing lazy/aggregate limits remain enforced.
Builder-core source is unchanged: its marginal consumer contribution changes through compression/chunk accounting, not transferred code.
Linux and native consumer measurements match. The complete theme cleanup now measures **31,730 / 7,223 / 67,726**: delta from cc05111 **−3 / +55 / +69**.
This historical candidate exceeded the full ceiling by **26 bytes**. No code was moved or deferred.
[Current blocked size report](m09b-plus-followup-evidence/blocked-consumer-size.json) supersedes the
pre-theme values for the current working tree. The owner subsequently approved behavior-preserving compaction with every ceiling retained.

New-test authoring failures are retained, not hidden: the first context-menu test used button rather
than menuitem locators; the first loading test lacked builder focus, then attempted an aria-disabled
Undo click and hit the unchanged 30-second deadline. It now uses the documented keyboard Undo.
The initial onboarding rule-count guess was corrected from 13 to the fixture's actual 124 rules.
These were new tests; no existing expectation, timeout, retry or test intent was weakened.
The first Linux capture selector accidentally included parent path text and selected no tests; the
corrected selector targets exactly the 13 requested filenames. The already-passing Linux count proof
was retained instead of repeated. All failed setup logs and expected negative controls are preserved.

The full pinned run passed lint/build/typecheck and 341 unit tests, then was deliberately interrupted
(exit 130; 131 browser passes) when the separate lazy-theme announcement path was found. Its complete
log/fingerprint are retained; it is **not** a full-verify PASS. The corrected full run, Linux theme
regressions and new-head first-attempt CI remain pending on the compacted source; the size STOP is resolved. No push or merge.

## Approved compaction ledger

All measurements use the same consumer builds. Baseline is the complete pre-compaction fix,
UI/core/full **31,730 / 7,223 / 67,726**. [Raw ledger](m09b-plus-followup-evidence/compactions.json).

| Compaction                                                                     | UI / core / full bytes  | Delta from baseline | Decision                               |
| ------------------------------------------------------------------------------ | ----------------------- | ------------------- | -------------------------------------- |
| Combine request identity and loading cancellation in one unique request object | 31,777 / 7,327 / 67,776 | +47 / +104 / +50    | Discarded; grows full and exceeds core |
| Share identical captured-focus restoration between theme success and failure   | 31,769 / 7,120 / 67,674 | +39 / −103 / −52    | Kept; all ceilings pass                |

The kept helper runs at the same two call sites, with the same captured-focus/connected check,
fallback target and preventScroll option. No CSS, selector, ARIA, message or test was removed.
No code moved between packages; builder-core source is unchanged and its marginal measured
contribution changes through compression/chunk accounting. The full consumer closure saves 52 bytes;
the separate UI probe grows 39 but remains below its fixed ceiling. Delta from reviewed cc05111:
**+36 / −48 / +17**. No new lazy chunk or API/JSON change. Final verification remains required.

The generated whole-gallery HTML/JSON finished writing after their first formatting pass. One local
verification therefore stopped at Prettier (two documentation files only). Its log is retained; both
files were formatted after generation completed, with no source, assertion or baseline change.
The complete pinned run is restarted on the final compacted source. No CI run was rerun.

## Disclosed existing-test correction

The new owner requirement supersedes the old expectation that completed loading remains in the
polite region. Three parameterized Commands/quick-add/bulk-editor cases in
`builder-review-menus.spec.ts` now assert empty text after mounting rather than `Loading`.
The exact before/after lines are in [fixes.md](../rehearsals/m09b-builder/fixes.md). Waiting, mount,
hidden-toast and ordinary-expiry assertions, timeouts and retries are unchanged. This is an
explicitly requested behavior change, not part of compaction. The Linux matrix exposed precisely
these three stale expectations (47 other cases passed). A second native full run was deliberately
interrupted with 165 browser passes, exit 130, to correct them; it is not a full-verify PASS. Both
logs remain in the evidence directory. The final pinned verification starts after this correction.

## Virtual-slot locator correction (assertions unchanged)

The next full native run completed **1,602 passes / 3 failures**: the same virtual-slot test in
all three browsers. Its `column.click({ button: "right" })` targets Experience inside the expanded
Column 2, proven by capture-phase event targets in all three engines. The old ancestor-slot handler
masked this wrong locator. Target the slot's direct visible `.of-builder-tree-name` instead.
Every no-menu/Delete-refusal/schema/history assertion, deadline and retry remains unchanged;
the test still exercises the virtual slot. Exact before/after lines are in fixes.md, and raw failed
full/probe logs are retained. Runtime source and the size measurement set are unchanged. A complete
pinned run restarts after this correction.

## Final local proof — 2026-11-09

Full pinned `pnpm verify` **PASS (exit 0)**: **341 unit / 1,605 browser / 36 size gates
(17 package + 19 consumer/lazy) / 9 runtime count checks**. Frozen install, lint, build, typecheck,
coverage, conformance and axe pass. The source/baseline fingerprint is identical before/after.
Pinned Linux: 15 focused context/loading/theme checks, 50 unchanged menu/selection/authoring visual
comparisons, and all nine corrected completed-loading cases across the three browsers PASS.
No retries, deadline/threshold increases, skipped checks or CI reruns. The corrected three old
expectations, the proven virtual-slot locator correction (assertions unchanged), and interrupted/failed local runs remain disclosed above and in fixes.md.

One final consumer-build measurement set, matching native and pinned Linux: **31,769 UI / 7,120
builder-core / 67,674 full initial**, fixed ceilings **31,800 / 7,300 / 67,700**. Delta from cc05111:
**+36 / −48 / +17**. Standalone builder and all lazy/Retry/aggregate limits pass; no ceiling change.
Settings 7,704/8,000; Commands 3,586/4,500; quick-add 1,869/3,750; bulk editor 4,661/4,700; planning
1,547/1,750; Data 269/300. Owned deferred union 40,262 includes Retry entries. No new chunk,
API addition, form-JSON change, dependency or code transfer between accounting boundaries.
The kept focus helper saves 52 full bytes (UI +39/core −103); the growing unique-request probe
was discarded. All CSS rules/selectors, ARIA attributes and message literals are retained.

Fresh isolated 500-field index: **13.900 ms advisory**, exactly 500 visits, cached
reopen; bulk Delete/Move/Required retain exactly 500 child commands, one publication and one history
entry each. Only the requested 43 host images changed; 429 other baselines are byte-identical.
The full suite compares native baselines and the Linux menu/selection proof compares unchanged
Linux images. The local A/B fix stays within 10% of main on native and emulated Linux; native CI
timings remain advisory and are reported separately from correctness in PR #16.

[Canonical final proof](m09b-plus-followup-evidence/final-verification.json),
[consumer sizes](m09b-plus-followup-evidence/final-consumer-size.json),
[consumer hosts](m09b-plus-followup-evidence/final-consumer-hosts.json),
[full verify log](m09b-plus-followup-evidence/final-pinned-verify.log.gz).
First-attempt immutable current-head CI results are linked in PR #16 and the final delivery report;
this local proof does not claim remote success. **Do not merge: owner re-review remains required.**
