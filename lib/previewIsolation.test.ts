import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPreviewDatabaseIsolation, assertPreviewProviderIsolation } from './previewIsolation';
afterEach(() => vi.unstubAllEnvs());
describe('Preview isolation', () => {
  it('refuses absent identity and shared production even if a separate reference is asserted', () => {
    expect(() => assertPreviewDatabaseIsolation({ VERCEL_ENV: 'preview' })).toThrow();
    expect(() => assertPreviewDatabaseIsolation({ VERCEL_ENV: 'preview', EASY_AI_PREVIEW_DATABASE_REF: 'abcdefghijklmnopqrst', DATABASE_URL: 'postgresql://postgres.kkslcsrtyoaeehsddnuy:synthetic@pooler.supabase.com/db', DIRECT_URL: 'postgresql://postgres:synthetic@db.abcdefghijklmnopqrst.supabase.co/db' })).toThrow();
  });
  it('requires both pooled and direct identity to match the separate project', () => {
    const env = { VERCEL_ENV: 'preview', EASY_AI_PREVIEW_DATABASE_REF: 'abcdefghijklmnopqrst', DATABASE_URL: 'postgresql://postgres.abcdefghijklmnopqrst:synthetic@pooler.supabase.com/db', DIRECT_URL: 'postgresql://postgres:synthetic@db.abcdefghijklmnopqrst.supabase.co/db' };
    expect(() => assertPreviewDatabaseIsolation(env)).not.toThrow();
    expect(() => assertPreviewDatabaseIsolation({ ...env, DIRECT_URL: 'postgresql://postgres:synthetic@db.kkslcsrtyoaeehsddnuy.supabase.co/db' })).toThrow();
  });
  it('does not redirect or enable shared providers and does not change production behavior', () => {
    expect(() => assertPreviewDatabaseIsolation({ VERCEL_ENV: 'production' })).not.toThrow();
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(() => assertPreviewProviderIsolation()).toThrow('separate authorization');
  });
});
