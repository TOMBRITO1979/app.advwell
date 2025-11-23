import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
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
  createdAt: string;
  updatedAt: string;
}

interface TodoFormData {
  title: string;
  description: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  clientId: string;
  caseId: string;
}

const ToDo: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompleted, setFilterCompleted] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    clientId: '',
    caseId: '',
  });

  useEffect(() => {
    loadTodos();
  }, [searchTerm, filterCompleted]);

  const loadTodos = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterCompleted) params.completed = filterCompleted;

      const response = await api.get('/schedule', { params });
      const todoEvents = response.data.filter((e: any) => e.type === 'TAREFA');
      setTodos(todoEvents);
    } catch (error) {
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        type: 'TAREFA',
        startDate: formData.dueDate,
        completed: false,
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
    });
    setEditMode(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      priority: 'MEDIUM',
      clientId: '',
      caseId: '',
    });
    setEditMode(false);
    setSelectedTodo(null);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
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
              <Calendar className="text-primary-600" />
              Tarefas
            </h1>
            <p className="text-neutral-600 mt-1">Gerencie suas tarefas e afazeres</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
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
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tarefa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Vencimento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todos.map((todo) => (
                    <tr key={todo.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {todo.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
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
                        {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(todo)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(todo.id)}
                            className="text-red-600 hover:text-red-700"
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
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vencimento</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Prioridade</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="LOW">Baixa</option>
                        <option value="MEDIUM">Média</option>
                        <option value="HIGH">Alta</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
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
