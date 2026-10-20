-- Duplicate guard for Gary contact requests.
-- Additive and nullable: existing PublicChatSession rows stay valid, no backfill required.
-- NULL means no contact request has been submitted from that chat session.
ALTER TABLE "PublicChatSession" ADD COLUMN "contactRequestedAt" TIMESTAMP(3);
