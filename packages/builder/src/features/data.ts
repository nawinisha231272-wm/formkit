import { toSubmissionSchema } from "@ourform/schema";
import type { FormController } from "@ourform/renderer-dom";
import { element } from "../types";
import type { UI } from "../types";

/** Body only; mode selection, accessible frame, focus and cancellation remain initial. */
export function mountData(
  host: HTMLElement,
  ui: UI,
  preview: () => FormController | undefined,
) {
  const schema = element(ui.document, "pre", "", "of-builder-json");
  const sample = element(ui.document, "pre", "", "of-builder-json");
  schema.tabIndex = sample.tabIndex = 0;
  host.replaceChildren(
    element(ui.document, "h2", ui.t("ofb.submissionSchema")),
    schema,
    element(ui.document, "h2", ui.t("ofb.sampleData")),
    sample,
  );
  const update = () => {
    const controller = preview();
    schema.textContent = controller
      ? JSON.stringify(toSubmissionSchema(controller.session.form), null, 2)
      : "";
    sample.textContent = controller
      ? JSON.stringify(controller.session.getData(), null, 2)
      : "";
  };
  update();
  return { update };
}
