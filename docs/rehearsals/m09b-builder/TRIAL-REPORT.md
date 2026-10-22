# M09b independent builder author trial

## Author and provenance

Author: Codex independent author sub-agent `/root/m09b_author_trial_retry`.

Required provenance: **isolated sub-agent, no conversation context, clean clone at 90f99dd64aa58fd2b6df83d371ce2d90148ead64**.

Repository: https://github.com/nawinisha231272-wm/formkit.git. Requested branch: `m09b-builder-ux`. Fresh clone: `/tmp/ourform-m09b-author-c56Jk2` (macOS also reports `/private/tmp/ourform-m09b-author-c56Jk2`). This directory was created outside the initial checkout before any project file was read. Clone was directly from GitHub, not a local copy. `git rev-parse HEAD` returned `90f99dd64aa58fd2b6df83d371ce2d90148ead64`; initial `git status --porcelain` produced no output. Checkout was detached at the required SHA. No implementation fixes, commits, pushes, or PRs were made, and no implementation assistance was requested.

Only project reading materials: `apps/docs/builder-author-guide.md`, its linked `packages/builder/README.md`, CLI help output (empty), command output from documented provisioning/verification, the running UI, and my own exported artifacts. No initial-checkout files or other sessions were accessed. Browser input used the in-app browser through `cua_repl`, native input, accessible controls, and read-only DOM observations. No builder commands, private window hooks, application JavaScript, or API-based schema construction were used.

This is AI trial evidence, not a human usability pass or owner screenshot approval.

## Times

All timestamps below are UTC (EDT is UTC minus four hours on this date).

- Start: **2026-10-22 11:22:56 UTC** / 07:22:56 EDT.
- First visible render: **2026-10-22 11:24:19 UTC** / 07:24:19 EDT, recorded immediately after the empty builder opened.
- Mouse construction/export/action checks finished by **11:28:05 UTC**.
- Keyboard construction/export/action checks finished and author dev server stopped by **11:34:28 UTC**.
- Supplementary screenshots were captured from the still-loaded tabs during verification, then tabs were closed.
- Finish: **2026-10-22 12:14:03 UTC** / 08:14:03 EDT.
- Duration: **51 minutes 7 seconds**. The entire trial remained within its 90-minute limit. No interval of ten minutes without progress occurred.

## Commands and results

Commands were run from the fresh clone, except `mktemp` from `/tmp`.

```sh
mktemp -d /tmp/ourform-m09b-author-XXXXXX
git clone --branch m09b-builder-ux --single-branch https://github.com/nawinisha231272-wm/formkit.git .
git checkout 90f99dd64aa58fd2b6df83d371ce2d90148ead64
git rev-parse HEAD
git status --porcelain
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm build
node packages/cli/dist/index.js --help
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm --filter @ourform/playground dev
```

- Clone, exact checkout and clean-status check: PASS.
- Install: exit 0; pnpm 10.10.0 reported completion in 8.4 seconds. Warning: ignored build scripts for `@parcel/watcher`. No approval/build-script workaround was required.
- Build: exit 0; 24/24 tasks successful, 32.75 seconds. Vite large-chunk warnings did not stop the build.
- CLI help: exit 0, **zero bytes of output**. A retry through the same pinned Node provisioning wrapper also exited 0 with zero bytes of output.
- Dev server: Vite ready in 196 ms on `http://127.0.0.1:4173/`, launched from the fresh clone. The task used `/builder.html?empty`, never `?approved` or an existing server. No port adjustment was needed.
- Author dev server stopped with Ctrl+C. Immediately afterward `lsof -nP -iTCP:4173 -sTCP:LISTEN` found no listener.

Verification command after stopping the dev server:

```sh
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify
```

