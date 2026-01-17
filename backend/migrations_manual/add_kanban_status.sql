-- Criar enum KanbanStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KanbanStatus') THEN
        CREATE TYPE "KanbanStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
    END IF;
END$$;

-- Adicionar coluna kanbanStatus na tabela schedule_events
ALTER TABLE schedule_events 
ADD COLUMN IF NOT EXISTS "kanbanStatus" "KanbanStatus";

-- Atualizar tarefas existentes baseado no status completed
UPDATE schedule_events 
SET "kanbanStatus" = 'DONE' 
WHERE type = 'TAREFA' AND completed = true AND "kanbanStatus" IS NULL;

UPDATE schedule_events 
SET "kanbanStatus" = 'TODO' 
WHERE type = 'TAREFA' AND completed = false AND "kanbanStatus" IS NULL;
