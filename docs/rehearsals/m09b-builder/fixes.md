# M09b independent builder trial — responses and fixes

The original `TRIAL-REPORT.md` is copied verbatim. SHA-256:
`ff3238c58bba1c4f0b78a4d53c9258ef79b1bba3bc8d127493e3d46d1426923d`.
This response is separate and was not supplied to the author. The author used the original pushed
90f99dd guide throughout; no implementation hints or corrected guide were provided during the trial.

## Original report findings

| #   | Finding                                                                                   | Response / fix                                                                                                                                                                                                                                            | Evidence                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CLI help exits 0 with no content.                                                         | **FIXED.** The guide named the library entry `dist/index.js`. It now invokes the actual executable `dist/cli.js` with pinned Node. No CLI implementation change was necessary.                                                                            | Pinned `node packages/cli/dist/cli.js --help` prints Usage and exits 0; existing executable-help tests in `packages/cli/tests/scaffolds.test.ts`.                                                                                         |
| 2   | Trial exports saved in the checkout failed Prettier.                                      | **FIXED guide gap.** Step 8 now places exports/screenshots outside the checkout and explains that untracked JSON is included in formatting checks. The author's artifacts remain unchanged.                                                               | Original failure preserved in `artifacts/trial-verify.log.txt`; author's final clean verify passes.                                                                                                                                       |
| 3   | Native condition-field select consumed arrow keys unexpectedly.                           | **FIXED guidance.** Document Space to open, label typeahead, Enter to confirm and checking the displayed selection.                                                                                                                                       | Both independent routes passed; the automated keyboard task uses label selection in all three engines.                                                                                                                                    |
| 4   | Focus/selection during action checks caused confusion.                                    | **CLARIFIED and regression-tested.** Component shortcuts target the selected component; confirm its highlight/sidebar heading, or explicitly Enter/Escape on the desired row. Existing End/Up navigation selects correctly; no SDK defect was reproduced. | New `outline End and Up select the action target before keyboard Copy or Duplicate` passes Chromium/Firefox/WebKit, with exact undo and no extra custom fields (`/tmp/m09b-material-additions-mac-record.log`).                           |
| 5   | An undocumented Copy attempt and extra Undo removed the custom hint temporarily.          | **FIXED guidance.** Copy, Paste, Duplicate and component-JSON shortcuts are documented, including text-editor clipboard behavior and Copy's zero history steps. Undo's actual schema change was correctly restored by the author.                         | Original exports remain byte-identical after action checks; action-route suite and the new outline regression verify the targets/history.                                                                                                 |
| 6   | Rapid automation focus polling was unreliable in Preview.                                 | **CLARIFIED.** Wait for Preview's panel before Tab traversal. The author resolved this with normal input/AX observations; no reproducible product keyboard failure was asserted.                                                                          | Independent keyboard-only route PASS without programmatic focus; automated all-browser task and appearance tests.                                                                                                                         |
| 7   | Industry initially had no populated choices.                                              | **FIXED guide ambiguity.** State explicitly that Select's options default to `[]`, show the generated Display/Options editor and a complete Software/Services JSON example. No async feature or default data was invented.                                | New `generated Select options populate the live Material preview and saved form` verifies the documented editor, actual choices, saved runtime selection and undo (Chromium/Firefox/WebKit PASS, `/tmp/m09b-select-options-browser.log`). |
| 8   | Internal scrolling/full-page capture and server reload limited supplementary screenshots. | **FIXED guidance.** Explain pane scrolling, Tab-to-field visibility and separate scrolled-state captures. Export/capture before stopping the dev server because Vite restart may reload unsaved state.                                                    | Original limited mouse captures are retained, not replaced; keyboard conditional visible/hidden captures and both complete JSON exports are retained.                                                                                     |
| 9   | A visible in-app tab was unsupported in the sub-agent tool.                               | **TOOLING DETOUR, no SDK change.** Background browser tabs were supported and used. This is not a builder visibility/API contract failure.                                                                                                                | Original report discloses the failed tool option and successful background route.                                                                                                                                                         |
| 10  | Author-added `--single-branch` omitted origin/main.                                       | **CLARIFIED.** The guide's original clone command did not use that flag; it now warns explicitly and gives the fetch command for existing clones. No expected count or gate changed.                                                                      | Original failed run retained in `artifacts/trial-verify-clean.log.gz`; complete verify after fetching is retained in `trial-verify-full-refs.log.gz`, exit 0 at the same SHA.                                                             |

