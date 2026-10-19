# ADR-0005 — Shell and theme registration

M03 uses the renderer's explicit, per-mount view map alongside the engine. The core engine
continues to own only headless models. `mount(root, session, { engine, views, themes?, theme? })`
checks that the session's registered models belong to that engine. `defineField().views` now
carries the shell hint, so existing view-map composition preserves shell selection. No global
view or theme registry is introduced. Native adapter selection remains M04 work.

The renderer imports the base theme so `mount` has a useful default; its legacy wrapper also imports
the other two shipped presets to preserve the M02 theme-name API.
This is a narrow amendment to the import table: renderer-dom → theme-\* presets → SDK **types only**
introduces no runtime cycle. Other installed themes are host-supplied, with duplicate names,
missing parents and inheritance cycles rejected. Hosts own custom CSS; each theme selector must
use `.of-root`, which the renderer rewrites to its mount-specific selector. Tokens reject CSS
rule/HTML delimiters, and static SSR rejects closing style tags. Theme CSS is trusted application
code, never form-definition data.

Theme resolution is base, inherited installed theme(s), application, form, component; each layer's
selected mode follows its light tokens. Classes merge by variant/part. Presentation (`help`,
`prefix`, `suffix`, a cell's combined column/row `cellLabel`) and overrides are mount options,
not new schema properties. Cell names require host context; absent that, the field label is used.

New mounts generate unique control ids. Explicit `idPrefix` supports host-owned ids; static SSR
requires distinct prefixes when multiple forms share a document. The M02 `renderForm` compatibility
wrapper retains raw ids and accepts base by default; the three shipped names remain supported. New integrations register other presets through `mount`.
It should be replaced in new integrations. SSR and DOM share the same shell generator.

`view.submit()` (also used by bubbling native submit events within the mount root) wraps headless
submission and shows/focuses a summary on failure. Calling `session.submit()` directly remains
headless and does not imply a renderer UI action. One polite live region announces validation
changes; errors themselves are not additional live regions. Custom `t` translates shell messages.
Focus first uses `focusRef`, falling back to the group's first enabled interactive descendant.
Group required state is announced in the legend; aria-required is omitted on the unsupported group role.

The conformance package covers features implemented through M03. Multi-value controls, grids and
wizard navigation cannot be tested as real controls until their own milestones; no placeholder
implementations or passing claims are added for them.

The development-only testing package exposes its Playwright/axe assertions through a separate
`/playwright` entry point with optional, pinned peer tools. Browser fixture consumers do not import
Node tooling. Bootstrap 5.3.8 is a pinned development dependency for stylesheet coexistence checks;
no external production runtime dependency was added. Its transitions are awaited in hover assertions.
