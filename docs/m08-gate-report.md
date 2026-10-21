# M08 gate report — owner-accepted Yes/No author trial

**Recommendation: GO for M08 under the owner-amended author criterion.** Full pinned corrective verification passes. ADR-0003 is accepted for SDK 0.x freeze. Stop for owner review after initial-green CI and merge; M09 remains unauthorized.

## Evidence policy and provenance

The owner accepts a fresh Codex session with no implementation context as an independent author
using only the guide, CLI and generated project. The owner explicitly accepts this particular
continued-session Yes/No trial as an exception. This supersedes the earlier human-only requirement;
a human guide-usability exercise remains mandatory in M11 (ADR-0013).

Author: **Codex trial agent**, in the continued **“Build Slider via author guide”** chat. Prior Slider
context remained available: the fresh-session condition is **FAIL**. The requested fresh-author label
in the original report is corrected by its own provenance note. Do not relabel it as a fresh session
or human evidence. The original source/report and failed experiments are preserved under
[docs/rehearsals/yes-no](rehearsals/yes-no/README.md). Owner acceptance is a project decision, not proof
that the failed condition actually passed. Earlier implementing-agent Slider/Color rehearsals retain
their original status.

## Trial record (as reported)

- Clean remote checkout: m08-sdk-complete at f9587cb654601b2b32743335d47b4bc0965f1c3c; SDK tree clean
  before setup and after authoring. No overlay.
- Start/first clone command: **2026-10-20 19:38:24.920671 EDT** (23:38:24.920671 UTC).
- First visible toggle: **19:42:30.615 EDT**; reported time to first render **4m 05s** (rounded down).
- Total through report preparation: **17m 12s**, within 90 minutes; no blocker over ten minutes.
- Component: **34 physical / 33 nonblank lines**. Source/lockfile/24 agent-reviewed baselines commit
  3f694e8; report commit d0ec4c9. The full command index is archived; original output logs remain in
  the standalone trial project, with hashes in provenance.json.
- Final authored project: build, strict typecheck, **3 Node tests and 24 browser cases PASS**.
  True/false/null, true-only required semantics, optional false submission, inline geometry, both actual
  caption editors, all four themes/three browsers, keyboard, reset, protected/API writes, identity and
  axe were checked. Native and pinned Linux comparisons passed with 12 PNGs per platform.
- The report states no SDK source, declaration files, specs, ADRs or repository tests were opened;
  only the guide/generated files were read. Own logging files outside the scaffold were an explicit
  administrative exception. No other agents/web/human assistance were used in that trial.
- Original usability verdict remains **No** for another unfamiliar component from the guide alone.
  The author has not supplied a new comfort verdict after these corrections. Human assessment moves
  to M11 and is not retroactively claimed here.

## Findings and corrective evidence

| Finding                                                                                   | Correction                                                                                                                                                                                       | Verification required before GO                                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Nullable boolean was missing; guesses about true-only required and nullable equals failed | Public nullableBooleanValue({requiredTrue?}) preserves true/false/null. Default accepts either boolean answer as required; consent explicitly requires true. Existing booleanValue is unchanged. | tests/nullable-boolean.test.ts: normalization/identity/serialization, required/optional matrix, canonical Node rejection and Ajv parity. |
| Value-adapter signatures were missing                                                     | Guide documents empty, normalize, isEmpty, equals, serialize, jsonSchema, required delegation and safe canonical round trips, with typed examples.                                               | Exact compiled inline/numeric guide sources in tests/author-guide.test.ts; public export inventory check.                                |
| Inline and other shell modes were missing                                                 | Guide explains field, group, inline, cell and none, with their accessibility/presentation responsibilities.                                                                                      | Typed inline example; measured label/control geometry in every theme and browser; existing shell conformance retained.                   |
| Configurable captions were ambiguous                                                      | Literal yesLabel/noLabel properties by default; optional yesLabelKey/noLabelKey opt into translation, with configured literal fallback for unknown keys.                                         | Typed caption test prevents accidental literal translation; every actual metadata editor changes browser preview.                        |
| CLI --help exited 1 and broke an && setup chain                                           | --help/-h return usage and exit zero without writes; invalid generation arguments still fail.                                                                                                    | Built executable exercised by CLI scaffold tests for both flags, with empty-output-directory assertion. Guide includes the command.      |

