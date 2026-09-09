-- Durable rate-limit ledger for the public contact form.
-- Stores only a one-way hash of the client identity plus a timestamp.
CREATE TABLE "ContactRateLimitEvent" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactRateLimitEvent_ipHash_createdAt_idx" ON "ContactRateLimitEvent"("ipHash", "createdAt");
