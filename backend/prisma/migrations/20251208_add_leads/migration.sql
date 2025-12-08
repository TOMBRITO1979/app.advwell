-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'CONTATADO', 'QUALIFICADO', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WHATSAPP', 'TELEFONE', 'SITE', 'INDICACAO', 'REDES_SOCIAIS', 'OUTROS');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "contactReason" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "source" "LeadSource" NOT NULL DEFAULT 'WHATSAPP',
    "notes" TEXT,
    "convertedToClientId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "leads"("companyId");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_companyId_status_idx" ON "leads"("companyId", "status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedToClientId_fkey" FOREIGN KEY ("convertedToClientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
