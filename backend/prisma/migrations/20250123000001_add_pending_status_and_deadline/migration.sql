-- AlterEnum: Add PENDENTE to CaseStatus
ALTER TYPE "CaseStatus" ADD VALUE 'PENDENTE';

-- AlterTable: Add deadline column to Case
ALTER TABLE "cases" ADD COLUMN "deadline" TIMESTAMP(3);
