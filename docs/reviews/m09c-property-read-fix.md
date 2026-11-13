# M09c property overlays — duplicate state-read correction

Status: **corrected full pinned verification and production edit gates PASS**.
Verified runtime checkpoint ready for index audit/commit/push; new-head CI pending. M09c
authoring/map/delivery remains open.

## Cause and fix

The property overlay error renderer read FieldState twice to get the resolved caption and errors.
The ordinary live-region scan visits every component on every edit, adding 50% state reads while
processor/render/DOM counts stayed flat. The new unit fails at two calls, then passes at one after
reusing the same snapshot. Caption/error text and all ARIA/CSS behavior remain intact.

A matched immutable-main probe records all 25 edits: plain100/500/1,000 **202/1,002/2,002** reads,
legacy **252/1,052/2,052**, onboarding **158**. The old draft made **303/1,503/3,003**,
**378/1,578/3,078**, **237**. Seven new hard checks enforce main's budgets; the original nine count
checks remain unchanged. A new evolution guard refuses increases/removal/workload changes.

## Corrected production comparison

One isolated Chromium runner, production esbuild consumers, immutable main
`cd6d0b679027da328da9f5e4f63480437d6c765b`, five alternating main/branch pairs; each fixture
has three warmups/nine samples of 250 edits and forced layout. No concurrent build/test workload.
Identical processor counts (250 plain / 6,500 legacy), retained focus/control identity and component
counts are asserted. The separate [original failed comparison and absolute times](m09c-property-overlays-checkpoint.md)
remain retained; no assertion, threshold or deadline changed. Medians of paired ratios need not equal
ratios of the displayed median times.

| Fixture     | Main ms/edit | Corrected ms/edit | Median paired ratio |
| ----------- | -----------: | ----------------: | ------------------: |
| plain 100   |       0.0932 |            0.0932 |              1.0000 |
| plain 500   |       0.4304 |            0.4252 |              0.9935 |
| plain 1000  |       0.9212 |            0.9264 |              0.9952 |
| legacy 100  |       0.9520 |            0.9392 |              0.9919 |
| legacy 500  |       2.2896 |            2.3012 |              1.0051 |
| legacy 1000 |       5.5928 |            5.5656 |              1.0062 |

All six are ≤1.10. [Every pair/sample](m09c-property-read-fix-evidence/property-read-fix-paired-timings.json.gz),
[count log](m09c-property-read-fix-evidence/property-read-fix-counts.log.gz).
Final M09c delivery must still establish evidence for its final runtime source.

## One corrected consumer measurement

| Gate                                       | Actual Brotli bytes | Owner ceiling |
| ------------------------------------------ | ------------------: | ------------: |
| Builder UI initial (excludes builder-core) |              31,780 |        32,600 |
| Builder-core marginal contribution         |               7,188 |         8,300 |
| Enabled builder full                       |              75,619 |        76,200 |
| Matched no-logic form                      |              29,111 |        29,200 |
| Matched opt-in increment                   |               6,318 |         7,000 |

The correctness fix changes no-logic +50/full +81 versus the prior measured sample within the
owner's final runtime envelope. Compressed deltas are non-additive; no accounting or ceiling changes.
[Complete consumer/lazy report](m09c-property-read-fix-evidence/property-read-gates.json.gz).

## Local verification disclosure

All 78 property host/theme/browser/CSP/offline cases pass in a controlled serial run. A prior
focused run was overlapped accidentally with a typecheck-triggered rebuild, causing transient missing
builder/Angular dist modules and two WebKit failures. Both exact cases pass in isolation (2 tests)
and then the full focused suite (78 tests), with unchanged assertions/deadlines. Preserve
[the failed run](m09c-property-read-fix-evidence/property-read-browser.log.gz),
[isolation log](m09c-property-read-fix-evidence/property-read-isolated-webkit.log.gz) and
[serial log](m09c-property-read-fix-evidence/property-read-browser-serial.log.gz). Full verification
runs sequentially. The new policy helper initially lacked its .d.mts and the new unit needed
formatting; both corrected, with original lint/typecheck logs retained. No CI rerun or source push.

## Corrected full pinned proof — 2026-11-13

`caffeinate -diu node node_modules/pnpm/bin/pnpm.cjs verify` exits **0** on Node **22.22.3** /
pnpm **10.10.0**, macOS arm64, Low Power Mode **0**. **446 unit tests / 74 files**, **1,770 browser
checks** in Chromium/Firefox/WebKit, **17 package budgets**, all consumer/lazy gates and **16 exact
work-count checks** pass. All three packed scaffold proofs pass. Overall line coverage is **94.43%**;
core/validation thresholds remain unchanged. No visual baseline changed.

The before/after source manifest is byte-identical, SHA-256
`9af7d44e8a03d14fb25dfcd268ecd9b9b1ea94fe2696620db5d7efd5ea4547f1`.
The coherent measurements in the table above are extracted from this final run, not a prior sample.
[Machine-readable proof](m09c-property-read-fix-evidence/final-verification.json),
[complete pinned log](m09c-property-read-fix-evidence/full-pinned-verify.log.gz),
[final gates](m09c-property-read-fix-evidence/final-gates.json.gz) and source manifests are preserved.
Documentation/evidence is finalized after this frozen run; staged non-document source must match
its manifest exactly before commit. New-head first-attempt CI follows push; no approval is inferred.

API additions are the documented optional property-capability metadata/resolved node and LogicPropertyPath;
no form JSON, expression format or runtime exports change. Screenshot baselines changed/new: 0/0.
