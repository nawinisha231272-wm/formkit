# 09 — Engineering standards

Status: normative. `pnpm verify` enforces most of these.

| Area          | Standard                                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain     | Node 22 LTS+; pnpm pinned in `packageManager`; TypeScript pinned in root devDependencies; no global tools                                                                                                       |
| TypeScript    | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`; no `any` in public API; no `DOM` lib for schema/core/validation/builder-core                     |
| Module format | ESM only; `exports` map; `sideEffects: false`; `.d.ts` emitted                                                                                                                                                  |
| Builds        | tsup (or Vite library mode) per package; Angular with ng-packagr; `dist/` git-ignored                                                                                                                           |
| Boundaries    | ESLint import rules per `00-architecture.md`; cross-package imports by package name only; no cycles                                                                                                             |
| Unit tests    | Vitest; Node environment for headless packages, happy-dom/jsdom for renderer; ≥ 90% lines in core and validation                                                                                                |
| Fixtures      | `fixtures/forms/*.json` shared by all suites; each fixture has `*.data.json` (good) and `*.invalid.json` (bad) where relevant                                                                                   |
| Conformance   | `@ourform/testing`: core suite, component suite, renderer/host suite, theme suite                                                                                                                               |
| E2E + a11y    | Playwright (Chromium, Firefox, WebKit) on playground and examples; @axe-core/playwright: zero serious/critical                                                                                                  |
| Performance   | `apps/benchmarks`: 100/500/1,000 fields, 100-row grid, rapid typing, dependency fan-out; CI fails on > 20% regression vs stored baseline                                                                        |
| Size          | size-limit budget per package; raising a budget needs an ADR                                                                                                                                                    |
| Security      | No `eval`/`new Function`/`innerHTML` with untrusted text; sanitize Content HTML (allow-list); URLs limited to http, https, mailto, tel; reject prototype-polluting keys; fuzz definitions and expressions (M11) |
| Network       | No package performs network I/O except through host-configured providers                                                                                                                                        |
| i18n          | Message keys with English defaults; RTL in theme suite                                                                                                                                                          |
| Versioning    | Changesets; fixed version across `@ourform/*` until 1.0                                                                                                                                                         |
| Docs          | Package README per package; spec updated with contract changes; ADRs in `docs/adr`                                                                                                                              |
| Git           | Conventional commits; branch per milestone `mNN-slug`; PR body lists acceptance criteria PASS/FAIL                                                                                                              |
| CI            | GitHub Actions: frozen install → lint → typecheck → build → test → e2e → size; bench on main                                                                                                                    |
