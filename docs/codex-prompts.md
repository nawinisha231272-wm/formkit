# Codex prompts for OurForm

Use these with OpenAI Codex (cloud task or CLI) on the repository that contains `AGENTS.md`,
`docs/spec/` and `docs/milestones/`. Codex reads `AGENTS.md` automatically; the prompts point it
at the right milestone and tell it when to stop.

Recommended: run one milestone per task (Prompt 2), review, merge, repeat.
Prompt 4 runs the whole project in one long session and stops at each gate.

---

## Prompt 1 — Kickoff (run once, builds M00)

```text
You are the lead engineer building OurForm, a self-hosted, commercially licensed JavaScript form SDK
(JSON form definitions, headless engine, portable renderer, Angular/React/Web Component adapters,
multiple themes, a visual builder, and a custom-component SDK where authors write only the control).

This repository currently contains a Phase 0 starter kit plus the full specification.

Before writing any code:
1. Read AGENTS.md completely and follow it for the whole task.
2. Read docs/spec/README.md, docs/spec/00-architecture.md and docs/spec/09-standards.md.
3. Read docs/milestones/M00.md. That milestone is your entire scope for this task.
4. Read every file under packages/, apps/, tests/ and scripts/ so you understand the starter kit.
5. Read docs/progress.md, including the nine known starter-kit issues it references.

Then:
6. Append your plan for M00 to docs/progress.md (ordered tasks, risks, anything in the spec you
   find ambiguous). If an ambiguity would change a public contract, record it under
   "Open questions" and choose the option the spec implies; do not invent new contracts.
7. Create branch m00-workspace. Implement every M00 task. Keep behaviour identical to the starter
   kit; this milestone is restructuring, tooling and CI, not features.
8. Pin every tool as a devDependency (pnpm via packageManager, TypeScript, tsup, Vitest,
   Playwright, ESLint, Prettier, size-limit, Changesets, Turbo). Do not rely on globally installed tools.
9. Run `pnpm install` and `pnpm verify` until they pass from a clean state (delete node_modules,
   dist and .turbo, then re-run once to prove it).
10. Update docs/progress.md: what you built, each M00 acceptance criterion as PASS or FAIL with the
    test name or command that proves it, deviations from the spec, open questions.
11. Commit with conventional commits and open a pull request titled "M00: Workspace foundation"
    whose body repeats the acceptance checklist with PASS/FAIL.

Rules:
- Do not start M01 or implement anything from later milestones.
- Never weaken or delete a test to make it pass.
- Never mark a criterion PASS without evidence.
- If you cannot finish, stop, leave the branch in a building state, and list what remains in
  docs/progress.md.

Finish with a short summary: what changed, how to run it, criteria status, open questions.
```

---

## Prompt 2 — Next milestone (reuse for M01 … M12)

Replace `MNN` (e.g. `M03`) before sending.

```text
Continue building OurForm. Your scope for this task is milestone MNN only.

1. Read AGENTS.md and follow it.
2. Read docs/progress.md (current state, open questions, previous milestone notes) and
   docs/milestones/MNN.md.
3. Read every spec file listed under "Read first" in MNN.md, plus docs/spec/00-architecture.md.
4. Inspect the existing code in the packages you will touch before changing them.
5. Append your plan for MNN to docs/progress.md. If anything in the spec is ambiguous or conflicts
   with existing code, record it under "Open questions". The spec wins over code unless an ADR
   says otherwise; if a contract must change, write an ADR in docs/adr/ and update the spec file in
   the same commit, and explain why in the PR.
6. Create branch from main named as shown in MNN.md. Implement every task in MNN.md.
7. Add or update a playground demo for each user-visible feature, and tests for every public API.
8. Run `pnpm verify` until it passes.
9. Update docs/progress.md with each acceptance criterion as PASS/FAIL plus evidence (test name or
   command), deviations, and open questions. Set "Next milestone" to the following one.
10. Commit with conventional commits and open a pull request titled "MNN: <milestone name>" whose
    body repeats the acceptance checklist.
11. If MNN is a gate milestone (M05, M07, M08, M12), also write the gate report the milestone
    file asks for and state a clear go / no-go recommendation.

Do not implement later milestones. Do not weaken tests. Do not mark anything PASS without evidence.
Stop when MNN is done and summarise: what changed, how to try it, criteria status, open questions.
```

---

## Prompt 3 — Apply review feedback

```text
Apply the review feedback below to the open pull request for milestone MNN.

1. Read AGENTS.md, docs/milestones/MNN.md and the latest docs/progress.md entry.
2. For each feedback item: make the change, add or adjust tests, and note it in docs/progress.md
   under the MNN entry ("Review fixes").
3. If an item conflicts with the spec, do not silently pick one: explain the conflict in
   docs/progress.md and implement the spec unless the feedback explicitly says to change the spec
   (then update the spec file and add an ADR).
4. Run `pnpm verify` until it passes, push to the same branch, and update the PR checklist.

Feedback:
<paste your review comments here>
```

---

## Prompt 4 — Whole project in one long session (optional)

Use only with Codex CLI or a long-running task and a reviewer checking in at each gate.

```text
You are the lead engineer building OurForm from the starter kit in this repository to its 1.0
release, following the specification exactly.

Read AGENTS.md first and follow it throughout. The plan is docs/milestones/M00.md through
M12.md, executed strictly in order. For each milestone:

1. Read docs/progress.md, the milestone file, and the spec files it lists.
2. Append your plan to docs/progress.md.
3. Create the milestone branch from the current main, implement every task, add tests and a
   playground demo, and run `pnpm verify` until it passes.
4. Record every acceptance criterion as PASS/FAIL with evidence, plus deviations and open questions.
5. Commit, open a PR titled "MNN: <name>", and merge it into main only if every acceptance
   criterion is PASS and `pnpm verify` is green on the merge result.
6. Continue with the next milestone.

Stop and wait for human input when any of these happens:
- You finish a gate milestone (M05, M07, M08, M12). Write the gate report, give a go/no-go
  recommendation, and do not start the next milestone until told to continue.
- An acceptance criterion cannot pass without changing a public contract in docs/spec.
- An open question in docs/progress.md blocks the current milestone.
- `pnpm verify` cannot be made green within reasonable effort.

Never implement work from a later milestone early, never weaken tests, never mark PASS without
evidence, never add network calls, telemetry or schema-executed JavaScript.

When you stop, summarise: milestones completed, current branch and state, criteria status, the
decision you need from me.
```