The first run exited 1 at Prettier because I had saved the UI exports in the repository root without final newlines. Warnings named only `keyboard-export-final.json`, `keyboard-export.json`, and `mouse-export.json`. This was trial-artifact contamination, not an implementation fix. I moved all trial exports/screenshots/logs unchanged to `/tmp/ourform-m09b-evidence-c56Jk2` and reran the identical command on the clean checkout. That second run passed lint, build, typecheck, all 298 unit tests, all 1,017 browser tests (12.4 minutes), and size budgets, but exited 1 at `benchmark:counts` because `origin/main` was absent. My initial clone had added `--single-branch`, which the guide does not specify. I corrected this author setup deviation with `git fetch origin main:refs/remotes/origin/main` (exit 0), without inspecting history or changing the checked-out SHA, then reran the full verification command. The final full rerun exited **0**: lint, 24-package build, 41-task typecheck, 42 unit-test files / 298 tests, all 1,017 browser tests (20.5 minutes), size budgets, and all five count benchmarks (9.2 seconds) passed. The checked-out SHA remained `90f99dd64aa58fd2b6df83d371ce2d90148ead64`, `git status --porcelain` was empty before this report was created, and the final port-4173 check found no listener.

An independent Python check read only the three UI-exported JSON files and asserted Tabs/Panel/Columns nesting, twelve total value fields, six per column, exactly one custom field, exactly one `visibleWhen`, and a condition referencing Customer type’s actual stable id. All three exports passed. `export-check.json` holds the result. No form was constructed with that script.

## Guide step results, by route

| Guide task step                                 | Mouse route                   | Keyboard route                | Evidence                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Tabs named Customer onboarding               | PASS                          | PASS                          | Export has root Tabs with this label; both began empty.                                                                                                                                                                                                                                                                                                                              |
| 2. Contact Panel inside First tab               | PASS                          | PASS                          | Mouse dragged into visible First tab; keyboard selected its virtual outline slot with Down/Enter. Panel is under Tabs in export and visible in First tab.                                                                                                                                                                                                                            |
| 3. Contact details Columns inside Contact       | PASS                          | PASS                          | Two columns under the Panel in each export.                                                                                                                                                                                                                                                                                                                                          |
| 4. Six Column 1 fields                          | PASS                          | PASS                          | Full name, Email, Phone, Customer type, Company name, Tax ID in order.                                                                                                                                                                                                                                                                                                               |
| 5. Company name visibility condition            | PASS                          | PASS                          | Conditional editor selected Customer type / equals / business; generated stable-id expression. Preview initially omitted Company name, revealed it for business; keyboard also cleared business and observed its removal again.                                                                                                                                                      |
| 6. Six Column 2 fields including custom control | PASS                          | PASS                          | Customer reference, Experience, Industry, Terms, Order reference, Notes in order, all in Column 2.                                                                                                                                                                                                                                                                                   |
| 7. Generated custom editor and live preview     | PASS                          | PASS                          | Reference tab and Reference hint present. Hint changed preview placeholder immediately. Cancel (mouse) / Escape (keyboard) discarded it; reopening showed original. Save applied hint.                                                                                                                                                                                               |
| 8. Preview behavior and JSON export             | PASS                          | PASS                          | Custom text inputs accepted ACME-123 / KEY-456. JSON exposed 12 value fields, six per column; exports preserved outside clone. Keyboard export copied with Cmd+A/Cmd+C from JSON editor.                                                                                                                                                                                             |
| 9. Undo/Redo and author actions                 | PASS for exercised UI actions | PASS for exercised UI actions | Both used Undo/Redo, Copy/Paste, Duplicate, Wrap with no settings opening for those actions. One Undo reversed each structural trial action. Keyboard additionally demonstrated Notes add plus initial label as one Undo step, and Redo restored it. Pending additions were discarded via mouse Cancel/Close and keyboard Escape/Close. Host `of-save` payload was not instrumented. |

Mouse construction used actual palette drags for Tabs, Panel, Columns and Full name. Subsequent fields used mouse palette activation, with a selected field or Column 2 determining the insertion destination. Dialog values were entered through UI input automation. No keyboard navigation or shortcuts were used for mouse construction. This tests mouse-only construction, not a claim that every field was individually dragged or that mid-gesture insertion-line appearance was captured.

Keyboard construction used no clicks, pointer gestures or programmatic focus calls. Every mutation came from native key input: Tab/Shift+Tab, arrows, Enter, Cmd+A, text entry, Cmd+Enter, Escape and keyboard-accessible buttons/menus. Read-only DOM focus observations helped identify the active control; they did not focus or mutate it. Ordinary Tab worked in this browser, so the guide’s Option+Tab fallback was not needed and that alternate system-setting path was not tested.

Copy/Paste, Duplicate and Wrap created temporary additional components for action checks. I reversed them before the final export. The final keyboard JSON was byte-for-byte equal to the earlier keyboard JSON export after restoring the custom hint through its editor. The mouse JSON also matched its original export after its action checks.

