-- Additive assessment reconciliation fields. Nullable answer columns preserve
-- compatibility with submissions created before these questions existed.
ALTER TABLE "Submission"
ADD COLUMN "leadResponse" TEXT,
ADD COLUMN "favoriteTeam" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "noWebsite" BOOLEAN NOT NULL DEFAULT false;
