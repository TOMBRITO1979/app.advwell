-- Migration: Add PARTIAL status to InstallmentStatus enum
-- Date: 2026-01-08
-- Description: Adds PARTIAL (Parcialmente Pago) status for installment payments

-- Add new enum value
ALTER TYPE "InstallmentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
