import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Read-only host evidence; warnings never change power settings or test deadlines. */
export function verifyPreflight({
  platform = process.platform,
  read = (args) =>
    execFileSync("pmset", args, {
      encoding: "utf8",
      timeout: 5_000,
      stdio: ["ignore", "pipe", "pipe"],
    }),
  now = () => new Date().toISOString(),
  log = console.log,
  warn = console.warn,
} = {}) {
  log(`[verify preflight] ${now()} platform=${platform}`);
  if (platform !== "darwin") {
    log("[verify preflight] macOS power probe not applicable.");
    return;
  }
  const evidence = new Map();
  for (const args of [["-g"], ["-g", "batt"], ["-g", "assertions"]]) {
    const command = `pmset ${args.join(" ")}`;
    try {
      const output = read(args);
      evidence.set(command, output);
      log(`[verify preflight] ${command}\n${output.trim()}`);
    } catch (error) {
      warn(
        `[verify preflight] WARNING: ${command} unavailable; power state is unknown: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const active = evidence.get("pmset -g") ?? "";
  const setting = (name) =>
    active.match(new RegExp(`^\\s*${name}\\s+(\\d+)\\b`, "m"))?.[1];
  const lowPower = setting("lowpowermode");
  log(
    `[verify preflight] Active Low Power Mode: ${lowPower === "1" ? "ON" : lowPower === "0" ? "OFF" : "UNKNOWN"}; idle sleep=${setting("sleep") ?? "unknown"} min; display sleep=${setting("displaysleep") ?? "unknown"} min.`,
  );
  if (lowPower === "1")
    warn(
      "[verify preflight] WARNING: Low Power Mode is ON before long browser runs; reduced host performance may contribute to timeouts. Record this state when diagnosing failures.",
    );
  else if (lowPower !== "0")
    warn(
      "[verify preflight] WARNING: cannot determine Low Power Mode before long browser runs.",
    );
  const assertions = evidence.get("pmset -g assertions") ?? "";
  const held = (name) =>
    new RegExp(`^\\s*${name}\\s+1\\s*$`, "m").test(assertions);
  for (const [name, prevented] of [
    ["sleep", held("PreventUserIdleSystemSleep") || held("PreventSystemSleep")],
    ["displaysleep", held("PreventUserIdleDisplaySleep")],
  ]) {
    const minutes = setting(name);
    if (minutes !== undefined && Number(minutes) > 0 && !prevented)
      warn(
        `[verify preflight] WARNING: ${name} is configured after ${minutes} idle minutes with no recorded prevention assertion; sleep can interrupt long browser runs.`,
      );
  }
  log(
    "[verify preflight] Read-only snapshot; settings, assertions, deadlines and retries are unchanged.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  verifyPreflight();
