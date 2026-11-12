# M09c — effects prototype: consumer-size stop

Historical status: **size stop resolved by explicit owner approval on 2026-11-12**. The owner accepted matched no-logic 28,852 and enabled builder maximum 75,700 for remaining runtime. Measurements/failures below retain their original ceilings and results. Current full pinned verification is pending; no draft commit, push or implementation PR yet. This is not milestone completion.

Base/pushed head: `0ac02419b086089c79b096f52c22d1fbe17c66de`. Its [Linux Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/43103737774) succeeded on attempt 1. That run does not cover this unpushed draft.

## Implemented draft

Typed StatePatch effects and immutable invocation data/args/event; indexed named events and Button bridging; after-publication trusted calls; Node availability/await/default-5s/custom-timeout diagnostics; reset/dispose cancellation and stale-result suppression. English defaults remain opt-in. Existing pure/legacy run arguments, form JSON, validation and protected controls remain unchanged. No SDK-owned networking. DOM focus/callback delivery and composed Element events are tested; React/Angular callbacks are wired and typechecked, with their dedicated lifecycle acceptance still pending. READMEs/specs/changeset describe the unreleased API.

## One final measured set

Pinned Node 22.22.3/pnpm 10.10.0; esbuild 0.25.12 production consumer build and Node Brotli. Established boundaries and shared-chunk accounting are unchanged. Final rebuilt results exactly equal the restored slot-alias candidate.

| Gate                                        | Bytes / ceiling | Delta from pushed checkpoint | Result        |
| ------------------------------------------- | --------------: | ---------------------------: | ------------- |
| Builder UI initial (excludes builder-core)  | 31,780 / 32,600 |                            0 | PASS          |
| Builder-core marginal consumer contribution |   7,180 / 8,300 |                          +19 | PASS          |
| Actual logic-enabled builder full initial   | 74,431 / 74,500 |                       +1,210 | PASS          |
| Matched no-logic form                       | 28,852 / 28,832 |                          +40 | **FAIL: +20** |
| Matched opt-in increment                    |   5,284 / 6,000 |                       +1,067 | PASS          |

The enabled matched form is 34,136 bytes. Against immutable main 28,232, the no-logic delta is +620, exceeding the accepted +600 by 20. The no-logic output contains neither root-rule execution nor rule meta-schema; enabled output contains both. All lazy/aggregate checks in the consumer gate pass, as do all 17 package budgets. No module is externalized or relabeled to claim a complete no-logic consumer. The full builder has only 69 bytes of remaining headroom; this prototype does not establish that remaining M09c work will fit.

[Complete consumer report](m09c-effects-evidence/final-proven-gates.json.gz), [exact failure](m09c-effects-evidence/final-proven-gates.stderr.gz), [verification metadata](m09c-effects-evidence/verification.json).

## Compaction evidence

Every rejected candidate was restored. Rows include successive implementation stages as well as isolated compactions; do not attribute catalog/host additions to a compaction. Marginal Brotli contributions change with bundling, so UI/core/full are not additive.

