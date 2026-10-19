# M07 performance baseline

Build first: `pnpm install --frozen-lockfile && pnpm build`.
Run `pnpm benchmark:check` for the stored gate, or start `pnpm --filter @ourform/benchmarks dev`
and open http://127.0.0.1:4190 for interactive measurements.

The committed m07-baseline.json is a measured artifact. To intentionally replace it, run
`pnpm benchmark:record` on an idle runner and review the diff and measurement environment.
Checks never update it. Each size has 3 warm-ups and 15 samples; report timings are medians in ms.
Compile, mount plus layout, 25 edits plus layout and two appearance changes plus layout are measured.
The 500-field form includes 25 calculated dependents; each 25-edit batch executes exactly 650 field
processors. All three sizes assert control count/identity/focus and DOM cleanup.

Every 500-field metric must be <= baseline × 1.20. The comparator has independent boundary/rejection
unit tests. pnpm verify runs the isolated Chromium gate after correctness checks. CI uploads the
benchmark JSON report, including on budget failure. Absolute timings depend on runner hardware,
OS, browser and CPU/power state. The initial artifact is local macOS evidence; no remote Linux
verification is implied. Keep the browser/toolchain pinned and investigate failures before changing
baselines. See ADR-0009 for scope and measurement limits.
