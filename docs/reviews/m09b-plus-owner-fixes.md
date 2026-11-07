# M09b+ owner review fixes — 2026-10-30

Status: **full pinned local verification PASS; current-head CI and owner review pending**.
Earlier failed-run evidence below remains historical; this proof supersedes its status.

## Cause and implementation

`9c7f0f4` replaced `primitives.menu()` with a bare `ofb-action-menu` in
`component-actions.ts`, and removed the initial `[data-ofb-primitive="Menu"]` stylesheet
from `primitive-style.ts`. The replacement never received matching CSS. Static CSS minification
was not stripping a matching rule: it was absent from source. The restored initial chrome now
styles the context/component More popup as a token-based fixed grid, clamps its whole box to the
viewport and shares surface styling with the other popovers. Header More remains positioned by its
initial chrome rule. Context menus, clipboard and PointerDrag remain initial.

Loading feedback owns its visible toast and cancels it on module resolution, failure or local abort;
a queued activation never clears a newer toast. Already-resolved requests settle before the loading
announcement timer. Toast dismissal does not clear the independent polite message. This is an
internal UI lifecycle helper, with **no public API addition**.

Command rows now expose listbox options, palette/type icons, jump locations, active highlighting and
search-input `aria-activedescendant`; arrows and Enter keep focus in search. The no-results recovery
also resets the active option. Bulk Settings has a count/labels title (full accessible name/title,
visual ellipsis) and visually hidden group legends instead of repeated tab headings. Toolbar labels
and tooltips update after selection changes, including context actions and unselected-component
single actions. Inline commits announce both the old and new caption. The explicitly owner-created,
untracked `outputs_cmp/` directory was removed after confirming no tracked files were inside it.

The first final native verify completed 1,589 browser cases but timed out in the unchanged WebKit
12-field keyboard task at its last Preview traversal. Inspection found that count-aware toolbar
refresh was replacing identical tooltip text nodes across the canvas on each selection update.
`disableAction` now leaves unchanged text nodes intact; `ariaLabel` uses the equivalent DOM property.
The new regression observes zero tooltip child mutations while selecting another field and back (the original tooltip stays connected) and confirms
that a changed multi-selection count still refreshes the tooltip. Its initial locator mistakenly
excluded the now-hidden non-primary toolbar; it now explicitly inspects that retained toolbar with
`includeHidden: true`. The existing keyboard task's assertions and 30-second deadline are unchanged.
A negative control in disposable generated JS reinstated the old unconditional setter: the new
regression failed with two child mutations and a replaced text node. Generated JS was then restored
byte-for-byte. A subsequent proof was interrupted before browser tests to strengthen this new
regression; that partial log is retained as interrupted, not as a passing run.
The task and new regression pass in Chromium, Firefox and WebKit; the failed full run is preserved.
The introductory README example also registers its Base/Bootstrap 4 form themes and builder recipe
explicitly, matching the already-approved opt-in registry API.

A later complete native run passed 1,588/1,593 browser cases (including the formerly failing
keyboard task in 22.9 seconds) but five WebKit `page.goto(..., waitUntil: "load")` calls timed out
before assertions, across unrelated builder/form URLs. The failed log and test ids are preserved.
Those five unchanged cases passed 15/15 isolated diagnostic repetitions; a single WebKit browser
also completed 200 fresh builder-page contexts without a navigation failure. This does **not**
establish the cause of the full-run failures. The WebKit project now retains traces on failure
for network/DOM evidence; no retry, timeout, test assertion or pixel setting changes. The final
full run remains required, and these earlier failures are not hidden by later passing evidence.

## Final approved consumer measurements

Pinned reproduction:

```sh
npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm --filter @ourform/builder build
npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm exec node scripts/builder-size-gate.mjs
```

| Consumer gate                              | Pushed 7885dca | Current build | Delta | Approved ceiling | Result |
| ------------------------------------------ | -------------: | ------------: | ----: | ---------------: | ------ |
| Builder UI initial (excludes builder-core) |         31,379 |        31,784 |  +405 |           31,800 | PASS   |
| builder-core marginal contribution         |          7,209 |         7,190 |   -19 |            7,300 | PASS   |
| Full initial closure                       |         67,317 |        67,651 |  +334 |           67,700 | PASS   |

