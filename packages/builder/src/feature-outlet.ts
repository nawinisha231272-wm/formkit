import type {
  FeatureLoader,
  FeatureModules,
  FeatureName,
} from "./feature-loader";
import { button, element } from "./types";
import type { UI } from "./types";
/** A cancellable activation owns its loading UI; imported modules never own the form state. */
export function featureOutlet(
  host: HTMLElement,
  ui: UI,
  loader: FeatureLoader,
) {
  let generation = 0;
  let feedback: HTMLElement | undefined;
  const clear = () => {
    feedback?.remove();
    feedback = undefined;
    host.removeAttribute("aria-busy");
  };
  const cancel = () => {
    generation++;
    clear();
  };
  ui.signal.addEventListener("abort", cancel, { once: true });
  function open<K extends FeatureName>(
    name: K,
    mount: (module: FeatureModules[K]) => void,
  ) {
    const request = ++generation;
    const restore = !!feedback?.contains(ui.document.activeElement);
    if (restore) {
      host.tabIndex = -1;
      host.focus();
    }
    clear();
    host.setAttribute("aria-busy", "true");
    feedback = element(
      ui.document,
      "div",
      ui.t("ofb.featureLoading", { feature: ui.t(`ofb.${name}`) }),
    );
    host.append(feedback);
    ui.announce(feedback.textContent ?? "");
    void loader
      .load(name)
      .then((module) => {
        if (request !== generation || ui.signal.aborted) return;
        clear();
        mount(module);
        if (restore && ui.document.activeElement === host)
          host
            .querySelector<HTMLElement>(
              "textarea,input,select,button,[tabindex='0']",
            )
            ?.focus();
      })
      .catch((cause: unknown) => {
        if (request !== generation || ui.signal.aborted) return;
        clear();
        feedback = element(
          ui.document,
          "div",
          `${ui.t("ofb.featureFailed", { feature: ui.t(`ofb.${name}`) })} ${cause instanceof Error ? cause.message : String(cause)}`,
        );
        feedback.append(button(ui, ui.t("ofb.retry"), () => open(name, mount)));
        host.append(feedback);
        ui.announce(feedback.firstChild?.textContent ?? "");
      });
  }
  return { open, cancel };
}
