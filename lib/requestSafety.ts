export const JSON_BODY_LIMIT_BYTES = 32 * 1024;
export const GARY_MAX_MESSAGES = 80;
export const GARY_MAX_TRANSCRIPT_CHARS = 40_000;
export const PROVIDER_TIMEOUT_MS = 45_000;
export const INTEGRATION_TIMEOUT_MS = 8_000;

export async function readLimitedJson(request: Request, maxBytes = JSON_BODY_LIMIT_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('REQUEST_TOO_LARGE');
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('REQUEST_TOO_LARGE');
  return JSON.parse(text);
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label = 'operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
