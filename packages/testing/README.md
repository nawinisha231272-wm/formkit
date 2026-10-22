# @ourform/testing

Development-only conformance fixture: `createThemeConformance(root, { theme, mode, readOnly, rtl })`
returns engine/session/view and a combined destroy function. `themeNames`, `themeModes` and
`themeConformanceStates` enumerate the M03 matrix. It exercises all five shells, required errors,
description/help/prefix/suffix, disabled and read-only controls, group focus, keyboard paths and CSS isolation.

Run `pnpm test:e2e` for axe and Playwright PNG comparisons. Baselines select platform/architecture and
browser, use CSS pixel
scale and allow 2% differing pixels for OS font rasterization. Inspect actual/diff PNGs on failures;
update snapshots only after reviewing intentional changes. The main playground is separately scanned
in all themes/light+dark. Multi-value, grid and wizard fixtures arrive with those implementations.

The `@ourform/testing/playwright` subpath exports reusable `checkThemeConformance(page, { root?, snapshot? })`
and `checkReadOnlyTheme(page, { root?, snapshot? })` assertions. Use them against the fixture with a
host-owned native Submit button. Playwright 1.56.1 and axe-playwright 4.10.2 are optional peer tools for
this development subpath; the browser fixture entry point imports neither tool. Root browser tests
run these assertions for every theme and color mode, with 60 PNG baselines per platform across three browsers.

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
With themeSelect it runs axe for base/Bootstrap 4/Bootstrap 5/Tailwind/Material; the selector must expose all five shipped themes. Real DOM/React/Angular wrappers use
the same suite; host-specific async/readonly/disabled/lifecycle tests complement it. The shared flow
asserts that email validation is no longer busy and is valid before continuing, so an async error
disappearing cannot move later pointer targets during their activation.

M07: createConformanceEngine installs builtinComponents, including the shipped transparent layouts
and object Container. The onboarding host suite reuses the same 40-value fixture for controlled,
uncontrolled, read-only, summary/reset, all themes, SSR/remount and the offline production-sample gate.

## Component author test kit (M08)

`renderComponent(def,{host,theme,...})` mounts a real single-component form in an empty caller-owned
Element and returns a FormController. Optional node/data/fields/readOnly engine and adapter/nativeHost cover
composites and native controls. Call destroy after each test; host content must be empty initially.
`componentTestEngine(fields)` creates an isolated engine from descriptors.
`checkValueAdapter(adapter,samples)` checks empty recognition and canonical normalize/serialize
round trips. `checkValidation(engine,definition,cases)` checks valid and optional exact error-code
expectations against canonical SDK validation. `checkBuilderRoundTrip(engine,type)` checks palette,
generated label editing and byte-identical undo/redo. Helpers throw on mismatch; no test runner is
required. Every new component needs conformance and visual checks in base, Bootstrap 4, Bootstrap 5
and Tailwind. The component author guide shows the complete workflow.

M08 author correction: `mountComponentBuilder(field,{host,theme?,themes?,engine?})` mounts an empty-host
mini builder with a real palette button, metadata-generated editors and preview. It returns builder,
preview and destroy; repeated destroy is safe. The Playwright subpath exports
`checkPropertyEditors(page,cases,{root?})` and `PropertyEditorCase`: each custom properties.\* editor
needs exactly one `{key,value,verify(preview)}` case. The helper edits the DOM editor and awaits the
observable preview assertion. See apps/docs/component-author-guide.md for full typed numeric/i18n and
required/disabled/top-level-readOnly fixtures. These are author fixtures, not M09's full builder UI.
