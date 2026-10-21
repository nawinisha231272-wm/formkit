export const settingsStyle = `
.of-builder .ofb-settings-header{display:flex;align-items:start;justify-content:space-between;gap:16px;padding:20px 24px 12px}
.of-builder .ofb-settings-header h2{font-size:var(--ofb-font-size-title);font-weight:var(--ofb-font-weight-bold);margin:0}
.of-builder .ofb-settings-header small,.of-builder .ofb-muted{font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted)}
.of-builder .ofb-settings>[data-ofb-primitive="Tabs"]{padding-inline:24px}
.of-builder .ofb-settings-body{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:24px;padding:24px}
.of-builder .ofb-settings-editors{min-inline-size:0;max-block-size:60vh;overflow:auto;padding:3px}
.of-builder .ofb-settings-editors>fieldset{border:0;padding:0;margin:0;min-inline-size:0}
.of-builder .ofb-settings-editors>fieldset>legend{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}
.of-builder .ofb-settings-editors .of-builder-property{display:grid;gap:5px;margin:0 0 16px;font-weight:var(--ofb-font-weight)}
.of-builder .ofb-settings-editors .of-builder-property:has([role="switch"]){display:flex;align-items:center;gap:8px}
.of-builder .ofb-settings-editors .of-builder-property>[role="switch"]{order:-1}
.of-builder .ofb-settings-editors [data-ofb-primitive="Input"]:disabled{background:var(--ofb-surface-raised);color:var(--ofb-text-muted);cursor:not-allowed}
.of-builder .ofb-settings-preview{min-inline-size:0}
.of-builder .ofb-preview-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-block-end:12px}
.of-builder .ofb-preview-heading h3{font-size:var(--ofb-font-size);font-weight:var(--ofb-font-weight-bold);margin:0}
.of-builder .ofb-live-preview{border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);min-block-size:300px;max-block-size:50vh;overflow:auto}
.of-builder .ofb-live-preview [data-ofb-preview-ancestor],.of-builder .ofb-live-preview [data-ofb-preview-ancestor]>.of-slot,.of-builder .ofb-live-preview [data-ofb-preview-ancestor]>.of-column{display:contents!important}
.of-builder .ofb-live-preview [data-ofb-preview-ancestor]>.of-slot-title{display:none}
.of-builder .ofb-settings-footer{display:flex;align-items:center;gap:8px;padding:16px 24px;border-block-start:1px solid var(--ofb-border);background:var(--ofb-surface-raised)}
.of-builder .ofb-settings-footer>small{flex:1;text-align:center}
.of-builder .ofb-editor-error{margin:0;padding:0 24px 16px;color:var(--ofb-danger);overflow-wrap:anywhere}
.of-builder .ofb-settings [data-has-problem="true"]::after{content:"";inline-size:6px;block-size:6px;border-radius:var(--ofb-radius-pill);background:var(--ofb-danger);margin-inline-start:6px}
.of-builder [data-ofb-primitive="Drawer"] .ofb-settings-body{grid-template-columns:minmax(0,1fr)}
.of-builder [data-ofb-primitive="Drawer"] .ofb-settings-editors{max-block-size:none}
.of-builder [data-ofb-primitive="Drawer"] .ofb-settings-footer{position:sticky;inset-block-end:0;z-index:1}
@media(max-width:900px){.of-builder .ofb-settings-body{gap:16px;padding:16px;grid-template-columns:minmax(0,1fr)}.of-builder .ofb-live-preview{min-block-size:180px}}
`;
