-- AlterTable
ALTER TABLE "clients" ADD COLUMN "personType" TEXT NOT NULL DEFAULT 'FISICA';

-- CreateEnum for PersonType (values: FISICA, JURIDICA)
