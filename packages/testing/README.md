# @ourform/testing

Development-only conformance fixture: `createThemeConformance(root, { theme, mode, readOnly, rtl })`
returns engine/session/view and a combined destroy function. `themeNames`, `themeModes` and
`themeConformanceStates` enumerate the M03 matrix. It exercises all five shells, required errors,
description/help/prefix/suffix, disabled and read-only controls, group focus, keyboard paths and CSS isolation.

Run `pnpm test:e2e` for axe and Playwright PNG comparisons. Baselines are per browser, use CSS pixel
scale and allow 2% differing pixels for OS font rasterization. Inspect actual/diff PNGs on failures;
update snapshots only after reviewing intentional changes. The main playground is separately scanned
in all themes/light+dark. Multi-value, grid and wizard fixtures arrive with those implementations.

The `@ourform/testing/playwright` subpath exports reusable `checkThemeConformance(page, { root?, snapshot? })`
and `checkReadOnlyTheme(page, { root?, snapshot? })` assertions. Use them against the fixture with a
host-owned native Submit button. Playwright 1.56.1 and axe-playwright 4.10.2 are optional peer tools for
this development subpath; the browser fixture entry point imports neither tool. Root browser tests
run these assertions for every theme and color mode, with 39 reviewed PNG baselines across three browsers.

The optional playground `?bootstrap` probe loads the real pinned Bootstrap 5.3.8 stylesheet.
Its three browser snapshots verify coexistence; normal snapshots verify the compiled fallback alone.

M04 adds checkHostConformance(samples) to the Playwright entry point. It compares full submissions,
validation errors and normalized accessible-control semantics. tests/e2e/hosts.spec.ts drives the same
fixtures/forms/native/host-feedback.json in vanilla, React, Angular 22 and Angular 21 examples, then
compares the samples. Custom-native fixtures are separated from core-only fixtures because they require
host registrations. Those original core fixture checks remain unchanged.

M05 adds bootstrap4 to themeNames and the conformance factory alongside bootstrap5, base and tailwind. Both Bootstrap versions have independent real-stylesheet browser checks.

M06 exports createConformanceEngine(options?) for Node/browser fixture checks (all built-ins plus the
existing headless object/transparent test scopes). The Playwright entry exports checkComponentConformance
(page, {root?, result?, themeSelect?}), covering Tier 1 values, errors/ARIA, hidden data, submission and axe.
With themeSelect it runs axe for base/Bootstrap 4/Bootstrap 5/Tailwind. Real DOM/React/Angular wrappers use
the same suite; host-specific async/readonly/disabled/lifecycle tests complement it.
