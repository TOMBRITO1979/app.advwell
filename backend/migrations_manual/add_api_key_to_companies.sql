-- Migration: Add apiKey field to companies table
-- Purpose: Enable external integrations (Chatwoot, etc) via API authentication
-- Date: 2025-11-08

-- Add apiKey column to companies table
ALTER TABLE companies
ADD COLUMN "apiKey" VARCHAR(255) UNIQUE;

-- Create index for faster API key lookups
CREATE INDEX IF NOT EXISTS idx_companies_api_key ON companies("apiKey");

-- Add comment to document the column
COMMENT ON COLUMN companies."apiKey" IS 'API Key for external integrations (Chatwoot, webhooks, etc). Should be a UUID or secure random string.';

-- Note: The apiKey field is nullable and unique
-- Companies without an API key cannot use integration endpoints
-- To generate an API key, use: UPDATE companies SET "apiKey" = gen_random_uuid() WHERE id = 'company-id';
