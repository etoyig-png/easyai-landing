/** Fail closed on shared Preview databases. An attestation alone cannot identify a target. */
export function assertPreviewDatabaseIsolation(env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (env.VERCEL_ENV !== 'preview') return;
  const expected = env.EASY_AI_PREVIEW_DATABASE_REF;
  if (!expected || !/^[a-z]{20}$/.test(expected) || expected === 'kkslcsrtyoaeehsddnuy') {
    throw new Error('Preview database isolation is not configured');
  }
  for (const value of [env.DATABASE_URL, env.DIRECT_URL]) {
    let url: URL;
    try { url = new URL(value ?? ''); } catch { throw new Error('Preview database isolation is not configured'); }
    const username = decodeURIComponent(url.username);
    const ref = username.startsWith('postgres.') ? username.slice('postgres.'.length) : url.hostname.match(/^db\.([a-z]{20})\.supabase\.co$/)?.[1];
    const permittedHost = url.hostname === `db.${expected}.supabase.co` || url.hostname === 'pooler.supabase.com' || url.hostname.endsWith('.pooler.supabase.com');
    if (!permittedHost || ref !== expected || url.hostname.includes('kkslcsrtyoaeehsddnuy') || username.includes('kkslcsrtyoaeehsddnuy') ||
      !['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Preview database target is not isolated');
  }
}

/** Shared provider credentials are unverified. Preview never invokes live providers yet. */
export function assertPreviewProviderIsolation(): void {
  if (process.env.VERCEL_ENV === 'preview') throw new Error('Preview provider activation requires isolated configuration and separate authorization');
}
