# 0002 — Portable VNode controls

Status: accepted
Date: 2026-10-19
Milestone: M02

## Context and method

We implemented equivalent Text and Rating controls twice behind FieldControlProps: a declarative h()
VNode tree with keyed patching, and an imperative DOM factory with update/destroy. Both used identical
values, callbacks, config, state, a11y and theme props. Each mounted 500 mixed controls (250 Text,
250 five-button Rating) into a real Chromium page, forced layout, updated a focused text control 200
times and switched the class theme on every control. Twelve rounds, two warmups, upper median of ten.
These are control-layer timings, excluding schema compilation/session work, not full-app latency.

Raw samples and environment: [m02-renderers.json](../measurements/m02-renderers.json).
Chromium 141.0.7390.37, macOS arm64, Node 23.11.0. Timer resolution limits interpretation of tiny updates.
DOM ran first; host samples include cold React/Angular startup and are proof timings, not comparable
framework performance benchmarks. All numbers are local observations rather than release budgets.

## Results

| Criterion                                   | DOM factory |         VNode |
| ------------------------------------------- | ----------: | ------------: |
| 500-control mount + forced layout           |   19.300 ms |     19.500 ms |
| Focused Text props update                   |   0.0010 ms |     0.0025 ms |
| 500-control theme switch + forced layout    |   14.100 ms |      4.000 ms |
| Text authoring meaningful lines             |          21 |            10 |
| Rating authoring meaningful lines           |          35 |            18 |
| Total control/SSR module meaningful lines   |          64 |            30 |
| Candidate runtime + controls minified bytes |       1,736 |         2,807 |
| Same bundle gzip / Brotli bytes             |   736 / 608 | 1,265 / 1,133 |
| SSR Text + Rating output bytes              |         527 |           527 |
| SSR Text + Rating pair (500 repetitions)    |   0.0038 ms |     0.0156 ms |
| React host wrapper meaningful lines         |          14 |            14 |
| Angular host class meaningful lines         |          13 |            13 |
| React/Angular mount, update, input, cleanup | PASS / PASS |   PASS / PASS |

SSR strings were byte-identical. Both candidates preserved the focused Text DOM node through updates
and theme changes. Both framework probes delivered exactly two change callbacks (one per host) and
removed controls on unmount. The numeric one-shot host timings are retained in the raw file; cold/warm
ordering makes them unsuitable for scoring renderer speed.

Meaningful lines count nonblank lines excluding punctuation-only lines after Prettier formatting.
The production Rating definition is 29 meaningful lines, including both property declarations and the
control, excluding imports. It uses the generic controlAttributes helper and keyed star buttons; no
Rating-specific rendering is hidden in another helper. The compact spike's 18 lines exclude model
metadata and are reported separately from the production acceptance count.

## Decision

Select VNode h() plus a small keyed DOM patcher. Mount cost was approximately equal, theme switching was
about 3.5x faster, and control authoring was materially shorter. The extra 525 Brotli bytes and slower
single-field/SSR microbenchmarks are acceptable at these absolute costs. One declarative representation
also gives generic SSR without duplicating each control's HTML template, reducing drift.

The production renderer mounts each control once, updates named fields in place, preserves matching
keyed nodes, skips value writes during composition, dispatches current callbacks and releases refs/listeners.
Shell selection is metadata in M02; complete FieldShell semantics/themes remain M03. React/Angular
probes do not add public bridge APIs (M04). No external runtime dependencies were introduced.

## Reproduction and removed spike

The complete, runnable two-candidate comparison is preserved at commit `0f00f17` on this branch:

```sh
git worktree add ../ourform-m02-comparison 0f00f17
cd ../ourform-m02-comparison
npx pnpm@10.10.0 install --frozen-lockfile
npx pnpm@10.10.0 build
npx pnpm@10.10.0 exec playwright install chromium
node experiments/renderer-comparison/run.mjs
```

Results are written to docs/measurements/m02-renderers.json in that checkout. Both comparison sources
are removed from the final tree; the chosen implementation lives in sdk/vnode and renderer-dom/vnode-dom.
The final SDK probe page verifies the production controls in real React 19.2 and Angular 20.3 hosts.
Framework/compiler dependencies are development-only. Probe APIs follow [React createRoot](https://react.dev/reference/react-dom/client/createRoot)
and [Angular createComponent](https://angular.dev/api/core/createComponent); they are not shipped adapters.

## Contract clarifications

ConfigOf preserves the property map's value types. resolveConfig validates overrides/defaults and returns
a frozen config or invalid-property diagnostics. Metadata helper group defaults to Display. defineField
validates defaults, freezes metadata, exposes properties and returns a headless model plus an erased
portable view (the typed author callback is validated before that heterogeneous registry boundary).
Number's empty value is null, boolean's is false, and each isEmpty recognizes its empty(). Array/object
adapter helpers, composites and plugins remain later work. M01's one starter assertion expecting Rating
zero changes to null as explicitly required by M02; all core/schema regression tests are retained unchanged.

The four-control accessibility scan caught aria-required=true on role=group. The shared attribute helper
now omits that unsupported property for group controls rather than suppressing the check. Full required
announcements/group shells remain M03 work; see the corrected SDK spec note and the four-control axe test.
