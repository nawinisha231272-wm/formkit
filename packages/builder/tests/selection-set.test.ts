import { describe, expect, test } from "vitest";
import { SelectionSet } from "../src/selection-set";

describe("instance selection model", () => {
  test("toggle, range and snapshot preserve primary and the range anchor", () => {
    const selection = new SelectionSet();
    selection.select("b");
    selection.range("d", ["a", "b", "c", "d"]);
    expect(selection.snapshot()).toEqual({
      members: ["b", "c", "d"],
      primary: "d",
      anchor: "b",
    });
    const before = selection.snapshot();
    selection.toggle("d", "parent");
    expect(selection.snapshot()).toEqual({
      members: ["b", "c"],
      primary: "c",
      anchor: "d",
    });
    selection.restore(before);
    expect(selection.snapshot()).toEqual(before);
  });
  test("removing the last primary falls back and deleted ids are pruned", () => {
    const selection = new SelectionSet();
    selection.select("a");
    selection.toggle("a", "parent");
    expect(selection._ofbPrimary).toBe("parent");
    selection.select("b");
    selection.toggle("c", null);
    selection.retain(new Set(["b"]));
    expect(selection.snapshot()).toEqual({
      members: ["b"],
      primary: "b",
      anchor: "b",
    });
  });
  test("structural normalization removes descendants without changing property selection", () => {
    const selection = new SelectionSet();
    selection.select("child");
    selection.toggle("parent", null);
    selection.toggle("sibling", null);
    expect(
      selection.structural([
        { id: "parent" },
        { id: "child", parent: "parent" },
        { id: "sibling" },
      ]),
    ).toEqual(["parent", "sibling"]);
    expect(selection._ofbMembers).toEqual(["child", "parent", "sibling"]);
  });
});
