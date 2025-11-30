-- Add nationality column to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "nationality" VARCHAR(255);
