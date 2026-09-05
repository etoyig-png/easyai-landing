-- Keep the retired answers for historical submissions while the new
-- discovery and website-conversion signals become the active assessment fields.
ALTER TABLE "Submission"
  ALTER COLUMN "usingAiTools" DROP NOT NULL,
  ALTER COLUMN "sportsFan" DROP NOT NULL,
  ADD COLUMN "searchVisibility" TEXT,
  ADD COLUMN "websiteConversion" TEXT;
