# M09b live review round 5

Owner screenshot approval: **pending**. PR #15 must also pass its final head's first CI attempt.
No merge and no M09b+/M09c implementation is authorized by these local checks.

The six affected 1280×800 states now preserve Email/Full name, reduce narrow toolbars to Edit,
Move, Duplicate, Delete and More, and truncate the key suffix first. The first-panel images include
the Contact details heading and exercise the shared flip-below placement. Full titles/ARIA names and
Copy/Paste/Edit JSON shortcuts remain available. Geometry tests additionally exercise 16 wide
characters in every theme and the old clipped-scroll case in all three browsers.

| State                         | macOS arm64                                                                                                                   | Linux x64, pinned Playwright                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| material: selected-column     | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-selected-column.png)     | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-selected-column.png)     |
| material: hover-neighbour     | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-hover-neighbour.png)     | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-hover-neighbour.png)     |
| material: first-panel-field   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-material-first-panel-field.png)   |
| bootstrap5: selected-column   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-selected-column.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-selected-column.png)   |
| bootstrap5: hover-neighbour   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-hover-neighbour.png)   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-hover-neighbour.png)   |
| bootstrap5: first-panel-field | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-round4.spec.ts/chromium/round4-bootstrap5-first-panel-field.png) |

Existing filenames identify the same reviewed states; these PNGs supersede their round-4 captures.
Affected wider workbench/drag/dialog/menu views are also re-recorded in builder-visual and
builder-review-visual; the screenshot manifest lists actual changed files. Unaffected images keep
their original bytes. No pixel thresholds change.

## Verification

Full pinned native verification: **PASS, exit 0** — lint/build/typecheck, **307 unit tests (44 files),
1,224 browser tests across Chromium/Firefox/WebKit, 17 size budgets and five exact count checks**.
No product source or baseline changed during the run. Log and metadata:
[m09b-round5-evidence](m09b-round5-evidence/).

Linux generation/comparison passed 88 checks; after the retained wrapper error, the clean comparison
passes 44 checks and exits 0. Builder: **29.95 kB before → 29.982 kB (29,982 bytes) final**, below
the unchanged **30 kB (30,000 bytes)** ceiling, with matching bytes on macOS and Linux.
The image manifest records **30 affected images changed, 374 byte-identical, no new PNGs** relative
to the previous PR head. Phone images are unchanged. All 32 trial artifact hashes still match.

| Remaining merge condition            | Status                                               |
| ------------------------------------ | ---------------------------------------------------- |
| Owner screenshot approval            | Pending                                              |
| Final-head first-attempt green PR CI | Required; current run links are reported with PR #15 |

## Regression coverage

| Owner item                                                                  | Reproducible evidence                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Whole label through 16 characters, hover/selection, all five themes         | `builder-round5.spec.ts`: `half-column tags preserve labels up to 16 characters on selection and hover`                                                                  |
| Add / Duplicate / Delete / Paste / Wrap / settings Save announce fresh text | Six `replaces the preceding builder command announcement` cases in `builder-round5.spec.ts`                                                                              |
| No-op Save and public command feedback                                      | `unchanged settings Save and public commands replace stale live text too`; core `history labels retain action and original subject through delete, selection and replay` |
| Fresh approved desktop begins Build, no view persistence                    | `approved desktop starts in Build after Preview and reload; view mode is not persisted`                                                                                  |
| Heading-visible flip-below and clipped-scroll regression                    | `builder-round4.spec.ts`: first-panel-field and clipped-first-panel-field in both themes; exact original nonintersection checks retained                                 |
| Timed action Undo / focus / move counts / sentence pickers                  | Existing builder-toast, builder-round3, builder-move-announcements and builder-ux suites remain in full verify                                                           |

## Previous PR evidence — not approval of the new head

At `554348eda96c08b403bc2f8dbdc015dea80af8d1`, the first PR
[Verify run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39879600917) and
[push Verify run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39879553666) failed,
both `run_attempt: 1`. PR Verify passed 1,177 browser cases and failed two Linux WebKit geometry
assertions in Material/Bootstrap 5's scrolled first-panel case. Size/count stages were not reached.
The [advisory timings run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39879600980)
succeeded, attempt 1; timing success does not make correctness green. No workflow was re-run.

Round 5 keeps the clipped-scroll assertions and waits for the actual native scroll event before
measuring, while the review screenshot now includes the heading. Placement measures the real tag
and toolbar rectangles, updates after fonts load, and schedules hover geometry before the next paint.
An intermediate local Firefox hover failure is retained; its exact overlap assertions are unchanged.
The fixtures now await loaded fonts and assert the actual flipped placement before geometry reads.
