-- Migration: Add Chatwell Integration fields to companies table
-- Date: 2026-01-10
-- Description: Adds fields to enable embedding Chatwell inside AdvWell
--              with hierarchical permission system (SUPER_ADMIN > ADMIN > USER)

-- Add Chatwell integration fields to companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "chatwell_enabled" BOOLEAN DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "chatwell_url" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "chatwell_email" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "chatwell_token" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "companies"."chatwell_enabled" IS 'Whether Chatwell is enabled for this company (controlled by SUPER_ADMIN)';
COMMENT ON COLUMN "companies"."chatwell_url" IS 'URL of the Chatwell panel (e.g., https://chat.company.com)';
COMMENT ON COLUMN "companies"."chatwell_email" IS 'Login email for Chatwell (encrypted with AES-256)';
COMMENT ON COLUMN "companies"."chatwell_token" IS 'API token or password for Chatwell authentication (encrypted with AES-256)';

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name LIKE 'chatwell%';
