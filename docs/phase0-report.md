# Phase 0 gate report — M05

Date: 2026-10-19. Branch: m05-phase0-gate, stacked on verified M04 (172fd19).
Status: implementation complete; human sign-off required before M06.
Recommendation: **GO to Phase 1 after human review.** This is an architecture proof, not a production release.

## Results and reproducible evidence

| Acceptance criterion                                           | Result | Evidence                                                                                                                                                                     |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same JSON in Vanilla, React, Angular                           | PASS   | hosts.spec.ts: all hosts return identical data/errors and equivalent accessible field semantics; shared native/host-feedback.json fixture, Angular 22/21 runtime assertions. |
| Rating without class inheritance                               | PASS   | SDK test: Rating stays under thirty meaningful authoring lines (29); unchanged defineField composition in components/src/rating.ts.                                          |
| React native value/blur/disabled                               | PASS   | Each host's native change/blur, disabled state, context and stable controlled updates; actual React portals/StrictMode.                                                      |
| Angular native equivalent                                      | PASS   | Same tests on Angular 22 and 21, local DI, outputs and object-valued CVA.                                                                                                    |
| Automatic custom builder palette                               | PASS   | builder unit: palette and property groups discover arbitrary native metadata; browser registry palette and generated Rating/native editors…                                  |
| Automatic custom property editors                              | PASS   | Same unit/browser tests edit Rating max and native EmployeeLookup searchPlaceholder with no component-specific builder editor.                                               |
| Base, Bootstrap 4, Bootstrap 5, Tailwind with unchanged Rating | PASS   | themes.spec.ts four-theme conformance/axe matrix; actual Bootstrap 4.6.2 CSS in all modes and 5.3.8 CSS; Rating source unchanged.                                            |
| Theme switch preserves state                                   | PASS   | Existing complete state/caret/identity test now includes Bootstrap 4; builder all preview themes preserve focused native typing…; per-host native caret tests.               |
| Client validation without backend                              | PASS   | Offline builder submission fails on required Name, then passes after portable/native input; core and host validation tests.                                                  |
| Offline build/runtime, no licensing endpoint dependency        | PASS   | sh scripts/verify-offline.sh: OS TCP denial probe (EPERM), 19 uncached package scripts built under deny-network policy; offline runtime test in all browsers.                |
| pnpm verify                                                    | PASS   | Pinned command below: lint, all builds/type checks, 123 unit tests, 216 browser cases, 13 budgets.                                                                           |

Reproduce with installed browser binaries:

```sh
npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm install --frozen-lockfile
CI=true npx --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify
sh scripts/verify-offline.sh
```

The offline proof is macOS-specific; dependencies/toolchain must already be installed/cached. The script
uses sandbox-exec to deny every network operation to builds/subprocesses, checks explicit outbound TCP
denial, and runs the same package build scripts directly in dependency order. Turbo could not spawn
jobs inside this policy; pnpm recursive builds bypass that launcher and caches. Standard verify still
checks the normal Turbo pipeline. Browser tests load local assets, go offline, then edit, validate and
submit. Phase 0 has no licensing service implementation; commercial licensing remains later work.

## Measurements

Final run: 123 unit tests, 216 browser cases in Chromium/Firefox/WebKit, 13 passing size budgets. Core line coverage: 98.59% (90% required).
There are 60 visual baselines: 39 unchanged previous baselines and 21 reviewed new Bootstrap 4 images.
New command coverage uses 25 seeded sequences × 50 commands, independently replaying patches and checking
all undo/redo snapshots for byte-identical JSON. No tests were weakened/deleted/skipped or thresholds relaxed.

