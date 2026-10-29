import { defaultMessage } from "@ourform/sdk";

const english: Readonly<Record<string, string>> = {
  "ofb.featureLoading": "Loading {feature}…",
  "ofb.featureFailed": "Could not load {feature}. Your changes are preserved.",
  "ofb.retry": "Retry",
  "ofb.addWithDefaults": "Add with defaults",
  "ofb.breadcrumb": "Form location",
  "ofb.submissionSchema": "Submission JSON Schema",
  "ofb.sampleData": "Sample data",
  "ofb.editSettings": "Edit settings",
  "ofb.inspector": "Form inspector",
  "ofb.selectedHelp":
    "Enter to edit · Space to pick up · Shift+F10 for actions",
  "ofb.componentCaption": "{type} · key {key}",
  "ofb.visible": "Visible",
  "ofb.always": "Always",
  "ofb.path": "Data path",
  "ofb.brand": "OurForm",
  "ofb.forms": "Forms",
  "ofb.untitled": "Untitled form",
  "ofb.draft": "Draft",
  "ofb.unsaved": "Unsaved changes",
  "ofb.save": "Save",
  "ofb.saving": "Saving…",
  "ofb.savedTime": "Saved {time}",
  "ofb.saveFailed": "Save failed: {message}",
  "ofb.savedEarlier": "Saved an earlier version; current changes are unsaved.",
  "ofb.builderLook": "Builder look",
  "ofb.matchForm": "Match form",
  "ofb.settingsMenu": "Builder settings",
  "ofb.emptyOptions": "{label} has no options. Add choices in Display.",
  "ofb.build": "Build",
  "ofb.logic": "Logic",
  "ofb.data": "Data",
  "ofb.preview": "Preview",
  "ofb.json": "JSON",
  "ofb.modes": "Builder mode",
  "ofb.logicUnavailable": "Logic rules are not available yet.",
  "ofb.theme.base": "Base",
  "ofb.theme.neutral": "Neutral",
  "ofb.theme.bootstrap4": "Bootstrap 4",
  "ofb.theme.bootstrap5": "Bootstrap 5",
  "ofb.theme.tailwind": "Tailwind",
  "ofb.theme.material": "Material",
  "ofb.theme.match-form": "Match form",
  "ofb.undid": "Undid {command}",
  "ofb.redid": "Redid {command}",
  "ofb.nothingUndo": "Nothing to undo",
  "ofb.nothingRedo": "Nothing to redo",
  "ofb.undo": "Undo",
  "ofb.issues": "Issues ({count})",
  "ofb.noIssues": "No issues found.",
  "ofb.search": "Search components",
  "ofb.basic": "Basic",
  "ofb.layout": "Layout",
  "ofb.advanced": "Advanced",
  "ofb.outline": "Outline",
  "ofb.history": "History",
  "ofb.selected": "Selected component",
  "ofb.selectionCount": "{count} selected",
  "ofb.deselected": "Deselected {label}",
  "ofb.did.AtomicCommand": "{label}",
  "ofb.history.AtomicCommand": "{label}",
  "ofb.commands": "Commands",
  "ofb.bulk": "Edit selected components",
  "ofb.planning": "Preparing selected components",
  "ofb.planningConflict":
    "The form changed while preparing this action. Please try again.",
  "ofb.mixedValues": "Mixed values",
  "ofb.noSharedProperties":
    "These components have no shared editable properties.",
  "ofb.commandSearch": "Search commands",
  "ofb.commandAdd": "Add component",
  "ofb.commandJump": "Jump to component",
  "ofb.commandActions": "Actions",
  "ofb.bulkAction": "{action} {count} components",
  "ofb.singleAction": "This action requires one component.",
  "ofb.unsupportedBulk": "A selected component does not support this property.",
  "ofb.required": "Required",
  "ofb.lockedBulk": "Locked by your app: {labels}",
  "ofb.deselectLocked": "Deselect locked components",
  "ofb.canvas": "Form canvas",
  "ofb.add": "Add component",
  "ofb.addType": "Add {title}",
  "ofb.emptySlot": "Drag a component here, or press +",
  "ofb.slotActions":
    "Select a component for this action. You can paste into this slot.",
  "ofb.slot": "{label}, position {index}",
  "ofb.formRoot": "Form",
  "ofb.noMatches": "No matching components.",
  "ofb.toolbar": "Component actions",
  "ofb.edit": "Edit",
  "ofb.editLabel": "Edit label",
  "ofb.labelRequired": "Label cannot be empty.",
  "ofb.noCaption": "No caption to edit.",
  "ofb.move": "Move",
  "ofb.duplicate": "Duplicate",
  "ofb.editJson": "Edit JSON",
  "ofb.more": "More",
  "ofb.delete": "Delete",
  "ofb.close": "Close",
  "ofb.cancel": "Cancel",
  "ofb.lock": "Locked by your app",
  "ofb.lock.key": "Locked by your app: can't change the data key",
  "ofb.lock.delete": "Locked by your app: can't delete",
  "ofb.lock.edit": "Locked by your app: can't edit",
  "ofb.lock.move": "Locked by your app: can't move",
  "ofb.selectFirst": "Select a component first.",
  "ofb.nothingToPaste": "Copy or cut a component first.",
  "ofb.copiedMany": "Copied {count} components. Choose a slot and paste.",
  "ofb.crossScopeBulk":
    "Move refused: all selected components must stay in the same data scope.",
  "ofb.adjacentBulk":
    "Wrap refused: select adjacent components in the same slot.",
  "ofb.invalidBulk":
    "The selection or clipboard contains an invalid component.",
  "ofb.copy": "Copy",
  "ofb.cut": "Cut",
  "ofb.paste": "Paste",
  "ofb.wrap": "Wrap in layout",
  "ofb.copied": "Copied {label}. Choose a slot and paste.",
  "ofb.deleteCancelled": "Deletion cancelled by your app.",
  "ofb.pickedUp": "Picked up {label}. Use arrow keys to move, Space to drop.",
  "ofb.position": "{label}, {target}, position {index} of {count}.",
  "ofb.moved": "Moved {label} into {target}, position {index} of {count}.",
  "ofb.refused": "Can't drop here: {reason}",
  "ofb.dragCancelled": "Move cancelled.",
  "ofb.and": "and",
  "ofb.or": "or",
  "ofb.yes": "Yes",
  "ofb.no": "No",
  "ofb.expr.eq": "{field} is {value}",
  "ofb.expr.neq": "{field} is not {value}",
  "ofb.expr.gt": "{field} is greater than {value}",
  "ofb.expr.gte": "{field} is at least {value}",
  "ofb.expr.lt": "{field} is less than {value}",
  "ofb.expr.lte": "{field} is at most {value}",
  "ofb.expr.empty": "{field} is empty",
  "ofb.expr.not": "not {field}",
  "ofb.controls": "Controls {count} fields",
  "ofb.shownWhen": "Shown when {condition}",
  "ofb.settings": "Settings",
};
const commandWords: Readonly<Record<string, readonly [string, string]>> = {
  AddComponent: ["add", "Added"],
  RemoveComponent: ["delete", "Deleted"],
  MoveComponent: ["move", "Moved"],
  DuplicateComponent: ["duplicate", "Duplicated"],
  PasteComponent: ["paste", "Pasted"],
  WrapInLayout: ["wrap", "Wrapped"],
  Unwrap: ["unwrap", "Unwrapped"],
  RestoreSnapshot: ["edit", "Restored"],
  UpdateComponent: ["edit", "Saved settings for"],
  ChangeKey: ["edit", "Changed key for"],
};
function commandMessage(key: string): string | undefined {
  const match = /^ofb\.(history|did)\.(.+)$/.exec(key);
  if (!match) return;
  const words = commandWords[match[2]!] ?? ["edit", "Updated"];
  return match[1] === "history"
    ? `${words[0]} of {label}`
    : `${words[1]} {label}`;
}
export function createMessages(
  overrides: Readonly<Record<string, string>> = {},
  translate?: typeof defaultMessage,
) {
  return (key: string, params?: Record<string, unknown>): string => {
    const translated = translate?.(key, params);
    const template = Object.hasOwn(overrides, key)
      ? overrides[key]!
      : translated !== undefined && translated !== key
        ? translated
        : (english[key] ??
          commandMessage(key) ??
          (key.startsWith("ofb.group.")
            ? key.slice(10)
            : defaultMessage(key, params)));
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
      params?.[name] === undefined ? match : String(params[name]),
    );
  };
}
