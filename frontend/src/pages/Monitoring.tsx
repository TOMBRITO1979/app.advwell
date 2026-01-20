import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Play,
  Pause,
  RefreshCw,
  FileText,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Scale,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ActionsDropdown } from '../components/ui';
import { DateOnlyPicker } from '../components/DateTimePicker';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { formatProcessNumber } from '../utils/processNumber';

// Types
type MonitoringStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';
type ConsultaStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Lawyer {
  id: string;
  name: string;
  oab?: string;
  oabState?: string;
}

interface MonitoredOAB {
  id: string;
  name: string;
  oab: string;
  oabState: string;
  status: MonitoringStatus;
  tribunais: string[];
  autoImport: boolean;
  lastConsultaAt?: string;
  createdAt: string;
  _count?: {
    publications: number;
    consultas: number;
  };
}

interface Publication {
  id: string;
  numeroProcesso: string;
  siglaTribunal: string;
  dataPublicacao: string;
  tipoComunicacao?: string;
  textoComunicacao?: string;
  imported: boolean;
  importedCaseId?: string;
  importedClientId?: string;
  createdAt: string;
  monitoredOab: {
    id: string;
    name: string;
    oab: string;
    oabState: string;
  };
}

interface OABConsulta {
  id: string;
  status: ConsultaStatus;
  dataInicio: string;
  dataFim: string;
  totalPublicacoes: number;
  importedCount: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  monitoredOab: {
    id: string;
    name: string;
    oab: string;
    oabState: string;
  };
}

interface QueueStatus {
  status: 'pending' | 'processing' | 'fetching' | 'saving' | 'completed' | 'failed';
  progress: number;
  totalPublications: number;
  savedCount: number;
  importedCount: number;
  currentPage: number;
  totalPages: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

interface Stats {
  totalOabs: number;
  activeOabs: number;
  totalPublications: number;
  pendingPublications: number;
  recentConsultas: number;
}

interface OABFormData {
  name: string;
  oab: string;
  oabState: string;
  tribunais: string[];
  autoImport: boolean;
}


// Brazilian states
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

// Status colors
const statusColors: Record<MonitoringStatus, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pausado' },
  INACTIVE: { bg: 'bg-neutral-100', text: 'text-neutral-800', label: 'Inativo' },
};

const consultaStatusColors: Record<ConsultaStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pendente' },
  PROCESSING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Processando' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Concluído' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Falhou' },
};

/**
 * Limpa o texto da publicacao removendo ARIA, HTML e formatando campos
 */
