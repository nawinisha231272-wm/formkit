export const settingsStyle = `
.of-builder-property{display:grid;gap:4px;margin-block:8px}
.of-builder-expression{margin-block:8px}.of-builder-expression fieldset{margin:8px 0}.of-builder-expression label{display:grid;gap:4px;margin-block:6px}
.of-builder input[data-ofb-primitive="Switch"]{appearance:none;position:relative;inline-size:34px;block-size:20px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-pill);background:var(--ofb-surface-raised);cursor:pointer;flex-shrink:0}
.of-builder input[data-ofb-primitive="Switch"]::after{content:"";position:absolute;inline-size:14px;block-size:14px;inset:2px auto auto 2px;border-radius:var(--ofb-radius-pill);background:var(--ofb-text-muted)}
.of-builder input[data-ofb-primitive="Switch"]:checked{background:var(--ofb-accent);border-color:var(--ofb-accent)}
.of-builder input[data-ofb-primitive="Switch"]:checked::after{transform:translateX(14px);background:var(--ofb-accent-contrast)}
.of-builder [data-ofb-primitive="SegmentedControl"]{display:flex;align-items:center;gap:4px;overflow-x:auto;flex-shrink:0;padding:3px;background:var(--ofb-surface-raised);border-radius:var(--ofb-radius)}
.of-builder [data-ofb-primitive="SegmentedControl"]>button{min-block-size:28px;border-color:var(--ofb-transparent);background:var(--ofb-transparent);padding:4px 10px}
.of-builder [data-ofb-primitive="SegmentedControl"]>button[aria-pressed="true"]{background:var(--ofb-surface);box-shadow:var(--ofb-shadow-1)}
.of-builder .ofb-settings-header{display:flex;align-items:start;justify-content:space-between;gap:16px;padding:20px 24px 12px}
.of-builder .ofb-settings-header h2{font-size:var(--ofb-font-size-title);font-weight:var(--ofb-font-weight-bold);margin:0}
.of-builder .ofb-settings-header small,.of-builder .ofb-muted{font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted)}
.of-builder .ofb-settings>[data-ofb-primitive="Tabs"]{padding-inline:24px}
.of-builder .ofb-settings-body{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:24px;padding:24px}
.of-builder .ofb-settings-editors{min-inline-size:0;max-block-size:60vh;overflow:auto;padding:3px}
.of-builder .ofb-settings-editors>fieldset{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:12px;border:0;padding:0;margin:0;min-inline-size:0}
.of-builder .ofb-settings-editors>fieldset>*{grid-column:1/-1}
.of-builder .ofb-settings-editors>fieldset>label:has([data-property="prefix"],[data-property="suffix"],[data-property="disabled"],[data-property="readOnly"]){grid-column:auto}
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

.of-builder .ofb-settings-header h2{display:flex;align-items:center;gap:8px}
.of-builder .ofb-settings-location{display:block;margin-block-start:4px}
.of-builder .of-builder-expression{margin-block-end:24px}
.of-builder .of-builder-expression h3{font-size:var(--ofb-font-size);margin:0 0 12px}
.of-builder .of-builder-expression details{margin-block-start:12px}
.of-builder .ofb-rule-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) auto;align-items:end;gap:8px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);padding:12px;margin:12px 0}
.of-builder .ofb-rule-row legend{font-size:var(--ofb-font-size-small);color:var(--ofb-text-muted)}
.of-builder .ofb-rule-row>label{display:grid;gap:4px;min-inline-size:0;font-size:var(--ofb-font-size-small)}
.of-builder .ofb-picker{position:relative;display:grid;gap:4px}
.of-builder .ofb-picker-list{position:absolute;inset-block-start:100%;inset-inline:0;z-index:10;max-block-size:180px;overflow:auto;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-1)}
.of-builder .ofb-picker-list>[role=option]{padding:6px 10px;cursor:pointer}
.of-builder .ofb-picker-list>[aria-selected=true]{background:var(--ofb-accent);color:var(--ofb-accent-contrast)}
`;
