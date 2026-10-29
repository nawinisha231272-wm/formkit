import {
  Pencil,
  GripVertical,
  Copy,
  Code,
  Ellipsis,
  Trash2,
  X,
  Plus,
  Search,
  Undo2,
  Redo2,
  Save,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  Braces,
  Type,
  TextCursorInput,
  AlignLeft,
  MousePointer2,
  FileText,
  ContactRound,
  CircleDot,
  ListFilter,
  RectangleEllipsis,
  EyeOff,
  CalendarDays,
  PanelsTopLeft,
  Mail,
  Hash,
  Star,
  SquareCheck,
  PanelTop,
  SquareDashed,
  Columns3,
  Folder,
  Workflow,
  Info,
  CircleAlert,
  Check,
} from "lucide";

const icons = {
  edit: Pencil,
  move: GripVertical,
  duplicate: Copy,
  copy: Copy,
  paste: Copy,
  json: Code,
  more: Ellipsis,
  delete: Trash2,
  close: X,
  add: Plus,
  search: Search,
  undo: Undo2,
  redo: Redo2,
  save: Save,
  expand: ChevronDown,
  collapse: ChevronRight,
  lock: LockKeyhole,
  data: Braces,
  text: TextCursorInput,
  textarea: AlignLeft,
  button: MousePointer2,
  content: FileText,
  employee: ContactRound,
  radio: CircleDot,
  password: RectangleEllipsis,
  hidden: EyeOff,
  date: CalendarDays,
  tabs: PanelsTopLeft,
  fieldset: SquareDashed,
  custom: Type,
  email: Mail,
  number: Hash,
  rating: Star,
  checkbox: SquareCheck,
  select: ListFilter,
  panel: PanelTop,
  columns: Columns3,
  container: Folder,
  logic: Workflow,
  info: Info,
  issues: CircleAlert,
  check: Check,
  cut: Copy,
  wrap: Braces,
  unwrap: Braces,
} as const;
export type BuilderIconName = keyof typeof icons;
export const isIconName = (name: string): name is BuilderIconName =>
  Object.hasOwn(icons, name);
export type BuilderIcon = readonly (readonly [
  string,
  Readonly<Record<string, string | number | undefined>>,
])[];
export type BuilderIcons = Readonly<
  Partial<Record<BuilderIconName, BuilderIcon>>
>;
/** Lucide's original icon data, mounted into the owner's document (including iframes). */
export function icon(
  document: Document,
  name: BuilderIconName,
  overrides: BuilderIcons = {},
): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.7",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
    class: "ofb-icon",
  }))
    svg.setAttribute(key, value);
  for (const [tag, attributes] of overrides[name] ?? icons[name]) {
    if (
      ![
        "path",
        "circle",
        "rect",
        "line",
        "polyline",
        "polygon",
        "ellipse",
      ].includes(tag)
    )
      throw new Error("Unsupported builder icon node.");
    const child = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (
        !/^(d|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|points|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)$/.test(
          key,
        )
      )
        throw new Error("Unsupported builder icon attribute.");
      if (value !== undefined && !/[<>]|url\s*\(/i.test(String(value)))
        child.setAttribute(key, String(value));
    }
    svg.append(child);
  }
  return svg;
}

export function componentIcon(
  type: string,
  declared?: string,
): BuilderIconName {
  return declared && isIconName(declared)
    ? declared
    : isIconName(type)
      ? type
      : /employee/i.test(type)
        ? "employee"
        : "custom";
}
