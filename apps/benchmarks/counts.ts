import { createEngine } from "@ourform/core";
import { builtinComponents } from "@ourform/components";
import { mount } from "@ourform/renderer-dom";
import type { FormDefinition } from "@ourform/schema";
import onboarding from "../../fixtures/forms/onboarding/customer.json";
import onboardingData from "../../fixtures/forms/onboarding/customer.data.json";

export interface WorkCounts {
  processorsPerEdit: number;
  domCreatedPerEdit: number;
  domReplacedPerEdit: number;
  statePatchesPerEdit: number;
  rendersPerStatePatch: number[];
}
function nodes(root: Node): Node[] {
  return [root, ...Array.from(root.childNodes).flatMap(nodes)];
}
/** Observe implicit DOM additions too (textContent/innerHTML); intercept detached allocations. */
export function observeDomWork(root: Node, action: () => void) {
  const before = new Set(nodes(root));
  const created = new Set<Node>();
  const record = (node: Node) => {
    for (const child of nodes(node)) if (!before.has(child)) created.add(child);
    return node;
  };
  const observer = new MutationObserver(() => {});
  observer.observe(root, { childList: true, subtree: true });
  const restores: (() => void)[] = [];
  for (const name of [
    "createElement",
    "createElementNS",
    "createTextNode",
    "createComment",
    "createDocumentFragment",
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      name,
    )!;
    const original = descriptor.value as (...args: unknown[]) => Node;
    Object.defineProperty(Document.prototype, name, {
      ...descriptor,
      value: function (this: Document, ...args: unknown[]) {
        return record(Reflect.apply(original, this, args));
      },
    });
    restores.push(() =>
      Object.defineProperty(Document.prototype, name, descriptor),
    );
  }
  const clone = Object.getOwnPropertyDescriptor(Node.prototype, "cloneNode")!;
  Object.defineProperty(Node.prototype, "cloneNode", {
    ...clone,
    value: function (this: Node, ...args: unknown[]) {
      return record(Reflect.apply(clone.value, this, args) as Node);
    },
  });
  restores.push(() =>
    Object.defineProperty(Node.prototype, "cloneNode", clone),
  );
  try {
    action();
    for (const mutation of observer.takeRecords())
      for (const node of mutation.addedNodes) record(node);
    const after = new Set(nodes(root));
    return {
      domCreatedPerEdit: created.size,
      domReplacedPerEdit: [...before].filter((node) => !after.has(node)).length,
    };
  } finally {
    observer.disconnect();
    restores.reverse().forEach((restore) => restore());
  }
}
export function measureWorkCounts(
  fixture: "100" | "500" | "1000" | "onboarding",
): WorkCounts[] {
  const count = Number(fixture);
  const definition: FormDefinition =
    fixture === "onboarding"
      ? (onboarding as FormDefinition)
      : {
          $formVersion: "1.0",
          id: `counts-${count}`,
          display: "form",
          settings: { validateOn: "change" },
          components: Array.from({ length: count }, (_, index) => ({
            id: `field-${index}`,
            key: `field${index}`,
            type: "text",
            label: `Field ${index + 1}`,
            ...(index > 0 && index <= 25
              ? {
                  calculate: {
                    expr: ["concat", { ref: "field-0" }, `-${index}`] as const,
                  },
                }
              : {}),
          })),
        };
  const engine = createEngine();
  let renders = 0;
  const views = new Map(
    builtinComponents.map((field) => {
      engine.register(field.model);
      const portable = field.views.portable;
      return [
        field.model.type,
        {
          ...field.views,
          ...(portable
            ? {
                portable: ((props) => {
                  renders++;
                  return portable(props);
                }) as typeof portable,
              }
            : {}),
        },
      ];
    }),
  );
  const compiled = engine.compile(definition);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const session = engine.createSession(
    compiled.form,
    fixture === "onboarding" ? { data: onboardingData } : {},
  );
  const root = document.querySelector<HTMLElement>("#form")!;
  let patchStart = 0;
  let patchRenders: number[] = [];
  const beforePatch = session.subscribe(() => {
    patchStart = renders;
  });
  const view = mount(root, session, { engine, views });
  const afterPatch = session.subscribe(() => {
    patchRenders.push(renders - patchStart);
  });
  const path = fixture === "onboarding" ? "contact.firstName" : "field0";
  const input = root.querySelector<HTMLInputElement>("input")!;
  input.focus();
  const results: WorkCounts[] = [];
  const processors = () =>
    Object.values(session.debug.processorRuns).reduce((a, b) => a + b, 0);
  try {
    for (let edit = 0; edit < 25; edit++) {
      const initial = processors();
      patchRenders = [];
      const dom = observeDomWork(root, () =>
        session.setValue(path, `Edit ${edit}`),
      );
      results.push({
        ...dom,
        processorsPerEdit: processors() - initial,
        statePatchesPerEdit: patchRenders.length,
        rendersPerStatePatch: patchRenders,
      });
      if (
        root.querySelectorAll("[data-field-id]").length !==
          compiled.form.nodes.length ||
        (fixture !== "onboarding" &&
          root.querySelectorAll("input").length !== count)
      )
        throw new Error("Control/component count regression");
      if (
        root.querySelector("input") !== input ||
        document.activeElement !== input
      )
        throw new Error("Edit replaced or unfocused its control");
    }
  } finally {
    beforePatch();
    afterPatch();
    view.destroy();
    session.dispose();
  }
  if (root.childNodes.length) throw new Error("Count fixture leaked DOM");
  return results;
}
window.ourformWorkCounts = measureWorkCounts;
window.ourformDomWork = observeDomWork;
declare global {
  interface Window {
    ourformWorkCounts: typeof measureWorkCounts;
    ourformDomWork: typeof observeDomWork;
  }
}