| Stage                |     UI |  Core |   Full | No-logic | Opt-in increment | Disposition                                                                             |
| -------------------- | -----: | ----: | -----: | -------: | ---------------: | --------------------------------------------------------------------------------------- |
| effects              | 31,780 | 7,196 | 74,236 |   28,886 |            5,115 | Early effects only; before English catalog/host delivery                                |
| shared-expression    | 31,780 | 7,148 | 74,200 |   28,844 |            5,130 | KEEP shared expression bindings; vs preceding row no-logic -42, full -36                |
| host                 | 31,780 | 7,278 | 74,500 |   28,946 |            5,278 | Catalog and initial host bridge added; not a compaction comparison                      |
| event-compact        | 31,780 | 7,188 | 74,438 |   28,915 |            5,267 | KEEP move event publication bookkeeping opt-in; vs host no-logic -31, full -62          |
| adapter-notification | 31,780 | 7,193 | 74,433 |   28,895 |            5,291 | KEEP Element-owned DOM event bridge; vs preceding row no-logic -20, full -5             |
| slot-alias           | 31,780 | 7,180 | 74,431 |   28,852 |            5,284 | KEEP cached child traversal/node aliases; vs preceding row no-logic -43, full -2; FINAL |
| ref-lookup           | 31,780 | 7,167 | 74,440 |   28,882 |            5,349 | DISCARD, vs final no-logic +30/full +9                                                  |
| unique-validation    | 31,780 | 7,095 | 74,412 |   28,925 |            5,274 | DISCARD, vs final no-logic +73/full -19                                                 |
| path-key             | 31,780 | 7,186 | 74,446 |   28,930 |            5,284 | DISCARD, vs final no-logic +78/full +15                                                 |
| delivery-args        | 31,780 | 7,136 | 74,404 |   28,879 |            5,326 | DISCARD, vs final no-logic +27/full -27                                                 |
| diagnostic-share     | 31,780 | 7,212 | 74,432 |   28,909 |            5,286 | DISCARD, vs final no-logic +57/full +1                                                  |
| event-payload        | 31,780 | 7,238 | 74,489 |   28,914 |            5,360 | DISCARD, vs final no-logic +62/full +58                                                 |

Each raw measurement, stderr, build/targeted test log and the original failing prototype logs are retained in `m09c-effects-evidence/` (gzip). No CSS selector, ARIA attribute, message, assertion, deadline or test was removed for size. The Element notification move retains typed renderer callbacks and native composed Element events; it does not discard the behavior.

## Checks and disclosed corrections

- Final build: 27 tasks PASS; typecheck: 45 tasks and test TypeScript PASS; lint PASS.
- Final core/validation: **169 tests / 19 files PASS**; effects module line coverage 98.72%, aggregate core and validation coverage gates pass.
- Final focused browser: **48 PASS** in Chromium/Firefox/WebKit: 21 new effects/lifecycle cases (five-theme DOM + Element light/shadow) and 27 prior replay/calculation cases. Five-theme axe checks pass.
- Effects work at 100/500/1,000 fields and rules: indexReads=1, candidates=1, actionExpressions=1, edges=1, effects=1; every condition/writer/write/cascade/source/value/override count is zero, no processor change, one patch. Unmatched event has zero candidates/effects and no patch. These are exact unit assertions, not timing claims.
- Existing unregistered-call prototype guard still rejects compilation; its diagnostic changes from unsupported-logic-action to unknown-function now that registered call is implemented. All guard assertions remain fail-closed.
- A new invalid-payload test initially used a pure function returning undefined, but the unchanged evaluator safely converts that result to null. Corrected the fixture to two individually valid 60,000-element results whose combined arguments exceed the existing 100,000-node JSON limit. Invalid-effect and failed-submit assertions remain unchanged. Original 168-pass/1-fail log retained; final 169 pass.
- New delivery signature implicit-any build errors were fixed with explicit types, without suppressions; original build logs retained.
- No screenshot/baseline changed. No new runtime A/B timing or full pinned verify claimed. No workflow rerun.

## Owner decision / remaining work

The current proven candidate cannot be pushed against the existing no-logic limit. Measured ceiling option: allow 28,852 (+620 against main), a 20-byte amendment, leaving all other ceilings unchanged. Keeping 28,832 requires another internal session/renderer/compiler bridge design and fresh measurements/correctness/performance evidence; no saving or success is claimed for an unmeasured alternative. This stop does not claim a mathematical minimum or approve any increase.

The owner subsequently approved the measured +20 amendment and scoped enabled maximum above. Continue verification before shipping. Property overlays, rule commands/locks/history, Build badges/chips, real lazy Logic/map, remaining host/CSP/offline parity, edit A/B timing, onboarding map, independent guide exercise, screenshots, full pinned verify and first-attempt implementation PR CI remain open. Do not merge or start M09d.