The JSON Schema change checks isEmpty after normalization for finite boolean/null serialized domains,
including adapters that keep objects internally and serialize booleans. It preserves the declared
empty value and keeps legacy schemas compatible; a regression test covers the object case.
No runtime dependency, size/count/coverage/pixel threshold or existing baseline is changed.

## Gate checklist

| Criterion                                     | Status / evidence                                                                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK scenarios A–F                             | PASS — full pinned verify, tests/sdk-scenarios.test.ts and tests/e2e/sdk-extensions.spec.ts.                                                                                        |
| All CLI scaffolds work without edits          | PASS — full pinned verify exercises built CLI, fresh packed-package projects, frozen/offline reinstall and unedited verify for component/theme/plugin; help status is tested too.   |
| Author evidence accepted                      | PASS under explicit owner exception, ADR-0013. Fresh-session condition remains FAIL.                                                                                                |
| Reported guide/SDK findings resolved          | PASS — seven nullable/caption/schema regression tests, exact compiled guide examples, built CLI help and 12 new browser cases.                                                      |
| Four-theme conformance and visual comparisons | PASS — macOS and pinned official Linux each pass 12 recording and 12 comparison cases; 24 new platform-specific images. All existing 192 PNG bytes are unchanged.                   |
| Full pinned verify                            | PASS — pinned Node 22.22.3/pnpm 10.10.0 verify exits 0: 194 unit tests, 444 browser cases, 15 size budgets and five count cases. Local log and first-run Linux CI are linked below. |
| SDK 0.x inventory/freeze                      | PASS — inventory includes nullableBooleanValue, exact TypeScript/runtime export check passes; ADR-0003 accepted after full corrective verification.                                 |

## Limits and review boundary

Native checkbox null and false both look unchecked; the guide explicitly documents reset/model
semantics and when a distinct unset indicator or three-choice control is appropriate. Prepublication
scaffolds still use a local kit, and their first screenshots require explicit record/review. These
are documented boundaries, not claims of human usability approval. M11 must record a real human's
name, provenance, times, commands, gaps and comfort verdict and resolve the findings.

Stop after the closure PR merges on its initial green CI. The proposed nested drag-and-drop slot
contract, Tabs, M10a/M10b plan changes and all M09 implementation remain outside this PR.

## Final corrective verification

Local log: /tmp/m08-close-full-pinned-verify.log (exit 0). The full run includes all earlier SDK,
component, adapter and performance-count regressions. Pin/image data remains in
scripts/playwright-container.json; sh scripts/linux-visuals.sh record boolean records only an empty
new-suite folder and then compares with updates disabled. Representative native and Linux images
were inspected; no human visual/usability approval is inferred. Original failed experiments remain
archived. Current-head CI and the merge record are linked in the closure PR; merge is permitted only
when its initial checks pass, without re-running a failed workflow.

## Closure confirmation and screenshot inspection

[PR #6](https://github.com/nawinisha231272-wm/formkit/pull/6) merged as
c8d8254a79cb9ef0c97acfcd5d426294de14a94b. Its
[PR verify run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39523437523)
passed on attempt 1 at the final head cb88763e46ca99f31095be5bd6d2ac51d09a7e7d;
the [push verify run](https://github.com/nawinisha231272-wm/formkit/actions/runs/39523433174)
also passed on attempt 1. No re-run was used to obtain green.

Codex opened all 24 new Yes/No PNGs individually: darwin-arm64 and linux-x64, each with
Chromium/Firefox/WebKit and Base/Bootstrap 4/Bootstrap 5/Tailwind. Each inspected file's Git blob SHA
matches the corresponding file returned by GitHub for PR #6. Labels, captions, required markers and
errors are readable throughout. The No caption sits below the checkbox in Base/Tailwind and beside
it in Bootstrap 4/5; platform font weight and native checkbox styling differ. These observations are
recorded for human review. This is AI inspection, not human visual approval; no person has approved
these 24 baselines yet. No image or comparison threshold was changed.
