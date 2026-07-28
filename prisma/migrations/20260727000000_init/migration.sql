-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "ipAddress" TEXT,
    "errorMessage" TEXT,
    "workSituation" TEXT NOT NULL,
    "usingAiTools" TEXT NOT NULL,
    "aiChallenge" TEXT NOT NULL,
    "desiredOutcome" TEXT NOT NULL,
    "timeDrain" TEXT NOT NULL,
    "privacyConcern" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "industryOther" TEXT,
    "sportsFan" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resultHtml" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_ipAddress_createdAt_idx" ON "Submission"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_email_idx" ON "Submission"("email");