Header Save was activated with the keyboard and the UI announced **“Form ready to save.”** The status remained Unsaved changes. This is consistent with the guide’s host-owned persistence explanation; no disk/database save or event-payload assertion is claimed. Direct drag insertion indicator visuals, every reorder/pickup shortcut, all appearance presets and every cancellation button on both routes were outside this trial’s exercised subset.

## Confusing instructions, gaps and recorded detours

1. **CLI help has no content.** Guide quotation: “After building, the CLI help is available with `node packages/cli/dist/index.js --help` (it exits 0).” It exits 0, but both the literal command and pinned-Node retry yielded empty log files. PASS for exit status, FAIL for usable help. This did not prevent the UI task.
2. **Verification includes the trial’s own exported JSON.** Guide quotation: “Switch to JSON to copy your form definition.” I saved those copies to the clone root. The later “Stop the dev server, then use the same pinned wrapper with `pnpm verify`” instruction did not say exports should live outside the repository. Prettier then failed on those untracked artifacts’ missing final newlines. Workaround: move trial artifacts unchanged to a sibling evidence directory and rerun. I did not run Prettier to rewrite repository files or weaken checks.
3. **Native select input detour.** Guide quotation: “field Customer type, operator equals, value `business`.” Home/Down/Tab initially left the field at Phone because macOS menu opening/confirmation consumed keys differently than expected. I opened the field menu with Space, used native typeahead `c`, confirmed with Return, and checked that Customer type was selected before saving. This needed only public UI input, not implementation help.
4. **Outline focus versus selected component needed attention during action checks.** Guide quotation: “Up/Down traverses rows” and “Enter on a component edits.” Moving focus to Notes with End/Up did not by itself select Notes; actions still used the selected Customer reference. I opened Notes with Enter, then Escape, to select it before Duplicate/Wrap. I used toolbar Copy/Paste via keyboard to resolve action focus. This caused temporary extra custom fields, each reversed by one Undo.
5. **An undocumented shortcut attempt caused an extra Undo.** I tried Cmd+C outside the JSON editor while exploring actions, although the guide documents Ctrl/Cmd+X and Ctrl/Cmd+V rather than a Copy shortcut. It did not produce the expected Notes duplicate. My extra Undo temporarily removed the saved custom hint. I discovered this by checking the JSON UI, reapplied the hint through Reference settings, and confirmed the final definition exactly matched the earlier keyboard export. This is an author detour, not a claimed contract failure for a documented shortcut.
6. **Rapid automation focus polling was unreliable in Preview.** A loop sending Tabs and immediately reading DOM focus sometimes failed to identify the text inputs. AX observations between inputs plus explicit Tab steps reached them; later stable AX/DOM observations also worked. An exploratory Option+Tab press during that debugging had no visible focus change; explicit Tab traversal resolved the issue. This is recorded as automation behavior, not asserted as a product keyboard failure. No programmatic focus was used to bypass traversal.
7. **Industry’s default Select showed only “Choose an option.”** Guide quotation: “Select starts with registered defaults.” The control rendered, but there were no populated Industry choices in this trial’s Preview. The task asks for the field rather than option authoring or async providers, so I left it as instructed and made no claim about populated defaults.
8. **Supplementary screenshot limits and verification reload.** Earlier viewport screenshots did not include the lower Company name row. I captured additional keyboard screenshots focused on Customer type to show Company name visible/hidden. PageDown from the mode-strip focus did not scroll the preview; tabbing to the field exposed the needed lower row. A requested `fullPage` capture still showed only the scrolling workbench viewport. During verification, the restarted Vite server caused the still-open mouse tab to reload to its empty entry URL before an extra lower-page mouse screenshot could be captured. The completed mouse export, earlier screenshot and successful Preview UI assertions were already saved. I did not reconstruct a completed form by importing JSON to replace that lost runtime state. Both trial tabs were then closed. This does not change either exported artifact.

9. **Browser tool setup limitation.** An attempted visible in-app tab was rejected because visibility is unsupported in a sub-agent. Background tabs were used; creating the second tab required the browser tabs API after the same visibility option was rejected. This was a tool setup detour, not a builder or guide defect.