All values are Brotli bytes after the same consumer build. No code moved into builder-core; its
marginal compression contribution can change with shared output. Current lazy entries: Settings
7,704/8,000; Commands 3,586/4,500; quick-add 1,869/3,750; bulk editor 4,661/4,700 (Retry 4,642);
planning 1,547/1,750; Data 269/300. Their Retry/aggregate gates pass (Logic/JSON/map 745/28,000; with Settings 8,449/36,000).
The owned deferred union is 40,262, +1,296 from 7885dca, including the independently bundled
Retry entries; no new chunk or aggregate ceiling is introduced. History/diff remains unshipped.
`m09b-plus-owner-fixes-evidence/consumer-size.json` contains every shared/initial/deferred file.

Safe shared popover/toast CSS deduplication remains. A title-in-lazy-editor variant exceeded the
4,700 bulk gate and was rejected. A later purely syntactic compaction decreased UI but grew the
full closure and was discarded. The additional axe check first exposed the visible group headings as forbidden listbox children;
those redundant accessibility headings are now hidden while each group retains its accessible name.
Logs for each build, size measurement and failed local regression
remain in the evidence directory. The owner accepted final UI/full ceilings **31,800/67,700** on 2026-10-30 because
`9c7f0f4` removed Menu CSS and restoring it plus the requested polish accounts for the growth.
ADR-0018/0020 and progress record this decision. Builder-core remains 7,300 and all lazy limits
remain unchanged. The table above is populated from the final consumer build JSON; earlier logs
and the stopped draft are historical measurements, not alternative current values.

## Final local proof — 2026-11-06

Full pinned verification **PASS (exit 0)**: **341 unit / 1,593 browser / 36 size gates / five runtime count fixtures**.
Frozen install, lint, build, typecheck, coverage, all browser/axe cases and deterministic counts passed.
The non-document source/PNG fingerprints match before and after the proof. Logs and metadata:
`m09b-plus-owner-fixes-evidence/nov06-verify.log.gz` and `verification.json`.

| Gate                                        | Final Brotli bytes | Ceiling | Delta from 7885dca |
| ------------------------------------------- | -----------------: | ------: | -----------------: |
| Builder UI initial (excludes builder-core)  |             31,784 |  31,800 |               +405 |
| Builder-core marginal consumer contribution |              7,190 |   7,300 |                -19 |
| Full initial closure                        |             67,651 |  67,700 |               +334 |

`consumer-size.json` is the single current numeric source. Native and saved pinned Linux sizes match;
builder source hashes are unchanged from that Linux evidence. `consumer-hosts.json` lists the consumer
builds for Vite/React, Angular CLI, vanilla and per-theme script tags. No code moved into builder-core.
Lazy ceilings stay unchanged; all per-feature, Retry and aggregate gates pass. No new lazy chunk.

500-field browser index: **13.800 ms**, exactly **500 visits**, cached reopen.
Bulk Delete/Move/Required: **500 child commands, one publication and one history entry each**.
Individual timings remain advisory and are retained; the drag reports also retain tasks above 50 ms.

Gallery versus main: **295 changed / 68 new / 109 byte-identical**;
**43 unexplained older preview differences** are explicitly listed for owner review.
Each changed image has main/after/diff; new states are marked absent from main. Group counts and reasons
are in the gallery/manifest. Linux menu images came from the official pinned Playwright image; no pixel
threshold changed. `outputs_cmp/` is removed.

The scaffold split preserves all 25 existing expect expressions, every export/asset/install/offline/browser
assertion, and every 30-second browser case. Owner-approved independent deadlines are **120/120/120 s**,
**sum 360 versus the former collective 180 s**. The phase report preserves the measured formula and
larger-kit analysis. Generated browser concurrency returns to main's one worker. No runtime dependency,
form JSON or public API is added by this owner-review follow-up.

The earlier failing keyboard trace is retained. The unchanged isolated task passed at **22.9 s without
tracing / 23.3 s with tracing**; tracing alone is not claimed as the cause. Temporary diagnostic tracing
was removed after capture (the original suite had none). Final native verification uses a process-scoped
`caffeinate -di` display-awake host; the root macOS WebKit launcher also suppresses native AppKit window
animations without changing browser defaults, global preferences, test assertions or deadlines.
See the separate display-sleep diagnosis for the no-application reproduction and fixed control.

Current-head remote first-attempt results will be recorded in PR #16. Local PASS does not imply CI PASS.
Owner image/delivery approval remains pending. **Do not merge or start M09c/M09d.**
