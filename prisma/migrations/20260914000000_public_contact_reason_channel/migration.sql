-- The assistant's contact flow stores what the visitor asked for, which channel captured
-- them, and which site owns the record. Nullable: rows captured before this remain valid.
ALTER TABLE "PublicContact" ADD COLUMN "reason" TEXT;
ALTER TABLE "PublicContact" ADD COLUMN "channel" TEXT;
ALTER TABLE "PublicContact" ADD COLUMN "siteKey" TEXT;

CREATE INDEX "PublicContact_siteKey_createdAt_idx" ON "PublicContact"("siteKey", "createdAt");
