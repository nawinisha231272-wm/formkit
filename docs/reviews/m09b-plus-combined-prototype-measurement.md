# M09b+ combined prototype — historical measured gaps

**Historical checkpoint, retained verbatim below:** its size STOP was resolved by the owner on
2026-10-28. See [the approved reset and delivery report](m09b-plus-size-reset.md) for the current
fixed ceilings, final measurements and verification status. Failed logs and rejected probes remain.

Date: 2026-10-28. Branch: `m09b-plus-authoring`. Pushed HEAD remains
`53765f74507617022da415ce54e10611b5ce0974`; this prototype and its CI repairs are uncommitted
and unpushed. This is a measurement checkpoint, not milestone acceptance or passing CI.

## Implemented workload

The combined prototype includes immediate Ctrl/Cmd+K activation, lazy schema-indexed search,
canvas/outline multi-selection and Shift ranges, selection snapshots on undo/redo, normalized
structural actions, exact property selection, atomic Delete/Move/Duplicate/Paste/Wrap/Required,
synchronous clipboard handlers, a lazy shared-metadata bulk editor, and named lock refusals with
Deselect locked components. Context menus, toolbar More, Issues and PointerDrag remain initial.
The Add draft, host lock, schema and wire-format contracts have not changed.

Bulk Cut retains its captured source set while the author focuses a destination. Paste inserts the
ordered set after the focused field or in the chosen slot; cross-scope movement refuses all members.
An app cancelling any bulk `of-before-delete` event prevents the whole mutation. Duplication/Paste
remap references between copied roots as well as within each subtree. Modal listeners have their own
abort signal, while the index cache belongs to the stable builder instance. Failed command-search
imports use a distinct Retry entry, matching Settings, quick-add and bulk editing.

## All three consumer gates

Method is unchanged: normal tsup output, then esbuild 0.25.12 ES2022 production consumer builds and
Node 22.22.3 default Brotli. UI excludes builder-core; builder-core is the full build minus the
otherwise identical consumer with builder-core externalized. Shared chunks count once. Core is a
marginal compression contribution, not an independently compressed source-file size.

| Checkpoint                                             |     UI initial | Builder-core |   Full initial |
| ------------------------------------------------------ | -------------: | -----------: | -------------: |
| Owner's starting baseline                              |         28,857 |        6,675 |         63,623 |
| Combined prototype v1                                  |         32,879 |        7,135 |         68,363 |
| Completed prototype v2, restored after rejected probes |         32,899 |        7,243 |         68,480 |
| Independent lazy entry builds                          |         32,137 |        7,211 |         67,841 |
| Internal callback/member compaction and marker repair  |         32,031 |        7,194 |         67,771 |
| Shared document-order index                            |         31,996 |        7,193 |         67,629 |
| Final static CSS compaction, original core restored    |         31,951 |        7,173 |         67,628 |
| Current enforced ceiling                               |         29,000 |        7,050 |         64,613 |
| **Current gap**                                        | **2,951 over** | **123 over** | **3,015 over** |

V2 adds ordered bulk keyboard movement and command-search Retry coverage. Its delta over the owner's
starting baseline is +4,042 / +568 / +4,857 bytes. The core source is unchanged: new consumer usage
and shared-chunk compression change its measured contribution. No bytes have been relabelled.
Retained compaction saves **948 / 70 / 852 bytes** from v2. The final delta over the owner's starting
baseline is **+3,094 / +498 / +4,005 bytes**. Even the pre-approved maximum 29,500 UI fallback leaves
a **2,451-byte UI gap**; it cannot be applied while full initial remains over 64,613. No initial
ceiling has been increased.

## Compaction and headless-placement probes

Each row reports all three gates. Rejected variants were removed; no protected behavior was deferred.
Source descriptions below and the exact JSON output are retained in
[m09b-plus-combined-evidence](./m09b-plus-combined-evidence/).

| Probe                                                                                    | UI initial | Builder-core | Full initial | Result                                                             |
| ---------------------------------------------------------------------------------------- | ---------: | -----------: | -----------: | ------------------------------------------------------------------ |
| Terser 10-pass builder-core build, against v1                                            |     32,879 |        7,148 |       68,376 | Discarded: core/full +13                                           |
| Terser ES2022 compression option, against v1                                             |     32,879 |        7,135 |       68,363 | Discarded: no reduction                                            |
| Share core Undo/Redo replay and reuse feature outlet for command/bulk frames, against v2 |     32,920 |        7,302 |       68,492 | Discarded: +21 / +59 / +12                                         |
| Move SelectionSet into builder-core, against v2                                          |     32,763 |        7,495 |       68,475 | Discarded: core is 445 over its ceiling                            |
| Remove redundant index-generation guard and narrow Retry exports, against v2             |     32,911 |        7,179 |       68,447 | Discarded: UI +12                                                  |
| Above plus simpler pending-selection and success handling                                |     32,928 |        7,186 |       68,447 | Discarded: UI +29                                                  |
| Use existing ReplaceDefinition instead of UpdateComponent to rebase copied references    |     32,919 |        7,191 |       68,480 | Discarded: grows all gates versus the preceding index-only variant |
| Remove duplicate palette-caption assignment with the index compaction                    |     32,955 |        7,205 |       68,438 | Discarded: UI +56                                                  |

