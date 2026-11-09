# M09b+ Linux task profiling — 2026-11-07

Status: **full pinned local verification PASS; first-attempt CI on the new head pending**. PR #16 remains open.
The owner authorized Linux profiling and a proven cause fix after the two first-attempt Verify failures.
No failed CI workflow has been rerun. No existing assertion, deadline, retry count or pixel threshold changed.

## Retained CI evidence

At source head `3bdf03416c9a402c6406b6ce8d6d1064e43c2bec`, both
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/42317266414) and
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/42317260357)
failed on attempt 1: the unchanged 30-second twelve-field WebKit mouse and keyboard tasks.
341 unit tests and 1,591 browser checks passed; CI did not reach size/count stages.
[Advisory timings](https://github.com/nawinisha231272-wm/formkit/actions/runs/42317266362)
passed on attempt 1; advisory success is separate from correctness.

The task file is byte-identical to verified main `0b3b452c46096e852248ca11872f9697888c621e`.
Main's retained green run [40019110517](https://github.com/nawinisha231272-wm/formkit/actions/runs/40019110517)
completed these WebKit tasks in 9.5 s / 12.6 s. Current CI hit 30 s / 30 s.

## Controlled local comparison

Fresh immutable git archives of both revisions were installed and built separately inside
`mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a`,
using Node 22.22.3 and pnpm 10.10.0. This machine emulates Linux x64 on an arm64 Mac.
Both arms used only the playground server, one worker and the original 30-second task deadline.
The diagnostic config omits unrelated example servers; it is not a substitute for full verification.

The unmodified tasks hit the deadline on **both** local arms. Emulated wall-clock pass/fail therefore
cannot establish the native CI cause. Step reporters and separate instrumented copies preserve all
original actions/assertions/deadlines and expose the work completed before the deadline.

Instrumentation wraps CSS writes, attribute writes and geometry reads; it adds per-edit logging.
At the same completed `Customer type` edit, cumulative geometry-read cost was:

| Input    |   Main |  PR head | Skip redundant builder CSS writes | Diagnostic inline-style control |
| -------- | -----: | -------: | --------------------------------: | ------------------------------: |
| Mouse    | 197 ms | 3,252 ms |                          2,104 ms |                          374 ms |
| Keyboard | 362 ms | 4,199 ms |                          3,081 ms |              see raw phase data |

These are diagnostic samples, not a timing gate or a claim of full-task recovery. All raw phase data
and failed outcomes are retained in `m09b-plus-linux-task-evidence/`.

The builder's new CSP-safe dynamic stylesheet helper calls `CSSStyleDeclaration.setProperty`
even when the declaration already has the requested value. Subsequent geometry reads then pay
additional style/layout work in WebKit. The diagnostic inline control removes most of that cost,
but **cannot ship** because it does not satisfy strict CSP. It was confined to the disposable clone.
Appending rules instead of inserting at index zero did not improve the profile and was discarded.
No alternative styling path or additional deferral is proposed.

## Minimal candidate and regression

The candidate changes only the builder stylesheet helper: compare the existing property value before
calling `setProperty`. Changed values still write to the same nonce-compatible stylesheet. No inline
styles, public API or form-JSON change is introduced. No code moves between packages or lazy boundaries.

New test: `builder-style-work.spec.ts` —
**“retained selection chrome does not rewrite unchanged CSP stylesheet declarations”**.
It exercises actual focus/selection changes, counts redundant stylesheet writes, verifies that changed
dimensions still write CSS, and retains the final focus/selection assertions.

- Original pushed implementation: **FAIL in Chromium, Firefox and WebKit**, each reporting 27 redundant writes.
- Candidate: **PASS in all three browsers**, zero redundant writes; actual dimension updates still occur.
- Builder typecheck and targeted ESLint: PASS.
- The focused browser proof used the exact pinned macOS-built candidate builder JS copied into the
  pinned Linux image. No fresh complete Linux source-build/visual verification is claimed for the candidate.
- The complete unchanged task suite and full CI still require validation after the budget decision.
  This candidate proves elimination of redundant work; it does not yet prove complete CI recovery.

## Same-build size STOP

`fix-size.json` uses the existing consumer build and accounting without edits to ceilings.

| Gate                                        | Pushed baseline | Candidate | Delta | Ceiling | Result            |
| ------------------------------------------- | --------------: | --------: | ----: | ------: | ----------------- |
| Builder UI initial, excluding builder-core  |          31,784 |    31,760 |   −24 |  31,800 | PASS              |
| Builder-core marginal consumer contribution |           7,190 |     7,266 |   +76 |   7,300 | PASS              |
| Full initial closure                        |          67,651 |    67,714 |   +63 |  67,700 | **FAIL: 14 over** |

No builder-core code changed; its marginal compressed contribution changes with consumer bundling and
compression, under the unchanged approved method. Per-feature/aggregate lazy gates pass; no new chunk.

The owner called 31,800 / 67,700 the **final M09b+ ceilings** and disallowed further byte-hunting probes.
The candidate has therefore not been committed or pushed, and no full verification is claimed for it.
Decision needed: authorize narrowly scoped compaction for this bug fix under the unchanged ceilings,
or retain the budget STOP. No ceiling increase is requested.

## Owner-authorized targeted compaction

The owner approved narrowly scoped compaction while keeping all ceilings unchanged. The only further
source change binds `cached.rule` once inside the existing helper; all guarded writes use that same
declaration. No behavior, package ownership or lazy boundary changes. This compaction measures
**31,733 UI / 7,168 builder-core / 67,657 full initial**, within **31,800 / 7,300 / 67,700**.
Compared with the initial guarded candidate, the full closure drops 57 bytes. Compared with the
pushed baseline, deltas are **−51 / −22 / +6**. The initial over-budget measurement remains above
and in `fix-size.json`; `compacted-size.json` is the current compaction checkpoint.

A fresh pinned Linux builder source build, focused regressions/CSP/unchanged visuals and full pinned
verification are required before commit and push. Native CI recovery remains unproven until the new
head's first-attempt Verify passes. No failed workflow will be rerun.

## Disclosed readiness corrections from the first local full run

The first native full run completed **341 units / 1,594 browser passes / two WebKit failures**;
size/count stages were not reached. Its entire failed log and snapshots are retained as
`first-local-full-*` artifacts. It was not pushed and no CI workflow was rerun.

1. `builder-bulk-actions.spec.ts:243`: the first order assertion read `[a,b,c,d]` immediately after
   Alt+ArrowDown. The failure snapshot already showed the correct `[a,d,b,c]` and selected `[b,c]`.
   A controlled held-import probe proves the cause: while lazy planning is held, state/history remain
   unchanged; releasing it produces `[a,d,b,c]`, exactly one history entry and the same selection.
   The approved Move contract is asynchronous; the test incorrectly assumed completion on key return.
   Add `await expect.poll(() => schema(page)).not.toBe(before)` before each existing order assertion.
   Every original order, selection and undo assertion stays unchanged. Protected immediate Delete,
   Required and clipboard tests are not converted to eventual assertions.
2. `builder.spec.ts:261`: the offline fixture disabled even localhost before the default idle Settings
   import completed. The snapshot reports “Importing a module script failed” and the correct Retry /
   Add with defaults state. The old eager fixture had all client code loaded by page startup.
   The corrected setup waits for the actual idle Settings request and awaits evaluation of that same
   module URL before disconnecting. **The first Settings interaction, every edit and submission still
   occur with `context.setOffline(true)`**, and the existing external-origin block/assertion is unchanged.
   This makes client-code cache readiness explicit; it does not route network requests around offline mode.

An AST audit preserves **all 55 original bulk-action assertions and all 38 original builder assertions**.
The only added assertions are the two bounded schema-publication waits; no expected value, overall
30-second deadline, retry count or intent changed. All six corrected-case/browser combinations pass
in the focused check. A new full pinned verify is required before any commit/push. Runtime source
and all measurements remain unchanged at **31,733 / 7,168 / 67,657**.

## Final local proof

Owner-authorized compaction is fully verified locally: **341 unit, 1,596 browser, 36 size gates and five
runtime-count fixtures**, full pinned `pnpm verify` exit 0. The 117 focused native checks and fresh
Linux six regression/CSP checks plus 41 unchanged visual comparisons also pass. Final measurements
are **31,733 / 7,168 / 67,657** on both platforms; no ceiling changed. The original task assertions
and 30-second deadlines are unchanged. The targeted WebKit tasks passed at 9.9 s / 13.4 s.

The verified non-document source and 472 baseline hashes are unchanged across the full proof.
`m09b-plus-linux-task-evidence/final-verification.json` and `final-consumer-size.json` are the current
records; all initial failures/profiling controls and the rejected over-budget candidate are historical.
CI recovery is confirmed only by the new head's first attempts, recorded in PR #16. No failed workflow
is rerun. Owner delivery review is still required; do not merge.
