import { expect, test, vi } from "vitest";
import { createServer } from "node:http";
import { probeLoopback } from "../scripts/loopback-health.mjs";
test("nightly probes real loopback when fetch is unavailable; rejects HTTP errors, closed ports and timeouts", async () => {
  let status = 200;
  const server = createServer((_request, response) => {
    if (status === 0) return;
    response.statusCode = status;
    response.end("ready");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected a bound port.");
  vi.stubGlobal("fetch", () => {
    throw new Error("fetch adapter unavailable");
  });
  try {
    expect(await probeLoopback(address.port)).toEqual({
      ok: true,
      status: 200,
    });
    status = 404;
    expect(await probeLoopback(address.port)).toEqual({
      ok: false,
      status: 404,
    });
    status = 0;
    expect(await probeLoopback(address.port, 25)).toMatchObject({
      ok: false,
      error: "Loopback readiness timeout",
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    expect(await probeLoopback(address.port)).toMatchObject({ ok: false });
    for (const port of [0, 65536, NaN])
      expect(() => probeLoopback(port)).toThrow(TypeError);
    expect(() => probeLoopback(4190, 0)).toThrow(TypeError);
  } finally {
    vi.unstubAllGlobals();
    server.closeAllConnections();
    server.close();
  }
});
