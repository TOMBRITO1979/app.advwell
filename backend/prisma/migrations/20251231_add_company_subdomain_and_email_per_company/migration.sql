-- Migration: Add company subdomain and email unique per company
-- This migration:
-- 1. Adds subdomain field to companies table
-- 2. Changes email constraint from global unique to unique per company

-- Add subdomain column to companies
ALTER TABLE "companies" ADD COLUMN "subdomain" TEXT;

-- Create unique index for subdomain
CREATE UNIQUE INDEX "companies_subdomain_key" ON "companies"("subdomain");

-- Drop the existing unique constraint on email in users table
DROP INDEX IF EXISTS "users_email_key";

-- Create composite unique constraint for email per company
-- Note: PostgreSQL allows multiple NULL values in unique constraints, so SUPER_ADMIN users
-- (with companyId = NULL) can still have unique emails verified in application code
CREATE UNIQUE INDEX "users_companyId_email_key" ON "users"("companyId", "email");

-- Create index for email lookups
CREATE INDEX "users_email_idx" ON "users"("email");
