-- Hand-authored: no live database/shadow-database connection was reachable from this
-- environment to run `prisma migrate diff`. Written to match 20260727000000_init's exact
-- style, validated with `prisma validate`/`prisma generate` (both offline-safe). NOT applied
-- to any database as part of this change — a reviewer should double-check this file before
-- `prisma migrate deploy` is ever run against it.

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "funnelCorrelationId" TEXT;

-- CreateIndex
CREATE INDEX "Submission_funnelCorrelationId_idx" ON "Submission"("funnelCorrelationId");

-- CreateEnum
CREATE TYPE "GaryChatSessionStatus" AS ENUM ('active', 'minimized', 'handed_off_to_assessment', 'ended');

-- CreateEnum
CREATE TYPE "GaryChatMessageRole" AS ENUM ('visitor', 'gary', 'system');

-- CreateEnum
CREATE TYPE "GarySafetyClass" AS ENUM ('none', 'sensitive');

-- CreateTable
CREATE TABLE "PublicContact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "businessName" TEXT,
    "phoneNormalized" TEXT,
    "emailNormalized" TEXT,
    "preferredContactTime" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "consentText" TEXT,
    "sourceSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicChatSession" (
    "id" TEXT NOT NULL,
    "status" "GaryChatSessionStatus" NOT NULL DEFAULT 'active',
    "anonymousId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "visitorTurnCount" INTEGER NOT NULL DEFAULT 0,
    "assessmentOfferCount" INTEGER NOT NULL DEFAULT 0,
    "currentPage" TEXT,
    "referrer" TEXT,
    "utm" JSONB,
    "identifiedContactId" TEXT,
    "handedOffAt" TIMESTAMP(3),

    CONSTRAINT "PublicChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "GaryChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "optionPayload" JSONB,
    "safetyClass" "GarySafetyClass" NOT NULL DEFAULT 'none',
    "model" TEXT,
    "responseValidationResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentHandoff" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "signedTokenHash" TEXT NOT NULL,
    "allowedPrefillFields" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "submissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEventOutbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrrOutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'contact.captured',
    "contactSnapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "CrrOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicContact_emailNormalized_idx" ON "PublicContact"("emailNormalized");

-- CreateIndex
CREATE INDEX "PublicContact_phoneNormalized_idx" ON "PublicContact"("phoneNormalized");

-- CreateIndex
CREATE INDEX "PublicChatSession_anonymousId_idx" ON "PublicChatSession"("anonymousId");

-- CreateIndex
CREATE INDEX "PublicChatSession_status_lastActivityAt_idx" ON "PublicChatSession"("status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "PublicChatMessage_sessionId_createdAt_idx" ON "PublicChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentHandoff_sessionId_key" ON "AssessmentHandoff"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEventOutbox_idempotencyKey_key" ON "FunnelEventOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FunnelEventOutbox_deliveredAt_nextAttemptAt_idx" ON "FunnelEventOutbox"("deliveredAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "PublicChatSession" ADD CONSTRAINT "PublicChatSession_identifiedContactId_fkey" FOREIGN KEY ("identifiedContactId") REFERENCES "PublicContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicChatMessage" ADD CONSTRAINT "PublicChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentHandoff" ADD CONSTRAINT "AssessmentHandoff_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
