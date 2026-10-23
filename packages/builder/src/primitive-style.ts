/** Appearance comes exclusively from --ofb-* tokens and scoped primitive recipes. */
export const primitiveStyle = `
.of-builder{font:var(--ofb-font-size)/1.45 var(--ofb-font-family);color:var(--ofb-text);background:var(--ofb-canvas);color-scheme:light}
.of-builder[data-ofb-mode="dark"]{color-scheme:dark}
.of-builder,.of-builder *{box-sizing:border-box}
.of-builder [hidden]{display:none!important}
.of-builder .ofb-primitive{font-family:var(--ofb-font-family);font-size:var(--ofb-font-size);color:var(--ofb-text)}
.of-builder .ofb-icon{inline-size:16px;block-size:16px;flex-shrink:0;vertical-align:middle;pointer-events:none}
.of-builder .ofb-primitive:focus-visible{outline:3px solid var(--ofb-focus-ring);outline-offset:3px}
.of-builder [data-ofb-primitive="Button"],.of-builder [data-ofb-primitive="IconButton"]{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-block-size:var(--ofb-control-height);padding:5px 12px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);background:var(--ofb-surface);font-weight:var(--ofb-font-weight);cursor:pointer;white-space:nowrap;text-decoration:none}
.of-builder [data-ofb-primitive="IconButton"]{inline-size:var(--ofb-control-height);padding:6px}
.of-builder button.ofb-primitive:hover{background:var(--ofb-surface-raised)}
.of-builder button.ofb-primitive[data-variant="primary"]{background:var(--ofb-accent);color:var(--ofb-accent-contrast);border-color:var(--ofb-accent)}
.of-builder button.ofb-primitive[data-variant="danger"]{color:var(--ofb-danger)}
.of-builder button.ofb-primitive[data-variant="quiet"]{border-color:var(--ofb-transparent);background:var(--ofb-transparent)}
.of-builder button.ofb-primitive:disabled,.of-builder button.ofb-primitive[aria-disabled="true"]{cursor:not-allowed;color:var(--ofb-text-muted);background:var(--ofb-surface-raised)}
.of-builder .ofb-field{display:flex;flex-direction:column;gap:5px;min-inline-size:0;font-weight:var(--ofb-font-weight)}
.of-builder [data-ofb-primitive="Input"],.of-builder [data-ofb-primitive="Select"]{inline-size:100%;min-inline-size:0;min-block-size:var(--ofb-control-height);padding:7px 10px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);background:var(--ofb-surface);line-height:1.4}
.of-builder textarea[data-ofb-primitive="Input"]{resize:vertical;min-block-size:84px}
.of-builder .ofb-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.of-builder input[data-ofb-primitive="Checkbox"]{accent-color:var(--ofb-accent);inline-size:17px;block-size:17px}
.of-builder input[data-ofb-primitive="Switch"]{appearance:none;position:relative;inline-size:34px;block-size:20px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-pill);background:var(--ofb-surface-raised);cursor:pointer;flex-shrink:0}
.of-builder input[data-ofb-primitive="Switch"]::after{content:"";position:absolute;inline-size:14px;block-size:14px;inset:2px auto auto 2px;border-radius:var(--ofb-radius-pill);background:var(--ofb-text-muted)}
.of-builder input[data-ofb-primitive="Switch"]:checked{background:var(--ofb-accent);border-color:var(--ofb-accent)}
.of-builder input[data-ofb-primitive="Switch"]:checked::after{transform:translateX(14px);background:var(--ofb-accent-contrast)}
.of-builder [data-ofb-primitive="Tabs"],.of-builder [data-ofb-primitive="SegmentedControl"]{display:flex;align-items:center;gap:4px;overflow-x:auto;flex-shrink:0}
.of-builder [data-ofb-primitive="Tabs"]{border-block-end:1px solid var(--ofb-border)}
.of-builder [data-ofb-primitive="Tabs"]>button{border:var(--ofb-tab-border-width) solid var(--ofb-transparent);border-block-end:var(--ofb-tab-indicator) solid var(--ofb-transparent);border-radius:var(--ofb-tab-radius);padding:9px 12px;background:var(--ofb-transparent)}
.of-builder [data-ofb-primitive="Tabs"]>button[aria-selected="true"]{color:var(--ofb-accent);border-block-end-color:var(--ofb-accent)}
.of-builder [data-ofb-primitive="SegmentedControl"]{padding:3px;background:var(--ofb-surface-raised);border-radius:var(--ofb-radius)}
.of-builder [data-ofb-primitive="SegmentedControl"]>button{min-block-size:28px;border-color:var(--ofb-transparent);background:var(--ofb-transparent);padding:4px 10px}
.of-builder [data-ofb-primitive="SegmentedControl"]>button[aria-pressed="true"]{background:var(--ofb-surface);box-shadow:var(--ofb-shadow-1)}
.of-builder [data-ofb-primitive="Dialog"]{margin-block:48px auto;padding:0;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius-panel);background:var(--ofb-surface);color:var(--ofb-text);box-shadow:var(--ofb-shadow-2);inline-size:min(1040px,calc(100% - 48px));max-inline-size:none;max-block-size:calc(100% - 48px);overflow:auto}
.of-builder dialog::backdrop{background:var(--ofb-overlay)}
.of-builder [data-ofb-primitive="Drawer"]{position:absolute;inset:0 0 0 auto;inline-size:min(560px,100%);z-index:30;overflow:auto;background:var(--ofb-surface);border-inline-start:1px solid var(--ofb-border);box-shadow:var(--ofb-shadow-2)}
.of-builder [data-ofb-primitive="Menu"]{position:absolute;z-index:50;min-inline-size:200px;padding:5px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-2)}
.of-builder [data-ofb-primitive="Menu"]>button{display:flex;inline-size:100%;justify-content:start;border-color:var(--ofb-transparent)}
.of-builder [data-ofb-primitive="Tooltip"]{position:absolute;z-index:90;inset:auto auto calc(100% + 8px) 0;padding:5px 8px;line-height:1.4;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);color:var(--ofb-text);background:var(--ofb-surface-raised);box-shadow:var(--ofb-shadow-1);font-weight:var(--ofb-font-weight-regular);pointer-events:none;white-space:nowrap;width:max-content;max-inline-size:calc(100vw - 16px)}
.of-builder [data-ofb-primitive="Toast"]{padding:12px 16px;border:1px solid var(--ofb-border);border-radius:var(--ofb-radius);color:var(--ofb-text);background:var(--ofb-surface);box-shadow:var(--ofb-shadow-2)}
.of-builder [data-ofb-primitive="Tree"]{list-style:none;margin:0;padding:0}
.of-builder [data-ofb-primitive="Tree"] [role="group"]{list-style:none;padding-inline-start:16px}
.of-builder [data-ofb-primitive="Tree"] [role="treeitem"]{cursor:pointer;min-block-size:var(--ofb-control-height);border-radius:var(--ofb-radius);outline-offset:-3px}
.of-builder [data-ofb-primitive="Tree"] [aria-selected="true"]>.of-builder-tree-name{color:var(--ofb-accent);background:var(--ofb-accent-soft)}
.of-builder [data-ofb-primitive="Chip"]{display:inline-flex;align-items:center;gap:4px;border-radius:var(--ofb-radius-pill);padding:2px 8px;font-size:var(--ofb-font-size-small);font-weight:var(--ofb-font-weight);color:var(--ofb-text-muted);background:var(--ofb-surface-raised)}
.of-builder [data-ofb-primitive="Chip"][data-tone="logic"]{color:var(--ofb-logic);background:var(--ofb-logic-soft)}
.of-builder [data-ofb-primitive="Chip"][data-tone="info"]{color:var(--ofb-info);background:var(--ofb-info-soft)}
.of-builder [data-ofb-primitive="Chip"][data-tone="success"]{color:var(--ofb-success);background:var(--ofb-success-soft)}
.of-builder [data-ofb-primitive="Chip"][data-tone="danger"]{color:var(--ofb-danger);background:var(--ofb-danger-soft)}
`;
