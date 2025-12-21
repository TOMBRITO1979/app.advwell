-- AddColumn createdAt to consent_logs (was missing from original migration)
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
