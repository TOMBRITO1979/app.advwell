-- Migration: Add ultimoAndamento, informarCliente, linkProcesso to Case table
-- Date: 2025-11-03
-- Description: Adiciona 3 novos campos à tabela cases:
--   - ultimoAndamento: Último movimento do processo (atualizado via API)
--   - informarCliente: Flag para informar cliente sobre atualizações
--   - linkProcesso: Link/URL do processo no tribunal

ALTER TABLE "cases"
ADD COLUMN "ultimoAndamento" TEXT,
ADD COLUMN "informarCliente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "linkProcesso" TEXT;

-- Comentários das colunas
COMMENT ON COLUMN "cases"."ultimoAndamento" IS 'Último movimento do processo, atualizado automaticamente pela API DataJud';
COMMENT ON COLUMN "cases"."informarCliente" IS 'Flag para indicar se o cliente deve ser informado sobre atualizações do processo';
COMMENT ON COLUMN "cases"."linkProcesso" IS 'Link ou URL do processo no site do tribunal';
