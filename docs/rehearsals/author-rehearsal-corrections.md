# M08 author rehearsal corrections

Date: 2026-10-20, America/New_York. Author: Codex. These are AI-assisted implementation checks,
not the independent human author exercise. M08 and its SDK freeze remain open.

## Fresh pushed checkout proof

PASS at final implementation `53402c0f6ee7e2f24015e5cc5d570c1cfc160542`, cloned from GitHub after pushing all
M08 deliverables. No local working-tree files were overlaid. The exact component author guide from
that checkout was saved before following its steps. Node reported 22.22.3 and pnpm 10.10.0.

The guide's frozen SDK install, 22-package build, public package packing, built CLI generation,
generated install, three-browser provisioning and generated `pnpm verify` all exited zero.
The generated acme-note project passed build/typecheck, its Node test and all 15 browser cases.
SHA-256 checks confirmed every generated source/config file was unchanged after verification;
`git status --porcelain` confirmed the SDK clone remained clean. The first verify captured explicitly
unapproved screenshots because a new project has no reviewed baseline; it did not claim visual approval.

[fresh-clone-proof.json](fresh-clone-proof.json) records the exact commands, timestamps, durations,
checkout SHA and source provenance. Full local command output and the runnable generated project are
retained at `/Users/dharanesh/Documents/ChatGPT/m08-author-rehearsal-sxvslgfr/`.
The earlier proof at `5c78ddf` also passed; its record is preserved in
[fresh-clone-initial-proof.json](fresh-clone-initial-proof.json). After the Color rehearsal exposed
the Linux local-kit path bug, the correction was pushed and the entire proof repeated.
The guide starts with a fresh clone of `m08-sdk-complete`; no unpublished working-tree state is required.

## Eight original findings

| #   | Correction                                              | Status / evidence                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | All M08 deliverables are committed and pushed           | PASS — clean GitHub clone at the SHA above; generated files unedited; `pnpm verify` exits zero.                                                                                                                                                                                |
| 2   | Exact provisioning and scaffold metadata                | PASS — `.nvmrc`, exact Node/pnpm engines, packageManager and engine-strict; guide `ofrun` commands report exact versions. CLI scaffold integration checks the pins.                                                                                                            |
| 3   | Complete non-Slider numeric example                     | PASS — `apps/docs/examples/quantity.ts`; `tests/author-guide.test.ts` compiles/checks the exact guide snippet and default properties.                                                                                                                                          |
| 4   | Typed translation with English default                  | PASS — Quantity's typed catalog uses `t(key)` and an English fallback; the same Node test checks fallback and custom translation. No guessed second default-string argument.                                                                                                   |
| 5   | Generated browser harness and verify                    | PASS — all three unedited scaffolds pass verification: preview, Playwright/axe, four themes/three browsers. Component/plugin each run 15 browser cases; theme runs 18 including authored-theme registration.                                                                   |
| 6   | Correct required, disabled and read-only fixture shapes | PASS — typed `RenderComponentOptions`: `node.validation.required`, `node.disabledWhen`, top-level `readOnly`; source typechecks and real host protection tests pass. `node.type` is supplied by the helper.                                                                    |
| 7   | Actual builder startup and each editor                  | PASS — generated `pnpm builder` opens the registered mini builder; `checkPropertyEditors` edits every custom property and requires a changed preview assertion. Quantity exercises min/max/step/showValue; scaffolds exercise placeholder/maxLength/showCount; omissions fail. |
| 8   | Exact Linux image/digest and screenshot command         | PASS — guide and generated config pin the official Playwright 1.56.1 noble digest. Root `sh scripts/linux-visuals.sh record author` records then compares 12 new Linux images, keeping all existing PNGs unchanged. Generated-project command evidence is recorded below.      |

## Slider simplification and core behavior

Original source/report are preserved in [slider-original.ts.txt](slider-original.ts.txt) and
[slider-original-report.md](slider-original-report.md). The simplified executable source is
`apps/docs/examples/slider.ts`. Physical lines: **51 → 46**; nonblank: **50 → 45**. Counting meaningful
body lines and excluding imports, comments, blanks and punctuation-only lines: **35 → 28**.

Removed the Slider's manual read-only value restoration, read-only keydown guard and repeated
read-only conditions. Core now rejects user writes on readOnly/disabled/hidden fields before
normalization or processor work, and emits only the target field with unchanged data and no changed
paths. The renderer reconciles live value/checked properties even when VNode props are unchanged.
Default/API writes continue to work. Controls retain identity; unchanged values do not reset a caret.

