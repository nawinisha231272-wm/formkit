# M09c prototype evidence — unpublished draft

The [review report](../m09c-runtime-prototype.md) defines scope, limitations and the requested
numeric budget. This directory records one final size set and the final-source checks. It is not
a full verification or CI result. Base `dcb7550c7990f57a789b4adc9a3563bd9059c221`; source remains
uncommitted on `m09c-logic-rules`. `source-manifest.json` fingerprints the 946 package, app,
fixture and test source files. These measurements describe that draft, not a new published SHA.

## Results and files

- `final-builder-size.json`: unchanged existing consumer probe output; full gate **exit 1**,
  71,036 > historical 67,700. UI 31,780, builder-core 7,212. Do not read embedded historical
  limits as the accepted M09c proposal or a granted enabled ceiling.
- `final-form-sizes.json`: real matched form consumers, separately built immutable main;
  main 28,232, no-logic draft 29,395, enabled 31,306. Includes entry source and every input.
- `final-package-bytes.json`, `final-package-sizes.log.gz`: exact standalone file figures and
  all 17 existing file checks PASS. These exclude imports and are not consumer closures.
- `paired-timings.json`: all five alternating pairs and final summary; preliminary result/log
  retained separately. Final no-logic bundle hashes in `timed-bundle-hashes.txt` equal the rebuilt
  final-source hashes in `contract-audit.json`, despite later opt-in-body-only guards.
- `root-timings.json`: absolute new root fixture timings and samples, no unsupported main ratio.
- `build-guards.log.gz` PASS (27 tasks); `final-typecheck.log.gz` PASS (45 tasks);
  `final-unit.log.gz` PASS (369 tests/59 files, unchanged coverage thresholds);
  `final-browser.log.gz` PASS (three browsers, final source); `final-existing-counts.log.gz`
  PASS (all nine existing runtime/DOM/CSP work-count checks, baselines unchanged).
- `final-lint.log.gz`: final lint result. The separate `format-failure.log.gz` preserves the
  initial formatting failure in the new headless counts test; formatting alone corrected it.
- `browser.log.gz`: initial module-load failure in the new test's Node JSON import.
  `browser-fixed.log.gz`: earlier corrected-loader pass. Final three-browser evidence is
  `final-browser.log.gz`. No browser assertion, timeout or retry changed.
- `timing-power-final.txt`: Low Power Mode 0, idle prevention, native host. The paired harness
  ran alone under command-lifetime caffeinate; no permanent system changes.
- `contract-audit.json`: no pre-existing tracked test changed, no expression evaluator/shared
  expression meta-schema change; the builder probe is byte-identical to the existing gate.

The complete pinned verify and implementation CI remain pending the explicit enabled-closure owner
decision. No screenshots/baselines changed. Plan PR18's CI is a separate, already merged result.

## Reproduce

Use Node **22.22.3** on PATH, repository-pinned pnpm **10.10.0**, frozen lockfile, Playwright
**1.56.1** with its installed browsers. No globally installed tools. From this draft's repository:

```sh
node node_modules/pnpm/bin/pnpm.cjs install --frozen-lockfile
node node_modules/pnpm/bin/pnpm.cjs build
node node_modules/pnpm/bin/pnpm.cjs typecheck
node node_modules/pnpm/bin/pnpm.cjs test
node node_modules/pnpm/bin/pnpm.cjs test:e2e tests/e2e/logic-prototype.spec.ts
node node_modules/pnpm/bin/pnpm.cjs benchmark:counts
node node_modules/pnpm/bin/pnpm.cjs exec size-limit
node scripts/builder-size-gate.mjs > /tmp/m09c-builder-size.json
```

The final command intentionally exits 1 at the existing 67,700 gate. Do not change the ceiling
to reproduce a green result. First obtain the owner decision described in the review report.

The `.txt` files are exact measurement-source snapshots, not runtime assets. Recreate the local
measurement directory `.git/ourform-m09c-prototype-2026-11-10/` and copy each script snapshot there
without its final `.txt` suffix. Create its `main-src` from
`git archive cd6d0b679027da328da9f5e4f63480437d6c765b` (extract into that directory), then run the
same pinned frozen install/build inside it. It must own its workspace links; do not substitute
the branch's built packages or a node_modules symlink. `main-install.log.gz`/`main-build.log.gz`
record that independent build.

Run `form-sizes.mjs` from the repository root for the matched closures. `build-bench.mjs` makes
the identical main/draft production bundles, then `run-ab.mjs` runs five alternating pairs in one
Chromium process. `run-root.mjs` builds and measures the separate absolute root fixture. On macOS,
record `pmset -g` and `pmset -g batt`, and wrap browser measurements in `caffeinate -diu`; run no
other builds/tests at the same time. Scripts bind only loopback HTTP and perform no external I/O.

Snapshots retain their original private output directory so reproduction cannot overwrite these
review artifacts. Final proof commands/logs apply to the manifest's source. Any source change
requires fresh applicable measurements before a delivery claim.