## Other review fixes

- Exact browser-install and pinned verify commands replace an implicit command substitution. The
  guide also gives `sh scripts/linux-visuals.sh check workbench` for the pinned-image comparisons.
- A final review found legacy four-theme lists in the shared Tier 1 helper, Tabs/SDK/native and host
  visual matrices and three demo selectors. Material now joins all five consistently. This is an
  M09b coverage correction discovered by the implementation review, not a claim that the restricted
  author inspected tests. Existing images and all thresholds stay unchanged; expanded verification
  passes: 298 unit / 1,050 browser / 17 size / five count checks, exit 0
  (`/tmp/m09b-expanded-full-verify.log`). Material-only recording and immediate comparisons passed all cases on both platforms;
  the stable Linux comparison-only command now exits 0 (12 checks, `/tmp/m09b-linux-material-check.log`).
- M11 explicitly retains both independent human SDK-author and builder-guide usability exercises.

## Provenance and limits

**isolated sub-agent, no conversation context, clean clone at
90f99dd64aa58fd2b6df83d371ce2d90148ead64**. Author `/root/m09b_author_trial_retry`, `fork_turns=none`.
The first invocation stopped at the account usage limit before producing a report; it supplies no
acceptance evidence. The successful trial lasted 51m 7s (2026-10-22 11:22:56–12:14:03 UTC), first
visible render at 11:24:19 UTC. It passed both UI construction routes and final full verify: 298 unit,
1,017 browser, 17 size and five count checks. The author corrected two setup detours, preserving both
failures. These are local trial runs, not CI re-runs to obtain a green check.

The author reports no forbidden repository files or application JavaScript opened. The report
explicitly discloses an accidental BODY text observation containing inline CSS, which was not used
to derive behavior; the observer was then narrowed. Browser DOM observations were allowed, and this
was not a forbidden repository-file read. Preserve that disclosure without claiming perfect adherence.
Mouse construction used real drags for four additions and mouse palette activation thereafter;
keyboard construction used no clicks or programmatic focus. The report does not claim complete
per-action/per-theme/screenshot coverage; those automated acceptance checks are separate.

The independent author criterion has evidence, with qualified findings answered here. M09b remains
open until first-attempt current-head PR CI and merge complete. Expanded local verification passes. Owner approval
of implementation screenshots is still pending; this report does not substitute for it.

## Owner-directed product fixes — 2026-10-22

The owner requested product fixes beyond the earlier guide clarifications. The original report and
all raw artifacts remain unchanged; its hash is still the value above.

- Sentence-first visible/disabled/calculated expressions now edit the same draft as the secondary
  expression view, with no Apply step. Searchable accessible comboboxes support filter/arrows/Enter.
  Unsupported simple-row shapes remain intact in the raw editor; invalid text cannot corrupt the draft.
- Selection follows outline/canvas focus. End/Up followed by Duplicate **and Wrap** targets Notes in
  the trial path. A regression also caught focus restoration after Paste selecting a stale slot's
  ancestor; restoration now follows the command's new selection.
- New Select additions have two editable choices. Issues flags empty Select/Radio options rather
  than relying on guide advice about empty defaults. Existing runtime model defaults are preserved.
- Save emits of-save, displays Saving…, and waits for markSaved()/markSaveFailed(message). Newer edits
  cannot be cleared by an older snapshot acknowledgement. The demo simulates host confirmation.
