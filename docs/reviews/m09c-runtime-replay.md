# M09c — scheduling, replay and combined calculations checkpoint

Status: full pinned verify PASS (exit 0); new-head CI pending. M09c remains open.
No implementation PR, owner screenshot approval, merge or M09d claim.

## Accepted contracts and implementation

The owner corrected load authority and calculation precedence on 2026-11-11. Load assignments
initialize once and remain editable; Node derives load state from final answers without replaying
load values. Submit assignments and non-overridable calculations are authoritative. Protected
setValue/clear targets fail compile with rule/field names. The field formula is position zero;
later active root formulas win, and the field formula returns when none remains active. The field's
allowOverride controls the combined value. No client canonicalization, form-format change or new
execution host option was added. Replay is an opt-in program capability, isolated per validation.

The runtime now settles legacy/root calculations between sequential actions, uses per-action reads
for graph edges and respects wire writer priority independently of evaluation rank. Actual-value
filtering prevents transient or unchanged results from triggering downstream edges. One transaction
publishes one settled patch. Existing indexed state-work expectations do not increase; added
sourceChecks/valueChecks/overrideInvalidations make this work observable.

Original questions, failure evidence and rejected recommendations are retained:
[replay question](m09c-authoritative-replay-question.md),
[calculation question](m09c-calculation-conflict-question.md).

## Verification and disclosed test changes

- Focused replay/scheduling/calculation/count tests: **43 passed**.
- Complete core/validation focused coverage run: **158 passed**, core root 91.48%, opt-in logic
  97.70%, validation 99.29% lines. Both package gates remain ≥90%.
- Browser parity/identity/one-patch checks: **27 passed**, Chromium/Firefox/WebKit. Includes
  active→3, inactive→2, allowed override→99 accepted by Node, protected forged→99 rejected.
- Node prototype invoice forgery expectation was changed explicitly because the owner revoked load
  authority; receipt/total forgery checks remain. The server-filled schema fixture uses submit,
  and the normalization test was renamed without changing its error assertions.
- New action-order browser check initially counted a Derived blur plus the Source edit. Focus now
  moves to Source before subscribing; the exact one-patch assertion stays unchanged. Original
  18-pass/3-fail log is retained privately. Final corrected matrix is 27/27.
- Two earlier full attempts were deliberately interrupted after independent product reproductions,
  not counted as PASS. Deadlines/thresholds/visual baselines were not changed. Final full proof is
  required before committing/pushing this checkpoint.

Raw focused logs and size/timing reports are in [evidence](m09c-runtime-replay-evidence/combined-final-gates.json).

## Consumer gates (one production build)

| Gate                                        | Measured Brotli bytes | Ceiling | Delta from pushed foundation |
| ------------------------------------------- | --------------------: | ------: | ---------------------------: |
| Builder UI initial, excludes builder-core   |                31,780 |  32,600 |                           +0 |
| Builder-core marginal consumer contribution |                 7,161 |   8,300 |                          -56 |
| Full logic-enabled builder initial closure  |                73,221 |  74,500 |                       +1,712 |
| Matched no-logic form                       |                28,812 |  28,832 |                           +8 |
| Matched opt-in increment                    |                 4,217 |   6,000 |                       +1,450 |

Matched enabled form: **33,029**. No-logic is **+580** versus
immutable main 28,232. It contains neither the rule execution body nor rule meta-schema. All measured
consumer/lazy gates pass; Logic/map are still reserved stubs, so their tiny size is not feature completion.
Shared assets count once; no required module is excluded from the full closure. No ceiling changed.

## Runtime edit comparison

Form-runtime field edits, production consumers, identical work, immutable main
cd6d0b679027da328da9f5e4f63480437d6c765b. One Chromium runner, five alternating A/B pairs,
three warmups plus nine samples per fixture/pair, 25 edits with forced layout. No concurrent
build/test workload. Per-edit absolute medians below; ratio is the median of paired ratios.

| Fixture | Fields | Main ms/edit | Branch ms/edit | Paired ratio |
| ------- | -----: | -----------: | -------------: | -----------: |
| plain   |    100 |       0.1280 |         0.1240 |       1.0000 |
| plain   |    500 |       0.4840 |         0.4680 |       0.9841 |
| plain   |   1000 |       1.0840 |         1.1280 |       1.0185 |
| legacy  |    100 |       0.9760 |         0.9840 |       1.0082 |
| legacy  |    500 |       2.4080 |         2.4960 |       1.0282 |
| legacy  |   1000 |       6.0320 |         6.1160 |       1.0225 |

Exact processors per 25 edits: plain **25**, legacy **650**, with focused-control identity and no
leaked DOM assertions. No wall-clock threshold or platform baseline was changed. This does not compare
new root-only behavior to a no-op main implementation. Full delivery still needs effects/property
config/async semantics, Logic commands/UI/map, all-host checks, fresh guide-only trial and screenshots.

## Full pinned proof

**PASS, exit 0:** lint, build, typecheck, **398 units / 1,632 browser checks** across all three
browsers, **17 package budgets plus all consumer/lazy gates**, and **nine exact runtime count checks**.
The full run reproduces the exact consumer measurement table above. No baseline changed, no CI
rerun, no assertion/deadline/threshold relaxation. Node 22.22.3 / pnpm 10.10.0; Low Power Mode 0
and command-lifetime caffeinate are recorded in the log. Source fingerprint before/after is identical:
`89dddbd01ece4be78b6df5da44e5ac84e36ad1e5757b4606d1e4cdb7f4a6a95d`.

[Verification record](m09c-runtime-replay-evidence/verification.json),
[complete log](m09c-runtime-replay-evidence/full-pinned-verify.log.gz). Documentation/evidence
recording follows the proof; implementation and test sources remain unchanged. The two interrupted
full attempts and the original action-count test failure are also preserved as compressed logs.

New-head push CI remains pending; the prior foundation CI covers only 2eb0312. No implementation
PR, completed M09c gate, owner screenshot approval or merge is claimed.
