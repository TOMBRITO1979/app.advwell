-- Tornar clientId opcional na tabela cases
-- Permite criar processos sem vincular a um cliente
-- O relacionamento agora e feito via CasePart (Demandante/Demandado)

-- Remover obrigatoriedade do campo
ALTER TABLE cases ALTER COLUMN "clientId" DROP NOT NULL;

-- Alterar constraint de FK para SET NULL em vez de CASCADE
ALTER TABLE cases
  DROP CONSTRAINT IF EXISTS "cases_clientId_fkey";

ALTER TABLE cases
  ADD CONSTRAINT "cases_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES clients(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Comentario para documentacao
COMMENT ON COLUMN cases."clientId" IS 'ID do cliente (opcional/legado). Usar CasePart para Demandante/Demandado.';
