# AGENTS.md — OurForm

OurForm (placeholder name) is a self-hosted, commercially licensed JavaScript form SDK:
JSON form definitions, a headless engine, a portable renderer, Angular/React/Web Component
adapters, multiple themes, a visual builder, and a custom-component SDK where authors write
only the control. Customers run everything on their own infrastructure. We never host forms
and never receive customer data.

This file holds the rules. The detail lives in `docs/`. Read before you change anything:

1. `docs/spec/00-architecture.md` — layers, packages, dependency rules
2. The spec file(s) for the area you touch (`docs/spec/01…09`)
3. The milestone file you were asked to build (`docs/milestones/MNN.md`)
4. `docs/progress.md` — what is done, deviations, open issues

`docs/spec/*` is authoritative. If code disagrees with the spec, the spec wins unless an ADR in
`docs/adr/` says otherwise. If the spec is ambiguous or wrong, stop and record the question in
`docs/progress.md` under "Open questions" instead of guessing at a contract.

## Non-negotiable architecture rules

- Dependencies point one way: `schema` ← `core` ← `validation`; `core` ← `sdk` ← `components`;
  `sdk` ← `renderer-dom` ← `element` / `react` / `angular` ← `apps`. Themes depend on `sdk` types only.
  `builder-core` depends on `schema`, `core`, `sdk`; `builder` adds `renderer-dom`.
- `schema`, `core`, `validation`, `builder-core` never import DOM types, browser globals, React,
  Angular, Vue or CSS frameworks. Their tsconfig `lib` has no `DOM`.
- Packages import each other only as `@ourform/<name>`, never by relative path. No import cycles.
- Each package's public API is exactly what `src/index.ts` exports. No default exports.
- Registries are per engine instance. No global mutable registries. Conflicting registrations throw.
- Components are composition, not inheritance: a headless `ComponentModel` (core) plus views
  (renderer). A basic custom field author writes only the control.
- The builder property panel is generated from `properties` metadata. Never hand-write edit forms
  for built-in components.
- Expressions are data (`docs/spec/03-expressions.md`). Never use `eval`, `new Function`,
  `with`, or string-to-code. Never write to `__proto__`, `constructor` or `prototype` paths.
- Components reference each other by stable `id`; data is addressed by parsed paths; repeater rows
  by stable `rowId`, never by index.
- The renderer updates only fields named in a `StatePatch`. Never re-create a focused control.
  Never run whole-form validation to render one field.
- No package makes network calls on its own. Only host-configured providers (data sources, file
  storage) may. Licensing is offline and never blocks rendering.
- All user-facing strings are message keys with English defaults.
- Accessibility is part of "done": labels, `aria-describedby`, `aria-invalid`, `aria-required`,
  keyboard paths, focus management. axe must report no serious or critical issues.

## Toolchain and commands

- Node 22 LTS or newer; pnpm (pinned via `packageManager`); TypeScript pinned in devDependencies.
- Never rely on globally installed tools. Never commit `dist/`, coverage or build output.

| Command          | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `pnpm install`   | Install with the lockfile                                      |
| `pnpm build`     | Build every package (Turbo)                                    |
| `pnpm typecheck` | `tsc --noEmit` everywhere                                      |
| `pnpm lint`      | ESLint (incl. boundary rules) + Prettier check                 |
| `pnpm test`      | Vitest unit + conformance                                      |
| `pnpm test:e2e`  | Playwright + axe on playground and examples                    |
| `pnpm size`      | Bundle-size budgets                                            |
| `pnpm verify`    | All of the above. Must pass before you say a milestone is done |
| `pnpm dev`       | Playground                                                     |

Until M0 is complete these commands may not exist yet; M0 creates them.

## Coding conventions

- TypeScript strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`. No `any` in public types; use `unknown` and narrow.
- Files `kebab-case.ts`, types `PascalCase`, functions `camelCase`. One concept per file.
- Pure functions in core where possible. Side effects only in session, renderer and adapters.
- Errors from user input (form definitions, submissions) are returned as diagnostics, not thrown.
  Programmer errors (duplicate registration, wrong API use) throw with a clear message.
- Every public function has tests. Core and validation keep ≥ 90% line coverage.
- Shared JSON fixtures live in `fixtures/forms/`. Reuse them across core, renderer and adapter tests.
- Public API changes need: updated package README, a changeset, and the spec updated in the
  same change. Contract decisions need an ADR (`docs/adr/NNNN-title.md`).

## How to work on a milestone

1. Read the files listed at the top of this document, plus the milestone file.
2. Append a short plan for the milestone to `docs/progress.md` (tasks in order, risks).
3. Work on branch `mNN-<short-slug>`. Use conventional commits.
4. Implement in small steps; keep `pnpm verify` green as you go.
5. Add or update a playground demo for every user-visible feature.
6. When done, update `docs/progress.md`: what was built, every acceptance criterion with
   PASS/FAIL and evidence (test name or command), deviations from spec, open questions.
7. Open a PR (or produce a summary if you cannot) titled `MNN: <milestone name>` whose body
   repeats the acceptance checklist.
8. Stop. Do not start the next milestone unless explicitly asked.

Gate milestones (M5, M7, M8, M12): also write the gate report the milestone file asks for, and
stop for human review even if every criterion passes.

## Never

- Never weaken, skip or delete a test to make it pass. Fix the code or record the problem.
- Never mark an acceptance criterion PASS without a test or a reproducible check behind it.
- Never add a runtime dependency without noting why in the PR; prefer zero-dependency core packages.
- Never add telemetry, analytics or any call home.
- Never implement features from later milestones "while you are there".
