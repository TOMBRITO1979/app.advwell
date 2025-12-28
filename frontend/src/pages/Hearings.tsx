import React, { useState, useEffect } from 'react';
import { Gavel, Calendar, ChevronLeft, ChevronRight, Edit2, User, List, CalendarDays } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { formatDateFull } from '../utils/dateFormatter';

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
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week');
  const [weekEvents, setWeekEvents] = useState<ScheduleEvent[]>([]);

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

  useEffect(() => {
    fetchCompanyUsers();
  }, []);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchHearings();
    } else {
      fetchWeekHearings();
    }
  }, [selectedDate, selectedUserId, viewMode]);

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
      const response = await api.get('/users', { params: { companyOnly: 'true' } });
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

  const changeWeek = (weeks: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (weeks * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Obter os dias da semana baseado na data selecionada
  const getWeekDays = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Buscar eventos da semana inteira
  const fetchWeekHearings = async () => {
    setLoading(true);
    try {
      const weekDays = getWeekDays();
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[6].toISOString().split('T')[0];

      const params: any = {
        type: 'AUDIENCIA',
        limit: 500,
        startDate: startDate,
        endDate: endDate + 'T23:59:59',
      };

      const response = await api.get('/schedule', { params });
      let hearings = response.data.data || [];

      // Filtrar por usuário selecionado
      if (selectedUserId) {
        hearings = hearings.filter((event: ScheduleEvent) => {
          if (event.assignedUsers && event.assignedUsers.length > 0) {
            return event.assignedUsers.some(a => a.user.id === selectedUserId);
          }
          return event.user?.id === selectedUserId;
        });
      }

      setWeekEvents(hearings);
    } catch (error) {
      console.error('Erro ao buscar audiências da semana:', error);
      toast.error('Erro ao carregar audiências');
    } finally {
      setLoading(false);
    }
  };

  // Obter audiências de um dia específico
  const getHearingsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return weekEvents.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Formatar dia da semana curto
  const formatWeekDay = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  };

  // Formatar dia do mês
  const formatDayNumber = (date: Date) => {
    return date.getDate().toString().padStart(2, '0');
  };

  // Verificar se é hoje
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Wrapper para usar formatDateFull do utilitário centralizado
  const formatDateDisplay = (dateString: string) => formatDateFull(dateString + 'T00:00:00');

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
              {viewMode === 'list' ? 'Visualização em lista' : 'Visualização semanal'}
            </p>
          </div>

          {/* Toggle de Visualização */}
          <div className="flex bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <List size={18} />
              Lista
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CalendarDays size={18} />
              Semana
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Navegação de Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => viewMode === 'list' ? changeDate(-1) : changeWeek(-1)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title={viewMode === 'list' ? 'Dia anterior' : 'Semana anterior'}
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
                onClick={() => viewMode === 'list' ? changeDate(1) : changeWeek(1)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title={viewMode === 'list' ? 'Próximo dia' : 'Próxima semana'}
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
            {viewMode === 'list' ? (
              <>
                <p className="text-lg font-semibold text-neutral-800 capitalize">
                  {formatDateDisplay(selectedDate)}
                </p>
                <p className="text-sm text-neutral-500">
                  {events.length} audiência(s) encontrada(s)
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-neutral-800">
                  Semana de {getWeekDays()[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a {getWeekDays()[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm text-neutral-500">
                  {weekEvents.length} audiência(s) na semana
                </p>
              </>
            )}
          </div>
        </div>

        {/* Visualização */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-500">Carregando audiências...</div>
          </div>
        ) : viewMode === 'list' ? (
          /* Visualização em Lista/Tabela */
          events.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Gavel size={48} className="text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Nenhuma audiência encontrada para esta data.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Horário
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                        Processo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                        Advogado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Prioridade
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {events
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((hearing) => (
                        <tr
                          key={hearing.id}
                          className={`hover:bg-neutral-50 cursor-pointer border-l-4 ${
                            hearing.priority === 'URGENTE' ? 'border-l-red-500' :
                            hearing.priority === 'ALTA' ? 'border-l-orange-500' :
                            hearing.priority === 'MEDIA' ? 'border-l-yellow-500' :
                            'border-l-green-500'
                          } ${hearing.completed ? 'bg-neutral-50 opacity-60' : ''}`}
                          onClick={() => handleEditClick(hearing)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-lg font-bold text-neutral-800">
                              {formatTime(hearing.date)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="font-medium text-neutral-900 truncate">
                                {hearing.title}
                              </p>
                              {/* Mobile: mostrar cliente e processo aqui */}
                              <div className="md:hidden text-sm text-neutral-500 mt-1">
                                {hearing.client && <span>{hearing.client.name}</span>}
                                {hearing.case && <span className="block font-mono text-xs">{hearing.case.processNumber}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm text-neutral-600">
                              {hearing.client ? (
                                <>
                                  <User size={14} />
                                  <span className="truncate max-w-[150px]">{hearing.client.name}</span>
                                </>
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {hearing.case ? (
                              <span className="text-sm text-neutral-600 font-mono truncate max-w-[180px] block">
                                {hearing.case.processNumber}
                              </span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {hearing.assignedUsers && hearing.assignedUsers.length > 0 ? (
                              <div className="flex items-center gap-1 text-sm text-neutral-600">
                                <User size={14} />
                                <span className="truncate max-w-[120px]">
                                  {hearing.assignedUsers[0].user.name}
                                </span>
                              </div>
                            ) : hearing.user ? (
                              <div className="flex items-center gap-1 text-sm text-neutral-600">
                                <User size={14} />
                                <span className="truncate max-w-[120px]">{hearing.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              hearing.completed
                                ? 'bg-success-100 text-success-700'
                                : hearing.priority === 'URGENTE'
                                  ? 'bg-red-100 text-red-700'
                                  : hearing.priority === 'ALTA'
                                    ? 'bg-orange-100 text-orange-700'
                                    : hearing.priority === 'MEDIA'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                            }`}>
                              {hearing.completed ? 'Concluída' : priorityLabels[hearing.priority || 'MEDIA']}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(hearing);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                            >
                              <Edit2 size={14} />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Visualização Semanal - Calendário */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 border-b">
              {getWeekDays().map((day, index) => (
                <div
                  key={index}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isToday(day) ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`text-xs uppercase font-medium ${
                    isToday(day) ? 'text-primary-600' : 'text-neutral-500'
                  }`}>
                    {formatWeekDay(day)}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    isToday(day) ? 'text-primary-600' : 'text-neutral-800'
                  }`}>
                    {formatDayNumber(day)}
                  </div>
                  {getHearingsForDay(day).length > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
                        {getHearingsForDay(day).length}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grid de audiências por dia */}
            <div className="grid grid-cols-7 min-h-[400px]">
              {getWeekDays().map((day, dayIndex) => {
                const dayHearings = getHearingsForDay(day);
                return (
                  <div
                    key={dayIndex}
                    className={`border-r last:border-r-0 p-2 ${
                      isToday(day) ? 'bg-primary-50/30' : ''
                    }`}
                  >
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {dayHearings.length === 0 ? (
                        <div className="text-center py-4 text-neutral-300">
                          <Calendar size={20} className="mx-auto opacity-50" />
                        </div>
                      ) : (
                        dayHearings.map((hearing) => (
                          <div
                            key={hearing.id}
                            onClick={() => handleEditClick(hearing)}
                            className={`p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all text-xs ${
                              priorityColors[hearing.priority || 'MEDIA']
                            }`}
                          >
                            {/* Horário */}
                            <div className="font-bold text-neutral-800 mb-1">
                              {formatTime(hearing.date)}
                            </div>

                            {/* Título */}
                            <div className="font-medium text-neutral-900 line-clamp-2 mb-1">
                              {hearing.title}
                            </div>

                            {/* Cliente */}
                            {hearing.client && (
                              <div className="text-neutral-600 truncate">
                                {hearing.client.name}
                              </div>
                            )}

                            {/* Advogado atribuído */}
                            {hearing.assignedUsers && hearing.assignedUsers.length > 0 && (
                              <div className="text-neutral-500 truncate mt-1 flex items-center gap-1">
                                <User size={10} />
                                {hearing.assignedUsers[0].user.name}
                              </div>
                            )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
