# M09c atomic rule commands and locks

Status: **full pinned verification PASS**; index audit/commit/push and new-head CI pending. This is a headless authoring checkpoint,
not completed Logic mode or M09c delivery.

`UpdateLogic(rules, label?)` snapshots safe JSON, preserves component selection and emits one
`/logic` add/replace patch/history step. One command handles Add/Edit/Remove/reorder/duplicate.
Invalid references/cycles/locks roll back schema, selection and history including redo; no-op
subjects remain available without history. Undo/redo restores definition bytes and selection.

Central lock comparison now includes root contributions to `all`-locked targets/subtrees and
visibility/disabled/read-only state inherited from ancestors. It compares trigger/condition,
otherwise and relative priority. Source reads and unrelated actions in mixed-target rules stay
editable. Key/structure locks continue allowing logic edits. JSON/history cannot bypass the check.
No new lock policy or form JSON is introduced. New rule command and optional subject are additive
public APIs documented in the package README, spec 07 and changeset.

The new lock regressions first reproduce **three failures/two passes** on unchanged code. After the
fix, **96 builder-core tests / ten files** pass, including every existing test. Typecheck passes.
[Red log](m09c-logic-commands-evidence/logic-locks-red.log.gz),
[expanded unit log](m09c-logic-commands-evidence/logic-command-expanded-units.log.gz),
[typecheck](m09c-logic-commands-evidence/logic-command-typecheck.log.gz).

| Gate                                       | Actual Brotli | Ceiling | Delta from c7e6013 |
| ------------------------------------------ | ------------: | ------: | -----------------: |
| Builder UI initial (excludes builder-core) |        31,814 |  32,600 |                +34 |
| Builder-core consumer contribution         |         7,419 |   8,300 |               +231 |
| Enabled builder full                       |        75,839 |  76,200 |               +220 |
| Matched no-logic form                      |        29,111 |  29,200 |                  0 |
| Matched opt-in increment                   |         6,318 |   7,000 |                  0 |

[Coherent consumer report](m09c-logic-commands-evidence/logic-command-gates.json.gz). Cost is root-rule
lock protection and localized command subjects; no code moved between gates, no behavior deferred,
no ceiling changed. Compression deltas are non-additive. All lazy budgets remain unchanged.
The corrected frozen `caffeinate -diu node node_modules/pnpm/bin/pnpm.cjs verify` exits **0** on
Node22.22.3/pnpm10.10.0, macOS arm64, Low Power Mode0: **456 units / 76 files / 1,770 browsers /
17 package budgets / all consumer/lazy gates / 16 count checks**. Coverage is **94.43%** overall;
existing core/validation gates remain intact. The final run reproduces exactly the table above.
Before/after fingerprint is identical:
`c7cb385646d1c8bd64048ca9fb3724a49956ae81a2cd5650cc676ee5fd026f9f`.
[Full proof](m09c-logic-commands-evidence/final-verification.json),
[full pinned log](m09c-logic-commands-evidence/logic-command-full-pinned-verify.log.gz),
[final consumer report](m09c-logic-commands-evidence/final-gates.json.gz).
All **71 runtime source files** (schema/core/sdk/components/renderer/validation/form hosts) match
c7e6013's verified source, so its six corrected production edit ratios still apply; no timing retry
or runtime-source claim is inferred for future UI changes. Documentation/proof is finalized after
this frozen run; the non-document index must match its source manifest before commit/push.
New-head first-attempt CI follows push; no result is inferred. New screenshots:
0; changed baselines: 0. The rule editor/map, Build metadata and final delivery remain open.
