import { expect, test, vi } from "vitest";
import { verifyPreflight } from "../scripts/verify-preflight.mjs";

function probe({ lowPower = "1", protectedSleep = false } = {}) {
  const log = vi.fn();
  const warn = vi.fn();
  const read = vi.fn((args: string[]) => {
    if (args[1] === "batt") return "Now drawing from 'AC Power'\n";
    if (args[1] === "assertions")
      return `   PreventUserIdleSystemSleep ${protectedSleep ? 1 : 0}\n   PreventUserIdleDisplaySleep ${protectedSleep ? 1 : 0}\n`;
    return `Currently in use:\n lowpowermode ${lowPower}\n sleep 1\n displaysleep 10\n`;
  });
  verifyPreflight({
    platform: "darwin",
    read,
    log,
    warn,
    now: () => "2026-11-10T18:00:00Z",
  });
  return {
    read,
    output: log.mock.calls.flat().join("\n"),
    warnings: warn.mock.calls.flat().join("\n"),
  };
}

test("verify preflight skips pmset outside macOS", () => {
  for (const platform of ["linux", "win32"]) {
    const read = vi.fn();
    const log = vi.fn();
    verifyPreflight({ platform, read, log });
    expect(read).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[verify preflight] macOS power probe not applicable.",
    );
  }
});

test("verify preflight logs timestamp, active power and raw sleep evidence using read-only commands", () => {
  const result = probe();
  expect(result.read.mock.calls.map(([args]) => args)).toEqual([
    ["-g"],
    ["-g", "batt"],
    ["-g", "assertions"],
  ]);
  expect(result.output).toContain("2026-11-10T18:00:00Z platform=darwin");
  expect(result.output).toContain("Now drawing from 'AC Power'");
  expect(result.output).toContain("displaysleep 10");
  expect(result.output).toContain("Active Low Power Mode: ON");
  expect(result.warnings).toContain("Low Power Mode is ON");
  expect(result.warnings).toContain("sleep is configured after 1 idle minutes");
  expect(result.warnings).toContain(
    "displaysleep is configured after 10 idle minutes",
  );
});

test("awake assertions suppress sleep warnings but never hide Low Power Mode", () => {
  const result = probe({ protectedSleep: true });
  expect(result.warnings).toContain("Low Power Mode is ON");
  expect(result.warnings).not.toContain("is configured after");
  const off = probe({ lowPower: "0", protectedSleep: true });
  expect(off.output).toContain("Active Low Power Mode: OFF");
  expect(off.warnings).toBe("");
});

test("unavailable power probes warn without failing or claiming Low Power Mode is off", () => {
  const log = vi.fn();
  const warn = vi.fn();
  expect(() =>
    verifyPreflight({
      platform: "darwin",
      read: () => {
        throw new Error("probe denied");
      },
      log,
      warn,
    }),
  ).not.toThrow();
  expect(warn.mock.calls.flat().join("\n")).toContain("probe denied");
  const output = log.mock.calls.flat().join("\n");
  expect(output).toContain("Active Low Power Mode: UNKNOWN");
  expect(output).not.toContain("Active Low Power Mode: OFF");
  const unknown = probe({ lowPower: "" });
  expect(unknown.warnings).toContain("cannot determine Low Power Mode");
});
