# Round-5 verification evidence

Final pinned native verify: **PASS, exit 0**, with lint/build/typecheck, 307 unit tests in 44 files,
1,224 browser tests in Chromium/Firefox/WebKit, 17 size budgets and five exact count checks.
Command/times/results are in verification.json; verified-source-sha256.json proves the product source
and baselines did not change during the complete run. Builder is 29,982 / unchanged 30,000 bytes.

Linux generation/comparison passed 88 tests. Its outer wrapper exited 2 because a comment was edited
in its source while it waited for Docker, changing the interpreter's file offset. The saved script
passes syntax validation. A clean, untouched `check owner-review` then passes 44 tests and exits 0.
linux.json and the exact logs distinguish these results; the earlier interrupted capture exits 143.

The previous PR head's first Linux correctness runs failed two WebKit geometry checks. Both failed
logs are retained; advisory timing success cannot satisfy correctness. No CI workflow was re-run.
Intermediate local failures include fixture assumptions, a Firefox hover timing race and size
measurements over the unchanged ceiling. No assertion threshold, deadline or budget was weakened.

All .log.gz files contain exact output; logs.json hashes the uncompressed bytes. snapshots.json
records 30 changed and 374 byte-identical PNGs relative to the preceding PR head, with no new images.
Phone captures remain unchanged. The 32 original trial artifacts remain separately immutable.
Owner screenshot approval and final-head first-attempt green PR CI still gate merge.
