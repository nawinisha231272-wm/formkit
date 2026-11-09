# M09b+ owner follow-up evidence — 2026-11-09

Start with `final-verification.json`, `final-consumer-size.json` and the linked owner-followup report.
Only these `final-*` measurements describe the compacted final source. Historical blocked/intermediate
JSON files and failed/interrupted logs are deliberately retained; they do not supersede the final proof.

- `compactions.json` and `compaction-string-audit.json`: kept/discarded byte ledger and retained literals.
- `previous-ci-ab.json`, `native-ab.json`, `linux-ab.json`, `timing-summary.json`: old slow runtime versus
  fixed native/emulated-Linux paired timings, including absolute batch/per-edit values.
- `final-500-indexing.json`, `final-500-bulk-work.json`: refreshed indexing and exact bulk work.
- `final-linux-*` and `final-pinned-verify.log.gz`: final comparisons and full correctness proof.
- `requested-images.json`, `image-audit.json`, `raster-audit.json`: exactly43 capture-only images;
  antialias/crop diagnostics never change screenshot thresholds or imply owner approval.
- `linux-old-loading-*` and `interrupted-before-loading-contract-update.log.gz`: the owner-superseded
  three stale-loading assertions, disclosed with exact before/after lines in fixes.md.

Final-head first-attempt CI URLs and conclusions are recorded in PR#16 and the final delivery report
after pushing. No workflow reruns for green and no merge authorized.
