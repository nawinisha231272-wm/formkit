# M09c calculation diagnostics and framework lifecycle checkpoint

Status: **full pinned verification PASS, exit 0**. M09c remains open.
No release, merge or completed authoring/map acceptance is claimed.

## Correctness and evidence

The strict numeric adapter reproduction rejects malformed derived values. An unrelated edit used
to clear the active calculation error, allowing browser submission while protected-value Node
validation rejected it. The same failure reproduced on exact pushed replay checkpoint `0ac0241`
and effects checkpoint `4c0964c`; this is an existing runtime bug, not a new adapter contract.
The first permissive built-in Number hypothesis was not a bug; that normalizer permits null.

The opt-in runtime now caches active calculation errors by target and session. Recovery, deactivation,
allowed explicit override and reset clear only the affected cached errors. No unrelated rule conditions,
action expressions or candidates are evaluated. Four new unit regressions and 173 targeted core/
validation checks pass. Six browser regressions pass across Chromium, Firefox and WebKit, retaining
input identity and protected-value rejection, and exercising allowed override/recovery.

Disclosure: the **new** overrideable browser test initially required Node to infer that no client
edit had occurred. That assertion was wrong under the accepted policy. Node accepts supplied canonical
allowOverride:true values; the browser knows its own edit history and retains the failed derivation
until actual override/recovery. Only that new Node assertion was corrected; protected Node rejection,
browser failure and recovery assertions stay. No existing test intent or deadline changed. Typecheck
also caught new fixture spread/heterogeneous generic registration errors; fixture typing was fixed.
The first full local run stopped at typecheck and remains a failed proof, not green.

## Real framework lifecycle

The shared `effects.json` fixture now runs through React and Angular demo hosts at `?effects`, with
all five registered themes. Thirty focused browser checks pass in all three browsers: stored value
and focus before delivery, retained control, frozen invocation snapshot, cancellation on unmount,
React latest-callback/StrictMode and Angular provider/output delivery. The full verification also
checks provider-before-output ordering and no page errors after stale call completion.
DOM and Element light/shadow effects checks remain unchanged. No new public API is added here.

## Size and performance

One consumer measurement set (Brotli, unchanged consumer accounting):

| Gate                                      | Actual / ceiling | Delta from effects checkpoint |
| ----------------------------------------- | ---------------: | ----------------------------: |
| Builder UI initial, excludes builder-core |  31,780 / 32,600 |                             0 |
| Builder-core marginal contribution        |    7,168 / 8,300 |                           +39 |
| Logic-enabled builder full initial        |  74,525 / 75,700 |                           +88 |
| Matched no-logic form                     |  28,897 / 28,897 |                             0 |
| Matched opt-in increment                  |    5,376 / 6,000 |                           -20 |

Marginal Brotli deltas are not additive. Full 74,525 first uses the preapproved remaining-runtime
allowance above historical 74,500 (+25), for persistent diagnostics/recovery. No ceiling changed;
new features do not use the reserved correctness-only no-logic maximum 29,000. All package/lazy
ceilings remain unchanged. Example-only fixtures do not enter these package/consumer measurements.

A fresh five-pair production 25-edit comparison retained two above-1.10 results: plain500 1.1121,
legacy100 1.1049. These are not relabeled performance PASS. A longer 250-edit diagnostic uses the
same production builds, fixtures, three warmups/nine measured samples, five alternating pairs,
forced layout, focus/identity checks and scaled exact processor counts (250 plain/6,500 legacy).
Both experiments are preserved. Timing acceptance remains separate from correctness CI; the final
M09c source must meet the owner performance requirement before delivery GO.

Extended 250-edit comparison completed: plain 100/500/1,000 paired median ratios
**0.9958 / 1.0027 / 0.9861**; legacy **1.0901 / 0.9982 / 0.9850**. All are ≤1.10 on the
same frozen runtime, without a product change between experiments. This longer-batch diagnostic
reduces short-sample sensitivity; it does not erase the two original exceedances or establish their
cause. Preserve absolute times and every pair; final M09c delivery timing must be refreshed again.

[Retained evidence](m09c-calculation-errors-evidence/) includes the original failures, fixed focused
checks, typecheck failure, consumer accounting and timing samples. The complete frozen proof below passed before commit/push.
No visual baseline changed. Property overlays, commands/locks/history, Build chips, real lazy Logic/
map, final timing/host loading/author/screenshot delivery and first-attempt PR CI remain open.

| Fixture | Fields | Main ms/edit (median batch / 250) | Branch ms/edit (median batch / 250) | Median paired ratio |
| ------- | -----: | --------------------------------: | ----------------------------------: | ------------------: |
| plain   |    100 |                            0.0980 |                              0.0968 |              0.9958 |
| plain   |    500 |                            0.4428 |                              0.4388 |              1.0027 |
| plain   |   1000 |                            1.0112 |                              0.9496 |              0.9861 |
| legacy  |    100 |                            0.9508 |                              1.0304 |              1.0901 |
| legacy  |    500 |                            2.4060 |                              2.4576 |              0.9982 |
| legacy  |   1000 |                            6.0196 |                              6.2152 |              0.9850 |

The median of ratios need not equal the ratio of medians. Every pair is in the machine evidence.

## Full pinned proof

Node22.22.3/pnpm10.10.0, Low Power Mode0, command-lifetime caffeinate. **414 units (70 files),
1,692 browser checks, 17 package budgets/all consumer and lazy gates/nine exact runtime counts PASS**.
Source fingerprint unchanged before/after: `7870b98e9f4c68d5715e30ee49c5d09aa43ccd71d356af671d73cfd53f412bfd`.
[Machine proof](m09c-calculation-errors-evidence/final-verification.json),
[complete log](m09c-calculation-errors-evidence/full-pinned-verify.log.gz),
[one final measurement set](m09c-calculation-errors-evidence/final-gates.json.gz).
Commit packaging audit and push/first-attempt new-head CI follow. No M09c delivery/merge approval.
