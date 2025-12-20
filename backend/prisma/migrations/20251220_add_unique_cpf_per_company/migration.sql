-- CreateIndex: Índice composto para buscas por CPF dentro da empresa
CREATE INDEX IF NOT EXISTS "clients_companyId_cpf_idx" ON "clients"("companyId", "cpf");

-- CreateIndex: Constraint de unicidade CPF por empresa (NULL é permitido para múltiplos clientes)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_companyId_cpf_key" ON "clients"("companyId", "cpf");
