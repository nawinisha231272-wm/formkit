import type { Theme } from "@ourform/sdk";
export const tailwindTheme: Theme = {
  name: "tailwind",
  tokens: {
    "--of-color-primary": "#6236b5",
    "--of-color-text": "#17232b",
    "--of-color-muted": "#505d70",
    "--of-color-border": "#768396",
    "--of-color-error": "#b21b2b",
    "--of-color-bg": "#ffffff",
    "--of-radius": "10px",
    "--of-space-1": "4px",
    "--of-space-2": "8px",
    "--of-space-3": "12px",
    "--of-space-4": "20px",
    "--of-font-family": "system-ui, sans-serif",
    "--of-font-size": "16px",
    "--of-control-height": "40px",
    "--of-focus-ring": "3px solid #174fbc",
  },
  classes: {
    field: {
      root: "flex flex-col gap-2 mb-5",
      label: "font-semibold",
      control: "rounded-lg border px-3 py-2",
    },
    group: {
      control: "rounded-lg border px-3 py-2",
    },
    inline: {
      root: "flex gap-2 items-center",
    },
  },
  css: '.of-root{box-sizing:border-box;background:var(--of-color-bg);color:var(--of-color-text);font-family:var(--of-font-family);font-size:var(--of-font-size);padding:var(--of-space-4);color-scheme:light}.of-root[data-of-mode="dark"]{color-scheme:dark}.of-root *{box-sizing:border-box}.of-root .of-field{min-inline-size:0;border:0;padding:0;margin:0 0 var(--of-space-4);display:flex;flex-direction:column;gap:var(--of-space-2)}.of-root [hidden]{display:none!important}.of-root .of-label{font-weight:600;padding:0;margin-block-end:var(--of-space-1)}.of-root .of-description,.of-root .of-help{color:var(--of-color-muted);font-size:.875em}.of-root .of-control-wrapper{display:flex;align-items:center;gap:var(--of-space-2)}.of-root .of-control{font:inherit;min-block-size:var(--of-control-height);border:1px solid var(--of-color-border);border-radius:var(--of-radius);padding:var(--of-space-2);color:var(--of-color-text);background:var(--of-color-bg);max-inline-size:100%}.of-root input:not([type="checkbox"]){inline-size:100%}.of-root .of-control-wrapper>input:not([type="checkbox"]){flex:1;min-inline-size:0}.of-root button.of-control{cursor:pointer;color:var(--of-color-primary);margin-inline-end:var(--of-space-1)}.of-root button.of-control[aria-pressed="true"]{background:var(--of-color-primary);color:var(--of-color-bg)}.of-root .of-control:hover:not(:disabled){border-color:var(--of-color-primary)}.of-root :focus-visible{outline:var(--of-focus-ring);outline-offset:2px}.of-root .of-control[aria-invalid="true"]{border-color:var(--of-color-error)}.of-root .of-control:disabled{opacity:.6;cursor:not-allowed}.of-root .of-control[readonly]{border-style:dashed}.of-root .of-errors,.of-root .of-required{color:var(--of-color-error)}.of-root .of-errors{margin:0;padding-inline-start:1.25em}.of-root .of-inline{flex-direction:row;align-items:center;flex-wrap:wrap}.of-root .of-inline .of-label{margin:0}.of-root .of-summary{border:2px solid var(--of-color-error);padding:var(--of-space-3);margin-block-end:var(--of-space-4)}.of-root .of-summary a{color:var(--of-color-primary)}.of-root .of-sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.of-root .of-cell .of-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(forced-colors:active){.of-root .of-control{border:1px solid ButtonText}.of-root :focus-visible{outline:2px solid Highlight}.of-root button[aria-pressed="true"]{outline:2px solid Highlight}}',
  modes: {
    dark: {
      "--of-color-primary": "#a6c8ff",
      "--of-color-text": "#f1f5f9",
      "--of-color-muted": "#c4cedc",
      "--of-color-border": "#8998ac",
      "--of-color-error": "#ffa5ae",
      "--of-color-bg": "#17212f",
      "--of-focus-ring": "3px solid #a6c8ff",
    },
    "high-contrast": {
      "--of-color-primary": "#ffff00",
      "--of-color-text": "#ffffff",
      "--of-color-muted": "#ffffff",
      "--of-color-border": "#ffffff",
      "--of-color-error": "#ffbaba",
      "--of-color-bg": "#000000",
      "--of-focus-ring": "3px solid #ffff00",
    },
  },
};