function cleanPublicationText(text: string | null | undefined): string | null {
  if (!text) return null;

  let cleaned = text
    // Remove atributos ARIA e HTML
    .replace(/aria-[a-z-]+="[^"]*"/gi, '')
    .replace(/data-[a-z-]+="[^"]*"/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/id="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/role="[^"]*"/gi, '')
    .replace(/tabindex="[^"]*"/gi, '')
    .replace(/d-flex[^"]*"/gi, '')
    .replace(/align-items-[^"]*"/gi, '')
    // Remove tags HTML
    .replace(/<[^>]+>/g, ' ')
    // Remove botoes de acao comuns
    .replace(/\b(Imprimir|Copiar|Copiar sem formatação|Download|Baixar|Compartilhar)\b/gi, '')
    // Remove padroes de interface
    .replace(/\/?$/g, '')
    .replace(/\.I\.\s*$/g, '')
    // Remove underscores soltos
    .replace(/\s*_\s*/g, ' ')
    // Remove multiplos espacos
    .replace(/\s+/g, ' ')
    .trim();

  // Formata campos conhecidos em linhas separadas
  cleaned = cleaned
    // Processo
    .replace(/\s*Processo\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/gi, '\n\nProcesso: $1')
    // Orgao/Vara
    .replace(/\s*(Órgão:?)\s*/gi, '\nÓrgão: ')
    .replace(/\s*(\d+ª?\s*Vara[^.]*)/gi, '\nVara: $1')
    // Datas
    .replace(/\s*(Data de disponibilização:?)\s*/gi, '\nData: ')
    .replace(/\s*(Data:?)\s+(\d{2}\/\d{2}\/\d{4})/gi, '\nData: $2')
    // Partes
    .replace(/\s*(Polo Ativo:?)\s*/gi, '\n\nPolo Ativo: ')
    .replace(/\s*(Polo Passivo:?)\s*/gi, '\nPolo Passivo: ')
    .replace(/\s*(Autor:?)\s+/gi, '\n\nAutor: ')
    .replace(/\s*(Réu:?)\s+/gi, '\nRéu: ')
    .replace(/\s*(Requerente:?)\s+/gi, '\n\nRequerente: ')
    .replace(/\s*(Requerido:?)\s+/gi, '\nRequerido: ')
    .replace(/\s*(Exequente:?)\s+/gi, '\n\nExequente: ')
    .replace(/\s*(Executado:?)\s+/gi, '\nExecutado: ')
    // Advogados
    .replace(/\s*(Advogado\(?s?\)?:?)\s*/gi, '\nAdvogado(s): ')
    .replace(/\s*-\s*OAB\s+/gi, ' - OAB ')
    // Tipo de acao
    .replace(/\s*(Trata-se de)\s+/gi, '\n\nTipo: ')
    .trim();

  // Remove linhas vazias extras
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return cleaned || null;
}

const Monitoring: React.FC = () => {
  const navigate = useNavigate();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'oabs' | 'publications' | 'consultas'>('oabs');

  // OABs state
  const [oabs, setOabs] = useState<MonitoredOAB[]>([]);
  const [loadingOabs, setLoadingOabs] = useState(true);
  const [searchOab, setSearchOab] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Lawyers state (para selecionar advogado existente)
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>('');

  // Publications state
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [searchPublication, setSearchPublication] = useState('');
  const [importedFilter, setImportedFilter] = useState<string>('');
  const [selectedOabFilter, setSelectedOabFilter] = useState<string>('');
  const [publicationPage, setPublicationPage] = useState(1);
  const [publicationTotal, setPublicationTotal] = useState(0);
  const [publicationTotalPages, setPublicationTotalPages] = useState(0);

  // Consultas state
  const [consultas, setConsultas] = useState<OABConsulta[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [consultaStatuses, setConsultaStatuses] = useState<Record<string, QueueStatus>>({});

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);

  // Modal states
  const [showOabModal, setShowOabModal] = useState(false);
  const [showPublicationModal, setShowPublicationModal] = useState(false);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [selectedOab, setSelectedOab] = useState<MonitoredOAB | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data
  const initialFormData: OABFormData = {
    name: '',
    oab: '',
    oabState: 'SP',
    tribunais: [],
    autoImport: true,
  };
  const [formData, setFormData] = useState<OABFormData>(initialFormData);

  // Consulta form
  const [consultaOabId, setConsultaOabId] = useState('');
  const [consultaDataInicio, setConsultaDataInicio] = useState<Date | null>(null);
  const [consultaDataFim, setConsultaDataFim] = useState<Date | null>(null);
  const [startingConsulta, setStartingConsulta] = useState(false);

  // Load data
  useEffect(() => {
    loadStats();
    loadOabs();
    loadLawyers();
  }, []);

  useEffect(() => {
    if (activeTab === 'publications') {
      loadPublications();
    } else if (activeTab === 'consultas') {
      loadConsultas();
    }
  }, [activeTab, publicationPage, searchPublication, importedFilter, selectedOabFilter]);

  // Poll for active consulta statuses
  useEffect(() => {
    if (activeTab !== 'consultas') return;

    const activeConsultas = consultas.filter(
      c => c.status === 'PENDING' || c.status === 'PROCESSING'
    );

    if (activeConsultas.length === 0) return;

    const pollStatuses = async () => {
      for (const consulta of activeConsultas) {
        try {
          const response = await api.get(`/monitoring/consultas/${consulta.id}/status`);
          if (response.data.queueStatus) {
            setConsultaStatuses(prev => ({
              ...prev,
              [consulta.id]: response.data.queueStatus,
            }));
          }
          // If completed or failed, refresh the list
          if (response.data.consulta.status === 'COMPLETED' || response.data.consulta.status === 'FAILED') {
            loadConsultas();
            loadStats();
          }
        } catch (err) {
          console.error('Error polling consulta status:', err);
        }
      }
    };

    pollStatuses();
    const interval = setInterval(pollStatuses, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activeTab, consultas]);

  const loadStats = async () => {
    try {
      const response = await api.get('/monitoring/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadOabs = async () => {
    try {
      setLoadingOabs(true);
      const params: Record<string, string> = {};
      if (searchOab) params.search = searchOab;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/monitoring/oabs', { params });
      setOabs(response.data);
    } catch (error) {
      toast.error('Erro ao carregar OABs monitoradas');
    } finally {
      setLoadingOabs(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const response = await api.get('/lawyers', { params: { limit: 1000 } });
      // Filtrar apenas advogados que têm OAB cadastrada
      const lawyersWithOab = (response.data.data || response.data || []).filter(
        (l: Lawyer) => l.oab && l.oabState
      );
      setLawyers(lawyersWithOab);
    } catch (error) {
      console.error('Error loading lawyers:', error);
    }
  };

  const loadPublications = async () => {
    try {
      setLoadingPublications(true);
      const params: Record<string, string | number> = {
        page: publicationPage,
        limit: 20,
      };
      if (searchPublication) params.search = searchPublication;
      if (importedFilter) params.imported = importedFilter;
      if (selectedOabFilter) params.monitoredOabId = selectedOabFilter;

      const response = await api.get('/monitoring/publications', { params });
      setPublications(response.data.publications);
      setPublicationTotal(response.data.pagination.total);
      setPublicationTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      toast.error('Erro ao carregar publicacoes');
    } finally {
      setLoadingPublications(false);
    }
  };

  const loadConsultas = async () => {
    try {
      setLoadingConsultas(true);
      const response = await api.get('/monitoring/consultas');
      setConsultas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar consultas');
    } finally {
      setLoadingConsultas(false);
    }
  };

  // CRUD handlers
  const handleOpenCreateModal = () => {
    setEditMode(false);
    setFormData(initialFormData);
    setShowOabModal(true);
  };

  const handleOpenEditModal = (oab: MonitoredOAB) => {
    setEditMode(true);
    setSelectedOab(oab);
    setFormData({
      name: oab.name,
      oab: oab.oab,
      oabState: oab.oabState,
      tribunais: oab.tribunais || [],
      autoImport: oab.autoImport,
    });
    setShowOabModal(true);
  };

  const handleCloseOabModal = () => {
    setShowOabModal(false);
    setSelectedOab(null);
    setFormData(initialFormData);
    setSelectedLawyerId('');
  };

  // Handler para quando seleciona um advogado existente
  const handleSelectLawyer = (lawyerId: string) => {
    setSelectedLawyerId(lawyerId);
    if (lawyerId) {
      const lawyer = lawyers.find(l => l.id === lawyerId);
      if (lawyer) {
        setFormData({
          ...formData,
          name: lawyer.name,
          oab: lawyer.oab || '',
          oabState: lawyer.oabState || 'SP',
        });
      }
    } else {
      // Limpar campos se desmarcar
      setFormData({
        ...formData,
        name: '',
        oab: '',
        oabState: 'SP',
      });
    }
  };

  const handleSaveOab = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome e obrigatorio');
      return;
    }
    if (!formData.oab.trim()) {
      toast.error('Numero da OAB e obrigatorio');
      return;
    }

    try {
      setSaving(true);
      if (editMode && selectedOab) {
        await api.put(`/monitoring/oabs/${selectedOab.id}`, formData);
        toast.success('OAB atualizada com sucesso');
      } else {
        await api.post('/monitoring/oabs', formData);
        toast.success('OAB adicionada com sucesso');
      }
      handleCloseOabModal();
      loadOabs();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar OAB');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOab = async (oab: MonitoredOAB) => {
    if (!confirm(`Deseja remover o monitoramento de ${oab.name} (OAB ${oab.oab}/${oab.oabState})?`)) {
      return;
    }

    try {
      await api.delete(`/monitoring/oabs/${oab.id}`);
      toast.success('OAB removida com sucesso');
      loadOabs();
      loadStats();
    } catch (error) {
      toast.error('Erro ao remover OAB');
    }
  };

  const handleToggleStatus = async (oab: MonitoredOAB) => {
    const newStatus = oab.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.put(`/monitoring/oabs/${oab.id}`, { status: newStatus });
      toast.success(`Monitoramento ${newStatus === 'ACTIVE' ? 'ativado' : 'pausado'}`);
      loadOabs();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  // Busca manual rápida (últimos 5 anos, enfileira direto)
  const handleRefreshOab = async (oab: MonitoredOAB) => {
    try {
      toast.loading('Enfileirando busca...', { id: 'refresh-oab' });
      await api.post(`/monitoring/oabs/${oab.id}/refresh`);
      toast.success('Busca enfileirada! Acompanhe na aba Consultas.', { id: 'refresh-oab' });
      loadConsultas();
      setActiveTab('consultas');
    } catch (error) {
      toast.error('Erro ao enfileirar busca', { id: 'refresh-oab' });
    }
  };

  // Publication handlers
  const handleViewPublication = (pub: Publication) => {
    setSelectedPublication(pub);
    setShowPublicationModal(true);
  };

  // Navegar para Cases com dados pre-preenchidos
  const handleImportToCase = (pub: Publication) => {
    const cleanedText = cleanPublicationText(pub.textoComunicacao);
    navigate('/cases', {
      state: {
        fromPublication: true,
        publicationId: pub.id,
        processNumber: pub.numeroProcesso,
        court: pub.siglaTribunal,
        publicationDate: pub.dataPublicacao,
        notes: cleanedText || pub.textoComunicacao || '',
        subject: pub.tipoComunicacao || 'Processo importado via monitoramento',
        monitoredOab: pub.monitoredOab,
      },
    });
  };

  // Consulta handlers
  const handleOpenConsultaModal = (oab?: MonitoredOAB) => {
    if (oab) {
      setConsultaOabId(oab.id);
    } else {
      setConsultaOabId('');
    }
    // Default: últimos 5 anos
    const today = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    setConsultaDataFim(today);
    setConsultaDataInicio(fiveYearsAgo);
    setShowConsultaModal(true);
  };

  // Formata Date para string YYYY-MM-DD
  const formatDateToISO = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartConsulta = async () => {
    if (!consultaOabId) {
      toast.error('Selecione uma OAB');
      return;
    }

    if (!consultaDataInicio || !consultaDataFim) {
      toast.error('Selecione o período');
      return;
    }

    try {
      setStartingConsulta(true);
      await api.post('/monitoring/consultas', {
        monitoredOabId: consultaOabId,
        dataInicio: formatDateToISO(consultaDataInicio),
        dataFim: formatDateToISO(consultaDataFim),
      });
      toast.success('Consulta enfileirada! Acompanhe o progresso na aba Consultas.');
      setShowConsultaModal(false);
      setActiveTab('consultas');
      loadConsultas();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao iniciar consulta');
    } finally {
      setStartingConsulta(false);
    }
  };

  // Filter effect for OABs
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOabs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchOab, statusFilter]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Monitoramento</h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">
              Importe processos do Diario Oficial por OAB
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenConsultaModal()}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
            >
              <RefreshCw size={18} />
              <span className="hidden sm:inline">Nova Consulta</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nova OAB</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
              <div className="text-2xl font-bold text-primary-600">{stats.totalOabs}</div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">OABs Cadastradas</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
              <div className="text-2xl font-bold text-green-600">{stats.activeOabs}</div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">Monitoramento Ativo</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalPublications}</div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">Proc. Encontrados</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingPublications}</div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">Aguardando Importacao</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.recentConsultas}</div>
              <div className="text-sm text-neutral-600 dark:text-slate-400">Consultas (7 dias)</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="border-b border-neutral-200 dark:border-slate-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('oabs')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'oabs'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Scale size={16} className="inline mr-2" />
                OABs Monitoradas
              </button>
              <button
                onClick={() => setActiveTab('publications')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'publications'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                Importar Proc.
              </button>
              <button
                onClick={() => setActiveTab('consultas')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'consultas'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <RefreshCw size={16} className="inline mr-2" />
                Consultas
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* OABs Tab */}
            {activeTab === 'oabs' && (
              <div>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou número da OAB..."
                      value={searchOab}
                      onChange={(e) => setSearchOab(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>

                {/* OABs Table */}
                {loadingOabs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary-600" size={32} />
                  </div>
                ) : oabs.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                    Nenhuma OAB cadastrada para monitoramento
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Advogado</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">OAB</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Processos</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Ultima Consulta</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Acoes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                        {oabs.map((oab) => (
                          <tr key={oab.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                            <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-100">{oab.name}</td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {oab.oab}/{oab.oabState}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  statusColors[oab.status].bg
                                } ${statusColors[oab.status].text}`}
                              >
                                {statusColors[oab.status].label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {oab._count?.publications || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {oab.lastConsultaAt ? formatDateTime(oab.lastConsultaAt) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ActionsDropdown
                                actions={[
                                  { label: 'Buscar Agora', icon: <Search size={16} />, onClick: () => handleRefreshOab(oab), variant: 'primary' },
                                  { label: 'Consulta Personalizada', icon: <RefreshCw size={16} />, onClick: () => handleOpenConsultaModal(oab) },
                                  { label: oab.status === 'ACTIVE' ? 'Pausar' : 'Ativar', icon: oab.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />, onClick: () => handleToggleStatus(oab), variant: 'warning' },
                                  { label: 'Editar', icon: <Edit size={16} />, onClick: () => handleOpenEditModal(oab) },
                                  { label: 'Remover', icon: <Trash2 size={16} />, onClick: () => handleDeleteOab(oab), variant: 'danger' },
                                ]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Publications Tab */}
            {activeTab === 'publications' && (
              <div>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por número do processo ou tribunal..."
                      value={searchPublication}
                      onChange={(e) => {
                        setSearchPublication(e.target.value);
                        setPublicationPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <select
                    value={selectedOabFilter}
                    onChange={(e) => {
                      setSelectedOabFilter(e.target.value);
                      setPublicationPage(1);
                    }}
                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todas as OABs</option>
                    {oabs.map((oab) => (
                      <option key={oab.id} value={oab.id}>
                        {oab.name} ({oab.oab}/{oab.oabState})
                      </option>
                    ))}
                  </select>
                  <select
                    value={importedFilter}
                    onChange={(e) => {
                      setImportedFilter(e.target.value);
                      setPublicationPage(1);
                    }}
                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Todos</option>
                    <option value="false">Pendentes</option>
                    <option value="true">Importados</option>
                  </select>
                </div>

                {/* Publications Table */}
                {loadingPublications ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary-600" size={32} />
                  </div>
                ) : publications.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                    Nenhuma publicacao encontrada
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Processo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Tribunal</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Data</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Tipo</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Advogado</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Acoes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                          {publications.map((pub) => (
                            <tr key={pub.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                              <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-100 font-mono">
                                {formatProcessNumber(pub.numeroProcesso)}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{pub.siglaTribunal}</td>
                              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                                {formatDate(pub.dataPublicacao)}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                                {pub.tipoComunicacao || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                                {pub.monitoredOab.name}
                              </td>
                              <td className="px-4 py-3">
                                {pub.imported ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    <Check size={12} />
                                    Importado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                    <AlertCircle size={12} />
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <ActionsDropdown
                                  actions={[
                                    { label: 'Visualizar', icon: <Eye size={16} />, onClick: () => handleViewPublication(pub), variant: 'info' },
                                    { label: 'Importar', icon: <Download size={16} />, onClick: () => handleImportToCase(pub), variant: 'primary', hidden: pub.imported },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {publicationTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          Mostrando pagina {publicationPage} de {publicationTotalPages} ({publicationTotal} processos)
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPublicationPage((p) => Math.max(1, p - 1))}
                            disabled={publicationPage === 1}
                            className="p-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => setPublicationPage((p) => Math.min(publicationTotalPages, p + 1))}
                            disabled={publicationPage === publicationTotalPages}
                            className="p-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Consultas Tab */}
            {activeTab === 'consultas' && (
              <div>
                {loadingConsultas ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary-600" size={32} />
                  </div>
                ) : consultas.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 dark:text-slate-400">
                    Nenhuma consulta realizada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Advogado</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Periodo</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Processos</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-slate-400">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                        {consultas.map((consulta) => (
                          <tr key={consulta.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                            <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-100">
                              {consulta.monitoredOab.name}
                              <div className="text-xs text-neutral-500 dark:text-slate-400">
                                {consulta.monitoredOab.oab}/{consulta.monitoredOab.oabState}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {formatDate(consulta.dataInicio)} - {formatDate(consulta.dataFim)}
                            </td>
                            <td className="px-4 py-3">
                              {/* Show progress for active consultas */}
                              {(consulta.status === 'PENDING' || consulta.status === 'PROCESSING') && consultaStatuses[consulta.id] ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-primary-600" />
                                    <span className="text-xs text-primary-600 capitalize">
                                      {consultaStatuses[consulta.id].status === 'fetching' ? 'Buscando...' :
                                       consultaStatuses[consulta.id].status === 'saving' ? 'Salvando...' :
                                       consultaStatuses[consulta.id].status === 'processing' ? 'Processando...' :
                                       'Aguardando...'}
                                    </span>
                                  </div>
                                  <div className="w-32 bg-neutral-200 rounded-full h-2">
                                    <div
                                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${consultaStatuses[consulta.id].progress}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 dark:text-slate-400">
                                    {consultaStatuses[consulta.id].progress}% -
                                    {consultaStatuses[consulta.id].savedCount > 0 && (
                                      <> {consultaStatuses[consulta.id].savedCount} salvas</>
                                    )}
                                    {consultaStatuses[consulta.id].currentPage > 0 && (
                                      <> (pag {consultaStatuses[consulta.id].currentPage}/{consultaStatuses[consulta.id].totalPages})</>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      consultaStatusColors[consulta.status].bg
                                    } ${consultaStatusColors[consulta.status].text}`}
                                  >
                                    {consultaStatusColors[consulta.status].label}
                                  </span>
                                  {consulta.errorMessage && (
                                    <div className="text-xs text-red-600 mt-1">{consulta.errorMessage}</div>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {consultaStatuses[consulta.id]?.totalPublications > 0 ? (
                                <>
                                  {consultaStatuses[consulta.id].savedCount}/{consultaStatuses[consulta.id].totalPublications}
                                </>
                              ) : consulta.totalPublicacoes > 0 ? (
                                <>
                                  {consulta.importedCount}/{consulta.totalPublicacoes}
                                </>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                              {formatDateTime(consulta.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OAB Modal */}
      {showOabModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editMode ? 'Editar OAB Monitorada' : 'Nova OAB Monitorada'}
              </h2>
              <button
                onClick={handleCloseOabModal}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Select para escolher advogado existente */}
              {!editMode && lawyers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Selecionar Advogado Cadastrado
                  </label>
                  <select
                    value={selectedLawyerId}
                    onChange={(e) => handleSelectLawyer(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Digitar manualmente --</option>
                    {lawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.name} (OAB {lawyer.oab}/{lawyer.oabState})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Selecione um advogado ja cadastrado ou digite manualmente abaixo
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Nome do Advogado <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!selectedLawyerId}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100"
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Numero OAB <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.oab}
                    onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                    disabled={editMode || !!selectedLawyerId}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.oabState}
                    onChange={(e) => setFormData({ ...formData, oabState: e.target.value })}
                    disabled={editMode || !!selectedLawyerId}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100"
                  >
                    {BRAZILIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoImport"
                  checked={formData.autoImport}
                  onChange={(e) => setFormData({ ...formData, autoImport: e.target.checked })}
                  className="rounded border-neutral-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="autoImport" className="text-sm text-neutral-700 dark:text-slate-300">
                  Importar processos automaticamente
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={handleCloseOabModal}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOab}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editMode ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publication Details Modal */}
      {showPublicationModal && selectedPublication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold">Detalhes da Publicação</h2>
              <button
                onClick={() => setShowPublicationModal(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Numero do Processo</label>
                  <div className="font-mono text-neutral-900 dark:text-slate-100">{formatProcessNumber(selectedPublication.numeroProcesso)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Tribunal</label>
                  <div className="text-neutral-900 dark:text-slate-100">{selectedPublication.siglaTribunal}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data da Publicação</label>
                  <div className="text-neutral-900 dark:text-slate-100">{formatDate(selectedPublication.dataPublicacao)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Tipo de Comunicacao</label>
                  <div className="text-neutral-900 dark:text-slate-100">{selectedPublication.tipoComunicacao || '-'}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Advogado Vinculado</label>
                <div className="text-neutral-900 dark:text-slate-100">
                  {selectedPublication.monitoredOab.name} (OAB {selectedPublication.monitoredOab.oab}/
                  {selectedPublication.monitoredOab.oabState})
                </div>
              </div>
              {selectedPublication.textoComunicacao && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-slate-400">Texto da Publicação</label>
                  <div className="mt-1 p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg text-sm text-neutral-700 dark:text-slate-300 whitespace-pre-wrap">
                    {cleanPublicationText(selectedPublication.textoComunicacao) || selectedPublication.textoComunicacao}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowPublicationModal(false)}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
              {!selectedPublication.imported && (
                <button
                  onClick={() => {
                    setShowPublicationModal(false);
                    handleImportToCase(selectedPublication);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Importar como Processo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consulta Modal */}
      {showConsultaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Nova Consulta</h2>
              <button
                onClick={() => setShowConsultaModal(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  OAB <span className="text-red-500">*</span>
                </label>
                <select
                  value={consultaOabId}
                  onChange={(e) => setConsultaOabId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione uma OAB</option>
                  {oabs
                    .filter((o) => o.status === 'ACTIVE')
                    .map((oab) => (
                      <option key={oab.id} value={oab.id}>
                        {oab.name} ({oab.oab}/{oab.oabState})
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Data Inicio <span className="text-red-500">*</span>
                  </label>
                  <DateOnlyPicker
                    selected={consultaDataInicio}
                    onChange={(date) => setConsultaDataInicio(date)}
                    placeholderText="Selecione a data"
                    maxDate={consultaDataFim || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Data Fim <span className="text-red-500">*</span>
                  </label>
                  <DateOnlyPicker
                    selected={consultaDataFim}
                    onChange={(date) => setConsultaDataFim(date)}
                    placeholderText="Selecione a data"
                    minDate={consultaDataInicio || undefined}
                  />
                </div>
              </div>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                A consulta buscara processos do Diario Oficial no periodo selecionado.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowConsultaModal(false)}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartConsulta}
                disabled={startingConsulta || !consultaOabId}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {startingConsulta && <Loader2 size={16} className="animate-spin" />}
                Iniciar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Monitoring;
