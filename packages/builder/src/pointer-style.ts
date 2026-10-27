export const pointerStyle = `
.of-builder .of-builder-drop:not(.ofb-empty-slot){display:none}
.of-builder [data-field-id]:hover>.of-builder-drop:not(.ofb-empty-slot),.of-builder [data-field-id]:focus-within>.of-builder-drop:not(.ofb-empty-slot),.of-builder .of-builder-drop:not(.ofb-empty-slot):focus{display:block}
.of-builder .ofb-empty-slot{border:1px dashed var(--ofb-border);border-radius:var(--ofb-radius);color:var(--ofb-text-muted);background:var(--ofb-surface-raised);min-block-size:64px;padding:16px}
.of-builder .of-builder-palette [data-type],.of-builder .of-builder-canvas [data-field-id],.of-builder .of-builder-outline [data-drag-id]{touch-action:none}
.of-builder [data-of-tab]{touch-action:manipulation}
.of-builder .ofb-drag-ghost,.of-builder .ofb-drag-feedback,.of-builder .ofb-insertion-line{position:absolute;z-index:80;pointer-events:none}
.of-builder .ofb-drag-ghost,.of-builder .ofb-drag-feedback{inset-inline-start:var(--ofb-pointer-x);inset-block-start:var(--ofb-pointer-y);border-radius:var(--ofb-radius);padding:5px 10px;font-size:var(--ofb-font-size-small)}
.of-builder .ofb-drag-ghost{background:var(--ofb-surface);color:var(--ofb-text);border:1px solid var(--ofb-accent);box-shadow:var(--ofb-shadow-2)}
.of-builder .ofb-drag-feedback{background:var(--ofb-accent);color:var(--ofb-accent-contrast)}
.of-builder .ofb-insertion-line{inset-inline-start:var(--ofb-line-x);inset-block-start:var(--ofb-line-y);inline-size:var(--ofb-line-width);block-size:2px;background:var(--ofb-accent)}
.of-builder [data-ofb-drop-target="true"]{outline:2px solid var(--ofb-accent);outline-offset:-2px;background-color:var(--ofb-accent-soft)}
.of-builder [data-ofb-drop-refused="true"]{outline-color:var(--ofb-danger);background-color:var(--ofb-danger-soft)}
.of-builder .ofb-drag-feedback[data-refused="true"],.of-builder .ofb-insertion-line[data-refused="true"]{background:var(--ofb-danger);color:var(--ofb-surface)}
.of-builder .of-builder-canvas,.of-builder .of-builder-palette,.of-builder .of-builder-outline{user-select:none}
.of-builder .of-builder-palette [data-type]:active,.of-builder .ofb-component-toolbar [data-ofb-action="move"]:active{cursor:grabbing}

.of-builder .ofb-component-toolbar{position:absolute;inset:auto 0 calc(100% + 3px) auto;display:none;align-items:center;gap:2px;padding:3px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-1);z-index:12;visibility:hidden;max-inline-size:calc(100% - 32px);flex-wrap:wrap}
.of-builder [data-field-id]:hover:not(:has([data-field-id]:hover))>.ofb-component-toolbar,.of-builder [data-of-selected=true]>.ofb-component-toolbar,.of-builder .ofb-component-toolbar:focus-within{display:flex;visibility:visible}
.of-builder .ofb-component-toolbar [data-ofb-primitive="IconButton"]{inline-size:28px;min-block-size:28px;padding:5px}
.of-builder .ofb-selection-label{margin:0;display:block;position:absolute;inset:auto auto calc(100% + 3px) 0;max-inline-size:calc(100% - 254px);min-inline-size:0;text-align:start;justify-content:flex-start;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;visibility:hidden;min-block-size:20px;padding:2px 6px;background:var(--ofb-accent);color:var(--ofb-accent-contrast);border-color:var(--ofb-accent);font-size:var(--ofb-font-size-small);z-index:11}
.of-builder .ofb-inline-label{position:relative;z-index:13;inline-size:min(100%,28rem);margin-block:0 8px;font:inherit;font-weight:600}
.of-builder [data-field-id]:hover:not(:has([data-field-id]:hover))>.ofb-selection-label,.of-builder [data-of-selected=true]>.ofb-selection-label,.of-builder .ofb-selection-label:focus{visibility:visible}
.of-builder [data-ofb-locked="all"]>.ofb-selection-label{display:none}
.of-builder .of-builder-canvas:has([data-of-selected=true]) [data-field-id]:not([data-of-selected=true])>.ofb-component-toolbar{display:none;visibility:hidden}
.of-builder .of-builder-canvas:not(:has([data-of-selected=true]:focus-within)):has([data-field-id]:not([data-of-selected=true]):hover) [data-of-selected=true]>.ofb-component-toolbar{display:none;visibility:hidden}
.of-builder .of-builder-canvas:not(:has([data-of-selected=true]:focus-within)) [data-field-id]:not([data-of-selected=true]):hover:not(:has([data-field-id]:hover))>.ofb-component-toolbar{display:flex;visibility:visible}

 .of-builder [data-ofb-chrome-below]:is([data-of-selected=true],:hover){margin-block-end:calc(var(--ofb-chrome-height) + 8px)!important}
.of-builder [data-ofb-chrome-below]>.ofb-component-toolbar,.of-builder [data-ofb-chrome-below]>.ofb-selection-label{inset-block-end:auto;inset-block-start:calc(100% + 3px)}
.of-builder [data-ofb-compact] :is([data-ofb-action="copy"],[data-ofb-action="paste"],[data-ofb-action="json"]){display:none}
.of-builder .ofb-selection-key{white-space:pre;display:inline-block;vertical-align:bottom;max-inline-size:calc(100% - var(--ofb-label-width));overflow:hidden;text-overflow:ellipsis}
.of-builder .ofb-lock{display:inline-flex;padding:4px;color:var(--ofb-text-muted)}
.of-builder [data-of-collapsed=true]>:not(.ofb-component-toolbar):not(.ofb-selection-label):not(.of-layout-title):not(.ofb-signal-row):not(.ofb-canvas-lock){display:none!important}
.of-builder .of-builder-canvas .of-field[data-of-collapsed=true][data-of-design-node]{min-block-size:44px;display:flex;flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;padding-block:10px}
.of-builder .of-builder-canvas .of-field[data-of-collapsed=true]>.of-layout-title{margin:0}
.of-builder .ofb-tree-caret{display:inline-flex;align-items:center;vertical-align:middle;margin-inline-end:3px}
.of-builder .ofb-tree-caret>.ofb-icon{inline-size:12px;block-size:12px}
.of-builder .of-builder-tree-name>.ofb-icon{margin-inline-start:6px;inline-size:12px;block-size:12px;color:var(--ofb-text-muted)}
.of-builder .ofb-canvas-lock{position:absolute;inset:6px 6px auto auto;color:var(--ofb-text-muted);display:inline-flex}
.of-builder .ofb-insertion-line[data-orientation="vertical"]{inline-size:2px;block-size:var(--ofb-line-height)}
.of-builder .ofb-signal-row{display:flex;gap:6px;flex-wrap:wrap;margin-block:6px;pointer-events:none}
`;
