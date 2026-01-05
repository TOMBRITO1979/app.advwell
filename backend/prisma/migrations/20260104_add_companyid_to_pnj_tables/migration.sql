-- ISSUE 2 FIX: Add companyId to pnj_parts and pnj_movements for direct tenant isolation

-- Step 1: Add nullable companyId columns
ALTER TABLE "pnj_parts" ADD COLUMN "companyId" TEXT;
ALTER TABLE "pnj_movements" ADD COLUMN "companyId" TEXT;

-- Step 2: Populate companyId from parent PNJ table
UPDATE "pnj_parts" SET "companyId" = (
  SELECT p."companyId" FROM "pnjs" p WHERE p."id" = "pnj_parts"."pnjId"
);

UPDATE "pnj_movements" SET "companyId" = (
  SELECT p."companyId" FROM "pnjs" p WHERE p."id" = "pnj_movements"."pnjId"
);

-- Step 3: Make columns NOT NULL (after population)
ALTER TABLE "pnj_parts" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "pnj_movements" ALTER COLUMN "companyId" SET NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE "pnj_parts" ADD CONSTRAINT "pnj_parts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pnj_movements" ADD CONSTRAINT "pnj_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create indexes for tenant filtering
CREATE INDEX "pnj_parts_companyId_idx" ON "pnj_parts"("companyId");
CREATE INDEX "pnj_movements_companyId_idx" ON "pnj_movements"("companyId");
