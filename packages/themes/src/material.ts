import { baseTheme } from "@ourform/theme-base";
import { materialTheme } from "@ourform/theme-material";

/** Material extends Base; register this set so its inherited CSS is available. */
export const materialThemes = Object.freeze([baseTheme, materialTheme]);
export { baseTheme, materialTheme };
