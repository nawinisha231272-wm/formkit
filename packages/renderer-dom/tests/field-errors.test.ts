import { expect, test, vi } from "vitest";
import { createEngine } from "@ourform/core";
import { textField } from "@ourform/components";
import { defaultMessage } from "@ourform/sdk";
import { fieldErrors } from "../src/shell";

test("fieldErrors reads one state snapshot for both resolved caption and errors", () => {
  const e = createEngine().register(textField.model);
  const compiled = e.compile({
    $formVersion: "1.0",
    id: "errors",
    display: "form",
    components: [
      {
        id: "name",
        type: "text",
        key: "name",
        label: "Original",
        validation: { required: true },
      },
    ],
  });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  const s = e.createSession(compiled.form);
  const state = s.getFieldState("name");
  const read = vi.spyOn(s, "getFieldState").mockReturnValue({
    ...state,
    resolvedNode: { ...compiled.form.byId.name!.node, label: "Adjusted" },
    errors: [{ code: "required", messageKey: "of.validation.required" }],
  });
  expect(fieldErrors(s, compiled.form.byId.name!, defaultMessage)).toEqual([
    defaultMessage("of.required", { label: "Adjusted" }),
  ]);
  expect(read).toHaveBeenCalledTimes(1);
  read.mockRestore();
  s.dispose();
});