- Header is one row at ≥1280px; Theme replaces Preview theme. More exposes locally persisted Builder
  look and keyboard destination/wrap controls. Duplicate harness action buttons are removed in favor
  of the shared toolbar/context/shortcut paths, reducing both clutter and bundle duplication.
- Palette order/icons, registered fallback titles, zero-count summary, generated Display presentation/
  protection fields, dialog icon/location and filled Material read-only surfaces address all remaining
  owner review items. Static protection inherits and preserves API writes.

Evidence in progress.md is updated as checks finish. Current focused results: 108 unit checks pass;
Chromium's 28 focused browser checks pass after fixing CSS specificity and stale focus restoration.
The first browser run's three Display failures were an overbroad test locator matching multiple shell
prefix spans; scoping to the selected field retained the assertions. The second run's two failures
caught the actual Material/focus bugs above. Logs `/tmp/m09b-review-focused-browser{,-2}.log` remain.
Cross-browser, scoped images and full pinned verify are required before claiming these fixes complete.
M09b screenshot approval stays pending. M09b+ is proposed only; M09c is not implemented.

Follow-up evidence: the normal picker/task suite passes all 45 cases across Chromium, Firefox and
WebKit (`/tmp/m09b-review-pickers-final.log`). Firefox's native Tab traversal needed the picker to
close and clear aria-activedescendant on keydown before the browser computes its next target; this
is a product fix. The trace before the fix is `/tmp/m09b-review-firefox-focus-diagnostic.log`, and
the fixed keyboard-only task is `/tmp/m09b-review-firefox-focus-fixed.log`. Temporary tracing and
extra focus waits are removed from the final test. Static flags pass across hosts after the React
controlled sample supplies both new fields in its initial data; the prior missing controlled values
were a sample setup error, not a protection failure.

Scoped macOS image generation passes ten workbench/review states and three Material read-only states.
Only seven workbench images and the three Material read-only images changed; the three new review
captures are additional evidence. Every other existing baseline is byte-identical. Pending: final
comparison after dead-CSS cleanup, pinned Linux generation, full verification and owner approval.
Size checks initially caught 30.05 kB and 30.02 kB against the unchanged 30 kB budget. Removing dead
harness selectors, duplicate harness actions and redundant icon data brings builder to 29.92 kB.
No behavior, assertion, pixel threshold or budget was relaxed.

### Expression locator correction requested by owner

The original assertions are unchanged, including the stored `e1` value, touched state, and
`await expect(page.locator('#preview input[type="search"]')).toBeDisabled()` after Save.
The first locator correction opened the raw expression view; that was incorrect for this regression.
It has been replaced with visible sentence controls, setting “Rating equals 7” (the Rating value
already established by the same test). No expression disclosure is opened and no textarea is filled.

Original failing line:

```ts
await dialog.getByLabel("Disabled when", { exact: true }).fill("true");
```

Superseded correction (not the final test):

```ts
await dialog.locator('[data-expression="disabledWhen"] summary').click();
await dialog.locator('textarea[data-property="disabledWhen"]').fill("true");
```

Final visible-control locators:

```ts
const disabledRule = dialog.getByRole("region", {
  name: "Disabled when",
  exact: true,
});
await disabledRule
  .getByRole("button", { name: "Add condition", exact: true })
  .click();
const conditionField = disabledRule.getByRole("combobox", {
  name: "Condition field",
  exact: true,
});
await conditionField.fill("Rating");
await conditionField.press("Enter");
const operator = disabledRule.getByRole("combobox", {
  name: "Operator",
  exact: true,
});
await operator.fill("equals");
await operator.press("Enter");
await disabledRule
  .getByRole("textbox", { name: "Comparison value", exact: true })
  .fill("7");
```

