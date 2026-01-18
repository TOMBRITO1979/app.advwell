import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, CheckCircle, Circle, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import KanbanStatusDropdown from '../components/ui/KanbanStatusDropdown';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate } from '../utils/dateFormatter';
import type { ScheduleEvent, Priority } from '../types/schedule';

// Interface local estendendo ScheduleEvent para compatibilidade com código existente
interface Todo extends Omit<ScheduleEvent, 'type' | 'endDate' | 'googleMeetLink'> {
  updatedAt?: string;
}

interface TodoFormData {
  title: string;
  description: string;
  date: string;
  priority: Priority;
  kanbanStatus: 'TODO' | 'IN_PROGRESS' | 'DONE';
  clientId: string;
  caseId: string;
  assignedUserIds: string[];
}

const ToDo: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompleted, setFilterCompleted] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    date: '',
    priority: 'MEDIA',
    kanbanStatus: 'TODO',
    clientId: '',
    caseId: '',
    assignedUserIds: [],
  });

  useEffect(() => {
    loadTodos();
    fetchCompanyUsers();
  }, [searchTerm, filterCompleted, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterCompleted]);

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/users', { params: { companyOnly: 'true' } });
      setCompanyUsers(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };


  const loadTodos = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (filterCompleted) params.completed = filterCompleted;
      params.type = 'TAREFA'; // Filtrar apenas tarefas no backend

      const response = await api.get('/schedule', { params });
      // Backend retorna { data: [...], total, page, limit }
      // Ordenar: futuros primeiro (ASC), passados no final (DESC)
      const now = new Date().getTime();
      const sortedTodos = (response.data.data || []).sort((a: Todo, b: Todo) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();

        const isPastA = dateA < now;
        const isPastB = dateB < now;

        // Passados vão para o final
        if (isPastA && !isPastB) return 1;
        if (!isPastA && isPastB) return -1;

        // Futuros: mais próximo primeiro (ASC)
        // Passados: mais recente primeiro (DESC)
        if (isPastA && isPastB) {
          return dateB - dateA;
        }
        return dateA - dateB;
      });
      setTodos(sortedTodos);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error(error.response?.data?.error || 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Adicionar hora 12:00 para evitar problema de fuso horário
      // Quando apenas a data é enviada (YYYY-MM-DD), o JS interpreta como UTC meia-noite
      // o que pode resultar em um dia anterior quando convertido para o fuso local
      const dateWithTime = formData.date
        ? `${formData.date}T12:00:00`
        : new Date().toISOString();

      // Determinar completed baseado no kanbanStatus
      const isCompleted = formData.kanbanStatus === 'DONE';

      const data = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        kanbanStatus: formData.kanbanStatus,
        type: 'TAREFA',
        date: dateWithTime,
        // Converter strings vazias para null/undefined para evitar erro de validação UUID
        clientId: formData.clientId || undefined,
        caseId: formData.caseId || undefined,
        completed: isCompleted,
        assignedUserIds: selectedUserIds,
      };

      if (editMode && selectedTodo) {
        await api.put(`/schedule/${selectedTodo.id}`, data);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await api.post('/schedule', data);
        toast.success('Tarefa criada com sucesso!');
      }

      setShowModal(false);
      resetForm();
      loadTodos();
    } catch (error: any) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar tarefa');
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      await api.put(`/schedule/${todo.id}`, {
        ...todo,
        completed: !todo.completed,
      });
      toast.success(todo.completed ? 'Tarefa marcada como pendente' : 'Tarefa concluída!');
      loadTodos();
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      await api.delete(`/schedule/${id}`);
      toast.success('Tarefa excluída com sucesso!');
      loadTodos();
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleEdit = (todo: Todo) => {
    setSelectedTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      date: todo.date ? todo.date.split('T')[0] : '',
      priority: todo.priority,
      kanbanStatus: todo.kanbanStatus || 'TODO',
      clientId: todo.client?.id || '',
      caseId: todo.case?.id || '',
      assignedUserIds: todo.assignedUsers?.map(au => au.user.id) || [],
    });
    setSelectedUserIds(todo.assignedUsers?.map(au => au.user.id) || []);
    setEditMode(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      priority: 'MEDIA',
      kanbanStatus: 'TODO',
      clientId: '',
      caseId: '',
      assignedUserIds: [],
    });
    setSelectedUserIds([]);
    setEditMode(false);
    setSelectedTodo(null);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      BAIXA: 'bg-success-100 text-success-800',
      MEDIA: 'bg-yellow-100 text-yellow-800',
      ALTA: 'bg-orange-100 text-orange-800',
      URGENTE: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIA;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      BAIXA: 'Baixa',
      MEDIA: 'Média',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getKanbanStatusLabel = (status?: string) => {
    const labels = {
      TODO: 'A Fazer',
      IN_PROGRESS: 'Em Andamento',
      DONE: 'Concluído',
    };
    return labels[status as keyof typeof labels] || 'A Fazer';
  };

  const handleKanbanStatusChange = async (todo: Todo, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      // Sincronizar completed com kanbanStatus
      const completed = newStatus === 'DONE';
      await api.put(`/schedule/${todo.id}`, {
        kanbanStatus: newStatus,
        completed: completed,
      });
      toast.success(`Status alterado para "${getKanbanStatusLabel(newStatus)}"`);
      loadTodos();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="text-primary-600" size={24} />
              Tarefas
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">Gerencie suas tarefas e afazeres</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
              />
            </div>

            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            >
              <option value="">Todos os status</option>
              <option value="false">Pendentes</option>
              <option value="true">Concluídos</option>
            </select>
          </div>
        </div>

        {/* Todos List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-500 dark:text-slate-400">Carregando...</div>
          ) : todos.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 dark:text-slate-400">
              Nenhuma tarefa encontrada. Crie uma nova tarefa para começar.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={todos.map((todo): MobileCardItem => ({
                    id: todo.id,
                    title: todo.title,
                    subtitle: todo.description || undefined,
                    badge: {
                      text: todo.completed ? 'Concluída' : getPriorityLabel(todo.priority),
                      color: todo.completed ? 'green' :
                             todo.priority === 'BAIXA' ? 'green' :
                             todo.priority === 'MEDIA' ? 'yellow' :
                             todo.priority === 'ALTA' ? 'yellow' :
                             'red',
                    },
                    fields: [
                      { label: 'Status', value: todo.completed ? 'Concluída' : 'Pendente' },
                      { label: 'Kanban', value: getKanbanStatusLabel(todo.kanbanStatus) },
                      { label: 'Vencimento', value: todo.date ? formatDate(todo.date) : '-' },
                    ],
                    onEdit: () => handleEdit(todo),
                    onDelete: () => handleDelete(todo.id),
                  }))}
                  emptyMessage="Nenhuma tarefa encontrada"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-slate-700">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Status Kanban</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Tarefa</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Prioridade</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Vencimento</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                    {todos.map((todo) => (
                      <tr key={todo.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                          >
                            {todo.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <KanbanStatusDropdown
                            value={(todo.kanbanStatus as 'TODO' | 'IN_PROGRESS' | 'DONE') || 'TODO'}
                            onChange={(status) => handleKanbanStatusChange(todo, status)}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={todo.completed ? 'line-through text-neutral-400' : ''}>
                            <div className="font-medium">{todo.title}</div>
                            {todo.description && (
                              <div className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{todo.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                            {getPriorityLabel(todo.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500 dark:text-slate-400 text-center">
                          {todo.date ? formatDate(todo.date) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <ActionsDropdown
                              actions={[
                                {
                                  label: 'Editar',
                                  icon: <Edit2 size={16} />,
                                  onClick: () => handleEdit(todo),
                                  variant: 'primary',
                                },
                                {
                                  label: 'Excluir',
                                  icon: <Trash2 size={16} />,
                                  onClick: () => handleDelete(todo.id),
                                  variant: 'danger',
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-neutral-200 dark:border-slate-700">
                  <span className="text-sm text-neutral-600 dark:text-slate-400">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} tarefas
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span className="text-sm text-neutral-600 dark:text-slate-400">por página</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium">
                      Página {page} de {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                      disabled={page >= Math.ceil(total / limit)}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">{editMode ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Título *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vencimento</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Prioridade</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="BAIXA">🟢 Baixa</option>
                        <option value="MEDIA">🟡 Média</option>
                        <option value="ALTA">🟠 Alta</option>
                        <option value="URGENTE">🔴 Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Status Kanban */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Status Kanban</label>
                    <select
                      value={formData.kanbanStatus}
                      onChange={(e) => setFormData({ ...formData, kanbanStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="TODO">📋 A Fazer</option>
                      <option value="IN_PROGRESS">🔄 Em Andamento</option>
                      <option value="DONE">✅ Concluído</option>
                    </select>
                  </div>

                  {/* Assigned Users */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
                        Atribuir a usuários (opcional)
                      </label>
                      {companyUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedUserIds.length === companyUsers.length) {
                              setSelectedUserIds([]);
                            } else {
                              setSelectedUserIds(companyUsers.map(u => u.id));
                            }
                          }}
                          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {selectedUserIds.length === companyUsers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                      )}
                    </div>
                    <div className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-3 max-h-48 overflow-y-auto">
                      {companyUsers.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-slate-400 italic">Nenhum usuário disponível</p>
                      ) : (
                        <div className="space-y-2">
                          {companyUsers.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                  }
                                }}
                                className="w-4 h-4 text-primary-600 border-gray-300 dark:border-slate-600 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-neutral-700 dark:text-slate-300">
                                {user.name}
                                <span className="text-neutral-500 dark:text-slate-400 text-xs ml-1">({user.email})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <p className="text-sm text-neutral-600 dark:text-slate-400 mt-2">
                        {selectedUserIds.length} usuário(s) selecionado(s)
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
                    >
                      {editMode ? 'Salvar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ToDo;
