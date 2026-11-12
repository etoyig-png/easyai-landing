import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL ?? 'postgresql://unused@127.0.0.1/unused' } } });
const names = ['Submission', 'PublicContact', 'PublicChatSession', 'PublicChatMessage', 'AssessmentHandoff', 'FunnelEventOutbox', 'CrrOutboxEvent', 'ContactRateLimitEvent', '_prisma_migrations'];
describe.skipIf(!process.env.TEST_DATABASE_URL)('server-only website tables on isolated PostgreSQL', () => {
  afterAll(() => db.$disconnect());
  it('enables RLS without forcing it on the legitimate table owner', async () => {
    const rows = await db.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class JOIN pg_namespace n ON n.oid = relnamespace WHERE n.nspname = 'public' AND relname = ANY(${names}::text[])`;
    expect(rows).toHaveLength(names.length);
    expect(rows.every((row) => row.relrowsecurity && !row.relforcerowsecurity)).toBe(true);
    expect(await db.submission.count()).toBeGreaterThanOrEqual(0);
  });
  it('the public API role has no table read or write privileges', async () => {
    const role = await db.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'anon') AS exists`;
    // The local rehearsal provisions anon before migration, so this cannot silently skip.
    expect(role[0].exists).toBe(true);
    const rows = await db.$queryRaw<{ allowed: boolean }[]>`SELECT has_table_privilege('anon', format('public.%I', t), 'SELECT,INSERT,UPDATE,DELETE') AS allowed FROM unnest(${names}::text[]) t`;
    expect(rows.every((row) => !row.allowed)).toBe(true);
  });
});
