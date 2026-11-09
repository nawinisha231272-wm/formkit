import { defaultMessage } from "@ourform/sdk";
import type { UI } from "./types";
const english: Readonly<Record<string, string>> = {
  "ofb.writeExpression": "Write as expression",
  "ofb.complexExpression":
    "Edit this expression below; simple rule rows cannot represent it.",
  "ofb.showWhen": "Show when",
  "ofb.disabledWhen": "Disabled when",
  "ofb.theseMatch": "of these match",
  "ofb.key": "Key",
  "ofb.hasProblem": "{tab} has a problem",
  "ofb.noProperties": "No settings in this tab.",
  "ofb.livePreview": "Live preview",
  "ofb.previewState": "Preview state",
  "ofb.default": "Default",
  "ofb.focus": "Focus",
  "ofb.error": "Error",
  "ofb.disabled": "Disabled",
  "ofb.previewHint":
    "Changes show here instantly and apply to the form when you save.",
  "ofb.drawerHint":
    "Changes apply live. Undo groups edits to the same field within 500 ms.",
  "ofb.saveHint": "Esc cancels · Ctrl+Enter saves · Save is one undo step",
  "ofb.editorConflict":
    "This component changed outside the editor. Close and reopen it to continue.",
};
export function settingsMessages(base: UI["t"]): UI["t"] {
  return (key, params) => {
    const translated = base(key, params);
    const template = translated === key ? english[key] : translated;
    return template
      ? template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
          params?.[name] === undefined ? match : String(params[name]),
        )
      : defaultMessage(key, params);
  };
}
