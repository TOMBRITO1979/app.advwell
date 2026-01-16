-- Adicionar campos comarca e vara na tabela cases
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "comarca" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "vara" TEXT;

-- Adicionar comentários
COMMENT ON COLUMN "cases"."comarca" IS 'Comarca do processo (ex: São Paulo, Campinas)';
COMMENT ON COLUMN "cases"."vara" IS 'Vara do processo (ex: 1ª Vara Cível, 2ª Vara Criminal)';
