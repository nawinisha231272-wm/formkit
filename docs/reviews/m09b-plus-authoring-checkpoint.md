# M09b+ inline labels and precise quick-add — checkpoint evidence

Date: 2026-10-27. Branch: `m09b-plus-authoring`.

This checkpoint follows the accepted opt-in-theme and lazy-Settings split. It adds public translated
captions, inline literal-label editing and a lazy exact-slot quick-add menu. Command search and
multi-select are not included.

## Behavior evidence

- `tests/e2e/builder-authoring-shortcuts.spec.ts` verifies one-command inline label edits, unchanged
  keys, cancel and exact undo; translation-key routing to Settings; and exact-slot filtered quick-add.
- `tests/e2e/builder-loading.spec.ts` verifies first-load/no-preload behavior, slow and failed loads,
  Retry, strict CSP/custom `assetBase`, and schema/history/selection preservation.
- The two complete specs pass **42/42** in Chromium, Firefox and WebKit.
- The inline-label activation regression passes **9/9** with `--repeat-each=3` across the three
  engines. This covers Firefox changing the pointer target when selection chrome appears between
  clicks.
- Focused schema, renderer/theme and feature-loader Vitest suites pass **25/25**. The repository
  typecheck and formatting/lint results are recorded in `docs/progress.md` with the checkpoint commit.

## Consumer measurement

Command: `node scripts/builder-size-gate.mjs`. Method: esbuild 0.25.12 production consumer build,
minified for ES2022; Brotli through `node:zlib`; shared chunks counted once per closure.

| Scope                         | Split baseline | Checkpoint |  Ceiling |  Delta | Result |
| ----------------------------- | -------------: | ---------: | -------: | -----: | ------ |
| Builder-owned initial         |         27,484 |     28,767 |   29,000 | +1,283 | PASS   |
| Full initial closure          |         61,049 |     63,487 |   64,613 | +2,438 | PASS   |
| Settings                      |          7,391 |      7,387 |    8,000 |     -4 | PASS   |
| Logic + JSON + map            |            745 |        745 |   28,000 |      0 | PASS   |
| Logic + JSON + map + Settings |          8,136 |      8,132 |   36,000 |     -4 | PASS   |
| All emitted deferred entries  |          8,524 |     12,019 | reported | +3,495 | —      |

Quick-add's loaded closure is 3,403 bytes. That closure includes the 2,901-byte primitive chunk
already present in initial code, leaving 502 feature-specific bytes. Counting the separate Retry
entry raises its unique emitted cost to 602 bytes.

The remaining headroom is 233 builder-owned initial bytes and 1,126 full-initial bytes. The command
bar therefore remains unshipped until its activation and lazy entry are measured and its numeric
budget is approved by the owner, as required by ADR-0021.
