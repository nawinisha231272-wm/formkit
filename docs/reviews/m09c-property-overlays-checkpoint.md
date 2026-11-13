# M09c property overlays — verified checkpoint

Status: **historical pre-read-fix candidate: correctness verify PASS, performance FAIL; not pushed**.
The new state-read fix requires fresh full verification. M09c delivery remains open.
Base: `420879478568a1717efc928badd34774040ecbab` (Linux Verify success, attempt 1).

## What changed

Trusted models explicitly grant safe display/validation/config properties through optional
`logicSettable` metadata. Derived contributions are cached per session/writer, folded in wire order,
and exposed as a frozen optional `FieldState.resolvedNode`. Deactivation restores prior/base values.
Renderer shells and custom/builtin validators consume that same resolved configuration without
mutating authored definitions/models or replacing retained controls. Invalid results remain errors
across unrelated edits until recovery/deactivation/reset. No form JSON or expression format changes.

Property-only processing does not invalidate unchanged legacy value dependants. Repeated scalar
results reuse parsed properties/patterns. Display-only rules retain static submission-schema bounds;
validation/config rules retain runtime annotations and canonical types. Unsafe, unmarked, structural
and ambiguous paths fail closed; prototype-bearing and wrongly typed results fail validation.

API additions: `LogicPropertyPath`, optional model/defineField/defineDisplay/defineLayout.logicSettable,
optional PropertyDefinition.logicSettable and optional FieldState.resolvedNode. Readmes, spec 02/04/05,
ADR-0022 and the changeset document them. ADR-0003's exact SDK inventory adds only the new type;
its test source/assertions and all runtime exports are unchanged.

## One final consumer measurement

Brotli bytes, production consumer build, existing accounting/shared attribution unchanged.

| Gate                                        | Actual | Owner ceiling |
| ------------------------------------------- | -----: | ------------: |
| Builder UI initial, excludes builder-core   | 31,780 |        32,600 |
| Builder-core marginal consumer contribution |  7,145 |         8,300 |
| Logic-enabled builder full initial          | 75,538 |        76,200 |
| Matched no-logic form                       | 29,061 |        29,200 |
| Matched opt-in increment                    |  6,395 |         7,000 |

The owner accepted prototype costs 29,061/6,300 and the final remaining-runtime envelope on
2026-11-12. No-logic +164 versus the preceding checkpoint pays for optional resolved-entry validation,
optional renderer node/error-label reads, and trusted built-in capability metadata. It contains no
root-rule execution or rule meta-schema. Hardening adds 45 enabled-builder bytes / 95 matched-increment
bytes over the prototype for property-only invalidation, scalar reuse and preserving static bounds.
Marginal compressed deltas are not additive. Every package/lazy ceiling and performance contract stays.
Four rejected compaction probes remain in the [historical budget report](m09c-property-budget-question.md).

## Verification and disclosed failures

Node **22.22.3**, pnpm **10.10.0**, darwin-arm64, Low Power Mode **0**, command-lifetime caffeinate.
Full `pnpm verify`: **444 unit tests (72 files), 1,770 browser checks, 17 package budgets/all consumer
and lazy gates, nine browser work-count checks PASS**. Core/validation coverage gates pass.
The runtime rule-count suite adds property cases at 100/500/1,000 fields without changing the existing
state-case expectations: one expression per affected writer and zero unrelated rule evaluations.

Targeted evidence includes `display-only updates do not reprocess unchanged legacy value dependants`,
`invalid writers on one target recover independently and deactivation removes only their own errors`,
`resolved config reaches custom validators and property changes abort stale async results`, and
`logic capability metadata is forwarded and isolated by every SDK definer and registry`.
DOM, Element light/shadow, React and Angular × five themes × three browsers pass **75** property
checks (native identity/focus, caption/options/constraints, revert, Node parity, axe). **Three** production
strict-CSP/offline checks pass with no runtime requests. These are included in full verify.

The first full local run failed because the new SDK type was omitted from its export inventory;
443 other units passed. Corrected the inventory under ADR-0003's additive policy, retained the exact
test, then ran full verify again. New fixture setup failures are retained: explicit Node JSON loading,
DOM layout registration, and a stable React engine/explicit controlled initial data. No existing
assertion was weakened. Typecheck also caught missing group metadata in two new test descriptors;
the descriptors were completed. The new processor-count regression first failed and then passed the
property-only invalidation fix. No browser retry, CI rerun, timeout increase or baseline update.

[Machine proof](m09c-property-overlays-evidence/final-verification.json),
[full log](m09c-property-overlays-evidence/full-pinned-verify.log.gz),
[final consumer/lazy evidence](m09c-property-overlays-evidence/final-gates.json.gz).
The source manifest is identical before/after verification:
`3c4dcd0d153411f0a63109325efc0eca3368920e1bf3cabf3fdbbf74bc393220`.
Changed/new screenshot baselines: **0/0**; all existing images/thresholds remain.

## Remaining delivery

Production edit comparison and packaging/index audit follow this frozen run. New-head CI is pending
commit/push; the previous head's green run does not approve this draft. Remaining M09c work includes
commands/locks/history, Build badges/chips, real lazy Logic editor/test/map, loading and all-host parity,
final performance/screenshots, fresh guide-only author exercise/fixes and owner delivery review.
No M09d implementation or merge approval is claimed.

## Performance regression and proven cause — 2026-11-13

First five alternating main/branch production pairs (250 edits, 3 warmups/9 samples each) fail
the plain-edit ≤1.10 requirement. Every pair remains in
[original timing evidence](m09c-property-overlays-evidence/property-paired-timings.json.gz).

| Fixture      | Main ms/edit | Candidate ms/edit | Median paired ratio | Result |
| ------------ | -----------: | ----------------: | ------------------: | ------ |
| Plain 100    |       0.0952 |            0.1108 |              1.1639 | FAIL   |
| Plain 500    |       0.4316 |            0.5560 |              1.2760 | FAIL   |
| Plain 1,000  |       0.9304 |            1.1896 |              1.2726 | FAIL   |
| Legacy 100   |       0.9464 |            0.9608 |              1.0123 | PASS   |
| Legacy 500   |       2.2984 |            2.4660 |              1.0714 | PASS   |
| Legacy 1,000 |       5.7008 |            5.8924 |              1.0372 | PASS   |

Medians of paired ratios need not equal ratios of displayed median times. The no-logic form runtime
live-region error scan calls fieldErrors for every node. The overlay draft fetched getFieldState
twice there, introducing 50% extra state reads; it affects ordinary edits, not only builder edits.
Matched immutable-main probe: plain 202/1,002/2,002 reads per edit versus 303/1,503/3,003; legacy
252/1,052/2,052 versus 378/1,578/3,078; onboarding 158 versus 237. The new unit test first fails
with two calls versus one. Reusing the same snapshot preserves resolved captions/errors and removes
the duplicate lookup. Exact new work gates use main's measured budgets; old count assertions stay.
The first corrected unit check passes. Corrected browser counts, fresh timings, sizes and full verify
follow; no candidate was pushed, no CI rerun or ceiling/threshold/deadline increase.
