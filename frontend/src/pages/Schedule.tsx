import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, CheckCircle, Circle, Edit2, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface Client {
  id: string;
  name: string;
  cpf?: string;
}

interface Case {
  id: string;
  processNumber: string;
  subject: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
}

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'GOOGLE_MEET';
  date: string;
  endDate?: string;
  completed: boolean;
  googleMeetLink?: string;
  client?: Client;
  case?: Case;
  user?: User;
  createdAt: string;
}

interface ScheduleFormData {
  title: string;
  description: string;
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'GOOGLE_MEET';
  date: string;
  endDate: string;
  clientId: string;
  caseId: string;
}

const Schedule: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<string>('');

  // Autocomplete states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [caseSuggestions, setCaseSuggestions] = useState<Case[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showCaseSuggestions, setShowCaseSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    description: '',
    type: 'COMPROMISSO',
    date: '',
    endDate: '',
    clientId: '',
    caseId: '',
  });

  const eventTypeLabels = {
    COMPROMISSO: 'Compromisso',
    TAREFA: 'Tarefa',
    PRAZO: 'Prazo',
    AUDIENCIA: 'Audiência',
    GOOGLE_MEET: 'Google Meet',
  };

  const eventTypeColors = {
    COMPROMISSO: 'bg-blue-100 text-blue-800',
    TAREFA: 'bg-green-100 text-green-800',
    PRAZO: 'bg-red-100 text-red-800',
    AUDIENCIA: 'bg-purple-100 text-purple-800',
    GOOGLE_MEET: 'bg-orange-100 text-orange-800',
  };

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, filterType, filterCompleted]);

  // Debounce para busca de clientes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clientSearchTerm) {
        searchClients(clientSearchTerm);
      } else {
        setClientSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  // Debounce para busca de processos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (caseSearchTerm) {
        searchCases(caseSearchTerm);
      } else {
        setCaseSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [caseSearchTerm]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type = filterType;
      if (filterCompleted) params.completed = filterCompleted;

      const response = await api.get('/schedule', { params });
      setEvents(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (query: string) => {
    try {
      const response = await api.get('/clients/search', { params: { q: query } });
      setClientSuggestions(response.data);
      setShowClientSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const searchCases = async (query: string) => {
    try {
      const response = await api.get('/cases/search', { params: { q: query } });
      setCaseSuggestions(response.data);
      setShowCaseSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        clientId: selectedClient?.id || null,
        caseId: selectedCase?.id || null,
        endDate: formData.endDate || null,
      };

      if (editingEvent) {
        await api.put(`/schedule/${editingEvent.id}`, payload);
        toast.success('Evento atualizado com sucesso!');
      } else {
        await api.post('/schedule', payload);
        toast.success('Evento criado com sucesso!');
      }

      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      date: event.date.split('T')[0] + 'T' + event.date.split('T')[1].substring(0, 5),
      endDate: event.endDate ? event.endDate.split('T')[0] + 'T' + event.endDate.split('T')[1].substring(0, 5) : '',
      clientId: event.client?.id || '',
      caseId: event.case?.id || '',
    });
    // Set selected client and case for autocomplete
    if (event.client) {
      setSelectedClient(event.client);
      setClientSearchTerm(event.client.name);
    }
    if (event.case) {
      setSelectedCase(event.case);
      setCaseSearchTerm(event.case.processNumber);
    }
    setShowModal(true);
  };

  const handleView = async (event: ScheduleEvent) => {
    try {
      const response = await api.get(`/schedule/${event.id}`);
      setViewingEvent(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes do evento:', error);
      toast.error('Erro ao carregar detalhes do evento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) {
      return;
    }

    try {
      await api.delete(`/schedule/${id}`);
      toast.success('Evento excluído com sucesso!');
      fetchEvents();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast.error('Erro ao excluir evento');
    }
  };

  const handleToggleComplete = async (event: ScheduleEvent) => {
    try {
      await api.patch(`/schedule/${event.id}/toggle-complete`);
      toast.success(event.completed ? 'Evento marcado como pendente' : 'Evento marcado como concluído');
      fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do evento');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'COMPROMISSO',
      date: '',
      endDate: '',
      clientId: '',
      caseId: '',
    });
    setEditingEvent(null);
    setSelectedClient(null);
    setSelectedCase(null);
    setClientSearchTerm('');
    setCaseSearchTerm('');
    setClientSuggestions([]);
    setCaseSuggestions([]);
    setShowClientSuggestions(false);
    setShowCaseSuggestions(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
            <Calendar className="text-primary-600" />
            Agenda
          </h1>
          <p className="text-neutral-600 mt-1">
            Gerencie seus compromissos, tarefas e prazos
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Novo Evento</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Filter by type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os tipos</option>
            <option value="COMPROMISSO">Compromisso</option>
            <option value="TAREFA">Tarefa</option>
            <option value="PRAZO">Prazo</option>
            <option value="AUDIENCIA">Audiência</option>
          </select>

          {/* Filter by status */}
          <select
            value={filterCompleted}
            onChange={(e) => setFilterCompleted(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="false">Pendentes</option>
            <option value="true">Concluídos</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum evento encontrado. Crie um novo evento para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Processo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleComplete(event)}
                        className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        title={event.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                      >
                        {event.completed ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventTypeColors[event.type]}`}>
                        {eventTypeLabels[event.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={event.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}>
                        {event.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDateTime(event.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {event.client?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {event.case?.processNumber || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {event.type === 'GOOGLE_MEET' && event.googleMeetLink && (
                          <>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(event.googleMeetLink!);
                                toast.success('Link do Google Meet copiado!');
                              }}
                              className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                              title="Copiar link do Google Meet"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => window.open(event.googleMeetLink, '_blank')}
                              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                              title="Abrir no Google Calendar"
                            >
                              <Calendar size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleView(event)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Ex: Reunião com cliente"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="COMPROMISSO">Compromisso</option>
                    <option value="TAREFA">Tarefa</option>
                    <option value="PRAZO">Prazo</option>
                    <option value="AUDIENCIA">Audiência</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data e Hora *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data/Hora Término (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Client and Case */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cliente (opcional)
                    </label>
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Digite o nome ou CPF do cliente..."
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {clientSuggestions.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearchTerm(client.name);
                              setShowClientSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                            {client.cpf && <div className="text-sm text-gray-500 dark:text-gray-400">CPF: {client.cpf}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedClient && (
                      <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                        ✓ {selectedClient.name} selecionado
                      </div>
                    )}
                  </div>

                  {/* Case Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Processo (opcional)
                    </label>
                    <input
                      type="text"
                      value={caseSearchTerm}
                      onChange={(e) => setCaseSearchTerm(e.target.value)}
                      onFocus={() => setShowCaseSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCaseSuggestions(false), 200)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Digite o número ou assunto do processo..."
                    />
                    {showCaseSuggestions && caseSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {caseSuggestions.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            onClick={() => {
                              setSelectedCase(caseItem);
                              setCaseSearchTerm(caseItem.processNumber);
                              setShowCaseSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{caseItem.processNumber}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{caseItem.subject}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedCase && (
                      <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                        ✓ {selectedCase.processNumber} selecionado
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Detalhes adicionais..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editingEvent ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Detalhes do Evento
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Título</label>
                  <p className="text-gray-900 dark:text-white text-lg">{viewingEvent.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${eventTypeColors[viewingEvent.type]}`}>
                    {eventTypeLabels[viewingEvent.type]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Data/Hora Início</label>
                    <p className="text-gray-900 dark:text-white">{formatDateTime(viewingEvent.date)}</p>
                  </div>
                  {viewingEvent.endDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Data/Hora Término</label>
                      <p className="text-gray-900 dark:text-white">{formatDateTime(viewingEvent.endDate)}</p>
                    </div>
                  )}
                </div>

                {viewingEvent.client && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</label>
                    <p className="text-gray-900 dark:text-white">{viewingEvent.client.name}</p>
                    {viewingEvent.client.cpf && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">CPF: {viewingEvent.client.cpf}</p>
                    )}
                  </div>
                )}

                {viewingEvent.case && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Processo</label>
                    <p className="text-gray-900 dark:text-white">{viewingEvent.case.processNumber}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{viewingEvent.case.subject}</p>
                  </div>
                )}

                {viewingEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{viewingEvent.description}</p>
                  </div>
                )}

                {viewingEvent.type === 'GOOGLE_MEET' && viewingEvent.googleMeetLink && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <label className="block text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                      🎥 Link do Google Meet
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={viewingEvent.googleMeetLink}
                        className="flex-1 px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingEvent.googleMeetLink!);
                          toast.success('Link copiado!');
                        }}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => window.open(viewingEvent.googleMeetLink, '_blank')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                      >
                        Abrir
                      </button>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      Clique em "Abrir" para criar o evento no Google Calendar. Após criar, clique em "Adicionar Google Meet" para gerar o link da reunião.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <p className="text-gray-900 dark:text-white">
                    {viewingEvent.completed ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={16} /> Concluído
                      </span>
                    ) : (
                      <span className="text-gray-600 flex items-center gap-1">
                        <Circle size={16} /> Pendente
                      </span>
                    )}
                  </p>
                </div>

                {viewingEvent.user && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Criado por</label>
                    <p className="text-gray-900 dark:text-white">{viewingEvent.user.name}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingEvent);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default Schedule;
