# Slider author trial — AI-assisted

Author: Codex. Date: October 20, 2026 (America/New_York).
This is the explicitly authorized agent trial, not independent human evidence for the M08 gate.

## Outcome

Built a portable Slider in **51 physical lines (50 nonblank)**, using the author guide and CLI-generated scaffold. No library source, other repository documentation, web documentation, other agents or human assistance was used. The SDK checkout itself was only built/packed; implementation was in a separate generated project.

The functional checks pass. The visual builder UI and individually interacting with all four generated property editors remain **unverified**. The guide's builder round-trip helper passes. This trial therefore does not establish every requested builder acceptance point or shipping readiness.

| Requested check                         | Result                        | Evidence                                                                                                                                                                                     |
| --------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clone/check out M08                     | PASS with setup caveat        | Local clone of `m08-sdk-complete`, HEAD `201b6095e3f9407e3734ac80e749a45203575ee6`; uncommitted working files overlaid to obtain guide/CLI                                                   |
| Number value; empty is unset            | PASS                          | Node checks cover omitted/null, numeric zero and 42; browser submits numeric 0/15/50; reset returns to unset                                                                                 |
| min=0, max=100, step=1, showValue=true  | PASS                          | `Slider property defaults and generated editors`; all-theme browser assertions                                                                                                               |
| Custom min/max/step and showValue=false | PASS                          | Bootstrap 4/Tailwind custom browser cases: 10..50, step 5, output absent                                                                                                                     |
| Required fails when unset               | PASS                          | Node and four-theme browser checks return `required`; zero submits successfully                                                                                                              |
| Builder palette and editable properties | PARTIAL                       | `checkBuilderRoundTrip(engine,"acme-slider")` passes; metadata exposes three numeric and one boolean property. Actual visual builder and explicit editing of each property were not verified |
| At least two themes                     | PASS                          | Base, Bootstrap 4, Bootstrap 5 and Tailwind browser interaction checks                                                                                                                       |
| Accessibility                           | PASS within tested scope      | Axe reports no serious/critical violations in selected state in all four themes; accessible slider name, required/invalid attributes, keyboard, reset/focus and input identity checked       |
| Read-only and disabled                  | PASS for direct control state | Bootstrap 4/Tailwind tests use a documented-in-code preview wrapper to supply state. Host wire-definition configuration remains unverified                                                   |
| Approved visual comparisons             | NOT DONE                      | Platform-separated screenshots captured; no approved baseline or human review exists                                                                                                         |

Native range UX limitation: the initial thumb is at min while the model is null. Blank output indicates no value; interaction sets a number. Host reset is the clearing path. A dedicated clear button and a translated unset announcement were not added.

## Timing

- Start: **16:49:02 EDT** / 20:49:02 UTC.
- First visible render: **16:52:18.988 EDT** / 20:52:18.988 UTC, **3m 16.988s** after start.
- First successful functional browser suite: about **16:53:44 EDT** (four tests).
- Expanded native checks: three Node tests and nine browser tests.
- Completion: **21:00:15 UTC**. **Total elapsed: 11m 13s**, including setup, failures, implementation, verification and report preparation.
- No individual blocker exceeded ten minutes. Gaps were logged and worked around promptly.
- Timebox: 90 minutes; stopped after this component and report.

## Reproduction and files

`component/` is the generated project, with a committed lockfile and an independent Git commit.
`kit/` contains the exact twelve unpublished SDK tarballs used by the project.
`guide-used.md` is the guide snapshot.
`notes.md` contains contemporaneous issues with direct guide quotations.
`commands.log` contains commands, full combined output, timestamps and exit statuses, including failed experiments.
`component/evidence/<platform>-<arch>/` contains theme screenshots.

Use the README in `component/` for the pinned install/verify and preview commands.
The project uses SDK package overrides relative to the adjacent kit, so it can be moved as a pair.

The initial SDK build completed all 22 package tasks. The first generated `pnpm verify` passed its single baseline test before edits. The authored project's `pnpm verify` was expanded to run browser checks as well as build, typecheck and Node tests. The original library repository was not edited.

## What was unclear, missing, or wrong

The detailed running record is in `notes.md`. The main author-facing gaps were:

