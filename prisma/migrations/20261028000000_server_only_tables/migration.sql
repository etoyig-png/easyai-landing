-- Server-owned tables have no public Data API use. Rehearse with actual role/grant inventory
-- and retain the pre-change ACL/RLS checkpoint before any separately authorized production run.
-- The owner and BYPASSRLS server roles retain access; FORCE ROW LEVEL SECURITY is not enabled.
DO $$
DECLARE relation_name text; api_role text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'Submission', 'PublicContact', 'PublicChatSession', 'PublicChatMessage',
    'AssessmentHandoff', 'FunnelEventOutbox', 'CrrOutboxEvent',
    'ContactRateLimitEvent', '_prisma_migrations'
  ] LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', relation_name);
      FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', relation_name, api_role);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;
