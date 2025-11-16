-- Criar tipo enum para tipo de evento (verificar se já existe)
DO $$ BEGIN
  CREATE TYPE "ScheduleEventType" AS ENUM ('COMPROMISSO', 'TAREFA', 'PRAZO', 'AUDIENCIA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de eventos da agenda
CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,

  -- Dados do evento
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type "ScheduleEventType" NOT NULL DEFAULT 'COMPROMISSO',

  -- Data e hora
  date TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),

  -- Relacionamentos (opcionais)
  "clientId" TEXT,
  "caseId" TEXT,

  -- Status e responsável
  completed BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,

  -- Metadados
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT "schedule_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "schedule_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "schedule_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES cases(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "schedule_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_schedule_events_companyId ON schedule_events("companyId");
CREATE INDEX IF NOT EXISTS idx_schedule_events_clientId ON schedule_events("clientId");
CREATE INDEX IF NOT EXISTS idx_schedule_events_caseId ON schedule_events("caseId");
CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON schedule_events(date);
CREATE INDEX IF NOT EXISTS idx_schedule_events_completed ON schedule_events(completed);
CREATE INDEX IF NOT EXISTS idx_schedule_events_type ON schedule_events(type);

-- Comentários
COMMENT ON TABLE schedule_events IS 'Tabela de eventos da agenda (compromissos, tarefas, prazos)';
COMMENT ON COLUMN schedule_events.title IS 'Título do evento';
COMMENT ON COLUMN schedule_events.description IS 'Descrição detalhada do evento';
COMMENT ON COLUMN schedule_events.type IS 'Tipo de evento (COMPROMISSO, TAREFA, PRAZO, AUDIENCIA)';
COMMENT ON COLUMN schedule_events.date IS 'Data e hora do evento';
COMMENT ON COLUMN schedule_events."endDate" IS 'Data e hora de término do evento (opcional)';
COMMENT ON COLUMN schedule_events.completed IS 'Se o evento foi concluído (para tarefas)';
COMMENT ON COLUMN schedule_events."createdBy" IS 'Usuário que criou o evento';
