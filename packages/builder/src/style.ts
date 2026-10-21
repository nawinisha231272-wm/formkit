// Chrome selectors deliberately exclude rendered form controls.
export const builderStyle = `
.of-builder{color:#17232b;background:#f5f7fa;font:14px/1.45 system-ui,sans-serif;box-sizing:border-box;border:1px solid #c6ced8;border-radius:8px;padding:16px}
.of-builder *{box-sizing:border-box}.of-builder [hidden]{display:none!important}
.of-builder-chrome button,.of-builder-handle,.of-builder-drop{font:inherit;color:#17232b;background:#fff;border:1px solid #778498;border-radius:4px;min-block-size:34px;padding:6px 10px;cursor:pointer}
.of-builder-chrome button:hover,.of-builder-handle:hover{background:#edf3ff;border-color:#174fbc}
.of-builder-chrome button:disabled{opacity:.55;cursor:not-allowed}
.of-builder-chrome input,.of-builder-chrome select,.of-builder-chrome textarea{font:inherit;color:#17232b;background:#fff;border:1px solid #778498;border-radius:4px;padding:7px;max-inline-size:100%}
.of-builder-chrome input:not([type=checkbox]),.of-builder-chrome textarea{inline-size:100%}
.of-builder-chrome :focus-visible,.of-builder-handle:focus-visible,.of-builder-drop:focus-visible{outline:3px solid #174fbc;outline-offset:2px}
.of-builder-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin-block-end:12px}
.of-builder-toolbar label{display:grid;gap:3px}.of-builder-status{min-block-size:24px;color:#8c1320;overflow-wrap:anywhere;margin-block:8px}
.of-builder-grid{display:grid;grid-template-columns:200px minmax(280px,1fr) 290px;gap:12px;align-items:start}
.of-builder-panel{min-inline-size:0;background:#fff;border:1px solid #c6ced8;border-radius:6px;padding:12px}
.of-builder-panel>h2{font-size:16px;margin:0 0 12px}.of-builder-panel>h3{font-size:14px;margin-block:14px 6px}
.of-builder-palette{max-block-size:70vh;overflow:auto;display:grid;gap:6px;padding:3px}
.of-builder-palette button,.of-builder-handle{position:relative}
.of-builder-drag-surface{position:absolute;inset:0}
.of-builder-palette h3{font-size:13px;margin:10px 0 2px}.of-builder-palette button{text-align:start}
.of-builder-outline{max-block-size:45vh;overflow:auto;margin-block-start:12px}.of-builder-outline ul{list-style:none;padding-inline-start:16px;margin:0}
.of-builder-outline>[role=tree]{padding:0}.of-builder-outline [role=treeitem]{padding:4px;border-radius:3px;cursor:pointer;outline-offset:-2px}
.of-builder-outline [role=treeitem][aria-selected=true]>.of-builder-tree-name{color:#103d92;background:#e8f0ff;font-weight:600}
.of-builder-outline [role=treeitem][data-cut=true]>.of-builder-tree-name{opacity:.55}.of-builder-tree-name{display:block;padding:4px;border-radius:3px;overflow-wrap:anywhere}
.of-builder-property{display:grid;gap:4px;margin-block:8px}.of-builder-properties fieldset{min-inline-size:0;border:1px solid #c6ced8;margin:0 0 10px;padding:10px}.of-builder-properties legend{font-weight:600;padding:0 4px}
.of-builder-expression{margin-block:8px}.of-builder-expression fieldset{margin:8px 0}.of-builder-expression label{display:grid;gap:4px;margin-block:6px}
.of-builder-bottom{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-block-start:12px}
.of-builder-json{inline-size:100%;min-block-size:250px;font:12px/1.5 ui-monospace,monospace!important;resize:vertical}
.of-builder-patch,.of-builder-result{white-space:pre-wrap;overflow-wrap:anywhere;max-block-size:250px;overflow:auto;font:12px/1.5 ui-monospace,monospace}
.of-builder-canvas{min-block-size:180px;overflow-wrap:anywhere}.of-builder-canvas [data-of-design-node]{position:relative;margin-block-end:12px}
.of-builder-canvas [data-of-selected=true]{outline:2px solid #174fbc;outline-offset:3px}
.of-builder-canvas .of-columns>.of-builder-handle,.of-builder-canvas .of-columns>.of-builder-drop{grid-column:1/-1}
.of-builder-handle{display:block;font-size:12px;margin-block:0 8px;padding:3px 7px;min-block-size:28px;background:#edf3ff}
.of-builder-handle[aria-pressed=true]{background:#174fbc;color:#fff}.of-builder-drop{display:block;inline-size:100%;min-block-size:28px;font-size:12px;border-style:dashed;color:#344760;margin-block:6px;background:#f8faff}
.of-builder-drop[aria-pressed=true],.of-builder-drop[data-drop-active=true]{border:2px solid #174fbc;background:#e8f0ff}
.of-builder-drop[data-drop-refused=true]{border-color:#b21b2b;background:#fff0f1}.of-builder-cut{opacity:.65}
@media(max-width:1000px){.of-builder-grid{grid-template-columns:180px minmax(0,1fr)}.of-builder-inspector{grid-column:1/-1}.of-builder-properties{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media(max-width:640px){.of-builder{padding:10px}.of-builder-grid,.of-builder-bottom,.of-builder-properties{display:block}.of-builder-panel{margin-block-end:10px}.of-builder-palette{max-block-size:240px}.of-builder-outline{max-block-size:220px}.of-builder-toolbar>*{max-inline-size:100%}}
@media(forced-colors:active){.of-builder-handle[aria-pressed=true],.of-builder-drop[aria-pressed=true]{outline:2px solid Highlight}}
`;
