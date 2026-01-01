-- CreateEnum
CREATE TYPE "PNJStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PNJPartType" AS ENUM ('AUTHOR', 'DEFENDANT', 'INTERESTED', 'THIRD_PARTY', 'OTHER');

-- CreateTable
CREATE TABLE "pnjs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "number" TEXT NOT NULL,
    "protocol" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PNJStatus" NOT NULL DEFAULT 'ACTIVE',
    "openDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "pnjs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pnj_parts" (
    "id" TEXT NOT NULL,
    "pnjId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "type" "PNJPartType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pnj_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pnj_movements" (
    "id" TEXT NOT NULL,
    "pnjId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "pnj_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pnjs_companyId_idx" ON "pnjs"("companyId");

-- CreateIndex
CREATE INDEX "pnjs_clientId_idx" ON "pnjs"("clientId");

-- CreateIndex
CREATE INDEX "pnjs_number_idx" ON "pnjs"("number");

-- CreateIndex
CREATE INDEX "pnjs_companyId_status_idx" ON "pnjs"("companyId", "status");

-- CreateIndex
CREATE INDEX "pnj_parts_pnjId_idx" ON "pnj_parts"("pnjId");

-- CreateIndex
CREATE INDEX "pnj_movements_pnjId_idx" ON "pnj_movements"("pnjId");

-- CreateIndex
CREATE INDEX "pnj_movements_date_idx" ON "pnj_movements"("date");

-- AddForeignKey
ALTER TABLE "pnjs" ADD CONSTRAINT "pnjs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnjs" ADD CONSTRAINT "pnjs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnjs" ADD CONSTRAINT "pnjs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnj_parts" ADD CONSTRAINT "pnj_parts_pnjId_fkey" FOREIGN KEY ("pnjId") REFERENCES "pnjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnj_movements" ADD CONSTRAINT "pnj_movements_pnjId_fkey" FOREIGN KEY ("pnjId") REFERENCES "pnjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnj_movements" ADD CONSTRAINT "pnj_movements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
