import { createBuilderController } from "./builder";
import type { BuilderOptions, BuilderController } from "./types";
/** Browser factory; pass your registered fields/engine, or use a framework wrapper's built-ins. */
export function createBuilder(
  root: Element,
  definition: unknown,
  options: Omit<BuilderOptions, "schema"> = {},
): BuilderController {
  return createBuilderController(root, { ...options, schema: definition });
}
export { createBuilderController } from "./builder";
export type {
  BuilderController,
  BuilderOptions,
  SchemaChange,
  PaletteOptions,
  EditorOptions,
  ToolbarAction,
} from "./types";
export type { ChromeOptions } from "./theme";
export type { BuilderIcons, BuilderIcon, BuilderIconName } from "./icons";
