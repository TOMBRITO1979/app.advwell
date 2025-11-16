-- Add accounts payable table
-- Migration: add_accounts_payable
-- Date: 2025-11-16

-- Create enum for account payable status
CREATE TYPE "AccountPayableStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- Create accounts_payable table
CREATE TABLE IF NOT EXISTS accounts_payable (
  id TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  supplier TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidDate" TIMESTAMP(3),
  status "AccountPayableStatus" NOT NULL DEFAULT 'PENDING',
  category TEXT,
  notes TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accounts_payable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accounts_payable_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "accounts_payable_companyId_idx" ON accounts_payable("companyId");
CREATE INDEX IF NOT EXISTS "accounts_payable_status_idx" ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS "accounts_payable_dueDate_idx" ON accounts_payable("dueDate");
CREATE INDEX IF NOT EXISTS "accounts_payable_createdBy_idx" ON accounts_payable("createdBy");

-- Add comments
COMMENT ON TABLE accounts_payable IS 'Tabela de contas a pagar';
COMMENT ON COLUMN accounts_payable.supplier IS 'Fornecedor/Credor';
COMMENT ON COLUMN accounts_payable.description IS 'Descrição da conta';
COMMENT ON COLUMN accounts_payable.amount IS 'Valor da conta';
COMMENT ON COLUMN accounts_payable."dueDate" IS 'Data de vencimento';
COMMENT ON COLUMN accounts_payable."paidDate" IS 'Data de pagamento (quando pago)';
COMMENT ON COLUMN accounts_payable.status IS 'Status: PENDING, PAID, OVERDUE, CANCELLED';
COMMENT ON COLUMN accounts_payable.category IS 'Categoria (ex: Aluguel, Salários, Fornecedores)';
