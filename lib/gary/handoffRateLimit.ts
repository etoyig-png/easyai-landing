const WINDOW_MS = 60_000;
const MAX_CALLS = 6;
const calls = new Map<string, number[]>();

export function isHandoffRateLimited(sessionId: string, now = Date.now()): boolean {
  if (calls.size > 10_000) {
    calls.forEach((timestamps, key) => {
      if (!timestamps.some((time) => time > now - WINDOW_MS)) calls.delete(key);
    });
  }
  const recent = (calls.get(sessionId) ?? []).filter((time) => time > now - WINDOW_MS);
  if (recent.length >= MAX_CALLS) { calls.set(sessionId, recent); return true; }
  recent.push(now);
  calls.set(sessionId, recent);
  return false;
}

export function resetHandoffRateLimits(): void { calls.clear(); }
