# M09b owner review — 2026-10-22

Status: **implementation screenshots await owner approval**. Original designs remain approved; this
review does not imply approval of the changed implementation. M09b+ is approved as a plan, starts
after M09b approval, and has not been implemented. M09c is not started. The latest selection states
and verification record are in [live review round 4](m09b-live-review-round4.md).

## Changed views

Open the local preview at `/builder.html?approved&theme=material&chrome=neutral`. Use Header More for
Builder look and Appearance. The Conditional/Logic tabs are in the generated settings dialog.

| View                                         | macOS                                                                                                                           | Linux                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Desktop header, palette and actual drag      | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-1-neutral-material-drag.png)        | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-1-neutral-material-drag.png)        |
| Generated Display settings                   | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-2-neutral-edit-dialog.png)          | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-2-neutral-edit-dialog.png)          |
| Sentence-style Conditional settings          | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-review-visual.spec.ts/chromium/review-conditional-sentence.png)    | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-review-visual.spec.ts/chromium/review-conditional-sentence.png)    |
| Builder look / keyboard destinations in More | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-review-visual.spec.ts/chromium/review-builder-look-menu.png)       | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-review-visual.spec.ts/chromium/review-builder-look-menu.png)       |
| Material phone read-only fill                | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-review-visual.spec.ts/chromium/review-material-phone-readonly.png) | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-review-visual.spec.ts/chromium/review-material-phone-readonly.png) |
| Bootstrap 4 builder                          | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-5-bootstrap4.png)                   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-5-bootstrap4.png)                   |
| Bootstrap 5 builder                          | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-5-bootstrap5.png)                   | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-5-bootstrap5.png)                   |
| Material builder                             | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-5-material.png)                     | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-5-material.png)                     |
| Dark compact builder                         | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-5-dark-compact.png)                 | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-5-dark-compact.png)                 |
| Three-theme comparison                       | [Image](../../tests/e2e/__screenshots__/darwin-arm64/builder-visual.spec.ts/chromium/screen-5-theme-comparison.png)             | [Image](../../tests/e2e/__screenshots__/linux-x64/builder-visual.spec.ts/chromium/screen-5-theme-comparison.png)             |

Material read-only conformance captures also change in Chromium, Firefox and WebKit on each platform.
All other existing baseline bytes must remain unchanged. The final scope/hash manifest and full verify
result are recorded in progress.md after generation and verification complete.

## Product fixes and evidence

| Owner finding                                                                          | Implementation / focused evidence                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sentence-first rules, Disabled when and Calculated value; synchronized expression view | `builder-review.spec.ts`: all three expression cases and advanced-expression preservation                                                               |
| Searchable keyboard pickers                                                            | Filter/arrows/Enter, Tab and Escape in all three engines; full keyboard task; Firefox clears its virtual active descendant before native Tab navigation |
| One desktop header row, Theme, visible persisted Builder look                          | Header bounds at 1280/1440/1800, reload persistence, canvas theme unchanged, programmatic chrome setting reflected                                      |
| Distinct palette icons and frequent types first                                        | Palette order and SVG uniqueness checks for the registered defaults; future/unregistered Date remains absent                                            |
| Unlabelled layout titles and nonzero logic summary                                     | Columns in outline/location; no Controls 0 fields in the selected summary                                                                               |
| Display properties and dialog icon/location                                            | Tooltip, Prefix, Suffix, Disabled/Read-only; value restoration/API writes in all five themes; location includes tab/column slots                        |
| Destination/wrap controls out of the main panel                                        | Header More contains them; keyboard slot and wrap command flows remain tested                                                                           |
| Filled Material read-only fields                                                       | Distinct neutral fill, solid borders, phone capture and light/dark/high-contrast token contrast tests                                                   |
| Focus follows selection                                                                | End/Up followed by Copy/Paste, Duplicate and Wrap, exact undo; locked focused rows refuse actions rather than acting on a previous selection            |
| Select defaults / empty choices                                                        | Add starts with editable Option 1/Option 2; empty Select/Radio warnings link to the component                                                           |
| Save acknowledgement                                                                   | of-save → Saving… → markSaved()/markSaveFailed(message), stale acknowledgements preserve newer edits; demo confirms after 500ms                         |

The independent trial report is unchanged. Product responses are in
[fixes.md](../rehearsals/m09b-builder/fixes.md). Proposed next work is
[spec 10: M09b+](../spec/10-builder-ux.md#m09b--authoring-shortcuts-owner-approved)
and [M09b-plus.md](../milestones/M09b-plus.md). M09b screenshot approval is required before building
those four approved features.
