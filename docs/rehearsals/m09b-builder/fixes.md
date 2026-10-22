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
