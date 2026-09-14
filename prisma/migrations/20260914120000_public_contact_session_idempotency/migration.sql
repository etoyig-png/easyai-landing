-- Session idempotency and notification state for the assistant's contact flow.
--
-- PREFLIGHT (read-only, run before applying): no two PublicContact rows may share a
-- sourceSessionId, or the unique index below will refuse to build and this migration fails
-- cleanly without partial effect (each statement runs in the migration's transaction).
--
--   select "sourceSessionId", count(*)
--   from "PublicContact"
--   where "sourceSessionId" is not null
--   group by 1 having count(*) > 1;
--
-- Expected on production as of 2026-09-14: zero rows (no code path on main has ever written
-- PublicContact). If duplicates exist, keep the newest row per session and null out
-- sourceSessionId on the older ones before re-running; do not delete contact data.

ALTER TABLE "PublicContact" ADD COLUMN "notificationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "PublicContact" ADD COLUMN "notificationAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PublicContact" ADD COLUMN "notifiedAt" TIMESTAMP(3);
ALTER TABLE "PublicContact" ADD COLUMN "notificationError" TEXT;

CREATE UNIQUE INDEX "PublicContact_sourceSessionId_key" ON "PublicContact"("sourceSessionId");
CREATE INDEX "PublicContact_notificationStatus_updatedAt_idx" ON "PublicContact"("notificationStatus", "updatedAt");
