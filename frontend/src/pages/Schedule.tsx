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

interface EventAssignment {
  id: string;
  user: User;
}

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'GOOGLE_MEET';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  date: string;
  endDate?: string;
  completed: boolean;
  googleMeetLink?: string;
  client?: Client;
  case?: Case;
  user?: User;
  assignedUsers?: EventAssignment[];
  createdAt: string;
}

interface ScheduleFormData {
  title: string;
  description: string;
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'GOOGLE_MEET';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  date: string;
  endDate: string;
  clientId: string;
  caseId: string;
  assignedUserIds: string[];
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
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [filterAssignedUserId, setFilterAssignedUserId] = useState<string>('');

  // Listas para filtros
  const [allClients, setAllClients] = useState<Client[]>([]);

  // Estado para seleção única de usuário responsável
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

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
    priority: 'MEDIA',
    date: '',
    endDate: '',
    clientId: '',
    caseId: '',
    assignedUserIds: [],
  });

  const eventTypeLabels = {
    COMPROMISSO: 'Compromisso',
    TAREFA: 'Tarefa',
    PRAZO: 'Prazo',
    AUDIENCIA: 'Audiência',
    GOOGLE_MEET: 'Google Meet',
  };

  const eventTypeColors = {
    COMPROMISSO: 'bg-info-100 text-info-700',
    TAREFA: 'bg-success-100 text-success-800',
    PRAZO: 'bg-red-100 text-red-800',
    AUDIENCIA: 'bg-primary-100 text-primary-800',
    GOOGLE_MEET: 'bg-orange-100 text-orange-800',
  };

  const priorityLabels = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  };

  const priorityColors = {
    BAIXA: 'bg-success-100 text-success-800',
    MEDIA: 'bg-yellow-100 text-yellow-800',
    ALTA: 'bg-orange-100 text-orange-800',
    URGENTE: 'bg-red-100 text-red-800',
  };

  // Função para ordenar eventos: hoje primeiro, depois futuros, por último passados
  const sortEventsByDate = (eventsToSort: ScheduleEvent[]): ScheduleEvent[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return [...eventsToSort].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      const isAToday = dateA >= todayStart && dateA < todayEnd;
      const isBToday = dateB >= todayStart && dateB < todayEnd;
      const isAFuture = dateA >= todayEnd;
      const isBFuture = dateB >= todayEnd;
      const isAPast = dateA < todayStart;
      const isBPast = dateB < todayStart;

      // Prioridade: Hoje > Futuro > Passado
      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;
      if (isAFuture && isBPast) return -1;
      if (isAPast && isBFuture) return 1;

      // Dentro da mesma categoria, ordenar por data
      // Hoje e Futuro: ordem crescente (mais próximo primeiro)
      // Passado: ordem decrescente (mais recente primeiro)
      if (isAPast && isBPast) {
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      }
      return dateA.getTime() - dateB.getTime(); // Mais próximo primeiro
    });
  };

  useEffect(() => {
    fetchEvents();
    fetchCompanyUsers();
    fetchAllClients();
  }, [searchTerm, filterType, filterCompleted, filterClientId, filterAssignedUserId]);

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

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/users');
      setCompanyUsers(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const fetchAllClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setAllClients(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type = filterType;
      if (filterCompleted) params.completed = filterCompleted;
      if (filterClientId) params.clientId = filterClientId;
      if (filterAssignedUserId) params.assignedUserId = filterAssignedUserId;

      const response = await api.get('/schedule', { params });
      // Ordenar eventos: hoje primeiro, depois futuros, por último passados
      const sortedEvents = sortEventsByDate(response.data.data);
      setEvents(sortedEvents);
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
      // Se um cliente está selecionado, buscar apenas processos desse cliente
      const params: any = { q: query };
      if (selectedClient) {
        params.clientId = selectedClient.id;
      }
      const response = await api.get('/cases/search', { params });
      setCaseSuggestions(response.data);
      setShowCaseSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: Cliente e Processo obrigatórios para AUDIENCIA
    if (formData.type === 'AUDIENCIA') {
      if (!selectedClient) {
        toast.error('Para audiências, é obrigatório selecionar um cliente');
        return;
      }
      if (!selectedCase) {
        toast.error('Para audiências, é obrigatório selecionar um processo');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        clientId: selectedClient?.id || null,
        caseId: selectedCase?.id || null,
        endDate: formData.endDate || null,
        assignedUserIds: selectedUserId ? [selectedUserId] : undefined,
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

  const handleEdit = async (event: ScheduleEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      priority: event.priority || 'MEDIA',
      date: utcToDatetimeLocal(event.date),
      endDate: event.endDate ? utcToDatetimeLocal(event.endDate) : '',
      clientId: event.client?.id || '',
      caseId: event.case?.id || '',
      assignedUserIds: [],
    });
    // Set selected client and case for autocomplete
    if (event.client) {
      setSelectedClient(event.client);
      setClientSearchTerm(event.client.name);
      // Carregar processos do cliente para manter o dropdown funcional
      try {
        const response = await api.get('/cases/search', { params: { clientId: event.client.id } });
        setCaseSuggestions(response.data);
      } catch (error) {
        console.error('Erro ao carregar processos do cliente:', error);
      }
    }
    if (event.case) {
      setSelectedCase(event.case);
      setCaseSearchTerm(event.case.processNumber);
    }
    // Set selected user (pega apenas o primeiro se houver múltiplos)
    if (event.assignedUsers && event.assignedUsers.length > 0) {
      setSelectedUserId(event.assignedUsers[0].user.id);
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
      priority: 'MEDIA',
      date: '',
      endDate: '',
      clientId: '',
      caseId: '',
      assignedUserIds: [],
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
    setSelectedUserId('');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Converte data UTC para formato datetime-local no timezone de São Paulo
  const utcToDatetimeLocal = (dateString: string): string => {
    const date = new Date(dateString);
    // Formata a data no timezone de São Paulo
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(date);
    const values: Record<string, string> = {};
    parts.forEach(part => {
      values[part.type] = part.value;
    });
    // Formato datetime-local: YYYY-MM-DDTHH:MM
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
            <Calendar className="text-primary-600" size={24} />
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
        >
          <Plus size={20} />
          <span>Novo Evento</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" size={20} />
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />
          </div>

          {/* Filter by type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            <option value="">Todos os status</option>
            <option value="false">Pendentes</option>
            <option value="true">Concluídos</option>
          </select>

          {/* Filter by client */}
          <select
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            <option value="">Todos os clientes</option>
            {allClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          {/* Filter by assigned user (advogado) */}
          <select
            value={filterAssignedUserId}
            onChange={(e) => setFilterAssignedUserId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            <option value="">Todos os advogados</option>
            {companyUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            Nenhum evento encontrado. Crie um novo evento para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Processo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Atribuído
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleComplete(event)}
                        className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-neutral-600 hover:text-success-600 hover:bg-success-50 rounded-md transition-all duration-200"
                        title={event.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                      >
                        {event.completed ? (
                          <CheckCircle size={18} className="text-success-600" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventTypeColors[event.type]}`}>
                        {eventTypeLabels[event.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[event.priority || 'MEDIA']}`}>
                        {priorityLabels[event.priority || 'MEDIA']}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={event.completed ? 'line-through text-neutral-500' : 'text-neutral-900'}>
                        {event.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {formatDateTime(event.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {event.client?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {event.case?.processNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {event.assignedUsers && event.assignedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {event.assignedUsers.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="px-2 py-1 text-xs font-medium bg-info-100 text-info-700 rounded-full"
                            >
                              {assignment.user.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
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
                              className="text-orange-600 hover:text-orange-800 transition-colors"
                              title="Copiar link do Google Meet"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => window.open(event.googleMeetLink, '_blank')}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                              title="Abrir no Google Calendar"
                            >
                              <Calendar size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleView(event)}
                          className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-info-600 hover:text-info-700 hover:bg-info-50 rounded-md transition-all duration-200"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(event)}
                          className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    placeholder="Ex: Reunião com cliente"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="COMPROMISSO">Compromisso</option>
                    <option value="TAREFA">Tarefa</option>
                    <option value="PRAZO">Prazo</option>
                    <option value="AUDIENCIA">Audiência</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Prioridade *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="BAIXA">🟢 Baixa</option>
                    <option value="MEDIA">🟡 Média</option>
                    <option value="ALTA">🟠 Alta</option>
                    <option value="URGENTE">🔴 Urgente</option>
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Data e Hora *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Data/Hora Término (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Client and Case */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Cliente {formData.type === 'AUDIENCIA' ? '*' : '(opcional)'}
                    </label>
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] ${
                        formData.type === 'AUDIENCIA' && !selectedClient
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Digite o nome ou CPF do cliente..."
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {clientSuggestions.map((client) => (
                          <div
                            key={client.id}
                            onClick={async () => {
                              const isChangingClient = !selectedClient || selectedClient.id !== client.id;
                              setSelectedClient(client);
                              setClientSearchTerm(client.name);
                              setShowClientSuggestions(false);
                              // Só limpar processo se estiver MUDANDO de cliente
                              if (isChangingClient) {
                                setSelectedCase(null);
                                setCaseSearchTerm('');
                                setCaseSuggestions([]);
                                // Carregar processos do novo cliente
                                try {
                                  const response = await api.get('/cases/search', { params: { clientId: client.id } });
                                  setCaseSuggestions(response.data);
                                } catch (error) {
                                  console.error('Erro ao carregar processos do cliente:', error);
                                }
                              }
                            }}
                            className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                          >
                            <div className="font-medium text-neutral-900">{client.name}</div>
                            {client.cpf && <div className="text-sm text-neutral-500">CPF: {client.cpf}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedClient && (
                      <div className="mt-1 text-sm text-success-600">
                        ✓ {selectedClient.name} selecionado
                      </div>
                    )}
                  </div>

                  {/* Case Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Processo {formData.type === 'AUDIENCIA' ? '*' : '(opcional)'}
                      {selectedClient && caseSuggestions.length > 0 && !selectedCase && (
                        <span className="ml-2 text-xs text-info-600">
                          ({caseSuggestions.length} processo{caseSuggestions.length > 1 ? 's' : ''} do cliente)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={caseSearchTerm}
                      onChange={(e) => setCaseSearchTerm(e.target.value)}
                      onFocus={() => {
                        // Mostrar sugestões ao focar se há processos carregados
                        if (caseSuggestions.length > 0 || caseSearchTerm) {
                          setShowCaseSuggestions(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowCaseSuggestions(false), 200)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] ${
                        formData.type === 'AUDIENCIA' && !selectedCase
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder={selectedClient ? 'Selecione ou digite para buscar...' : 'Selecione um cliente primeiro...'}
                    />
                    {showCaseSuggestions && caseSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {caseSuggestions.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            onClick={() => {
                              setSelectedCase(caseItem);
                              setCaseSearchTerm(caseItem.processNumber);
                              setShowCaseSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                          >
                            <div className="font-medium text-neutral-900">{caseItem.processNumber}</div>
                            <div className="text-sm text-neutral-500">{caseItem.subject}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedClient && caseSuggestions.length === 0 && !selectedCase && showCaseSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-neutral-500">
                        Nenhum processo vinculado a este cliente
                      </div>
                    )}
                    {selectedCase && (
                      <div className="mt-1 text-sm text-success-600">
                        ✓ {selectedCase.processNumber} selecionado
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned User - Select único */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Responsável (opcional)
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Selecione um responsável...</option>
                    {companyUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    placeholder="Detalhes adicionais..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvando...' : editingEvent ? 'Atualizar' : 'Criar'}
                  </button>
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
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                Detalhes do Evento
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500">Título</label>
                  <p className="text-neutral-900 text-lg">{viewingEvent.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-500">Tipo</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${eventTypeColors[viewingEvent.type]}`}>
                    {eventTypeLabels[viewingEvent.type]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-500">Data/Hora Início</label>
                    <p className="text-neutral-900">{formatDateTime(viewingEvent.date)}</p>
                  </div>
                  {viewingEvent.endDate && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-500">Data/Hora Término</label>
                      <p className="text-neutral-900">{formatDateTime(viewingEvent.endDate)}</p>
                    </div>
                  )}
                </div>

                {viewingEvent.client && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500">Cliente</label>
                    <p className="text-neutral-900">{viewingEvent.client.name}</p>
                    {viewingEvent.client.cpf && (
                      <p className="text-sm text-neutral-600">CPF: {viewingEvent.client.cpf}</p>
                    )}
                  </div>
                )}

                {viewingEvent.case && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500">Processo</label>
                    <p className="text-neutral-900">{viewingEvent.case.processNumber}</p>
                    <p className="text-sm text-neutral-600">{viewingEvent.case.subject}</p>
                  </div>
                )}

                {viewingEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500">Descrição</label>
                    <p className="text-neutral-900 whitespace-pre-wrap">{viewingEvent.description}</p>
                  </div>
                )}

                {viewingEvent.type === 'GOOGLE_MEET' && viewingEvent.googleMeetLink && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-orange-800 mb-2">
                      🎥 Link do Google Meet
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={viewingEvent.googleMeetLink}
                        className="flex-1 px-3 py-2 border border-orange-300 rounded-md bg-white text-neutral-900 text-sm min-h-[44px]"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingEvent.googleMeetLink!);
                          toast.success('Link copiado!');
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md shadow-sm transition-all duration-200"
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => window.open(viewingEvent.googleMeetLink, '_blank')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-md transition-all duration-200"
                      >
                        Abrir
                      </button>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      Clique em "Abrir" para criar o evento no Google Calendar. Após criar, clique em "Adicionar Google Meet" para gerar o link da reunião.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-500">Status</label>
                  <p className="text-neutral-900">
                    {viewingEvent.completed ? (
                      <span className="text-success-600 flex items-center gap-1">
                        <CheckCircle size={16} /> Concluído
                      </span>
                    ) : (
                      <span className="text-neutral-600 flex items-center gap-1">
                        <Circle size={16} /> Pendente
                      </span>
                    )}
                  </p>
                </div>

                {viewingEvent.user && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500">Criado por</label>
                    <p className="text-neutral-900">{viewingEvent.user.name}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingEvent);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 font-medium rounded-lg transition-all duration-200"
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
