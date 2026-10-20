export function probeLoopback(
  port: number,
  timeoutMs?: number,
): Promise<{ ok: boolean; status?: number; error?: string }>;
