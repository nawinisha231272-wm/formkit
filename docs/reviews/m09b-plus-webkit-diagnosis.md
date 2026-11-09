# M09b+ native WebKit diagnosis — 2026-11-06

Status: **CONFIRMED empty-page reproduction and fixed control; full pinned local verify PASS**.
This is test-host infrastructure; no SDK rendering behavior, test assertion, pixel tolerance, browser
version or 30-second browser-case deadline changes. No page/CI retry is used.

## Original failures and isolation

The retained [full-run failure log](m09b-plus-owner-fixes-evidence/second-full-webkit-navigation-timeouts.log.gz)
contains five initial navigation timeouts in unrelated builder/form cases. The exact same five cases
passed all 15 explicitly repeated isolation diagnostics: [isolation log](m09b-plus-owner-fixes-evidence/owner-navigation-diagnostic.log.gz).
Those isolation passes alone did not establish the cause. The original five hung processes were not
sampled; attribution to the defect below is an inference from the matching pinned-browser reproduction,
original display-sleep correlation and this final full-suite pass.

A subsequent full run also hit the unchanged long keyboard task's 30-second deadline; its trace is
retained as `oct30-full-keyboard-trace.zip`. Identical isolated task on November 6: **22.9 s without
tracing / 23.3 s with tracing**. Tracing alone is not established as that timeout's cause. Temporary
tracing added for diagnosis was removed after capture; the original suite had no tracing. Final full
verification ran with `caffeinate -di`, keeping the native host awake, and the same task passed **22.9 s**.
Both isolated logs and the final full log remain; no task assertion/deadline was edited.

## Controlled reproduction with no OurForm code

Pinned Node **22.22.3**, pnpm **10.10.0**, Playwright **1.56.1 / WebKit build 2215**, macOS
**26.6.2 (25G83), arm64**. A private localhost:4199 server returns only static `<h1>ok</h1>` HTML.
One browser per arm, fresh context/page per navigation, no page retry. Native browser PIDs are selected
only among descendants of the diagnostic process. The 15-second observation window belongs to this
negative-control diagnostic; production test cases retain their unchanged 30-second deadline.

| Arm                                              | Completed navigations | Initial/final native threads | Display                                          |
| ------------------------------------------------ | --------------------: | ---------------------------: | ------------------------------------------------ |
| Pinned browser, default native window animations |       63 then stalled |                       8 → 71 | Asleep                                           |
| Actual `scripts/webkit-macos.sh` launcher        |             200 / 200 |                       8 → 13 | Asleep throughout sampled points and final check |

At navigation **63**, the baseline sent **0 browser requests / 0 server requests**.
An external request to the same server returned **HTTP 200 in 15.997 ms**.
The owned browser sample contains dispatch-root workers blocked in `-[NSAnimation _runBlocking]`;
65 animation-stack mentions were observed. Thread growth follows page creation, while the fixed arm
stays around 13–14 threads after startup and completes every page. This reproduces a browser/AppKit
failure without form code, a Vite server or application processing.

This matches the display-sleep/native-animation mechanism reported in the
[upstream Playwright issue](https://github.com/microsoft/playwright/issues/42385).
Our fix appends a **process-local** AppKit argument after Playwright's validated launch arguments;
it invokes the same public pinned executable and preserves all default browser arguments. Linux is
unchanged. No global application defaults are written, and the package/browser pins remain fixed.

The hardware controller checked **2183 seconds of physical idle**, slept the display
only, and requested wake at completion. The display-sleep interval was **19:11:32–19:13:57 EST** on
November 6. System sleep was prevented only for the experiment with `caffeinate -i`.
Power preference snapshots before/after are **byte-identical**. The controller has a bounded cleanup
path and always requests wake; it never changes system power preferences.

## Retained evidence and reproduction

Under `m09b-plus-owner-fixes-evidence/`: `nov06-display-baseline.json`, `nov06-display-fixed.json`,
`nov06-display-status.json`, `nov06-display-baseline-sample.txt.gz`, `nov06-display-control.log.gz`,
`nov06-display-hardware-control.json`, the two compressed diagnostic scripts, the original full/isolation
logs, and the November 6 full verify log. Source/PNG fingerprints prove the verified runtime stayed unchanged.

For a fresh reproduction from the repository root, unpack the two diagnostic scripts to
`.git/ourform-owner-proof-2026-11-06/` using their recorded filenames, then run:

```sh
mkdir -p .git/ourform-owner-proof-2026-11-06
gzip -dc docs/reviews/m09b-plus-owner-fixes-evidence/nov06-display-probe.mjs.gz > .git/ourform-owner-proof-2026-11-06/display-probe.mjs
gzip -dc docs/reviews/m09b-plus-owner-fixes-evidence/nov06-control-display.py.gz > .git/ourform-owner-proof-2026-11-06/control-display.py
caffeinate -i python3 .git/ourform-owner-proof-2026-11-06/control-display.py
```

The controller refuses to interrupt an active user (requires more than ten minutes of physical idle),
uses the installed pinned browser, records both independent arms and wakes the display. It is a
controlled environmental diagnosis, not a way to retry a failed correctness test to green.

The final native full-verification command uses the unchanged repository script with a process-scoped
host display assertion (released automatically at exit):

```sh
caffeinate -di npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify
```
