# M09b+ — Step 0 evidence and split-plan owner review

Date: 2026-10-23. Branch: `m09b-plus-authoring`.
Base: approved M09b `79e69f688b1779696449465fbe34869460018cd0`, merged via PR #15 as
`0b3b452c46096e852248ca11872f9697888c621e`.

## What changed

The exact approved M09b head was merged after fresh GitHub checks confirmed its PR/push Verify
successes on attempt 1. The new branch carries the owner's accepted M09d plan, records the merge,
adds the missing Unwrap feedback/history regression and proposes the ADR-0018 split implementation
in [ADR-0020](../adr/0020-builder-consumer-entry-boundaries.md). Product implementation is unchanged.
No lazy split or authoring shortcut is claimed shipped; stop here for the requested ADR review.

## Step 0 checks

| Requirement                                                                                  | Result / evidence                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole ≤16-character labels in half-columns; compact actions; shared placement in five themes | PASS — existing `half-column tags preserve labels up to 16 characters on selection and hover` tests, Chromium/Firefox/WebKit, unchanged assertions                                                                                                                          |
| Fresh add/duplicate/delete/paste/wrap/settings announcements                                 | PASS — existing six `replaces the preceding builder command announcement` cases and unchanged-settings/public-command check in all three browsers                                                                                                                           |
| Unwrap feedback and exact undo/redo                                                          | PASS — new `Unwrap replaces a preceding command announcement and restores exactly through Undo/Redo` in all three browsers; exact live/toast messages and serialized before/after definitions                                                                               |
| Desktop Build after reload                                                                   | PASS — existing `approved desktop starts in Build after Preview and reload; view mode is not persisted` in all browsers                                                                                                                                                     |
| Heading-visible first-panel flip; no overlap/clipping; empty Undo/body shortcuts             | PASS — existing round-4 eight geometry/screenshot states and Undo focus case, unchanged assertions, all browsers                                                                                                                                                            |
| Baseline scope                                                                               | PASS — 202 Mac + 202 Linux PNGs byte-identical to merged main; zero changed/new. [Manifest](m09b-plus-step0-evidence/baseline-manifest.json). Native Chromium re-captured/compared requested images; no Linux generation was required or claimed for unchanged product code |
| Split/features/full milestone verify                                                         | NOT RUN / NOT IMPLEMENTED — this is the pre-implementation review, not M09b+ closure                                                                                                                                                                                        |

Pinned focused command (exit 0, **69 tests pass**):

```sh
caffeinate -diu npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec playwright test tests/e2e/builder-round4.spec.ts tests/e2e/builder-round5.spec.ts tests/e2e/builder-plus-step0.spec.ts
```

[Complete successful log](m09b-plus-step0-evidence/final-local-run.log.gz).
[First local log](m09b-plus-step0-evidence/first-local-run.log.gz) retains 66 existing passes and
three failures in the newly written test's copied subject string. The fixture label is **Contact
details**, and Copy includes “Choose a slot and paste.”; the new test initially expected “Contact”.
Only that new test's exact expected subject/text was corrected. Product code, existing tests,
assertion types, deadlines, retries and thresholds were unchanged. The corrected case asserts exact
Unwrap/Undo/Redo text and byte-identical definition restoration. No GitHub workflow was rerun.

## Screenshot page

These are the already owner-approved states, freshly compared locally with no baseline edits:

| Theme       | Mac heading-visible flip                                                                                                      | Linux approved baseline                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Material    | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   |
| Bootstrap 5 | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) |

[All round-5 review states](m09b-live-review-round5.md). This does not approve future M09b+ visuals.
Live builder: <http://127.0.0.1:4173/builder.html?approved> (left running).

## Size before / after and decision

[Read-only before measurements](m09b-plus-step0-evidence/before-sizes.json): published builder
**29,982 bytes Brotli**, minimal fully bundled consumer **64,613 bytes Brotli**. No split has been
implemented, so there is no after measurement. ADR-0020 gives the reproducible probe options and
proposes a transparent accounting boundary; it does not claim these two scopes are interchangeable.

Owner decision needed: does ADR-0018's **26 kB** limit cover builder-owned initial code/styles after
consumer build, with common form-runtime cost separately fully reported/budgeted, or the entire
initial transitive closure? Do not implement against an inferred answer. Existing 26/10/8/10/28 kB
ceilings remain fixed. Command-bar/History numeric budgets still need measured proposals before
shipping; no new allowance is assumed. Selection/bulk-command contracts will get their own ADR
before implementation after the split. Main risks: shared-byte ownership, lazy focus/lifecycle,
CSP/offline asset loading and bulk lock/scope/history atomicity.

## CI and head evidence

M09b approved head and merge are above. First-attempt successes authorizing that merge:
[PR Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39952512034) and
[push Verify](https://github.com/nawinisha231272-wm/formkit/actions/runs/39952507392).
Those runs do **not** verify the new M09b+ planning/test commits. Its exact head, PR and first-run
CI links are published in the draft PR/handover; do not merge this milestone before owner approval.
