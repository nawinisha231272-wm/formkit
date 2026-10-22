/** Workbench geometry follows the approved desktop reference; appearance stays in theme tokens. */
export const workbenchStyle = `
.of-builder{padding:0;border:0;border-radius:var(--ofb-radius-flat);min-block-size:100vh;position:relative}
.of-builder .ofb-header{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;padding:12px 20px;border-block-end:1px solid var(--ofb-border);background:var(--ofb-surface)}
.of-builder .ofb-brand{display:flex;align-items:center;gap:10px;white-space:nowrap}
.of-builder .ofb-brand-mark{display:grid;place-items:center;inline-size:30px;block-size:30px;background:var(--ofb-accent);color:var(--ofb-accent-contrast);border-radius:var(--ofb-radius);font-weight:var(--ofb-font-weight-bold)}
.of-builder .ofb-breadcrumb{display:flex;align-items:center;gap:12px;color:var(--ofb-text-muted)}
.of-builder .ofb-breadcrumb strong{color:var(--ofb-text)}
.of-builder .ofb-header-actions{display:flex;align-items:center;gap:6px;flex-basis:auto;margin-inline-start:auto}
.of-builder .ofb-header>label{display:flex;align-items:center;gap:8px;font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted)}
.of-builder .ofb-header select{font:inherit;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);padding:6px;color:var(--ofb-text);background:var(--ofb-surface)}
.of-builder .ofb-mode-tabs{background:var(--ofb-surface-raised);border:0;border-radius:var(--ofb-radius);padding:3px;gap:0;margin-inline-start:auto}
.of-builder .ofb-mode-tabs>button{border:0;border-radius:var(--ofb-radius);color:var(--ofb-text-muted);padding:6px 14px;background:var(--ofb-transparent)}
.of-builder .ofb-mode-tabs>button[aria-selected=true]{background:var(--ofb-surface);color:var(--ofb-text);box-shadow:var(--ofb-shadow-1)}
.of-builder .of-builder-grid{grid-template-columns:264px minmax(320px,1fr) 280px;gap:0;align-items:stretch;min-block-size:calc(100vh - 100px)}
.of-builder .of-builder-panel{border:0;border-radius:var(--ofb-radius-flat);background:var(--ofb-surface);padding:18px 16px}
.of-builder [data-builder-part=library]{border-inline-end:1px solid var(--ofb-border)}
.of-builder [data-builder-part=library]>h2{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}
.of-builder [data-builder-part=library]>label{display:grid;gap:6px;font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted)}
.of-builder .of-builder-palette{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-block-size:calc(100vh - 180px);padding:2px;gap:6px;margin-block-start:12px}
.of-builder .of-builder-palette h3{grid-column:1/-1;text-transform:uppercase;letter-spacing:.03em;font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted);margin:14px 0 4px}
.of-builder .of-builder-palette button{font-size:var(--ofb-font-size-small);white-space:normal;justify-content:flex-start;min-block-size:38px}
.of-builder [data-builder-part=canvas-panel]{background:var(--ofb-canvas);padding:24px;overflow:auto;max-block-size:calc(100vh - 100px)}
.of-builder [data-builder-part=canvas-panel]>h2{font-size:var(--ofb-font-size-small);font-weight:var(--ofb-font-weight);color:var(--ofb-text-muted);margin-block-end:18px}
.of-builder [data-builder-part=canvas-panel]>p{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}
.of-builder .of-builder-canvas{background:var(--ofb-surface);border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);box-shadow:var(--ofb-shadow-1);padding:32px;min-block-size:400px}
.of-builder .of-builder-inspector{border-inline-start:1px solid var(--ofb-border);grid-column:auto}
.of-builder .of-builder-inspector>h2{display:none}
.of-builder .of-builder-inspector>h3{font-size:var(--ofb-font-size);margin:0 0 12px;border-block-end:1px solid var(--ofb-border);padding-block-end:12px}
.of-builder .of-builder-outline{margin:0;max-block-size:55vh}
.of-builder .of-builder-toolbar{margin-block-start:20px;gap:6px;align-items:center}
.of-builder .of-builder-toolbar button{font-size:var(--ofb-font-size-small)}
.of-builder .of-builder-toolbar label{font-size:var(--ofb-font-size-small);inline-size:100%}
.of-builder .of-builder-toolbar select{max-inline-size:100%}
.of-builder .of-builder-bottom{display:block;margin:0;padding:24px;min-block-size:calc(100vh - 100px)}
.of-builder .of-builder-bottom>.of-builder-panel{max-inline-size:960px;margin:auto;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);padding:24px}
.of-builder .ofb-data-panel{max-inline-size:960px;margin:auto;padding:24px;border:1px solid var(--ofb-border);background:var(--ofb-surface);border-radius:var(--ofb-radius-panel)}
.of-builder .ofb-data-panel pre{white-space:pre-wrap;overflow:auto}
.of-builder .of-builder-status:empty{display:none}
.of-builder .of-builder-status{position:fixed;inset:auto 24px 20px auto;z-index:60;max-inline-size:min(600px,90vw);padding:10px 16px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);color:var(--ofb-text);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-2)}
@media(max-width:1100px){.of-builder .of-builder-grid{grid-template-columns:210px minmax(280px,1fr) 230px}.of-builder [data-builder-part=canvas-panel]{padding:16px}.of-builder .of-builder-canvas{padding:20px}.of-builder .ofb-header{gap:10px}}
@media(max-width:767px){.of-builder .ofb-header{padding:10px}.of-builder .ofb-breadcrumb,.of-builder .ofb-header>label{display:none}.of-builder .of-builder-bottom{padding:12px}.of-builder .ofb-mode-tabs{margin:0}.of-builder .ofb-mode-tabs>button{padding:6px 8px}}

.of-builder .ofb-mini-palette{position:absolute;z-index:40;inline-size:280px;padding:12px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-2)}
.of-builder .ofb-mini-palette>div{display:grid;gap:6px;max-block-size:300px;overflow:auto;margin-block-start:8px}
.of-builder .ofb-mini-palette button{justify-content:start}

.of-builder .of-builder-inspector{padding:0 16px 20px}
.of-builder .of-builder-inspector>[data-ofb-primitive="Tabs"]{gap:0;overflow:visible;margin-block-end:18px}
.of-builder .of-builder-inspector>[data-ofb-primitive="Tabs"]>button{padding:12px 7px;font-size:var(--ofb-font-size-small)}
.of-builder .ofb-sidebar-panel{min-block-size:180px}
.of-builder .ofb-sidebar-history{margin:0;padding-inline-start:20px;color:var(--ofb-text-muted);line-height:2}
.of-builder .ofb-sidebar-issues{display:grid;gap:8px}
.of-builder .ofb-sidebar-issues button{white-space:normal;text-align:start}
.of-builder .ofb-component-info{margin-block-start:24px;border-block-start:1px solid var(--ofb-border);padding-block-start:16px}
.of-builder .ofb-component-info h3{margin:0 0 4px;font-size:var(--ofb-font-size)}
.of-builder .ofb-component-info small{display:block;color:var(--ofb-text-muted);font-size:var(--ofb-font-size-small)}
.of-builder .ofb-component-info dl{display:grid;grid-template-columns:76px minmax(0,1fr);gap:8px;font-size:var(--ofb-font-size-small);margin:14px 0}
.of-builder .ofb-component-info dt{color:var(--ofb-text-muted)}
.of-builder .ofb-component-info dd{margin:0;overflow-wrap:anywhere}
.of-builder .ofb-info-actions{display:flex;gap:6px;flex-wrap:wrap;margin-block-end:12px}
.of-builder .ofb-info-actions button{font-size:var(--ofb-font-size-small)}

.of-builder .ofb-header-menu{position:relative;flex-shrink:0}
.of-builder .ofb-header-menu>summary{display:flex;align-items:center;justify-content:center;list-style:none;cursor:pointer;min-block-size:var(--ofb-control-height);inline-size:var(--ofb-control-height);border:1px solid var(--ofb-border);border-radius:var(--ofb-radius)}
.of-builder .ofb-header-preferences{position:absolute;inset-block-start:100%;inset-inline-end:0;z-index:50;inline-size:300px;padding:16px;display:grid;gap:12px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-2)}
.of-builder .ofb-header-preferences label{display:grid;gap:4px}
.of-builder .ofb-header-preferences .of-builder-toolbar{margin:0}
@media(min-width:1280px){
.of-builder .ofb-header{flex-wrap:nowrap;gap:8px;padding:12px}
.of-builder .ofb-breadcrumb{min-inline-size:0;gap:6px;flex:1}
.of-builder .ofb-breadcrumb strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-inline-size:130px}
.of-builder .ofb-mode-tabs{margin-inline-start:0;flex-shrink:0}
.of-builder .ofb-mode-tabs>button{padding-inline:8px}
.of-builder .ofb-header>label{flex-shrink:0;gap:4px}
.of-builder .ofb-header>label select{max-inline-size:116px}
.of-builder .ofb-header-actions{flex-shrink:0;margin-inline-start:auto;gap:4px}
.of-builder .ofb-header-actions button{padding-inline:8px;font-size:var(--ofb-font-size-small)}
}
`;

// Owner review: keep desktop actions on the right; preferences/destinations live in More.
