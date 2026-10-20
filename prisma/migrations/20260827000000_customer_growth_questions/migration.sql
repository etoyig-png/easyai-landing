-- Customer-growth assessment questions.
-- Purely additive: every column is nullable, so existing Submission rows remain valid and no
-- backfill is required. NULL means the question was not asked (rows created before this
-- migration) or not answered, which is distinct from an empty answer.
ALTER TABLE "Submission" ADD COLUMN "customerDiscovery" TEXT;
ALTER TABLE "Submission" ADD COLUMN "searchVisibility" TEXT;
ALTER TABLE "Submission" ADD COLUMN "websiteAction" TEXT;
ALTER TABLE "Submission" ADD COLUMN "responseSpeed" TEXT;
ALTER TABLE "Submission" ADD COLUMN "missedCalls" TEXT;
ALTER TABLE "Submission" ADD COLUMN "followUpConsistency" TEXT;
ALTER TABLE "Submission" ADD COLUMN "sensitiveInfo" TEXT;
