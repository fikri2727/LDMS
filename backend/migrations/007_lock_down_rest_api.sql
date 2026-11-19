-- Lock down the Supabase REST API (2026-11-18).
-- Before this, every table in "public" had RLS off and the anon/authenticated roles had full
-- SELECT/INSERT/UPDATE/DELETE, so anyone with the project's anon key could read or change staff
-- data (including password hashes in "User") via https://<ref>.supabase.co/rest/v1/.
--
-- Nothing uses that API: the backend connects as the postgres (owner) role over the pooler, and
-- Storage calls use the service role key. Neither is affected by RLS (no FORCE) or by these revokes.
--
-- Two layers, both safe to re-run:
--   1. RLS on every public table, with no policies -> anon/authenticated see zero rows.
--   2. Revoke anon/authenticated privileges on tables, sequences and functions, and stop
--      new objects created by postgres from granting them again.

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