The headless probe moved the instance selection set, primary/anchor/ranges, normalization and snapshot
methods out of UI. UI fell 136 bytes, core rose 252, and full fell 5: compression/shared graph changes
mean these marginal values do not add. The 7,050 ceiling refused this placement. Its temporary export
and source were removed. Selection history still belongs to the builder instance, never form JSON.

Additional build/source probes, starting from the retained compaction checkpoints above:

| Probe                                                   | UI initial | Builder-core | Full initial | Result                                                                                    |
| ------------------------------------------------------- | ---------: | -----------: | -----------: | ----------------------------------------------------------------------------------------- |
| Cross-entry private-context mangling, dollar-name cache |     32,058 |        7,151 |       67,678 | Removed: grows UI/full versus shared index                                                |
| Same broad rewrite with letter-name cache               |     31,961 |        7,175 |       67,590 | Removed: only 35 UI bytes for a roughly 900-line rewrite and compiler-name-cache coupling |
| Factor repeated core clipboard checking                 |     31,996 |        7,193 |       67,629 | Removed: no compressed saving                                                             |
| Share core snapshot-command base                        |     31,996 |        7,246 |       67,682 | Removed: core/full grow                                                                   |
| Snapshot base plus CSS compaction                       |     31,951 |        7,157 |       67,612 | Removed with the growing snapshot-base refactor; original core restored                   |

The retained independent-entry build bundles each existing lazy entry's static helpers separately,
preserving every existing dynamic-import boundary. It avoids initial helper-fragmentation overhead;
it does **not** move any initial behavior into a new deferred feature. Static CSS minification now
also handles comment-only file preambles/trailers. A shared document-order index replaces duplicate
canvas/command traversal. Internal callback and selection-storage names use the established private
member minifier convention; public exports, snapshot keys and form JSON do not change. No code is
retained in builder-core from these probes, and no bytes have been reclassified between gates.

**Size STOP:** these retained compactions and the allowed headless placement have not closed the
hard gaps. The one-time UI fallback cannot cure the remaining full/core failures. Do not push,
raise a ceiling or defer another feature. Owner decision requested: authorize a measurement-only
proposal for additional lazy bulk-command planning (Move/Wrap/Duplicate/Paste preparation) and the
Data inspector body. Keep clipboard handlers/buffer/system access, immediate command frame,
selection/Shift-arrows, context menu and PointerDrag initial. Any proposed loading path must retain
the existing accessible frame/focus/error/Retry contract and an approved measured lazy ceiling.
This is an unimplemented proposal, not a claim that it will meet the gates. Alternatively the owner
can change milestone scope. All current gates remain enforced.

The unchanged standalone package budget also fails: builder **30,305 / 30,000** bytes; the other
16 package budgets pass. The consumer method and package gate were both rerun on the final source;
their exact reports/errors are archived. No initial or standalone limit has been relaxed.

## Lazy closures

| Closure                 | Measured Brotli bytes |    Ceiling | Result |
| ----------------------- | --------------------: | ---------: | ------ |
| Command bar / Retry     |         2,880 / 2,880 | 4,500 each | PASS   |
| Bulk editor             |                 3,895 |      4,700 | PASS   |
| Bulk editor Retry       |                 3,882 |      4,700 | PASS   |
| Settings / Retry        |         7,325 / 7,325 | 8,000 each | PASS   |
| Quick-add / Retry       |         1,852 / 1,852 | 3,750 each | PASS   |
| Logic/JSON/map          |                   745 |     28,000 | PASS   |
| Logic/JSON/map/Settings |                 8,070 |     36,000 | PASS   |

The new bulk ceiling was established under the owner's rule 4 from the first complete measurement:
`ceil(4,266 × 1.10 / 50) × 50 = 4,700`. It remains unchanged after compaction. Independent entries
duplicate some static helper code across deferred outputs: the emitted deferred graph union rises
from **15,399 to 32,900 bytes**, including separately fetchable Retry copies. Report this cost rather
than concealing it behind the initial improvement. Shared files still count once per closure. This
union is not a sum of incremental downloads on top of initial. Existing per-feature/aggregate
ceilings all pass; no new History/diff implementation is added.

