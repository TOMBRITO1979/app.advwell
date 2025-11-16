-- Migration: Alter informarCliente from BOOLEAN to TEXT
-- Date: 2025-11-03
-- Description: Altera o campo informarCliente de Boolean para Text
--   para permitir texto explicativo do andamento ao cliente

-- Primeiro, remove o default
ALTER TABLE "cases" ALTER COLUMN "informarCliente" DROP DEFAULT;

-- Tornar a coluna nullable
ALTER TABLE "cases" ALTER COLUMN "informarCliente" DROP NOT NULL;

-- Depois, converte valores existentes (true -> texto, false/null -> null)
ALTER TABLE "cases"
ALTER COLUMN "informarCliente" TYPE TEXT
USING CASE
  WHEN "informarCliente" = true THEN 'Informar cliente sobre este processo'
  ELSE NULL
END;

-- Atualiza o comentário da coluna
COMMENT ON COLUMN "cases"."informarCliente" IS 'Texto explicativo do andamento do processo para informar ao cliente';
