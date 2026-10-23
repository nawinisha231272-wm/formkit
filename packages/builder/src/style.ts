// Chrome selectors deliberately exclude rendered form controls.
export const builderStyle = `
.of-builder-chrome button,.of-builder-handle,.of-builder-drop{font:inherit;color:var(--ofb-text);background:var(--ofb-surface);border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);min-block-size:34px;padding:6px 10px;cursor:pointer}
.of-builder-chrome button:hover,.of-builder-handle:hover{background:var(--ofb-accent-soft);border-color:var(--ofb-accent)}
.of-builder-chrome button:disabled{opacity:.55;cursor:not-allowed}
.of-builder-chrome input,.of-builder-chrome select,.of-builder-chrome textarea{font:inherit;color:var(--ofb-text);background:var(--ofb-surface);border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);padding:7px;max-inline-size:100%}
.of-builder-chrome input:not([type=checkbox]),.of-builder-chrome textarea{inline-size:100%}
.of-builder-chrome :focus-visible,.of-builder-handle:focus-visible,.of-builder-drop:focus-visible{outline:3px solid var(--ofb-accent);outline-offset:2px}
.of-builder-toolbar{display:flex;flex-wrap:wrap}
.of-builder .of-sr-only{position:absolute!important;inline-size:1px;block-size:1px!important;min-block-size:0!important;max-block-size:1px!important;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.of-builder-grid{display:grid}
.of-builder-panel{min-inline-size:0}
.of-builder-panel>h2{font-size:var(--ofb-font-size-title);margin:0 0 12px}.of-builder-panel>h3{font-size:var(--ofb-font-size);margin-block:14px 6px}
.of-builder-palette{overflow:auto}

.of-builder-palette button{text-align:start}
.of-builder-outline{overflow:auto}.of-builder-outline ul{list-style:none;padding-inline-start:16px;margin:0}
.of-builder-outline>[role=tree]{padding:0}.of-builder-outline [role=treeitem]{padding:4px;border-radius:var(--ofb-radius);cursor:pointer;outline-offset:-2px}
.of-builder-outline [role=treeitem][aria-selected=true]>.of-builder-tree-name{color:var(--ofb-accent);background:var(--ofb-accent-soft);font-weight:var(--ofb-font-weight-bold)}
.of-builder-outline [role=treeitem][data-cut=true]>.of-builder-tree-name{opacity:.55}.of-builder-tree-name{display:block;padding:4px;border-radius:var(--ofb-radius);overflow-wrap:anywhere}
.of-builder-property{display:grid;gap:4px;margin-block:8px}
.of-builder-expression{margin-block:8px}.of-builder-expression fieldset{margin:8px 0}.of-builder-expression label{display:grid;gap:4px;margin-block:6px}

.of-builder-json{inline-size:100%;min-block-size:250px;font:var(--ofb-font-size-code)/1.5 var(--ofb-font-family-code)!important;resize:vertical}
.of-builder-patch,.of-builder-result{white-space:pre-wrap;overflow-wrap:anywhere;max-block-size:250px;overflow:auto;font:var(--ofb-font-size-code)/1.5 var(--ofb-font-family-code)}
.of-builder-canvas{overflow-wrap:anywhere}.of-builder-canvas [data-of-design-node]{position:relative;margin-block-end:12px}
.of-builder-canvas [data-of-selected=true]{outline:2px solid var(--ofb-accent);outline-offset:3px}
.of-builder-canvas .of-columns>.of-builder-handle,.of-builder-canvas .of-columns>.of-builder-drop{grid-column:1/-1}

.of-builder-drop{display:block;inline-size:100%;min-block-size:28px;font-size:var(--ofb-font-size-small);border-style:dashed;color:var(--ofb-text-muted);margin-block:6px;background:var(--ofb-surface-raised)}
.of-builder-drop[aria-pressed=true]{border:2px solid var(--ofb-accent);background:var(--ofb-accent-soft)}
.of-builder-cut{opacity:.65}
@media(forced-colors:active){.of-builder-handle[aria-pressed=true],.of-builder-drop[aria-pressed=true]{outline:2px solid var(--ofb-focus-ring)}}
`;
