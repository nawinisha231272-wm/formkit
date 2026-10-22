# M09b independent builder exercise

`TRIAL-REPORT.md` is the author's unedited final report. `prompt.txt` is the exact initial prompt;
`provenance.json` records the source SHA, no-context agent and immutable artifact hashes. Responses
and verification of fixes belong only in `fixes.md`.

The author cloned GitHub at **90f99dd64aa58fd2b6df83d371ce2d90148ead64**, after full pinned local verify
and push. That complete checkpoint also passed native Linux CI on attempt 1:
[39714060389](https://github.com/nawinisha231272-wm/formkit/actions/runs/39714060389).
No local implementation files or progress summary were supplied. The saved guide/public README
snapshots are the exact versions at that SHA, not later corrections.

The original report uses temporary absolute paths. Portable copies are under `artifacts/`:

- UI-exported JSON, notes, small logs and final checks have `.txt` appended, preserving original bytes
  without letting repository formatting rewrite them.
- JPGs keep their names. They are author evidence, not approved visual baselines.
- The two large verification logs are losslessly gzip-compressed; use `gzip -dc` to inspect them.
- `export-check.json.txt` records twelve fields, six per column, one custom field and one stable-id
  visibility condition for both routes. `keyboard-export-final.json.txt` matches the earlier keyboard
  export after reversible action checks.

The report's SHA-256 is
`ff3238c58bba1c4f0b78a4d53c9258ef79b1bba3bc8d127493e3d46d1426923d`.
The report and raw artifact copies are preserved; only this index, provenance and response are
maintained by the implementation agent. Human usability remains M11. Owner implementation-image
approval remains distinct from this AI author exercise.
