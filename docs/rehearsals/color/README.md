# Color rehearsal source

AI-assisted only; not independent human M08 gate evidence. The component accepts a hex string,
shows a sanitized swatch, and declares placeholder/showSwatch metadata. Required/pattern rules
belong to the host fixture, as in the guide's numeric example. No read-only/disabled control wrapper
or manual restoration is used.

Use the component author guide with name `acme-color`, then replace the generated files:

| Archived file         | Generated project destination |
| --------------------- | ----------------------------- |
| component.ts.txt      | src/index.ts                  |
| preview.ts.txt        | preview.ts                    |
| component.test.ts.txt | tests/component.test.ts       |
| component.spec.ts.txt | browser/component.spec.ts     |

Keep the generated test/config/package files; install with the pinned tools and run `pnpm verify`,
`pnpm visual:record`, then `pnpm visual:linux:record`. These record commands require initially empty
platform baseline directories, record and then compare, and refuse to replace existing PNGs.
Use `pnpm visual:check` / `pnpm visual:linux:check` for subsequent comparison.

The source archives retain exact physical lines; they are not additional shipped library controls.
`initial-steps.json` preserves the first style type error, the corrected native verification and the
Linux local-kit path failure. The final proof records the newly generated project after the pushed
CLI correction. See the parent rehearsal report for complete results and remaining limitations.
