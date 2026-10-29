# M09b+ opt-in themes and Settings split — final measurements

Date: 2026-10-26. Branch: `m09b-plus-authoring`.

The accepted option-B implementation keeps PointerDrag, context menu, toolbar More, Issues and all
clipboard behavior initial. Generated Settings UI/styles are lazy and idle-preload by default. The
root builder contains Neutral chrome only; form themes and matching builder recipes are explicit
per-instance registrations. No secondary-tools chunk exists.

## Canonical consumer gates

Command: `node scripts/builder-size-gate.mjs`. Method: esbuild 0.25.12 production consumer build,
minified for ES2022; Brotli through `node:zlib`; static closure only; shared chunks counted once.

| Scope                                  | Brotli bytes |  Ceiling | Result |
| -------------------------------------- | -----------: | -------: | ------ |
| Builder-owned initial                  |       27,484 |   29,000 | PASS   |
| Full minimal initial closure           |       61,049 |   64,613 | PASS   |
| Settings                               |        7,391 |    8,000 | PASS   |
| Logic + JSON + dependency map          |          745 |   28,000 | PASS   |
| Logic + JSON + map + Settings          |        8,136 |   36,000 | PASS   |
| All currently emitted deferred entries |        8,524 | Reported | —      |

The full-initial result remains the primary no-growth gate. Command search and persistent
History/diff remain unresolved and unshipped; neither receives a budget from these numbers.

## Built consumer closures

Command: `node scripts/builder-consumer-report.mjs --write`. The checked-in JSON report records every
file. These totals include host/framework/app code and are therefore supplementary evidence rather
than the canonical 64,613-byte minimal-consumer gate.

| Consumer route         | Raw bytes | Brotli bytes |
| ---------------------- | --------: | -----------: |
| Vite vanilla           |   272,539 |       68,394 |
| Vite React             |   462,734 |      119,273 |
| Angular CLI production |   339,119 |       93,963 |

Generated script-tag bundles use one source graph. Each total includes built-ins and its static
shared chunks once; deferred feature chunks are excluded until activated.

| Script entry                 | Raw bytes | Brotli bytes |
| ---------------------------- | --------: | -----------: |
| Base                         |   232,454 |       64,303 |
| Bootstrap 4                  |   237,440 |       65,596 |
| Bootstrap 5                  |   237,342 |       65,588 |
| Tailwind                     |   236,885 |       65,467 |
| Material (includes Base)     |   237,438 |       65,540 |
| All themes (playground/demo) |   251,977 |       69,452 |

## Runtime evidence

The focused loading matrix passes 51 cases across Chromium, Firefox and WebKit. It covers Vite
vanilla/React, Angular CLI and script-tag hosts; default idle and explicit no-preload Settings;
immediate accessible loading; failure/Retry and Add with defaults; preserved focus/draft/schema/
history; synchronous first Copy before deferred code; local/offline assets; strict CSP; custom
`assetBase`; registered-only lazy themes; theme failure/Retry; and late-result cleanup.

All form/theme source stays shared. The five form themes retain their existing conformance, axe and
visual suites. Compatibility `@ourform/theme-*` entries re-export the same descriptors. Theme choice
is host configuration and does not alter form JSON.
