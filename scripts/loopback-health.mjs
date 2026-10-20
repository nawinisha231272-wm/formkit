import { get } from "node:http";
/** Probe this process's loopback network directly, independent of fetch/proxy adapters. */
export function probeLoopback(port, timeoutMs = 2000) {
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  )
    throw new TypeError("Expected a loopback port and positive timeout.");
  return new Promise((resolve) => {
    const request = get(
      { hostname: "127.0.0.1", port, path: "/", agent: false },
      (response) => {
        const status = response.statusCode ?? 0;
        response.resume();
        resolve({ ok: status >= 200 && status < 300, status });
      },
    );
    request.setTimeout(timeoutMs, () =>
      request.destroy(new Error("Loopback readiness timeout")),
    );
    request.on("error", (error) =>
      resolve({ ok: false, error: error.message }),
    );
  });
}