10. **Author-added single-branch clone option broke the count benchmark.** The guide clone command uses `git clone --branch m09b-builder-ux` without `--single-branch`; I added the latter option when creating the otherwise fresh direct GitHub clone. The benchmark later reported `git rev-parse --verify origin/main^{commit}` / `fatal: Needed a single revision`. This was my provisioning deviation, not an error in the documented clone command. I fetched `main:refs/remotes/origin/main` from the same GitHub remote and reran full verification. I did not inspect repository history or alter implementation files.

No blocker reached ten minutes without progress. All construction questions were resolved through allowed documents, CLI output and the running public UI.

## Access-boundary disclosure

**Forbidden repository files opened: none.** No `packages/*/src`, spec, ADR, test, progress, history/diff, initial-checkout, or other-session files were opened manually. Executing documented build/verify naturally ran implementation and tests; only their output was read, as authorized.

One accidental overbroad browser DOM read occurred during keyboard-focus debugging: when BODY held focus, reading activeElement.textContent returned embedded inline stylesheet text along with UI labels. I did not intend to inspect application source, did not read any application JavaScript, and did not use the stylesheet text to derive behavior. I immediately restricted the helper to element attributes and associated labels. This accidental inline-CSS exposure is disclosed rather than silently omitted. It did not involve a forbidden repository-file read.

## Artifacts

Report destination: `/tmp/ourform-m09b-author-c56Jk2/TRIAL-REPORT.md`.

All other authored evidence is in `/tmp/ourform-m09b-evidence-c56Jk2/`:

- `mouse-export.json`: complete mouse-built definition copied from visible JSON UI.
- `keyboard-export.json`: complete keyboard-built definition copied through browser clipboard.
- `keyboard-export-final.json`: final keyboard definition after reversible action checks; equal to keyboard-export.json.
- `export-check.json`: structural assertions against exported definitions.
- `mouse-custom-editor.jpg`, `keyboard-custom-editor.jpg`: custom Reference metadata editor and live-preview hint.
- `mouse-preview-hidden.jpg`, `mouse-preview-business.jpg`: original mouse Preview captures (viewport screenshots; lower conditional row may be below fold).
- `mouse-preview-business-full.jpg`: supplementary screenshot request; still viewport-limited by workbench scrolling.
- `keyboard-preview-hidden.jpg`, `keyboard-preview-business.jpg`, `keyboard-preview-business-full.jpg`: keyboard Preview captures, some viewport-limited.
- `keyboard-condition-visible.jpg`, `keyboard-condition-hidden.jpg`: lower-page screenshots demonstrating business/Company name and cleared/hidden state.
- `mouse-json.jpg`, `keyboard-json.jpg`, `keyboard-final.jpg`: JSON UI and final keyboard state captures.
- `trial-install.log`, `trial-build.log`, `trial-server.log`: provisioning and own dev-server output.
- `trial-cli-help.log`, `trial-cli-help-pinned.log`: zero-byte CLI-help outputs.
- `trial-verify.log`: initial artifact-contaminated lint failure.
- `trial-verify-clean.log`: verification that passed through size but failed at the missing origin/main benchmark.
- `trial-verify-full-refs.log`: complete verification after correcting the author-added single-branch clone option.
- `report-format.log`: locally installed Prettier formatting of this authored report artifact only; no implementation file was rewritten.
- `trial-events.md`: event notes recorded during the trial.

After all verification completed, I wrote this report to the clone. It is a trial artifact; the clean-checkout verification runs did not include this subsequently created report. The report was formatted using the repository-installed Prettier, without changing its findings.

## Verdict

**UI task: PASS on both mouse-only and keyboard-only construction routes. Full verification: PASS after correcting two author setup deviations (placing exports in the repository root, and adding `--single-branch`).** Both complete exported definitions contain the required Tabs → Panel → Columns nesting, exactly twelve value fields / six per column, one conditional rule, and one custom component. Conditional behavior and generated custom editing/live preview were demonstrated through the UI.

**Guide follow-up required:** CLI `--help` prints no help despite exiting 0. The empty Industry choices and input/automation detours are recorded above without asserting undocumented contracts. This is a qualified independent AI trial, not a claim of perfect guide adherence, a human usability pass, or owner approval of implementation screenshots. No library fixes were made. The own dev server and verification servers have stopped; port 4173 is free.
