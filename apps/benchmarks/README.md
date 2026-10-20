# Runtime benchmarks

Build packages with `pnpm build`, then `pnpm --filter @ourform/benchmarks dev` and open
http://127.0.0.1:4190. Choose 100/500/1,000 fields and Run. The first field fans out to 25 calculations.
Measurements include forced layout and assert input identity/focus and cleanup.

`pnpm benchmark:record` records three warm-ups plus 15 measured samples per field count, storing medians
in docs/performance/baselines/<platform>-<arch>.json. `pnpm benchmark:check` compares all four 500-field timing metrics
and fails at >20% regression. It also verifies affected-processor counts for all sizes. pnpm verify/CI
runs this separately with one Chromium worker after correctness tests. Never record over a failure
without reviewing its cause. Run idle and foreground; hardware/OS/browser/power/CPU contention affect
absolute timings. The stored report identifies the measured environment. Missing/pending platforms fail closed; Linux never uses the Mac baseline. Use benchmark:measure for explicit calibration, then aggregate three API-verified clean main CI reports as documented in docs/performance. The Linux file remains a pending placeholder until those runs exist. See ADR-0009.
