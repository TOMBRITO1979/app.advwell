// Tipos compartilhados para ScheduleEvent (Agendamento, Tarefas, Kanban)
// Todas as 3 abas usam a mesma tabela ScheduleEvent no banco de dados

export type ScheduleEventType = 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'PERICIA' | 'GOOGLE_MEET';
export type Priority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type KanbanStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Client {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
}

export interface Case {
  id: string;
  processNumber: string;
  subject?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface EventAssignment {
  id: string;
  user: User;
}

// Interface unificada para eventos de agenda (usada em Agendamento, Tarefas e Kanban)
export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  type: ScheduleEventType;
  priority: Priority;
  date: string;
  endDate?: string;
  completed: boolean;
  kanbanStatus?: KanbanStatus;
  googleMeetLink?: string;
  client?: Client;
  case?: Case;
  assignedUsers?: EventAssignment[];
  createdAt: string;
  updatedAt?: string;
}

// Interface para formulário de criação/edição
export interface ScheduleFormData {
  title: string;
  description: string;
  type: ScheduleEventType;
  priority: Priority;
  date: string;
  endDate: string;
  clientId: string;
  caseId: string;
  assignedUserIds: string[];
}
