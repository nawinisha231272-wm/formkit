# Runtime benchmarks

Build with `pnpm build`, then `pnpm --filter @ourform/benchmarks dev` and open
http://127.0.0.1:4190. The 100/500/1,000-field forms fan the first field out to 25 calculations.
Timing samples include forced layout and assert control identity/focus/count and cleanup.

`pnpm verify` runs the deterministic `pnpm benchmark:counts` gate, not wall-clock timings. Its separate
counts.html probe measures actual processor/DOM/render work for 25 edits per size and the shared
onboarding fixture. Expectations in docs/performance/work-counts.json must match every edit/patch
exactly; both increases and unreviewed decreases fail.

`pnpm benchmark:check` runs original timings on their own with advisory platform ratios. Correctness
assertions still fail; wall-clock ratios do not. `pnpm benchmark:record` remains an explicit local
recording command, refusing a single Linux recording. Existing Mac/Linux timing files are preserved.

PRs get an isolated five-pair interleaved main/PR production-build timing job and a median-ratio job
summary. Nightly main timing uses original Vite serving against the Linux baseline and raises an issue
only for >20% over three consecutive nights. Never compare across platforms or serving modes. See
ADR-0010, docs/performance and docs/progress.md for policy, provenance and failed-run records.
