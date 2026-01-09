-- Migration: Add status column to financial_transactions table
-- Date: 2026-01-09

-- Create the TransactionStatus enum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED');

-- Add status column with default value
ALTER TABLE "financial_transactions" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- Create indexes for status
CREATE INDEX "financial_transactions_status_idx" ON "financial_transactions"("status");
CREATE INDEX "financial_transactions_companyId_status_idx" ON "financial_transactions"("companyId", "status");
