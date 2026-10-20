import { expect, test, vi } from "vitest";
import { createEngine } from "../src/index";
import type { StatePatch } from "../src/index";
import { field, form } from "./helpers";

test.each(["readOnly", "disabled", "hidden"] as const)(
  "%s user writes refresh only the protected field; API writes still work",
  (protection) => {
    const normalize = vi.fn((value: unknown) => String(value ?? ""));
    const engine = createEngine().register({
      type: "text",
      title: "Text",
      value: { empty: () => "", normalize, isEmpty: (value) => value === "" },
    });
    const compiled = engine.compile(
      form([
        field("protected", {
          defaultValue: "stored",
          ...(protection === "disabled" ? { disabledWhen: ["eq", 1, 1] } : {}),
          ...(protection === "hidden"
            ? { visibleWhen: ["eq", 1, 0], clearOnHide: false }
            : {}),
        }),
        field("dependent", { calculate: { expr: { ref: "protected" } } }),
        field("unrelated"),
      ]),
    );
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const session = engine.createSession(compiled.form, {
      mode: protection === "readOnly" ? "readOnly" : "edit",
    });
    const data = session.getData();
    const state = session.getFieldState("protected");
    const processors = { ...session.debug.processorRuns };
    normalize.mockClear();
    const patches: StatePatch[] = [];
    session.subscribe((patch) => patches.push(patch));
    session.setValue("protected", "blocked", { source: "user" });
    expect(session.getData()).toBe(data);
    expect(session.getFieldState("protected")).toBe(state);
    expect(normalize).not.toHaveBeenCalled();
    expect(session.debug.processorRuns).toEqual(processors);
    expect(patches).toEqual([
      { changedFields: ["protected"], changedPaths: [], data },
    ]);
    for (const source of [undefined, "api"] as const) {
      session.setValue(
        "protected",
        source ?? "default API",
        source ? { source } : {},
      );
      expect(session.getValue("protected")).toBe(source ?? "default API");
      expect(session.getValue("dependent")).toBe(source ?? "default API");
    }
    session.dispose();
  },
);
