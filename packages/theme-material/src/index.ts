export { builderTheme } from "./builder-theme";
import type { Theme } from "@ourform/sdk";

/** Portable Material appearance. It preserves the shared shell DOM and its accessible labels. */
export const materialTheme: Theme = {
  name: "material",
  extends: "base",
  tokens: {
    "--of-color-primary": "#6750a4",
    "--of-color-on-primary": "#ffffff",
    "--of-color-text": "#1d1b20",
    "--of-color-muted": "#5d5866",
    "--of-color-border": "#79747e",
    "--of-color-error": "#b3261e",
    "--of-color-bg": "#fffbfe",
    "--of-material-panel-bg": "#f7f2fa",
    "--of-material-label-bg": "var(--of-color-bg)",
    "--of-material-elevation": "0 1px 3px rgb(29 27 32 / 22%)",
    "--of-radius": "4px",
    "--of-space-1": "4px",
    "--of-space-2": "8px",
    "--of-space-3": "12px",
    "--of-space-4": "20px",
    "--of-font-family": "Roboto, system-ui, sans-serif",
    "--of-font-size": "16px",
    "--of-control-height": "52px",
    "--of-focus-ring": "3px solid #6750a4",
  },
  classes: {},
  modes: {
    dark: {
      "--of-color-primary": "#d0bcff",
      "--of-color-on-primary": "#381e72",
      "--of-color-text": "#e6e1e5",
      "--of-color-muted": "#cac4d0",
      "--of-color-border": "#938f99",
      "--of-color-error": "#f2b8b5",
      "--of-color-bg": "#1c1b1f",
      "--of-material-panel-bg": "#25222c",
      "--of-material-elevation": "0 1px 3px rgb(0 0 0 / 45%)",
      "--of-focus-ring": "3px solid #d0bcff",
    },
    "high-contrast": {
      "--of-color-primary": "#ffff00",
      "--of-color-on-primary": "#000000",
      "--of-color-text": "#ffffff",
      "--of-color-muted": "#ffffff",
      "--of-color-border": "#ffffff",
      "--of-color-error": "#ffbaba",
      "--of-color-bg": "#000000",
      "--of-material-panel-bg": "#000000",
      "--of-material-elevation": "none",
      "--of-focus-ring": "3px solid #ffff00",
    },
  },
  css: `
.of-root .of-panel,.of-root .of-fieldset{--of-material-label-bg:var(--of-material-panel-bg);background:var(--of-material-panel-bg);border-color:var(--of-color-border);border-radius:12px;box-shadow:var(--of-material-elevation);padding:20px}
.of-root .of-layout-title{font-size:16px;font-weight:500;line-height:1.5;margin-block-end:18px}
.of-root [data-of-shell="field"]{position:relative;padding-block-start:8px;gap:6px}
.of-root [data-of-shell="field"]>.of-label{position:absolute;inset-block-start:0;inset-inline-start:12px;z-index:1;max-inline-size:calc(100% - 28px);padding-inline:4px;background:var(--of-material-label-bg);font-size:12px;font-weight:400;line-height:16px}
.of-root [data-of-shell="field"]>.of-control-wrapper{order:1}
.of-root [data-of-shell="field"]>.of-description{order:2}
.of-root [data-of-shell="field"]>.of-help{order:3}
.of-root [data-of-shell="field"]>.of-errors{order:4}
.of-root .of-panel [data-of-shell="field"]>.of-label,.of-root .of-fieldset [data-of-shell="field"]>.of-label{background:var(--of-material-panel-bg)}
.of-root [data-of-shell="field"]>.of-control-wrapper>.of-control{padding:14px 16px;background:transparent;border-radius:4px;line-height:22px}
.of-root [data-of-shell="field"]:focus-within>.of-label{color:var(--of-color-primary)}
.of-root [data-of-shell="field"]:has([aria-invalid="true"])>.of-label{color:var(--of-color-error)}
.of-root .of-description,.of-root .of-help,.of-root .of-errors{font-size:12px;line-height:18px}
.of-root [data-of-shell="field"]>.of-description,.of-root [data-of-shell="field"]>.of-errors{padding-inline-start:16px}
.of-root .of-errors{list-style:none;margin:0}
.of-root .of-tablist{border-block-end:1px solid var(--of-color-border)}
.of-root .of-tablist>[role="tab"]{background:transparent;border:0;border-block-end:3px solid transparent;border-radius:0;padding:12px 20px;font-size:14px;font-weight:500}
.of-root .of-tablist>[role="tab"][aria-selected="true"]{color:var(--of-color-primary);border-block-end-color:var(--of-color-primary);background:transparent}
.of-root button.of-control{min-block-size:40px;border-radius:20px;font-weight:500;font-size:14px;padding:8px 20px}
.of-root .of-none>button.of-control{background:var(--of-color-primary);color:var(--of-color-on-primary);border-color:var(--of-color-primary)}
.of-root [role="group"]>label{min-block-size:32px}
.of-root input[type="checkbox"],.of-root input[type="radio"]{accent-color:var(--of-color-primary)}
@media(forced-colors:active){.of-root .of-control{border:1px solid ButtonText}.of-root :focus-visible{outline:3px solid Highlight}.of-root .of-panel{box-shadow:none}}
`,
};
