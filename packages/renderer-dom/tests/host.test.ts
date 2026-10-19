import { expect, test } from "vitest";
import { createFormHost, resolveView, syncData } from "@ourform/renderer-dom";
import { textField } from "@ourform/components";
import { registerNativeField } from "@ourform/sdk";
test("native > renderer pack > portable resolution names missing type and adapter", () => {
  const native = registerNativeField("react", "employee", () => null).views
    .native!.react!;
  const portable = textField.views.portable;
  const pack = () => portable({} as never);
  expect(
    resolveView(
      "employee",
      { native: { react: native }, packs: { react: pack }, portable },
      "react",
    ),
  ).toBe(native);
  expect(
    resolveView("employee", { packs: { react: pack }, portable }, "react"),
  ).toBe(pack);
  expect(resolveView("employee", { portable }, "angular")).toBe(portable);
  expect(() => resolveView("employee", undefined, "angular")).toThrow(
    "employee in adapter angular",
  );
});
test("host registries isolate instances, reject duplicate registrations and synchronize changed leaves only", () => {
  const host = createFormHost([textField]);
  expect(createFormHost([]).engine.listFields()).toEqual([]);
  expect(() => createFormHost([textField, textField])).toThrow(
    "Duplicate component registration",
  );
  const result = host.engine.compile({
    $formVersion: "1.0",
    id: "host",
    display: "form",
    components: [{ id: "name", type: "text", key: "name", label: "Name" }],
  });
  if (!result.ok) throw new Error("compile failed");
  const session = host.engine.createSession(result.form);
  let patches = 0;
  session.subscribe(() => patches++);
  syncData(session, { name: "Ada" });
  expect(session.getValue("name")).toBe("Ada");
  expect(patches).toBe(1);
  session.touch("name");
  const count = patches;
  syncData(session, { name: "Ada" });
  expect(patches).toBe(count);
  expect(session.getFieldState("name").touched).toBe(true);
  expect(() => syncData(session, [])).toThrow("must be an object");
});

test("a native view can augment an existing portable model without replacing its fallback", () => {
  const native = registerNativeField("react", "text", () => null, {
    model: textField.model,
  });
  const host = createFormHost([textField, native]);
  expect(resolveView("text", host.views.get("text"), "react")).toBe(
    native.views.native!.react,
  );
  expect(resolveView("text", host.views.get("text"), "angular")).toBe(
    textField.views.portable,
  );
  expect(() => createFormHost([textField, native, native])).toThrow(
    "Duplicate native view",
  );
});
