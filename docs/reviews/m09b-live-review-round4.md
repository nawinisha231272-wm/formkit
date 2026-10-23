# M09b live review round 4

Owner approval: **pending**. No merge is authorized until approval and first-attempt green PR CI.

Superseded by [round 5](m09b-live-review-round5.md). This records the earlier local result. Its PR
head's first Linux CI attempt later failed two WebKit geometry checks; the round-5 record retains
the run URLs, failed logs and the preserved regression. These images are updated in place by round 5.

Six requested 1280×800 states. Tags/toolbar remain outside field content, preserve the first
character, carry full title/ARIA text and avoid neighbouring headings/labels. The same controls
flip below when the top edge lacks room; vendor Bootstrap margin utilities cannot override the
reserved space. Keyboard history retains focus and works from body when there is one builder.
F6 cycles regions; Alt/Option+Z is not intercepted.

| State                         | macOS                                                                                                                         | Linux (pinned Playwright image)                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| material: selected-column     | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-selected-column.png)     | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-selected-column.png)     |
| material: hover-neighbour     | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-hover-neighbour.png)     | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-hover-neighbour.png)     |
| material: first-panel-field   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   |
| bootstrap5: selected-column   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-selected-column.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-selected-column.png)   |
| bootstrap5: hover-neighbour   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-hover-neighbour.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-hover-neighbour.png)   |
| bootstrap5: first-panel-field | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) |

## Validation status

| Check                                                                               | Result / evidence                                                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Selection geometry, focus and six requested states                                  | PASS in Chromium, Firefox and WebKit; `builder-round4.spec.ts`                                                                    |
| Tooltips in all five themes, repeated history messages, no expired-toast replay, F6 | PASS in all three browsers; `builder-round3.spec.ts`                                                                              |
| Action toast pauses on hover/focus, keyboard access, history after expiry           | PASS in all three browsers; `builder-toast.spec.ts`                                                                               |
| Exact move counts within a slot, between slots and between columns                  | PASS, nine checks; `builder-move-announcements.spec.ts` also checks destination order and exact undo/redo                         |
| Expanded existing action/pointer/gesture/sentence regressions                       | PASS, 195 checks before the isolated SVG correction; six affected WebKit routes and all 48 round-3/4/toast controls pass after it |
| Linux visual generation and comparison                                              | PASS, 17 workbench/control cases plus three Material read-only cases in each pass                                                 |
| Full pinned verify including the new move-count regression                          | PASS, exit 0: lint/build/typecheck, 307 unit, 1,179 browser, 17 size and five count checks; `m09b-round4-awake-verify.log.gz`     |
| Current-head PR CI, attempt 1                                                       | Required before merge; see PR checks for live status                                                                              |
| Owner screenshot approval                                                           | Pending                                                                                                                           |

Logs are retained in [m09b-round4-evidence](m09b-round4-evidence/), with original development failures
and the interrupted coverage-audit run distinguished from completed verification. The SVG correction
removes tooltip-only width declarations from the icon rule: WebKit previously expanded icons to
300px. A header icon-width assertion now guards the required 16px size. The five other full-run
navigation/teardown stalls passed in isolation; their cause is not attributed to the SVG correction.

Before size: **30.83 kB** (round-3 checkpoint). Final full-verify build: **29.95 kB**, below the unchanged
**30 kB** limit; all 17 size budgets pass. Pinned development-only Terser 5.44.1 and removal of redundant
messages/styles reduce output without changing the loading boundary or runtime dependencies. The
owner-approved split remains first in M09b+, with its later 26 kB core target.

Linux image: `mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a`
(linux/amd64, emulated on the local arm64 host). These captures predate the isolated SVG rule correction;
current-head Linux PR CI must compare them without regeneration. Run scoped comparisons with
`sh scripts/linux-visuals.sh check owner-review`.

Prior completed full run: **FAIL**, eight WebKit timeouts, 1,171 browser passes. Archived full log
and power transitions show idle sleep and repeated dark wakes during verification. The unchanged
suite subsequently **passed** with temporary `caffeinate -diu` assertions bound to the command lifetime;
no permanent system settings or test deadlines changed. The successful run had no sleep/wake
transitions. [verification.json](m09b-round4-evidence/verification.json) records the exact command,
times, platform, counts and log hash. The assertions ended automatically, and the requested playground
dev server restarted on `127.0.0.1:4173` for live owner review.

[Baseline manifest](m09b-round4-baselines.json): 16 existing images changed, 12 new requested images,
376 existing images byte-identical to the merged PR14 head. The independent trial report and all 32
original artifacts are unchanged. No deadline, correctness assertion or pixel tolerance was relaxed.