`packages/core/tests/protected-writes.test.ts` checks data/state identity, zero normalization or
processor work, the exact refresh patch, and API/dependent updates. `tests/e2e/protected-writes.spec.ts`
and `authoring.spec.ts` cover direct DOM, vanilla, React, Angular 21/22 and Web Component light/shadow
hosts, plus the actual simplified Slider in all four themes and three browsers.

The first focused browser run had six React fixture failures: explicit controlled empty data correctly
replaced the schema default. The fixture now supplies stored initial data, and a new assertion checks
it before mutation. All 48 focused browser cases pass. This was a fixture correction; no assertion or
threshold was removed. Linux author recording and comparison each passed 12 cases. There are 12 new
Mac and 12 new Linux images; the preceding 168 PNG bytes remain unchanged.

## Color rehearsal

PASS — a different portable component, Color, was authored in a separate generated project using
the fixed guide and public kit. It is a hex text input with a sanitized swatch, placeholder and
showSwatch properties, typed translation fallback, and host required/pattern validation. The component
is **24 physical lines** and contains no manual protected-write guard or control-state wrapper.
The mini builder registers it from metadata and both generated property editors change the preview.

- Native pinned `pnpm verify`: build/typecheck, two Node tests and 15 Chromium/Firefox/WebKit cases
  PASS, including all four themes, required/pattern validation, reset, protected user writes/API writes,
  swatch English name/actual color, axe and each property editor.
- Native `pnpm visual:record`: 15 recording cases and 15 update-disabled comparison cases PASS;
  12 darwin-arm64 screenshots. Representative Bootstrap 4 image inspected.
- Generated **`pnpm visual:linux:record`**: frozen install/build, 15 recording and 15 update-disabled
  comparison cases PASS in the exact official image/digest from the guide. 12 linux-x64 screenshots;
  source and SDK kit stayed read-only, Linux dependencies/build lived in the disposable container.
  Runtime 305.826 seconds under x64 emulation. No screenshots were substituted across platforms.
- Standalone project source/lockfile/baseline commit: `04431577c58798e4a6ee10181e0e29705e2871d6`. Runnable project and full logs:
  `/Users/dharanesh/Documents/ChatGPT/m08-author-rehearsal-sxvslgfr/acme-color` and adjacent
  `color-commands.log`. [Color source and replay notes](color/README.md),
  [final proof and screenshot hashes](color/proof.json) retain reproducible evidence in this repo.

### Failures retained and remaining gaps

The initial rehearsal used the first pushed kit at `5c78ddf`. A style object failed TypeScript because
VNode style attributes use a CSS string; this was an author assumption, corrected with a CSS string
whose dynamic color is restricted to a validated six-digit hex value. Functional/native checks then
passed. The generated Linux command failed with ENOENT `/ourform-sdk-kit/ourform-sdk-0.0.1.tgz`:
pnpm's lockfile had relative tarball paths, but the command copied the project to `/project`.
The CLI correction at `53402c0` preserves the absolute project/kit directory relationship inside
the disposable container. The whole pushed-checkout proof was repeated and a new Color project
generated from that corrected kit; only the authored component/fixture/tests were ported over.
[Initial command outcomes](color/initial-steps.json) and both local full logs retain these failures.
No failed CI run was re-run to obtain green.

Remaining limitations are explicit:

- Independent human guide-only authoring and human visual/API review remain pending. This rehearsal
  cannot pass M08 or accept ADR-0003. No M09 work is included.
- First verification in a new project captures unapproved visual evidence; the author must explicitly
  record, inspect and commit platform-specific images. AI inspection is not human approval.
- Before package publication, the guide requires a local packed SDK kit. Generated overrides bind to
  its location and version 0.0.1; regenerate the scaffold if moving the kit. Publishing is later work.
- The guide demonstrates themed classes but has no general VNode styling recipe; the compiler caught
  the CSS-style-object assumption. No unresolved failure remains in the exercised commands.
- Slider still uses the native range's minimum thumb while the stored value is null; its blank output
  and reset/first-interaction behavior remain documented. Color uses text input and has no such ambiguity.

Comfort with another basic portable component is improved: provisioning, typed examples, browser
setup, exact fixtures, real editor interactions and Linux commands now work without setup overlays.
This is the implementing agent's assessment, not independent usability evidence.
