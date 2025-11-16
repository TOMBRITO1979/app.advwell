-- Migração: Adicionar campos de verificação de email
-- Data: 04/11/2025
-- Descrição: Adiciona campos para verificação de email dos usuários

-- Adicionar campos de verificação de email
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP(3);

-- Marcar usuários existentes como verificados (para não bloquear contas atuais)
UPDATE users
SET "emailVerified" = true
WHERE "emailVerified" = false;

-- Comentário
COMMENT ON COLUMN users."emailVerified" IS 'Indica se o email do usuário foi verificado';
COMMENT ON COLUMN users."emailVerificationToken" IS 'Token de verificação de email';
COMMENT ON COLUMN users."emailVerificationExpiry" IS 'Data de expiração do token de verificação';
