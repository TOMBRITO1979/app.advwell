-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('FISICA', 'JURIDICA');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "personType" "PersonType" NOT NULL DEFAULT 'FISICA';