1. **A clean checkout did not contain the guide/tooling being evaluated.** Guide: “From the SDK checkout, build and pack the local kit”. M08 was a local branch with uncommitted deliverables. Used a working-tree snapshot overlay in the clone. This limits clean-checkout reproducibility.
2. **Version provisioning was omitted.** Guide: “Use Node 22.22.3 and pnpm 10.10.0.” Defaults were 23.11.0/11.25.0; the first install failed with ignored-build enforcement. Used exact versions through npx.
3. **Property helper usage was omitted.** Guide: “Properties such as numberProperty generate config types, defaults, diagnostics and builder editors.” Guessed imports, `properties` shape, `{label,default}` arguments and booleanProperty. Compiler accepted them; a complete example would remove these guesses.
4. **Translation with an English default was unexplained.** Guide: “Labels may be message keys; translate control strings with p.t.” Three plausible calls failed typechecking. Removed the optional unset text rather than adding a hard-coded control string or reading source.
5. **Browser tooling was not scaffolded.** Guide: “In a real browser use renderComponent(note,{host:emptyElement,theme:"bootstrap4"})” and “Run keyboard, name/description/error, pending/invalid/read-only, reset/focus/identity and axe checks.” Had to create HTML, preview, browser tests and config, install Playwright/axe, and separate Vitest's include pattern. Original generated verify did not run browser checks.
6. **Fixture shape was missing.** Guide: “node/data/fields overrides allow required, disabled, read-only and composite fixtures.” Typechecking rejected `node.type`, `node.readOnly` and `node.readonly`. Used a public control-state wrapper for the optional state conformance tests. No host-state integration claim is made.
7. **Visual builder integration was missing.** Guide: “The builder reads the same engine registry: no palette or property-panel extension is needed.” The helper can be called as generated, but there are no visual-builder startup/registration steps or individual editor assertions. A guessed explicit-edit argument was rejected. This remains a verification gap rather than a silently claimed success.
8. **Linux image instructions were incomplete.** Guide: “Generate Linux images inside the digest-pinned Playwright image matching 1.56.1; keep platform images separate.” No image reference/digest/command was supplied. Discovered a matching cached image via Docker CLI and used its digest. Screenshots are evidence, not approved comparisons.

The number adapter's empty string rejection was a test-author mistake: `""` is not a number. The test now asserts a type diagnostic for that input while preserving required assertions for omitted/null data and valid assertions for zero. Event handlers typed as KeyboardEvent/PointerEvent were another author mistake; VNode handlers accept Event, with an internal cast for keyboard keys. Both failures and fixes are in the command log.

## Comfort building the next component

**No, not using this guide alone as it stands.** A basic control is small and the generated Node check is useful, but property declarations, translation defaults, browser setup, state fixtures and actual builder integration needed guesses or workarounds. I would want one complete numeric-field example, a generated browser harness, and exact builder registration/editor checks before treating this as a reliable independent author path.

The guide states: “That human evidence is required before the SDK gate can be marked GO.” This AI-assisted exercise does not satisfy that requirement.

## Final verification

- macOS arm64: full install/frozen install and verify passed; final browser rerun passed all nine tests after platform screenshot separation.
- Linux x64: frozen install and full verify passed in cached Playwright 1.56.1 image pinned as mcr.microsoft.com/playwright@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a. It ran under emulation on the arm64 Docker host.
- Each full verify: build and typecheck PASS; 3 Node tests PASS; 9 browser tests PASS.
- Screenshots are in evidence/darwin-arm64 and evidence/linux-x64; no approved-baseline comparison or human visual review was performed.
- Standalone source/lockfile commit: f1a297f (feat: build slider from component author guide). Generated build outputs, package tarballs, test output and screenshots were not committed.

## Component code

```ts
import {
  defineField,
  numberValue,
  numberProperty,
  booleanProperty,
  controlAttributes,
  h,
} from "@ourform/sdk";

export const field = defineField({
  type: "acme-slider",
  title: "Slider",
  value: numberValue(),
  properties: {
    min: numberProperty({ label: "Minimum", default: 0 }),
    max: numberProperty({ label: "Maximum", default: 100 }),
    step: numberProperty({ label: "Step", default: 1 }),
    showValue: booleanProperty({ label: "Show value", default: true }),
  },
  control: (p) =>
    h(
      "div",
      {},
      h("input", {
        ...controlAttributes(p),
        type: "range",
        min: p.config.min,
        max: p.config.max,
        step: p.config.step,
        value: p.value ?? p.config.min,
        class: p.theme.classFor("control"),
        oninput: (event: Event) => {
          const input = event.target as HTMLInputElement;
          if (p.state.readOnly) {
            input.value = String(p.value ?? p.config.min);
            return;
          }
          p.setValue(input.valueAsNumber);
        },
        onkeydown: (event: Event) => {
          if (p.state.readOnly) event.preventDefault();
        },
        onkeyup: (event: Event) => {
          if (
            !p.state.readOnly &&
            p.value === null &&
            [
              "Home",
              "End",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "PageUp",
              "PageDown",
            ].includes((event as KeyboardEvent).key)
          ) {
            p.setValue((event.target as HTMLInputElement).valueAsNumber);
          }
        },
        onpointerup: (event: Event) => {
          if (!p.state.readOnly && p.value === null) {
            p.setValue((event.target as HTMLInputElement).valueAsNumber);
          }
        },
        onblur: p.onBlur,
      }),
      p.config.showValue
        ? h("output", {}, p.value === null ? "" : String(p.value))
        : null,
    ),
});
```
