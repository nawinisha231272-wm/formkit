# M09b live-review verification evidence

Original completed local development logs, including failures, are compressed without editing their
contents. `logs.json` records each original source path and uncompressed SHA-256. These are local
checks, not GitHub Actions re-runs. The current PR must pass remote CI on its first attempt.

Key records:

- `m09b-live-full-verify.log.gz`: original round-2 full run, 16 browser failures.
- `m09b-round4-verify-final.log.gz`: first round-4 full run, six WebKit failures.
- `m09b-round4-verify-corrected.log.gz`: interrupted after 203 passing browser checks to add missing
  exact move-count coverage; not a completed verification result. Termination can mark an in-flight
  case failed; this is not an assertion failure.
- `m09b-round4-webkit-corrected.log.gz`: all six affected routes pass after the SVG width correction;
  the navigation stalls are not attributed to that CSS bug without evidence.
- `m09b-round4-controls-corrected.log.gz`: 48 round-3/4/toast cases pass in all three browsers.
- `m09b-round4-move-counts.log.gz`: nine exact move-count/history cases pass in all three browsers.
- `m09b-round4-linux-verified.log.gz`: pinned Linux visual generation and comparison pass.
- `m09b-round4-final-verify.log.gz`: complete follow-up, 307 unit passes, 1,171 browser passes and
  eight WebKit timeouts. Size/count stages were not reached.
- `m09b-round4-power-events.log.gz`: only sleep/wake transitions during that run; idle sleep began
  at 19:47:35 EDT, followed by repeated dark wakes. No unrelated scheduling entries are retained.

- `m09b-round4-awake-verify.log.gz`: final full **PASS**, exit 0; 307 unit tests, all 1,179 browser
  tests, all 17 size budgets and five exact count checks. Builder is 29.95 kB against unchanged 30 kB.
- `verification.json`: exact pinned command, platform, worker count, times, exit code and log hash;
  no sleep/wake transitions occurred during this successful run.

On macOS the final command was `caffeinate -diu npx --offline --yes --package=node@22.22.3 --package=pnpm@10.10.0 pnpm verify`.
The assertions automatically ended with verification; no permanent power setting changed. The
playground then restarted on the requested 4173 port. Earlier size and geometry failures are
retained as development records; no correctness assertion, pixel tolerance, deadline or budget was
relaxed. The original independent-trial report and raw artifacts remain in their immutable directory.
