import React, { useState, useEffect } from 'react';
import {
  Search,
  GripVertical,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  date: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  completed: boolean;
  kanbanStatus?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  type: string;
  client?: {
    id: string;
    name: string;
  };
  case?: {
    id: string;
    processNumber: string;
  };
  assignedUsers?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Column {
  id: 'todo' | 'in_progress' | 'done';
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const columns: Column[] = [
  {
    id: 'todo',
    title: 'A Fazer',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'in_progress',
    title: 'Em Andamento',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'done',
    title: 'Concluído',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
];

const priorityColors: Record<string, string> = {
  BAIXA: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  MEDIA: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ALTA: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  URGENTE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const TaskKanban: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schedule', {
        params: {
          type: 'TAREFA',
          limit: 500 // Load all tasks for kanban view
        }
      });
      setTasks(response.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Determine which column a task belongs to
  const getTaskColumn = (task: Task): 'todo' | 'in_progress' | 'done' => {
    // Usar kanbanStatus se disponível
    if (task.kanbanStatus) {
      switch (task.kanbanStatus) {
        case 'TODO': return 'todo';
        case 'IN_PROGRESS': return 'in_progress';
        case 'DONE': return 'done';
      }
    }

    // Fallback para completed se kanbanStatus não existir
    if (task.completed) return 'done';
    return 'todo';
  };

  // Filter tasks by column
  const getTasksByColumn = (columnId: 'todo' | 'in_progress' | 'done') => {
    const now = new Date().getTime();

    return tasks
      .filter(task => {
        if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (filterPriority && task.priority !== filterPriority) {
          return false;
        }
        return getTaskColumn(task) === columnId;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate || a.date || a.createdAt).getTime();
        const dateB = new Date(b.dueDate || b.date || b.createdAt).getTime();

        // Primeiro: tarefas futuras/atuais antes de passadas
        const isPastA = dateA < now;
        const isPastB = dateB < now;

        if (isPastA && !isPastB) return 1;  // A é passado, B não -> B vem primeiro
        if (!isPastA && isPastB) return -1; // A não é passado, B é -> A vem primeiro

        // Segundo: ordenar por prioridade (URGENTE primeiro)
        const priorityOrder = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Terceiro: dentro da mesma prioridade, ordenar por data
        // Futuros: mais próximo primeiro (ASC)
        // Passados: mais recente primeiro (DESC)
        if (isPastA && isPastB) {
          return dateB - dateA; // Passados: mais recente primeiro
        }
        return dateA - dateB; // Futuros: mais próximo primeiro
      });
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    setDraggedTask(null);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetColumn: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();

    if (!draggedTask) return;

    const currentColumn = getTaskColumn(draggedTask);
    if (currentColumn === targetColumn) return;

    // Mapear coluna para kanbanStatus
    const kanbanStatusMap: Record<string, string> = {
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'done': 'DONE'
    };

    try {
      await api.put(`/schedule/${draggedTask.id}`, {
        kanbanStatus: kanbanStatusMap[targetColumn]
      });

      const columnNames: Record<string, string> = {
        'todo': 'A Fazer',
        'in_progress': 'Em Andamento',
        'done': 'Concluído'
      };
      toast.success(`Tarefa movida para "${columnNames[targetColumn]}"!`);

      // Reload tasks
      await loadTasks();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
    }
  };

  // Toggle task completion
  const toggleComplete = async (task: Task) => {
    try {
      await api.put(`/schedule/${task.id}`, { completed: !task.completed });
      toast.success(task.completed ? 'Tarefa reaberta!' : 'Tarefa concluída!');
      await loadTasks();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      await api.delete(`/schedule/${taskId}`);
      toast.success('Tarefa excluída!');
      await loadTasks();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
    setActionMenuOpen(null);
  };

  // Move task to specific column
  const moveTaskToColumn = async (task: Task, targetColumn: 'todo' | 'in_progress' | 'done') => {
    const currentColumn = getTaskColumn(task);
    if (currentColumn === targetColumn) {
      setActionMenuOpen(null);
      return;
    }

    // Mapear coluna para kanbanStatus
    const kanbanStatusMap: Record<string, string> = {
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'done': 'DONE'
    };

    try {
      await api.put(`/schedule/${task.id}`, {
        kanbanStatus: kanbanStatusMap[targetColumn]
      });

      const columnNames: Record<string, string> = {
        'todo': 'A Fazer',
        'in_progress': 'Em Andamento',
        'done': 'Concluído'
      };
      toast.success(`Tarefa movida para "${columnNames[targetColumn]}"!`);
      await loadTasks();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
    }
    setActionMenuOpen(null);
  };

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    if (task.completed) return false;
    const dueDate = task.dueDate || task.date;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Render task card
  const renderTaskCard = (task: Task) => {
    const overdue = isOverdue(task);

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        className={`
          bg-white dark:bg-slate-800 rounded-lg shadow-sm border
          ${overdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-slate-700'}
          p-4 cursor-grab active:cursor-grabbing
          hover:shadow-md transition-shadow duration-200
          group
        `}
      >
        {/* Header with drag handle and actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h4 className="font-medium text-gray-900 dark:text-slate-100 truncate">{task.title}</h4>
          </div>
          <div className="relative">
            <button
              onClick={() => setActionMenuOpen(actionMenuOpen === task.id ? null : task.id)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {actionMenuOpen === task.id && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                {/* Opções de mover para colunas */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">
                  Mover para
                </div>
                {columns.map((column) => {
                  const isCurrentColumn = getTaskColumn(task) === column.id;
                  return (
                    <button
                      key={column.id}
                      onClick={() => moveTaskToColumn(task, column.id)}
                      disabled={isCurrentColumn}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                        isCurrentColumn
                          ? 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {column.icon}
                      {column.title}
                      {isCurrentColumn && <span className="ml-auto text-xs">(atual)</span>}
                    </button>
                  );
                })}
                <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setShowTaskModal(true);
                    setActionMenuOpen(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                >
                  <Eye className="w-4 h-4" /> Ver detalhes
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority badge */}
          <span className={`px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>

          {/* Due date */}
          {(task.dueDate || task.date) && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.dueDate || task.date)}
            </span>
          )}

          {/* Assigned users */}
          {task.assignedUsers && task.assignedUsers.length > 0 && (
            <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
              <User className="w-3 h-3" />
              {task.assignedUsers.length === 1
                ? task.assignedUsers[0].user.name.split(' ')[0]
                : `${task.assignedUsers.length} pessoas`
              }
            </span>
          )}
        </div>

        {/* Client/Case info */}
        {(task.client || task.case) && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
            {task.client && <div>Cliente: {task.client.name}</div>}
            {task.case && <div>Processo: {task.case.processNumber}</div>}
          </div>
        )}
      </div>
    );
  };

  // Task detail modal
  const renderTaskModal = () => {
    if (!showTaskModal || !selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{selectedTask.title}</h2>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {selectedTask.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Descrição</label>
                  <p className="text-gray-900 dark:text-slate-100 mt-1">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Prioridade</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${priorityColors[selectedTask.priority]}`}>
                      {priorityLabels[selectedTask.priority]}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      selectedTask.completed
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {selectedTask.completed ? 'Concluído' : 'Pendente'}
                    </span>
                  </p>
                </div>
              </div>

              {(selectedTask.dueDate || selectedTask.date) && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Data</label>
                  <p className="text-gray-900 dark:text-slate-100 mt-1">
                    {formatDateTime(selectedTask.dueDate || selectedTask.date)}
                  </p>
                </div>
              )}

              {selectedTask.client && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Cliente</label>
                  <p className="text-gray-900 dark:text-slate-100 mt-1">{selectedTask.client.name}</p>
                </div>
              )}

              {selectedTask.case && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Processo</label>
                  <p className="text-gray-900 dark:text-slate-100 mt-1">{selectedTask.case.processNumber}</p>
                </div>
              )}

              {selectedTask.assignedUsers && selectedTask.assignedUsers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-slate-400">Responsáveis</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedTask.assignedUsers.map(au => (
                      <span key={au.id} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm text-gray-700 dark:text-slate-300">
                        {au.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                <p>Criado em: {formatDateTime(selectedTask.createdAt)}</p>
                <p>Atualizado em: {formatDateTime(selectedTask.updatedAt)}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => toggleComplete(selectedTask)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedTask.completed
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {selectedTask.completed ? 'Reabrir Tarefa' : 'Marcar como Concluída'}
              </button>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="py-2 px-4 rounded-lg font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Quadro Kanban</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Arraste as tarefas entre as colunas para atualizar o status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTasks}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <a
              href="/todos"
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
            >
              Ver Lista
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todas as prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id);

            return (
              <div
                key={column.id}
                className={`rounded-xl ${column.bgColor} border-2 ${column.borderColor} p-4`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column header */}
                <div className={`flex items-center gap-2 mb-4 ${column.color}`}>
                  {column.icon}
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="ml-auto bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-sm font-medium">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-3 min-h-[200px]">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    columnTasks.map(renderTaskCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">Total de Tarefas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{tasks.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">A Fazer</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getTasksByColumn('todo').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">Em Andamento</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{getTasksByColumn('in_progress').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">Concluídas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getTasksByColumn('done').length}</p>
          </div>
        </div>
      </div>

      {/* Task detail modal */}
      {renderTaskModal()}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </Layout>
  );
};

export default TaskKanban;