The current full run began before this final correction; it cannot establish verification of this
new test path. The sentence-control regression must pass in all three browsers before completion.

The first sentence-control run failed in all three engines because changing Rating's maximum to 7
did not select a rating. The test now clicks the visible “7 of 7 stars” preview button before adding
the Employee lookup. “Rating equals 7” then evaluates against actual user input. Every original
assertion remains unchanged; the correction adds fixture interaction, not an API write or raw expression.
Retained failure: `/tmp/m09b-sentence-final-three-browser.log` (15 passed, 3 failed).

During the fixture correction, a broad text replacement also inserted the Rating click into two
unrelated tests. That caused their navigation to wait for a nonexistent seven-star control. Removed
both accidental insertions; the click now occurs only in the sentence-rule regression. The original
assertions remain intact. Retain `/tmp/m09b-sentence-final-three-browser-2.log` as the development
failure record; verification must use the corrected file.

Final corrected regression: PASS, all 18 checks across Chromium/Firefox/WebKit
(`/tmp/m09b-sentence-final-three-browser-3.log`). Full pinned final verify: PASS, exit 0,
306 unit / 1,122 browser / 17 size / five count checks. Archived logs are in
`docs/reviews/m09b-owner-review-evidence/`. Earlier pending verification statements above are
historical checkpoints; owner screenshot approval and remote CI remain pending.

## Live review rounds 3/4 follow-up

Round 4's first expanded run passed 192 of 195 browser checks. All three failures were the pointer
fixture's exact Undo title: the new shared command label correctly names the newly added “Email 2”,
while the assertion expected the type title Email. Updated the exact expected string to
“Undo add of Email 2”; kept the private-add, history, schema and undo assertions unchanged.
The suite still enforces the original 600ms hover threshold. After a collapsed container opens,
refresh hit-test bounds synchronously so the next pointer event can reach an inactive tab.
Logs /tmp/m09b-round4-focused-and-mac-2.log and earlier failures are retained.
Selection tags now use start justification as well as start text alignment; tests check the first
character rect is within the tag. Requested screenshots must be explicitly re-recorded, because
small tag changes can otherwise compare within the unchanged pixel tolerance and retain old PNGs.

The exact move-count regression now covers all three requested routes through public keyboard drop
controls: same slot, different slot and different column. It asserts the full live-region/toast
message, destination sibling order, exact undo/redo text and byte-identical undo. Nine checks pass
across Chromium, Firefox and WebKit (`/tmp/m09b-round4-move-counts.log`). The full run in progress
was interrupted to include this previously missing coverage; it is not recorded as a full pass.
The final icon-width correction is scoped to SVG icons; tooltip no-wrap/max-content positioning
remains intact. Earlier full-run WebKit failures and the interrupted run are retained separately.
All 32 immutable trial artifacts remain unchanged; these are product responses, not edits to its report.

### Final round-4 verification

PASS: pinned full verify exits 0, with 307 unit checks, all 1,179 browser checks, 17 size budgets
and five exact count checks. The Mac slept during an earlier failed full run; both its eight WebKit
timeouts and power transitions are retained. A command-scoped keep-awake assertion enabled a complete
run with no sleep/wake transitions, without changing permanent settings, deadlines or retries.
Logs and command metadata: `docs/reviews/m09b-round4-evidence/`.

Product fixes cover the exact move counts, command-derived history messages, timed/pauseable toasts,
independent SR-only repeated announcements, no stale toast replay, single-line/clamped tooltips,
outside-content selection chrome with preserved first characters, empty-history focus/body shortcuts
and F6 without intercepting Option+Z. Six requested 1280×800 states are re-recorded for Material and
Bootstrap 5 on macOS/Linux. Final builder is 29.95 kB against unchanged 30 kB (prior checkpoint 30.83).
Screenshot owner approval and first-attempt green current-head PR CI still gate merge. The trial report
and raw artifacts remain verbatim; no M09b+ runtime feature is included.
