-- Add ACCOUNT_PAYABLE to AuditEntityType enum
-- Migration: add_account_payable_to_audit_entity_type
-- Date: 2026-01-27

-- Add new value to existing enum
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ACCOUNT_PAYABLE';

-- Add comment
COMMENT ON TYPE "AuditEntityType" IS 'Tipos de entidade auditada: CLIENT, CASE, SCHEDULE_EVENT, ACCOUNT_PAYABLE';
