import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Search, CheckCircle, Circle, Edit2, Trash2, Eye, List, Grid3X3, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, MessageCircle, Upload } from 'lucide-react';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import KanbanStatusDropdown from '../components/ui/KanbanStatusDropdown';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDateTime, formatTime, formatDayName, formatDayNumber, formatMonthYear, toDatetimeLocal, isToday as isTodayUtil, fromSaoPauloToISO } from '../utils/dateFormatter';
import DateTimePicker from '../components/DateTimePicker';
import { parseISO } from 'date-fns';

// Converte Date para string datetime-local SEM conversão de timezone
// O usuário sempre digita horário de São Paulo, independente de onde esteja
const dateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface Client {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
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

interface Holiday {
  date: string;
  name: string;
  type: string;
}

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'PERICIA' | 'GOOGLE_MEET';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  date: string;
  endDate?: string;
  completed: boolean;
  kanbanStatus?: 'TODO' | 'IN_PROGRESS' | 'DONE';
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
  type: 'COMPROMISSO' | 'TAREFA' | 'PRAZO' | 'AUDIENCIA' | 'PERICIA' | 'GOOGLE_MEET';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  kanbanStatus: 'TODO' | 'IN_PROGRESS' | 'DONE';
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

  // Estado para controle de visualização (tabela ou calendário)
  // Tabela é o padrão para todos os dispositivos
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo
    const diff = today.getDate() - dayOfWeek; // Início da semana (Domingo)
    return new Date(today.setDate(diff));
  });

  // Estado para seleção múltipla de usuários responsáveis
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Estado para feriados nacionais
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state (only for table view)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

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
    kanbanStatus: 'TODO',
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
    PERICIA: 'Perícia',
    GOOGLE_MEET: 'Google Meet',
  };

  const eventTypeColors = {
    COMPROMISSO: 'bg-info-100 text-info-700',
    TAREFA: 'bg-success-100 text-success-800',
    PRAZO: 'bg-red-100 text-red-800',
    AUDIENCIA: 'bg-primary-100 text-primary-800',
    PERICIA: 'bg-amber-100 text-amber-800',
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

  const kanbanStatusLabels = {
    TODO: 'A Fazer',
    IN_PROGRESS: 'Em Andamento',
    DONE: 'Concluído',
  };


  // Função para ordenar eventos: atuais/futuros primeiro em ordem cronológica, passados no final
  const sortEventsByDate = (eventsToSort: ScheduleEvent[]): ScheduleEvent[] => {
    if (!eventsToSort || eventsToSort.length === 0) return [];

    const now = new Date();
    const nowMs = now.getTime();

    return [...eventsToSort].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const timeA = dateA.getTime();
      const timeB = dateB.getTime();

      // Verifica se já passou (antes do momento atual)
      const isPastA = timeA < nowMs;
      const isPastB = timeB < nowMs;

      // Eventos passados vão para o final
      if (isPastA && !isPastB) return 1;  // A é passado, B não -> B vem primeiro
      if (!isPastA && isPastB) return -1; // A não é passado, B é -> A vem primeiro

      // Ambos são passados: mais recente primeiro (ordem decrescente)
      if (isPastA && isPastB) {
        return timeB - timeA;
      }

      // Ambos são atuais ou futuros: ordem cronológica (mais próximo primeiro)
      return timeA - timeB;
    });
  };

  useEffect(() => {
    fetchEvents();
    fetchCompanyUsers();
  }, [searchTerm, filterType, filterCompleted, page, viewMode]);

  // Reset page when filters change or view mode changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterType, filterCompleted, viewMode]);

  // Buscar feriados quando mudar de semana
  useEffect(() => {
    fetchHolidays();
  }, [currentWeekStart]);

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
      // Usar companyOnly=true para garantir que apenas usuários da mesma empresa sejam listados
      // Isso evita o erro "Usuário inválido" quando SUPER_ADMIN tenta atribuir evento
      const response = await api.get('/users', { params: { companyOnly: 'true' } });
      setCompanyUsers(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      // Buscar feriados para o ano da semana atual e próximo (caso cruze anos)
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startYear = currentWeekStart.getFullYear();
      const endYear = weekEnd.getFullYear();

      // Buscar feriados de todos os anos necessários
      const yearsToFetch = [startYear];
      if (endYear !== startYear) {
        yearsToFetch.push(endYear);
      }

      const allHolidays: Holiday[] = [];
      for (const year of yearsToFetch) {
        const response = await api.get(`/holidays/${year}`);
        allHolidays.push(...response.data);
      }

      setHolidays(allHolidays);
    } catch (error) {
      console.error('Erro ao buscar feriados:', error);
      // Não exibe toast para não atrapalhar a experiência do usuário
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type = filterType;
      if (filterCompleted) params.completed = filterCompleted;

      // Use pagination only for table view
      if (viewMode === 'table') {
        params.page = page;
        params.limit = limit;
      } else {
        // For calendar view, fetch more events without pagination
        params.limit = 100;
      }

      const response = await api.get('/schedule', { params });
      // Garantir que temos um array de eventos
      const eventsData = response.data?.data || response.data || [];
      // Ordenar eventos: hoje primeiro, depois futuros, por último passados
      const sortedEvents = sortEventsByDate(Array.isArray(eventsData) ? eventsData : []);
      setEvents(sortedEvents);

      // Set total for pagination (only relevant for table view)
      if (response.data?.total !== undefined) {
        setTotal(response.data.total);
      }
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

    // Validação: Cliente e Processo obrigatórios para AUDIENCIA e PERICIA
    if (formData.type === 'AUDIENCIA' || formData.type === 'PERICIA') {
      const tipoEvento = formData.type === 'AUDIENCIA' ? 'audiências' : 'perícias';
      if (!selectedClient) {
        toast.error(`Para ${tipoEvento}, é obrigatório selecionar um cliente`);
        return;
      }
      if (!selectedCase) {
        toast.error(`Para ${tipoEvento}, é obrigatório selecionar um processo`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        // Converter datas para ISO com timezone de São Paulo
        date: fromSaoPauloToISO(formData.date),
        endDate: formData.endDate ? fromSaoPauloToISO(formData.endDate) : null,
        clientId: selectedClient?.id || null,
        caseId: selectedCase?.id || null,
        assignedUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        // Incluir kanbanStatus apenas para tarefas
        kanbanStatus: formData.type === 'TAREFA' ? formData.kanbanStatus : undefined,
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
      kanbanStatus: event.kanbanStatus || 'TODO',
      date: toDatetimeLocal(event.date),
      endDate: event.endDate ? toDatetimeLocal(event.endDate) : '',
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
    // Set selected users (carrega todos os usuários atribuídos)
    if (event.assignedUsers && event.assignedUsers.length > 0) {
      setSelectedUserIds(event.assignedUsers.map(assignment => assignment.user.id));
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

  const handleKanbanStatusChange = async (event: ScheduleEvent, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      // Sincronizar completed com kanbanStatus
      const completed = newStatus === 'DONE';
      await api.put(`/schedule/${event.id}`, {
        kanbanStatus: newStatus,
        completed: completed,
      });
      toast.success(`Status alterado para "${kanbanStatusLabels[newStatus]}"`);
      fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar status kanban:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSendWhatsApp = async (event: ScheduleEvent) => {
    if (!event.client?.phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    try {
      const response = await api.post(`/schedule/${event.id}/send-whatsapp`);
      toast.success(response.data.message || 'Mensagem de confirmação enviada!');
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Erro ao enviar mensagem');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'COMPROMISSO',
      priority: 'MEDIA',
      kanbanStatus: 'TODO',
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
    setSelectedUserIds([]);
  };


  // Funções auxiliares para o calendário de 7 dias
  const getWeekDays = (startDate: Date): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getEventsForDay = (day: Date): ScheduleEvent[] => {
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === day.getFullYear() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getDate() === day.getDate()
      );
    });
    // Ordenar eventos do dia por horário (mais cedo primeiro)
    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeA - timeB;
    });
  };

  const getHolidayForDay = (day: Date): Holiday | undefined => {
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return holidays.find(h => h.date === dayStr);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), diff));
  };

  // Aliases locais para manter compatibilidade com o código existente
  const isToday = (date: Date): boolean => isTodayUtil(date);
  const formatDayHeader = (date: Date): string => formatDayName(date);
  const formatEventTime = (dateString: string): string => formatTime(dateString);

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setExporting(true);
      setShowExportMenu(false);

      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.type = filterType;
      if (filterCompleted) params.completed = filterCompleted;

      const response = await api.get(`/schedule/export/${format}`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `agenda_${dateStr}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Agenda exportada com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar agenda');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/schedule/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message || 'Importação concluída!');

      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} linhas com erro`);
      }

      setShowImportModal(false);
      setImportFile(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleNewEventForDay = (day: Date) => {
    resetForm();
    // Pré-preenche com a data do dia clicado às 09:00
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    setFormData(prev => ({
      ...prev,
      date: `${year}-${month}-${dayNum}T09:00`,
    }));
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="text-primary-600" size={24} />
            Agenda
          </h1>
          <p className="text-neutral-600 dark:text-slate-400 mt-1">
            Gerencie seus compromissos, tarefas e prazos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Toggle View Mode */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[44px] transition-colors ${
                viewMode === 'table'
                  ? 'bg-neutral-200 dark:bg-slate-600 text-neutral-800 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
              }`}
              title="Visualização em Tabela"
            >
              <List size={18} />
              <span className="hidden sm:inline text-sm">Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[44px] transition-colors border-l border-neutral-200 dark:border-slate-700 ${
                viewMode === 'calendar'
                  ? 'bg-neutral-200 dark:bg-slate-600 text-neutral-800 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700'
              }`}
              title="Visualização em Calendário"
            >
              <Grid3X3 size={18} />
              <span className="hidden sm:inline text-sm">Calendário</span>
            </button>
          </div>
          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-600 font-medium rounded-lg transition-all duration-200"
          >
            <Upload size={20} />
            <span>Importar</span>
          </button>
          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-600 font-medium rounded-lg transition-all duration-200"
            >
              <Download size={20} />
              <span>{exporting ? 'Exportando...' : 'Exportar'}</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-lg border border-neutral-200 dark:border-slate-700 z-50">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
                >
                  <FileText size={18} className="text-red-600" />
                  Exportar PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors border-t border-neutral-100"
                >
                  <FileSpreadsheet size={18} className="text-green-600" />
                  Exportar CSV
                </button>
              </div>
            )}
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
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search - busca unificada por título, cliente, telefone ou advogado */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por título, cliente, telefone ou advogado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />
          </div>

          {/* Filter by type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            <option value="">Todos os tipos</option>
            <option value="COMPROMISSO">Compromisso</option>
            <option value="TAREFA">Tarefa</option>
            <option value="PRAZO">Prazo</option>
            <option value="AUDIENCIA">Audiência</option>
            <option value="PERICIA">Perícia</option>
          </select>

          {/* Filter by status */}
          <select
            value={filterCompleted}
            onChange={(e) => setFilterCompleted(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          >
            <option value="">Todos os status</option>
            <option value="false">Pendentes</option>
            <option value="true">Concluídos</option>
          </select>
        </div>
      </div>

      {/* Events Display - Table or Calendar View */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-500 dark:text-slate-400">Carregando...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 dark:text-slate-400">
              Nenhum evento encontrado. Crie um novo evento para começar.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={events.map((event): MobileCardItem => ({
                    id: event.id,
                    title: event.title,
                    subtitle: formatDateTime(event.date),
                    badge: {
                      text: eventTypeLabels[event.type],
                      color: event.type === 'COMPROMISSO' ? 'blue' :
                             event.type === 'TAREFA' ? 'green' :
                             event.type === 'PRAZO' ? 'red' :
                             event.type === 'AUDIENCIA' ? 'purple' :
                             event.type === 'PERICIA' ? 'yellow' : 'gray',
                    },
                    fields: [
                      { label: 'Prioridade', value: priorityLabels[event.priority || 'MEDIA'] },
                      { label: 'Kanban', value: event.type === 'TAREFA' ? kanbanStatusLabels[event.kanbanStatus || 'TODO'] : '-' },
                      { label: 'Cliente', value: event.client?.name || '-' },
                      { label: 'Processo', value: event.case?.processNumber || '-' },
                      { label: 'Status', value: event.completed ? 'Concluído' : 'Pendente' },
                    ],
                    onView: () => handleView(event),
                    onEdit: () => handleEdit(event),
                    onDelete: () => handleDelete(event.id),
                  }))}
                  emptyMessage="Nenhum evento encontrado"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-slate-700">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider whitespace-nowrap">
                        Data
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Status Kanban
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Prioridade
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Processo
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Atribuído
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                    {events.map((event) => (
                      <tr key={event.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleComplete(event)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-neutral-600 dark:text-slate-400 hover:text-success-600 hover:bg-success-50 rounded-md transition-all duration-200"
                            title={event.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                          >
                            {event.completed ? (
                              <CheckCircle size={18} className="text-success-600" />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400 text-center whitespace-nowrap">
                          {formatDateTime(event.date)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventTypeColors[event.type]}`}>
                            {eventTypeLabels[event.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {event.type === 'TAREFA' ? (
                            <KanbanStatusDropdown
                              value={(event.kanbanStatus as 'TODO' | 'IN_PROGRESS' | 'DONE') || 'TODO'}
                              onChange={(status) => handleKanbanStatusChange(event, status)}
                            />
                          ) : (
                            <span className="text-neutral-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[event.priority || 'MEDIA']}`}>
                            {priorityLabels[event.priority || 'MEDIA']}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={event.completed ? 'line-through text-neutral-500' : 'text-neutral-900 dark:text-slate-100'}>
                            {event.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400 text-center">
                          {event.client?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400 text-center">
                          {event.case?.processNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400 text-center">
                          {event.assignedUsers && event.assignedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
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
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <ActionsDropdown
                              actions={[
                                {
                                  label: 'Ver Detalhes',
                                  icon: <Eye size={16} />,
                                  onClick: () => handleView(event),
                                  variant: 'info',
                                },
                                {
                                  label: 'Editar',
                                  icon: <Edit2 size={16} />,
                                  onClick: () => handleEdit(event),
                                  variant: 'primary',
                                },
                                {
                                  label: 'WhatsApp',
                                  icon: <MessageCircle size={16} />,
                                  onClick: () => handleSendWhatsApp(event),
                                  variant: 'success',
                                  hidden: !event.client?.phone,
                                },
                                {
                                  label: 'Copiar Link Meet',
                                  icon: <Calendar size={16} />,
                                  onClick: () => {
                                    navigator.clipboard.writeText(event.googleMeetLink!);
                                    toast.success('Link do Google Meet copiado!');
                                  },
                                  variant: 'warning',
                                  hidden: !(event.type === 'GOOGLE_MEET' && event.googleMeetLink),
                                },
                                {
                                  label: 'Abrir no Calendar',
                                  icon: <Calendar size={16} />,
                                  onClick: () => window.open(event.googleMeetLink, '_blank'),
                                  variant: 'primary',
                                  hidden: !(event.type === 'GOOGLE_MEET' && event.googleMeetLink),
                                },
                                {
                                  label: 'Excluir',
                                  icon: <Trash2 size={16} />,
                                  onClick: () => handleDelete(event.id),
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

              {/* Pagination - Table View Only */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-700">
                  <div className="text-sm text-neutral-600 dark:text-slate-400">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} eventos
                  </div>
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
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-neutral-600 dark:text-slate-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Página anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-slate-400">
                      Página {page} de {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= Math.ceil(total / limit)}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-neutral-600 dark:text-slate-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Próxima página"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Calendar View - 7 Days */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-700">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex items-center gap-1 px-3 py-2 min-h-[44px] text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Semana Anterior</span>
            </button>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 capitalize">
                {formatMonthYear(currentWeekStart)}
              </h3>
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                Hoje
              </button>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="flex items-center gap-1 px-3 py-2 min-h-[44px] text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Próxima Semana</span>
              <ChevronRight size={20} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-neutral-500 dark:text-slate-400">Carregando...</div>
          ) : (
            <>
              {/* Desktop: Grid horizontal */}
              <div className="hidden md:grid md:grid-cols-7 divide-x divide-neutral-200 dark:divide-slate-700">
                {getWeekDays(currentWeekStart).map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isDayToday = isToday(day);
                  const holiday = getHolidayForDay(day);
                  return (
                    <div key={index} className={`min-h-[300px] ${isDayToday ? 'bg-primary-50/30' : holiday ? 'bg-red-50/30' : ''}`}>
                      {/* Day Header */}
                      <div className={`p-3 text-center border-b border-neutral-200 dark:border-slate-700 ${isDayToday ? 'bg-primary-100 dark:bg-primary-900/30' : holiday ? 'bg-red-100 dark:bg-red-900/30' : 'bg-neutral-50 dark:bg-slate-700'}`}>
                        <div className={`text-xs font-medium uppercase ${isDayToday ? 'text-primary-700 dark:text-primary-400' : holiday ? 'text-red-700 dark:text-red-400' : 'text-neutral-500 dark:text-slate-400'}`}>
                          {formatDayHeader(day)}
                        </div>
                        <div className={`text-2xl font-bold ${isDayToday ? 'text-primary-700 dark:text-primary-400' : holiday ? 'text-red-700 dark:text-red-400' : 'text-neutral-900 dark:text-slate-100'}`}>
                          {formatDayNumber(day)}
                        </div>
                      </div>
                      {/* Holiday Banner */}
                      {holiday && (
                        <div className="px-2 py-1 bg-red-100 border-b border-red-200">
                          <div className="text-xs font-medium text-red-800 text-center truncate" title={holiday.name}>
                            🎉 {holiday.name}
                          </div>
                        </div>
                      )}
                      {/* Day Events */}
                      <div className="p-2 space-y-2">
                        {dayEvents.length === 0 ? (
                          <div className="text-center py-4">
                            <button
                              onClick={() => handleNewEventForDay(day)}
                              className="text-xs text-neutral-400 dark:text-slate-500 hover:text-primary-600 transition-colors"
                            >
                              + Adicionar
                            </button>
                          </div>
                        ) : (
                          <>
                            {dayEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => handleView(event)}
                                className={`w-full text-left p-2 rounded-lg transition-all hover:shadow-md ${
                                  event.completed ? 'opacity-50' : ''
                                } ${eventTypeColors[event.type].replace('text-', 'border-l-4 border-').split(' ')[0]} bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-600`}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                                    {formatEventTime(event.date)}
                                  </span>
                                  {event.completed && (
                                    <CheckCircle size={12} className="text-success-600" />
                                  )}
                                </div>
                                <div className={`text-sm font-medium truncate ${event.completed ? 'line-through text-neutral-500' : 'text-neutral-900 dark:text-slate-100'}`}>
                                  {event.title}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${eventTypeColors[event.type]}`}>
                                    {eventTypeLabels[event.type]}
                                  </span>
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={() => handleNewEventForDay(day)}
                              className="w-full text-xs text-center py-1 text-neutral-400 dark:text-slate-500 hover:text-primary-600 transition-colors"
                            >
                              + Adicionar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: Vertical list */}
              <div className="md:hidden divide-y divide-neutral-200 dark:divide-slate-700">
                {getWeekDays(currentWeekStart).map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isDayToday = isToday(day);
                  const holiday = getHolidayForDay(day);
                  return (
                    <div key={index} className={`${isDayToday ? 'bg-primary-50/30' : holiday ? 'bg-red-50/30' : ''}`}>
                      {/* Day Header */}
                      <div className={`p-3 flex items-center justify-between ${isDayToday ? 'bg-primary-100 dark:bg-primary-900/30' : holiday ? 'bg-red-100 dark:bg-red-900/30' : 'bg-neutral-50 dark:bg-slate-700'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`text-2xl font-bold ${isDayToday ? 'text-primary-700 dark:text-primary-400' : holiday ? 'text-red-700 dark:text-red-400' : 'text-neutral-900 dark:text-slate-100'}`}>
                            {formatDayNumber(day)}
                          </div>
                          <div className="flex flex-col">
                            <div className={`text-sm font-medium ${isDayToday ? 'text-primary-700 dark:text-primary-400' : holiday ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-slate-400'}`}>
                              {formatDayHeader(day)}
                            </div>
                            {holiday && (
                              <div className="text-xs text-red-600">
                                🎉 {holiday.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleNewEventForDay(day)}
                          className="p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      {/* Day Events */}
                      <div className="p-3 space-y-2">
                        {dayEvents.length === 0 ? (
                          <div className="text-center py-2 text-sm text-neutral-400 dark:text-slate-500">
                            Nenhum evento
                          </div>
                        ) : (
                          dayEvents.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => handleView(event)}
                              className={`w-full text-left p-3 rounded-lg transition-all hover:shadow-md ${
                                event.completed ? 'opacity-50' : ''
                              } bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-600`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-500 dark:text-slate-400">
                                    {formatEventTime(event.date)}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${eventTypeColors[event.type]}`}>
                                    {eventTypeLabels[event.type]}
                                  </span>
                                </div>
                                {event.completed && (
                                  <CheckCircle size={16} className="text-success-600" />
                                )}
                              </div>
                              <div className={`text-base font-medium ${event.completed ? 'line-through text-neutral-500' : 'text-neutral-900 dark:text-slate-100'}`}>
                                {event.title}
                              </div>
                              {event.client && (
                                <div className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                                  {event.client.name}
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    placeholder="Ex: Reunião com cliente"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="COMPROMISSO">Compromisso</option>
                    <option value="TAREFA">Tarefa</option>
                    <option value="PRAZO">Prazo</option>
                    <option value="AUDIENCIA">Audiência</option>
                    <option value="PERICIA">Perícia</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Prioridade *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="BAIXA">🟢 Baixa</option>
                    <option value="MEDIA">🟡 Média</option>
                    <option value="ALTA">🟠 Alta</option>
                    <option value="URGENTE">🔴 Urgente</option>
                  </select>
                </div>

                {/* Kanban Status - apenas para tarefas */}
                {formData.type === 'TAREFA' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Status Kanban
                    </label>
                    <select
                      value={formData.kanbanStatus}
                      onChange={(e) => setFormData({ ...formData, kanbanStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="TODO">📋 A Fazer</option>
                      <option value="IN_PROGRESS">🔄 Em Andamento</option>
                      <option value="DONE">✅ Concluído</option>
                    </select>
                  </div>
                )}

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Data e Hora *
                    </label>
                    <DateTimePicker
                      selected={formData.date ? parseISO(formData.date.includes('T') ? formData.date : formData.date + 'T00:00:00') : null}
                      onChange={(date) => setFormData({ ...formData, date: date ? dateToLocalString(date) : '' })}
                      required
                      placeholderText="Selecione data e hora"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Data/Hora Término (opcional)
                    </label>
                    <DateTimePicker
                      selected={formData.endDate ? parseISO(formData.endDate.includes('T') ? formData.endDate : formData.endDate + 'T00:00:00') : null}
                      onChange={(date) => setFormData({ ...formData, endDate: date ? dateToLocalString(date) : '' })}
                      placeholderText="Selecione data e hora"
                      isClearable
                    />
                  </div>
                </div>

                {/* Client and Case */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Cliente {(formData.type === 'AUDIENCIA' || formData.type === 'PERICIA') ? '*' : '(opcional)'}
                    </label>
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] text-neutral-900 dark:text-slate-100 ${
                        (formData.type === 'AUDIENCIA' || formData.type === 'PERICIA') && !selectedClient
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                          : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}
                      placeholder="Digite o nome ou CPF do cliente..."
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                            className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-slate-600 cursor-pointer min-h-[44px]"
                          >
                            <div className="font-medium text-neutral-900 dark:text-slate-100">{client.name}</div>
                            {client.cpf && <div className="text-sm text-neutral-500 dark:text-slate-400">CPF: {client.cpf}</div>}
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
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Processo {(formData.type === 'AUDIENCIA' || formData.type === 'PERICIA') ? '*' : '(opcional)'}
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] text-neutral-900 dark:text-slate-100 ${
                        (formData.type === 'AUDIENCIA' || formData.type === 'PERICIA') && !selectedCase
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                          : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}
                      placeholder={selectedClient ? 'Selecione ou digite para buscar...' : 'Selecione um cliente primeiro...'}
                    />
                    {showCaseSuggestions && caseSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {caseSuggestions.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            onClick={() => {
                              setSelectedCase(caseItem);
                              setCaseSearchTerm(caseItem.processNumber);
                              setShowCaseSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-slate-600 cursor-pointer min-h-[44px]"
                          >
                            <div className="font-medium text-neutral-900 dark:text-slate-100">{caseItem.processNumber}</div>
                            <div className="text-sm text-neutral-500 dark:text-slate-400">{caseItem.subject}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedClient && caseSuggestions.length === 0 && !selectedCase && showCaseSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg p-3 text-sm text-neutral-500 dark:text-slate-400">
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

                {/* Assigned Users - Seleção múltipla com checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
                      Responsáveis (opcional)
                    </label>
                    <div className="flex gap-2">
                      {selectedUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds([])}
                          className="text-xs text-red-600 hover:text-red-800 transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds(companyUsers.map(u => u.id))}
                        className="text-xs text-primary-600 hover:text-primary-800 transition-colors font-medium"
                      >
                        Adicionar Todos
                      </button>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-white dark:bg-slate-800">
                    {companyUsers.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-slate-400 text-center py-2">Nenhum usuário disponível</p>
                    ) : (
                      companyUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 rounded-md cursor-pointer transition-colors"
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
                          <div className="flex-1">
                            <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">{user.name}</span>
                            {user.email && (
                              <span className="text-xs text-neutral-500 dark:text-slate-400 ml-2">({user.email})</span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedUserIds.length > 0 && (
                    <p className="mt-2 text-xs text-success-600">
                      {selectedUserIds.length} responsável{selectedUserIds.length > 1 ? 'eis' : ''} selecionado{selectedUserIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
                Detalhes do Evento
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Título</label>
                  <p className="text-neutral-900 dark:text-slate-100 text-lg">{viewingEvent.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Tipo</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${eventTypeColors[viewingEvent.type]}`}>
                    {eventTypeLabels[viewingEvent.type]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Data/Hora Início</label>
                    <p className="text-neutral-900 dark:text-slate-100">{formatDateTime(viewingEvent.date)}</p>
                  </div>
                  {viewingEvent.endDate && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Data/Hora Término</label>
                      <p className="text-neutral-900 dark:text-slate-100">{formatDateTime(viewingEvent.endDate)}</p>
                    </div>
                  )}
                </div>

                {viewingEvent.client && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Cliente</label>
                    <p className="text-neutral-900 dark:text-slate-100">{viewingEvent.client.name}</p>
                    {viewingEvent.client.cpf && (
                      <p className="text-sm text-neutral-600 dark:text-slate-400">CPF: {viewingEvent.client.cpf}</p>
                    )}
                  </div>
                )}

                {viewingEvent.case && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Processo</label>
                    <p className="text-neutral-900 dark:text-slate-100">{viewingEvent.case.processNumber}</p>
                    <p className="text-sm text-neutral-600 dark:text-slate-400">{viewingEvent.case.subject}</p>
                  </div>
                )}

                {viewingEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Descrição</label>
                    <p className="text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">{viewingEvent.description}</p>
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
                        className="flex-1 px-3 py-2 border border-orange-300 rounded-md bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 text-sm min-h-[44px]"
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
                  <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Status</label>
                  <p className="text-neutral-900 dark:text-slate-100">
                    {viewingEvent.completed ? (
                      <span className="text-success-600 flex items-center gap-1">
                        <CheckCircle size={16} /> Concluído
                      </span>
                    ) : (
                      <span className="text-neutral-600 dark:text-slate-400 flex items-center gap-1">
                        <Circle size={16} /> Pendente
                      </span>
                    )}
                  </p>
                </div>

                {viewingEvent.user && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 dark:text-slate-400">Criado por</label>
                    <p className="text-neutral-900 dark:text-slate-100">{viewingEvent.user.name}</p>
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-lg">
            <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-slate-200">Importar Eventos de CSV</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                <h4 className="font-medium text-info-800 mb-2">Formato do CSV:</h4>
                <p className="text-sm text-info-700 mb-2">O arquivo deve conter as seguintes colunas (na ordem):</p>
                <code className="text-xs bg-info-100 px-2 py-1 rounded block">
                  Data,Horário,Título,Tipo,Prioridade,Descrição
                </code>
                <p className="text-xs text-info-600 mt-2">
                  • Data: DD/MM/AAAA ou AAAA-MM-DD<br />
                  • Horário: HH:MM (opcional)<br />
                  • Tipo: Compromisso, Tarefa, Prazo, Audiência, Perícia<br />
                  • Prioridade: Baixa, Média, Alta, Urgente
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">Arquivo CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-slate-400">
                    Arquivo selecionado: {importFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white hover:bg-primary-700 disabled:bg-neutral-300 font-medium rounded-lg transition-all duration-200"
              >
                <Upload size={18} />
                {importing ? 'Importando...' : 'Importar'}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default Schedule;