| Library          | Brotli size | Budget |
| ---------------- | ----------: | -----: |
| schema           |     3.06 kB |  30 kB |
| core             |     6.63 kB |  30 kB |
| sdk              |     3.54 kB |  30 kB |
| components       |       828 B |  30 kB |
| renderer-dom     |     6.68 kB |  30 kB |
| builder-core     |        4 kB |  30 kB |
| theme-base       |       989 B |  10 kB |
| theme-bootstrap5 |     1.17 kB |  10 kB |
| theme-tailwind   |     1.07 kB |  10 kB |
| element          |      1.5 kB |  30 kB |
| react            |      1.4 kB |  30 kB |
| angular          |     2.38 kB |  30 kB |
| theme-bootstrap4 |     1.19 kB |  10 kB |

Sizes are size-limit's Brotli measurements of built library entries, excluding framework peers and
host stylesheets. No new external library runtime dependency was introduced. The development stylesheet
alias auto-installs Bootstrap 4's jQuery/Popper peers; neither framework JS nor those peers are imported
by the preset. Angular/example JIT/probe bundles retain Vite's 500 kB advisory; these are development
apps, and library budgets are measured separately.

Historical renderer comparison in ADR-0002 and docs/measurements/m02-renderers.json: the chosen VNode
spike mounted 500 mixed controls in 19.5 ms and switched their classes in 4.0 ms (upper medians locally).
Those M02 measurements used Node 23/Chromium 141 and minimal spikes; they are not fresh M05 production
performance claims. Current verification uses Node 22.22.3, pnpm 10.10.0, React 19, Angular 22.2.3/21.2.25.

## Problems found and decisions

- The original builder spec requested hidden/accessible-name editors without both wire fields. ADR-0007
  maps Hidden to visibleWhen=false and adds optional ariaLabel; meta stays uninterpreted. Standard
  placeholder is forwarded by the shared SDK/shell without editing Rating.
- New output panels initially lacked a valid ARIA region role. The axe finding was fixed in the markup.
- Draft additions initially used successful compilation to discover data scopes. Structural discovery
  now generates unique keys even with unresolved references. Clearing unset properties adds no history;
  JSON editors preserve explicit nulls. Focused regression tests cover these cases.
- Snapshot inverses ensure exact property order and stable generated ids on redo. They consume memory
  proportional to history × definition size. Bound/compact history before production builder sessions.
- Schema edits rebuild preview sessions with current data, resetting transient touched/errors. Themes
  preserve the existing session, focused controls, caret and all state. This distinction is intentional.
- Remove can leave unresolved-reference drafts with warnings; preview remains unavailable until repair
  or undo. Compiler reference diagnostics precede deeper graph diagnostics; repairing refs may expose
  additional issues. Invalid drafts never enter the renderer.
- Generic JSON expression/options editors and a list canvas prove discovery. Custom editor plugins,
  drag/drop, moves/duplication and the production builder package remain M09. Layout width is authored
  but layout rendering belongs to its later milestones.

## Recommended architecture changes and gate decision

Retain per-engine model/view registries, composition-based fields, shared shells, VNodes and opaque
native slots. The builder discovers portable and native metadata without importing frameworks. The
Bootstrap 4 preset adds only a narrow shipped-theme exception, retaining one-way dependency rules.
No Phase 0 finding requires replacing the architecture.

Before production builder work, bound history and decide preview reconciliation semantics; improve
multi-error draft diagnostics and add structured expression/custom editors in M09. Follow the existing
milestones for validation/submission schema, Tier 1 fields, layouts, composites/plugins and distribution.
Repeat performance and Linux CI checks on production targets as the feature set expands.

**GO after human sign-off**, with the limits above. M06 has not been started. AGENTS.md explicitly
requires gate milestones to stop for human review even when every criterion passes. Review this report,
the mini builder at /builder.html, ADR-0007 and the verification evidence before authorizing Phase 1.
This branch is stacked because earlier milestones have not been merged. Git transport is authenticated;
no PR was created because the available GitHub CLI session is unauthenticated. docs/progress.md carries
the review/acceptance summary in its place. Local checks do not claim that remote Linux CI has run.
