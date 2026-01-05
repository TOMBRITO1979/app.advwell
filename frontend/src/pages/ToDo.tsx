import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate } from '../utils/dateFormatter';

interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  completed: boolean;
  clientId?: string;
  caseId?: string;
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

interface TodoFormData {
  title: string;
  description: string;
  dueDate: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
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

  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIA',
    clientId: '',
    caseId: '',
    assignedUserIds: [],
  });

  useEffect(() => {
    loadTodos();
    fetchCompanyUsers();
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
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterCompleted) params.completed = filterCompleted;
      params.type = 'TAREFA'; // Filtrar apenas tarefas no backend

      const response = await api.get('/schedule', { params });
      // Backend retorna { data: [...], total, page, limit }
      setTodos(response.data.data || []);
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
      const dateWithTime = formData.dueDate
        ? `${formData.dueDate}T12:00:00`
        : new Date().toISOString();

      const data = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        type: 'TAREFA',
        date: dateWithTime,
        // Converter strings vazias para null/undefined para evitar erro de validação UUID
        clientId: formData.clientId || undefined,
        caseId: formData.caseId || undefined,
        completed: false,
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
      dueDate: todo.dueDate ? todo.dueDate.split('T')[0] : '',
      priority: todo.priority,
      clientId: todo.clientId || '',
      caseId: todo.caseId || '',
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
      dueDate: '',
      priority: 'MEDIA',
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="text-primary-600" size={24} />
              Tarefas
            </h1>
            <p className="text-neutral-600 mt-1">Gerencie suas tarefas e afazeres</p>
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
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
              />
            </div>

            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            >
              <option value="">Todos os status</option>
              <option value="false">Pendentes</option>
              <option value="true">Concluídos</option>
            </select>
          </div>
        </div>

        {/* Todos List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-500">Carregando...</div>
          ) : todos.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
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
                      { label: 'Vencimento', value: todo.dueDate ? formatDate(todo.dueDate) : '-' },
                    ],
                    onEdit: () => handleEdit(todo),
                    onDelete: () => handleDelete(todo.id),
                  }))}
                  emptyMessage="Nenhuma tarefa encontrada"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">Tarefa</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">Prioridade</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">Vencimento</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {todos.map((todo) => (
                      <tr key={todo.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                          >
                            {todo.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className={todo.completed ? 'line-through text-neutral-400' : ''}>
                            <div className="font-medium">{todo.title}</div>
                            {todo.description && (
                              <div className="text-sm text-neutral-500 mt-1">{todo.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                            {getPriorityLabel(todo.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500">
                          {todo.dueDate ? formatDate(todo.dueDate) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(todo)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(todo.id)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vencimento</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Prioridade</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="BAIXA">🟢 Baixa</option>
                        <option value="MEDIA">🟡 Média</option>
                        <option value="ALTA">🟠 Alta</option>
                        <option value="URGENTE">🔴 Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Assigned Users */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Atribuir a usuários (opcional)
                    </label>
                    <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                      {companyUsers.length === 0 ? (
                        <p className="text-sm text-neutral-500 italic">Nenhum usuário disponível</p>
                      ) : (
                        <div className="space-y-2">
                          {companyUsers.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-2 rounded"
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
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-neutral-700">
                                {user.name}
                                <span className="text-neutral-500 text-xs ml-1">({user.email})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <p className="text-sm text-neutral-600 mt-2">
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
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 font-medium rounded-lg transition-all duration-200"
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
