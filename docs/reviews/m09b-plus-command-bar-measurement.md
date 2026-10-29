# M09b+ command bar — budget measurement proposal

Date: 2026-10-27. Baseline commit: `c9457cd49a32c9cbbc237a9c20d14caf6f638aa9`.

This is a measurement-only probe. The temporary implementation was removed after the measurements;
the pushed branch contains no command-bar product code. The prototype included the immediate
accessible dialog/loading frame, Ctrl/Cmd+K scoping, failure/Retry through the shared feature outlet,
focus restoration, grouped Add/Jump/Action search, disabled reasons and keyboard filtering/navigation.

Method: the normal `@ourform/builder` tsup graph followed by `node scripts/builder-size-gate.mjs`.
The size gate uses an esbuild 0.25.12 production consumer build, ES2022 minification and `node:zlib`
Brotli. Shared chunks are counted once per closure.

## Measurements

The shipped checkpoint baseline is 28,767 builder-owned initial, 63,487 full initial and 12,019
across all emitted deferred entries.

| Design                                   | Builder initial | Delta | Full initial | Delta | Command closure | All deferred | Gate result         |
| ---------------------------------------- | --------------: | ----: | -----------: | ----: | --------------: | -----------: | ------------------- |
| Search index built in initial activation |          29,102 |  +335 |       63,830 |  +343 |           3,512 |       12,593 | FAIL initial by 102 |
| Search index built in lazy module        |          29,044 |  +277 |       63,753 |  +266 |           4,218 |       13,299 | FAIL initial by 44  |

For lazy indexing, the 4,218-byte command closure comprises the 2,901-byte shared primitive chunk,
a 422-byte shared palette/title chunk and 895 command-specific bytes. The full initial closure stays
860 bytes below its unchanged 64,613 ceiling. The builder-owned initial ceiling remains 29,000.

## Proposal

Approve **4,500 Brotli bytes** as the command-bar consumer closure ceiling. Use lazy indexing and
compact at least 45 bytes from normal initial code before shipping; target 28,800 or lower when
practical to retain room for multi-select. Do not defer any owner-protected initial behavior and do
not raise either initial ceiling.

The measured alternative would approve a 3,750-byte command closure and compact at least 103 initial
bytes. It makes palette/jump/action indexing part of startup and leaves less room for the remaining
milestone, so it is not recommended.

History/diff has no budget from this proposal. Multi-select and its lazy bulk editor are not included
in these measurements. Both remain unshipped.
