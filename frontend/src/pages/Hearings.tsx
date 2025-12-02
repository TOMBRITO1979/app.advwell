import React, { useState, useEffect } from 'react';
import { Gavel, Calendar, ChevronLeft, ChevronRight, Edit2, User } from 'lucide-react';
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

interface UserData {
  id: string;
  name: string;
  email?: string;
}

interface EventAssignment {
  id: string;
  user: UserData;
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
  user?: UserData;
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

const Hearings: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    description: '',
    type: 'AUDIENCIA',
    priority: 'MEDIA',
    date: '',
    endDate: '',
    clientId: '',
    caseId: '',
    assignedUserIds: [],
  });

  // Autocomplete states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [caseSuggestions, setCaseSuggestions] = useState<Case[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showCaseSuggestions, setShowCaseSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedEditUserId, setSelectedEditUserId] = useState<string>('');

  const priorityColors = {
    BAIXA: 'border-l-green-500 bg-success-50',
    MEDIA: 'border-l-yellow-500 bg-yellow-50',
    ALTA: 'border-l-orange-500 bg-orange-50',
    URGENTE: 'border-l-red-500 bg-red-50',
  };

  const priorityLabels = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  };

  // Paleta de cores foscas, claras e calmas para cada advogado
  const userColors = [
    { header: 'bg-slate-400', headerText: 'text-slate-50', subText: 'text-slate-200', count: 'text-slate-200' },
    { header: 'bg-stone-400', headerText: 'text-stone-50', subText: 'text-stone-200', count: 'text-stone-200' },
    { header: 'bg-zinc-400', headerText: 'text-zinc-50', subText: 'text-zinc-200', count: 'text-zinc-200' },
    { header: 'bg-teal-300', headerText: 'text-teal-800', subText: 'text-teal-600', count: 'text-teal-600' },
    { header: 'bg-cyan-300', headerText: 'text-cyan-800', subText: 'text-cyan-600', count: 'text-cyan-600' },
    { header: 'bg-sky-300', headerText: 'text-sky-800', subText: 'text-sky-600', count: 'text-sky-600' },
    { header: 'bg-indigo-300', headerText: 'text-indigo-800', subText: 'text-indigo-600', count: 'text-indigo-600' },
    { header: 'bg-violet-300', headerText: 'text-violet-800', subText: 'text-violet-600', count: 'text-violet-600' },
    { header: 'bg-rose-300', headerText: 'text-rose-800', subText: 'text-rose-600', count: 'text-rose-600' },
    { header: 'bg-amber-300', headerText: 'text-amber-800', subText: 'text-amber-600', count: 'text-amber-600' },
    { header: 'bg-lime-300', headerText: 'text-lime-800', subText: 'text-lime-600', count: 'text-lime-600' },
    { header: 'bg-emerald-300', headerText: 'text-emerald-800', subText: 'text-emerald-600', count: 'text-emerald-600' },
  ];

  const getUserColor = (index: number) => {
    return userColors[index % userColors.length];
  };

  useEffect(() => {
    fetchCompanyUsers();
  }, []);

  useEffect(() => {
    fetchHearings();
  }, [selectedDate, selectedUserId]);

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

  const fetchHearings = async () => {
    setLoading(true);
    try {
      const params: any = {
        type: 'AUDIENCIA',
        limit: 500,
      };

      const response = await api.get('/schedule', { params });
      let hearings = response.data.data || [];

      // Filtrar por data selecionada
      if (selectedDate) {
        hearings = hearings.filter((event: ScheduleEvent) => {
          const eventDate = new Date(event.date).toISOString().split('T')[0];
          return eventDate === selectedDate;
        });
      }

      // Filtrar por usuário selecionado
      if (selectedUserId) {
        hearings = hearings.filter((event: ScheduleEvent) => {
          if (event.assignedUsers && event.assignedUsers.length > 0) {
            return event.assignedUsers.some(a => a.user.id === selectedUserId);
          }
          return event.user?.id === selectedUserId;
        });
      }

      setEvents(hearings);
    } catch (error) {
      console.error('Erro ao buscar audiências:', error);
      toast.error('Erro ao carregar audiências');
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

  // Agrupar audiências por usuário/advogado
  const getHearingsByUser = () => {
    const userMap = new Map<string, { user: UserData; hearings: ScheduleEvent[] }>();

    // Inicializar todos os usuários da empresa
    companyUsers.forEach(user => {
      userMap.set(user.id, { user, hearings: [] });
    });

    // Adicionar coluna "Sem atribuição"
    userMap.set('unassigned', {
      user: { id: 'unassigned', name: 'Sem Atribuição', email: '' },
      hearings: []
    });

    // Distribuir audiências
    events.forEach(event => {
      if (event.assignedUsers && event.assignedUsers.length > 0) {
        event.assignedUsers.forEach(assignment => {
          const existing = userMap.get(assignment.user.id);
          if (existing) {
            existing.hearings.push(event);
          }
        });
      } else if (event.user) {
        const existing = userMap.get(event.user.id);
        if (existing) {
          existing.hearings.push(event);
        }
      } else {
        const unassigned = userMap.get('unassigned');
        if (unassigned) {
          unassigned.hearings.push(event);
        }
      }
    });

    // Converter para array e ordenar
    return Array.from(userMap.values())
      .filter(item => item.hearings.length > 0 || selectedUserId === '' || selectedUserId === item.user.id)
      .sort((a, b) => {
        if (a.user.id === 'unassigned') return 1;
        if (b.user.id === 'unassigned') return -1;
        return a.user.name.localeCompare(b.user.name);
      });
  };

  const handleEditClick = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      priority: event.priority || 'MEDIA',
      date: event.date.split('T')[0] + 'T' + event.date.split('T')[1].substring(0, 5),
      endDate: event.endDate ? event.endDate.split('T')[0] + 'T' + event.endDate.split('T')[1].substring(0, 5) : '',
      clientId: event.client?.id || '',
      caseId: event.case?.id || '',
      assignedUserIds: [],
    });
    if (event.client) {
      setSelectedClient(event.client);
      setClientSearchTerm(event.client.name);
    }
    if (event.case) {
      setSelectedCase(event.case);
      setCaseSearchTerm(event.case.processNumber);
    }
    if (event.assignedUsers && event.assignedUsers.length > 0) {
      setSelectedEditUserId(event.assignedUsers[0].user.id);
    } else {
      setSelectedEditUserId('');
    }
    setShowEditModal(true);
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
        assignedUserIds: selectedEditUserId ? [selectedEditUserId] : undefined,
      };

      await api.put(`/schedule/${editingEvent?.id}`, payload);
      toast.success('Audiência atualizada com sucesso!');

      setShowEditModal(false);
      resetForm();
      fetchHearings();
    } catch (error: any) {
      console.error('Erro ao salvar audiência:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar audiência');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'AUDIENCIA',
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
    setSelectedEditUserId('');
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const hearingsByUser = getHearingsByUser();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
              <Gavel className="text-primary-600" size={28} />
              Audiências
            </h1>
            <p className="text-neutral-600 mt-1">
              Visualização por advogado/usuário
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Navegação de Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Dia anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-neutral-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Próximo dia"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                Hoje
              </button>
            </div>

            {/* Filtro por Advogado */}
            <div className="flex items-center gap-2">
              <User size={20} className="text-neutral-500" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] min-w-[200px]"
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

          {/* Data selecionada em destaque */}
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold text-neutral-800 capitalize">
              {formatDateDisplay(selectedDate)}
            </p>
            <p className="text-sm text-neutral-500">
              {events.length} audiência(s) encontrada(s)
            </p>
          </div>
        </div>

        {/* Colunas por Advogado */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-500">Carregando audiências...</div>
          </div>
        ) : hearingsByUser.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Gavel size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Nenhuma audiência encontrada para esta data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {hearingsByUser.map(({ user, hearings }, index) => {
                const colors = getUserColor(index);
                return (
                <div
                  key={user.id}
                  className="w-80 flex-shrink-0 bg-white rounded-lg shadow"
                >
                  {/* Cabeçalho da Coluna */}
                  <div className={`${colors.header} p-4 rounded-t-lg`}>
                    <div className="flex items-center gap-2">
                      <User size={20} className={colors.headerText} />
                      <div>
                        <h3 className={`font-semibold ${colors.headerText}`}>{user.name}</h3>
                        {user.email && (
                          <p className={`text-xs ${colors.subText}`}>{user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className={`mt-2 text-sm ${colors.count}`}>
                      {hearings.length} audiência(s)
                    </div>
                  </div>

                  {/* Lista de Audiências */}
                  <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {hearings.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400">
                        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sem audiências</p>
                      </div>
                    ) : (
                      hearings
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((hearing) => (
                          <div
                            key={hearing.id}
                            onClick={() => handleEditClick(hearing)}
                            className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                              priorityColors[hearing.priority || 'MEDIA']
                            }`}
                          >
                            {/* Horário */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold text-neutral-800">
                                {formatTime(hearing.date)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                hearing.completed
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {hearing.completed ? 'Concluída' : priorityLabels[hearing.priority || 'MEDIA']}
                              </span>
                            </div>

                            {/* Título */}
                            <h4 className="font-medium text-neutral-900 mb-2 line-clamp-2">
                              {hearing.title}
                            </h4>

                            {/* Cliente */}
                            {hearing.client && (
                              <div className="flex items-center gap-1 text-sm text-neutral-600 mb-1">
                                <User size={14} />
                                <span className="truncate">{hearing.client.name}</span>
                              </div>
                            )}

                            {/* Processo */}
                            {hearing.case && (
                              <div className="text-xs text-neutral-500 font-mono truncate">
                                {hearing.case.processNumber}
                              </div>
                            )}

                            {/* Indicador de edição */}
                            <div className="mt-2 flex items-center gap-1 text-xs text-primary-600">
                              <Edit2 size={12} />
                              <span>Clique para editar</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                  Editar Evento
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
                      <option value="BAIXA">Baixa</option>
                      <option value="MEDIA">Média</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
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
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearchTerm(client.name);
                              setShowClientSuggestions(false);
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
                        {selectedClient.name} selecionado
                      </div>
                    )}
                  </div>

                  {/* Case Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Processo {formData.type === 'AUDIENCIA' ? '*' : '(opcional)'}
                    </label>
                    <input
                      type="text"
                      value={caseSearchTerm}
                      onChange={(e) => setCaseSearchTerm(e.target.value)}
                      onFocus={() => setShowCaseSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCaseSuggestions(false), 200)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] ${
                        formData.type === 'AUDIENCIA' && !selectedCase
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Digite o número ou assunto do processo..."
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
                    {selectedCase && (
                      <div className="mt-1 text-sm text-success-600">
                        {selectedCase.processNumber} selecionado
                      </div>
                    )}
                  </div>

                  {/* Assigned User - Select único */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Responsável (opcional)
                    </label>
                    <select
                      value={selectedEditUserId}
                      onChange={(e) => setSelectedEditUserId(e.target.value)}
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
                      {loading ? 'Salvando...' : 'Atualizar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
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
      </div>
    </Layout>
  );
};

export default Hearings;