## Deterministic work and advisory timing

The new `docs/performance/builder-authoring-counts.json` pins a 500-field workload: exactly 500 index
node visits, and for each bulk Delete/Move/Required, 500 child-command applications, one publication
and one history entry. The unit test exercises real commands, exact undo/redo and stored ids; counts
run as part of normal `pnpm test`/`pnpm verify`. Baseline evolution also rejects an increase, a missing
metric or a changed workload against the PR base, alongside the existing renderer work-count gate.

An isolated Chromium timing run on darwin-arm64 records **13.8 ms** for first-use indexing of all 500
fields after importing the emitted feature; the advisory 50 ms target is met. It also asserts the
same promise is reused and visits stay at 500. Import/download and modal-frame time are intentionally
excluded from this index metric; slow first-open frame behavior is covered independently in e2e.
Command: pinned `pnpm exec playwright test -c playwright.builder-bench.config.ts tests/builder-benchmarks/authoring.spec.ts`.

An otherwise quiet focused Node workload records indexing 11.97 ms, Delete 92.84 ms, Move 362.56 ms
and Required 234.86 ms. These timings are advisory and never compared with another platform. Exact
counts, not these durations, gate correctness. Earlier concurrent development timings remain in logs.

## Verification and remaining work

- Pinned `pnpm test`: **337 tests / 52 files PASS**, core line coverage 91.11%, validation 99.25%.
  This includes the unchanged missing-portable-view contract, original theme-token assertions and
  all three fresh packed CLI installs/frozen offline reinstalls/generated `pnpm verify` proofs.
- Combined bulk/action/editor/search suite: **66/66 PASS** in Chromium, Firefox and WebKit, including
  all five themes' bulk-editor axe checks, exact selection history, per-column Cut/Paste, cross-scope
  refusal, ancestor/descendant property selection, lock recovery and failed-download Retry.
- Pinned `pnpm lint`, the complete test TypeScript project and `git diff --check` pass.
- The newly added count-baseline safeguard and existing CI performance-policy tests: **7/7 PASS**;
  the new safeguard was added after the 337-test run. Baseline evolution command also passes.
- The first bulk tests incorrectly expected append-to-column after focusing Full name; the actual
  insertion contract is immediately after that field. Only those newly authored assertions were
  corrected. The new cancel test likewise now expects the existing diagnostic-prefixed message.
- One existing multi-delete locator matched both header Undo and the newly supplied toast Undo.
  It is now scoped to `.ofb-header`; every original schema/history/selection assertion is unchanged.
  The corrected command regression passes all three engines. Earlier failed local logs are retained.
- On the retained final compaction, **114/114** loading/authoring/multi-select/bulk browser cases
  pass across Chromium, Firefox and WebKit, including slow/failing/retried features, strict CSP,
  custom local assetBase and five-theme bulk-editor axe. A separate **15/15** all-theme/three-engine
  geometry matrix proves the quick-add marker does not overlap or intercept caption editing.
- That geometry repair moves the 24px marker to the start gutter. A six-case failure in the first
  independent-entry browser run exposed its previous overlap; actual double-clicks now work without
  forced interactions, changed expectations or relaxed thresholds. The failed run is retained.
- Fresh complete typecheck passes all 45 package tasks and the test project; fresh lint passes.
  A complete unit attempt run concurrently with that typecheck finishes **335/338 PASS**, with
  timeouts in the source-security scan, seeded builder-core replay and the packed scaffold proof.
  It is archived as a failed local run, not accepted verification. No assertion/deadline/retry changed.
- Running the unchanged complete unit command in isolation then passes **338/338 tests in 53 files**,
  exit 0, including all three packed scaffold install/frozen offline install/generated verify proofs.
  Core line coverage remains **91.11%**, validation **99.25%**. The source-security scan takes 1.35s
  and seeded builder replay 0.765s in this isolated run; the earlier concurrent timeouts remain in
  the evidence. This is a local rerun, not a GitHub workflow rerun or a full `pnpm verify` pass.

No final full `pnpm verify` pass, screenshot approval or current-head CI success is claimed. All size
checks remain enabled and currently fail as shown above. No new commit or push is made while verify
cannot pass. Actions' Node-24 SHA upgrades remain pending a separate housekeeping commit after the
required verification. Remaining work is the size decision, owner polish, affected images,
full pinned verification and first-attempt PR CI. M09c/M09d are not started.
