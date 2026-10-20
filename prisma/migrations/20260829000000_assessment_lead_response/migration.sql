-- Approved assessment fields: lead-response diagnostic, sports write-in, and website answer.
-- Forward-only and purely additive. No column is dropped or renamed, and every existing
-- Submission row stays valid: the three text columns are nullable, and noWebsite defaults to
-- false so historical rows read as "no explicit no-website declaration".
--
-- This REPLACES the withdrawn 20260827000000_customer_growth_questions migration, which was
-- never applied to any database and has been removed along with the seven questions it backed.
ALTER TABLE "Submission" ADD COLUMN "leadResponse" TEXT;
ALTER TABLE "Submission" ADD COLUMN "favoriteTeam" TEXT;
ALTER TABLE "Submission" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "Submission" ADD COLUMN "noWebsite" BOOLEAN NOT NULL DEFAULT false;
