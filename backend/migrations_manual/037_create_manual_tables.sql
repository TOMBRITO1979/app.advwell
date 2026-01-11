-- Migration: Create Manual/FAQ tables
-- Date: 2026-01-11
-- Description: Tabelas para o sistema de Manual/FAQ do AdvWell

-- Tabela de categorias do manual
CREATE TABLE IF NOT EXISTS "ManualCategory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT,
    "icon" VARCHAR(50),
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de artigos/tutoriais do manual
CREATE TABLE IF NOT EXISTS "ManualArticle" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL REFERENCES "ManualCategory"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "videoUrl" VARCHAR(500),
    "thumbnailUrl" VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("categoryId", "slug")
);

-- Tabela de FAQs
CREATE TABLE IF NOT EXISTS "ManualFAQ" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "categoryId" UUID REFERENCES "ManualCategory"("id") ON DELETE SET NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "ManualCategory_order_idx" ON "ManualCategory"("order");
CREATE INDEX IF NOT EXISTS "ManualCategory_active_idx" ON "ManualCategory"("active");

CREATE INDEX IF NOT EXISTS "ManualArticle_categoryId_idx" ON "ManualArticle"("categoryId");
CREATE INDEX IF NOT EXISTS "ManualArticle_order_idx" ON "ManualArticle"("order");
CREATE INDEX IF NOT EXISTS "ManualArticle_active_idx" ON "ManualArticle"("active");
CREATE INDEX IF NOT EXISTS "ManualArticle_slug_idx" ON "ManualArticle"("slug");

CREATE INDEX IF NOT EXISTS "ManualFAQ_categoryId_idx" ON "ManualFAQ"("categoryId");
CREATE INDEX IF NOT EXISTS "ManualFAQ_order_idx" ON "ManualFAQ"("order");
CREATE INDEX IF NOT EXISTS "ManualFAQ_active_idx" ON "ManualFAQ"("active");

-- Trigger para atualizar updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_manual_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_category_updated_at ON "ManualCategory";
CREATE TRIGGER manual_category_updated_at
    BEFORE UPDATE ON "ManualCategory"
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_updated_at();

DROP TRIGGER IF EXISTS manual_article_updated_at ON "ManualArticle";
CREATE TRIGGER manual_article_updated_at
    BEFORE UPDATE ON "ManualArticle"
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_updated_at();

DROP TRIGGER IF EXISTS manual_faq_updated_at ON "ManualFAQ";
CREATE TRIGGER manual_faq_updated_at
    BEFORE UPDATE ON "ManualFAQ"
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_updated_at();

-- Inserir categorias iniciais de exemplo
INSERT INTO "ManualCategory" ("name", "slug", "description", "icon", "order") VALUES
('Início Rápido', 'inicio-rapido', 'Guia rápido para começar a usar o AdvWell', 'Rocket', 1),
('Processos', 'processos', 'Como gerenciar processos judiciais', 'Scale', 2),
('Clientes', 'clientes', 'Gestão de clientes e contatos', 'Users', 3),
('Agenda', 'agenda', 'Calendário, tarefas e compromissos', 'Calendar', 4),
('Financeiro', 'financeiro', 'Contas a pagar e receber', 'DollarSign', 5),
('Monitoramento', 'monitoramento', 'Monitoramento de publicações via OAB', 'Bell', 6),
('Configurações', 'configuracoes', 'Configurações do sistema', 'Settings', 7)
ON CONFLICT (slug) DO NOTHING;
