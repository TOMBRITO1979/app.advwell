import React, { useEffect, useState, useRef } from 'react';
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
  UserPlus,
  Phone,
  Mail,
  MessageSquare,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import { ExportButton } from '../components/ui';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import TagSelector from '../components/TagSelector';
import TagBadge from '../components/TagBadge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

type LeadStatus = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'CONVERTIDO' | 'PERDIDO';
type LeadSource = 'WHATSAPP' | 'TELEFONE' | 'SITE' | 'INDICACAO' | 'REDES_SOCIAIS' | 'OUTROS';

interface LeadTag {
  id: string;
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface Lead {
  id: string;
  name: string;
  phone: string;  // Telefone é obrigatório
  email?: string;
  contactReason?: string;
  status: LeadStatus;
  source: LeadSource;
  notes?: string;
  convertedToClientId?: string;
  convertedAt?: string;
  convertedToClient?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  leadTags?: LeadTag[];
  createdAt: string;
  updatedAt: string;
}

interface LeadFormData {
  name: string;
  phone: string;
  email: string;
  contactReason: string;
  status: LeadStatus;
  source: LeadSource;
  notes: string;
  tagIds: string[];
}

interface ConvertFormData {
  personType: 'FISICA' | 'JURIDICA';
  cpf: string;
  rg: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  profession: string;
  maritalStatus: string;
  birthDate: string;
  notes: string;
}

interface LeadStats {
  total: number;
  byStatus: {
    NOVO: number;
    CONTATADO: number;
    QUALIFICADO: number;
    CONVERTIDO: number;
    PERDIDO: number;
  };
  conversionRate: string;
}

const statusColors: Record<LeadStatus, { bg: string; text: string; label: string }> = {
  NOVO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Novo' },
  CONTATADO: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Contatado' },
  QUALIFICADO: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Qualificado' },
  CONVERTIDO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Convertido' },
  PERDIDO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Perdido' },
};

const sourceLabels: Record<LeadSource, string> = {
  WHATSAPP: 'WhatsApp',
  TELEFONE: 'Telefone',
  SITE: 'Site',
  INDICACAO: 'Indicação',
  REDES_SOCIAIS: 'Redes Sociais',
  OUTROS: 'Outros',
};

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const [importResults, setImportResults] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ line: number; identifier: string; error: string }>;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showCheckPhoneModal, setShowCheckPhoneModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [converting, setConverting] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneToCheck, setPhoneToCheck] = useState('');
  const [phoneCheckResult, setPhoneCheckResult] = useState<any>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    contactReason: '',
    status: 'NOVO',
    source: 'WHATSAPP',
    notes: '',
    tagIds: [],
  });

  const [convertFormData, setConvertFormData] = useState<ConvertFormData>({
    personType: 'FISICA',
    cpf: '',
    rg: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    profession: '',
    maritalStatus: '',
    birthDate: '',
    notes: '',
  });

  useEffect(() => {
    loadLeads();
    loadStats();
  }, [search, statusFilter, tagFilter, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const params: any = { search, status: statusFilter, page, limit };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get('/leads', { params });
      setLeads(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/leads/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const params: any = { search, status: statusFilter };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get('/leads/export/csv', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params: any = { search, status: statusFilter };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get('/leads/export/pdf', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/leads/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Nova resposta assíncrona com jobId
      if (response.data.jobId) {
        toast.success(`Importação iniciada: ${response.data.totalRows} registros. Aguarde...`);

        // Poll para verificar status
        const pollStatus = async () => {
          try {
            const statusResponse = await api.get(`/leads/import/status/${response.data.jobId}`);
            const status = statusResponse.data;

            if (status.status === 'completed') {
              setImportResults({
                successCount: status.successCount,
                errorCount: status.errorCount,
                errors: status.errors || [],
              });
              setShowImportResults(true);
              loadLeads();
              loadStats();
              toast.success(`Importação concluída: ${status.successCount} leads importados`);
            } else if (status.status === 'failed') {
              toast.error('Falha na importação');
              setImportResults({
                successCount: 0,
                errorCount: status.totalRows,
                errors: status.errors || [],
              });
              setShowImportResults(true);
            } else if (status.status === 'processing' || status.status === 'pending') {
              // Continuar polling
              setTimeout(pollStatus, 2000);
            }
          } catch (err) {
            console.error('Erro ao verificar status:', err);
          }
        };

        // Iniciar polling
        setTimeout(pollStatus, 2000);
      }
    } catch (error: any) {
      console.error('Erro ao importar CSV:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.message || error.response.data.error);
      } else {
        toast.error('Erro ao importar CSV');
      }
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearFilters = () => {
    setTagFilter('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('ALL');
    setSearch('');
  };

  const hasActiveFilters = tagFilter || dateFrom || dateTo || statusFilter !== 'ALL';

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      contactReason: '',
      status: 'NOVO',
      source: 'WHATSAPP',
      notes: '',
      tagIds: [],
    });
  };

  const resetConvertForm = () => {
    setConvertFormData({
      personType: 'FISICA',
      cpf: '',
      rg: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      profession: '',
      maritalStatus: '',
      birthDate: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedLead) {
        await api.put(`/leads/${selectedLead.id}`, formData);
        toast.success('Lead atualizado com sucesso!');
      } else {
        await api.post('/leads', formData);
        toast.success('Lead criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedLead(null);
      resetForm();
      loadLeads();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar lead');
    }
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      contactReason: lead.contactReason || '',
      status: lead.status,
      source: lead.source,
      notes: lead.notes || '',
      tagIds: lead.leadTags?.map((lt) => lt.tag.id) || [],
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/leads/${lead.id}`);
      toast.success('Lead excluído com sucesso!');
      loadLeads();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir lead');
    }
  };

  const handleViewDetails = async (lead: Lead) => {
    try {
      const response = await api.get(`/leads/${lead.id}`);
      setSelectedLead(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      setSelectedLead(lead);
      setShowDetailsModal(true);
    }
  };

  const handleConvert = (lead: Lead) => {
    setSelectedLead(lead);
    resetConvertForm();
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setConverting(true);
    try {
      await api.post(`/leads/${selectedLead.id}/convert`, convertFormData);
      toast.success('Lead convertido para cliente com sucesso!');
      setShowConvertModal(false);
      setShowDetailsModal(false);
      setSelectedLead(null);
      resetConvertForm();
      loadLeads();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao converter lead');
    } finally {
      setConverting(false);
    }
  };

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneToCheck) return;

    setCheckingPhone(true);
    setPhoneCheckResult(null);
    try {
      const response = await api.get('/leads/check-phone', {
        params: { phone: phoneToCheck },
      });
      setPhoneCheckResult(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao verificar telefone');
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleNewClient = () => {
    resetForm();
    setEditMode(false);
    setSelectedLead(null);
    setShowModal(true);
  };

  // Wrappers que retornam '-' ao invés de string vazia para campos vazios
  const formatDateDisplay = (dateString?: string) => formatDate(dateString) || '-';
  const formatDateTimeDisplay = (dateString?: string) => formatDateTime(dateString) || '-';

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-3 sm:mb-4">Leads</h1>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-neutral-200 dark:border-slate-700">
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{stats.total}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">Total</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{stats.byStatus.NOVO}</p>
                <p className="text-xs text-blue-600">Novos</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 shadow-sm border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-700">{stats.byStatus.CONTATADO}</p>
                <p className="text-xs text-yellow-600">Contatados</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 shadow-sm border border-purple-200">
                <p className="text-2xl font-bold text-purple-700">{stats.byStatus.QUALIFICADO}</p>
                <p className="text-xs text-purple-600">Qualificados</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
                <p className="text-2xl font-bold text-green-700">{stats.byStatus.CONVERTIDO}</p>
                <p className="text-xs text-green-600">Convertidos</p>
              </div>
              <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-3 shadow-sm border border-neutral-200 dark:border-slate-700">
                <p className="text-2xl font-bold text-primary-700">{stats.conversionRate}%</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">Taxa Conv.</p>
              </div>
            </div>
          )}

          {/* Hidden file input for CSV import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          {/* Action Buttons */}
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <ExportButton
              type="import"
              onClick={handleImportClick}
            />
            <ExportButton
              type="csv"
              onClick={handleExportCSV}
              loading={exportingCSV}
            />
            <ExportButton
              type="pdf"
              onClick={handleExportPDF}
              loading={exportingPDF}
            />
            <button
              onClick={() => setShowCheckPhoneModal(true)}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Phone size={20} />
              <span className="hidden sm:inline">Consultar</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px] ${
                hasActiveFilters
                  ? 'bg-warning-100 text-warning-700 border border-warning-200 hover:bg-warning-200'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              <Filter size={20} />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && <span className="bg-warning-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
            </button>
            <button
              onClick={handleNewClient}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Lead</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search size={20} className="text-neutral-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="NOVO">Novo</option>
              <option value="CONTATADO">Contatado</option>
              <option value="QUALIFICADO">Qualificado</option>
              <option value="CONVERTIDO">Convertido</option>
              <option value="PERDIDO">Perdido</option>
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 mb-4 border border-neutral-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tag
                  </label>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Todas as Tags</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-neutral-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 min-h-[44px]"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-700">
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    <strong>Filtros ativos:</strong>{' '}
                    {statusFilter !== 'ALL' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs mr-2">Status: {statusColors[statusFilter as LeadStatus]?.label || statusFilter}</span>}
                    {tagFilter && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs mr-2">Tag: {tags.find(t => t.id === tagFilter)?.name}</span>}
                    {dateFrom && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mr-2">De: {dateFrom}</span>}
                    {dateTo && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mr-2">Até: {dateTo}</span>}
                  </p>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</p>
          ) : leads.length === 0 ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">
              {search || statusFilter !== 'ALL'
                ? 'Nenhum lead encontrado para sua busca'
                : 'Nenhum lead cadastrado'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={leads.map((lead): MobileCardItem => ({
                    id: lead.id,
                    title: lead.name,
                    subtitle: lead.phone || lead.email || '-',
                    badge: {
                      text: statusColors[lead.status].label,
                      color: lead.status === 'NOVO' ? 'blue' :
                             lead.status === 'CONTATADO' ? 'yellow' :
                             lead.status === 'QUALIFICADO' ? 'purple' :
                             lead.status === 'CONVERTIDO' ? 'green' : 'gray',
                    },
                    extraContent: lead.leadTags && lead.leadTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.leadTags.map((lt) => (
                          <TagBadge key={lt.id} name={lt.tag.name} color={lt.tag.color} size="sm" />
                        ))}
                      </div>
                    ) : undefined,
                    fields: [
                      { label: 'Origem', value: sourceLabels[lead.source] },
                      { label: 'Criado em', value: formatDateDisplay(lead.createdAt) },
                    ],
                    onView: () => handleViewDetails(lead),
                    onEdit: lead.status !== 'CONVERTIDO' ? () => handleEdit(lead) : undefined,
                    onDelete: () => handleDelete(lead),
                  }))}
                  emptyMessage={search ? 'Nenhum lead encontrado' : 'Nenhum lead cadastrado'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Origem
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-slate-100">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{lead.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{lead.email || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status].bg} ${statusColors[lead.status].text}`}
                          >
                            {statusColors[lead.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {sourceLabels[lead.source]}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {lead.leadTags && lead.leadTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.leadTags.map((lt) => (
                                <TagBadge key={lt.id} name={lt.tag.name} color={lt.tag.color} size="sm" />
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {formatDateDisplay(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center">
                            <ActionsDropdown
                              actions={[
                                {
                                  label: 'Ver detalhes',
                                  icon: <Eye size={16} />,
                                  onClick: () => handleViewDetails(lead),
                                  variant: 'info',
                                },
                                {
                                  label: 'Editar',
                                  icon: <Edit size={16} />,
                                  onClick: () => handleEdit(lead),
                                  variant: 'primary',
                                  hidden: lead.status === 'CONVERTIDO',
                                },
                                {
                                  label: 'Converter para Cliente',
                                  icon: <UserPlus size={16} />,
                                  onClick: () => handleConvert(lead),
                                  variant: 'success',
                                  hidden: lead.status === 'CONVERTIDO',
                                },
                                {
                                  label: 'Excluir',
                                  icon: <Trash2 size={16} />,
                                  onClick: () => handleDelete(lead),
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
            </>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4">
              <div className="text-sm text-neutral-600 dark:text-slate-400">
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} leads
              </div>
              <div className="flex items-center gap-2">
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg">
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                  <option value={200}>200 por página</option>
                </select>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)} className={`px-3 py-1 text-sm rounded-lg ${page === pageNum ? 'bg-primary-600 text-white' : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50">
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedLead(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Nome <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Telefone <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as LeadStatus })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="NOVO">Novo</option>
                      <option value="CONTATADO">Contatado</option>
                      <option value="QUALIFICADO">Qualificado</option>
                      <option value="PERDIDO">Perdido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Origem
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value as LeadSource })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="TELEFONE">Telefone</option>
                      <option value="SITE">Site</option>
                      <option value="INDICACAO">Indicação</option>
                      <option value="REDES_SOCIAIS">Redes Sociais</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Motivo do Contato / Resumo
                  </label>
                  <textarea
                    value={formData.contactReason}
                    onChange={(e) => setFormData({ ...formData, contactReason: e.target.value })}
                    rows={3}
                    placeholder="Descreva o motivo do contato ou um resumo do atendimento..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Observações adicionais..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tags
                  </label>
                  <TagSelector
                    selectedTagIds={formData.tagIds}
                    onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                    placeholder="Selecionar tags..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedLead(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailsModal && selectedLead && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">Detalhes do Lead</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLead(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4 sm:space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedLead.status].bg} ${statusColors[selectedLead.status].text}`}
                >
                  {statusColors[selectedLead.status].label}
                </span>
                <span className="text-sm text-neutral-500 dark:text-slate-400">
                  Origem: {sourceLabels[selectedLead.source]}
                </span>
              </div>

              {/* Dados do Lead */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Dados do Lead</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Nome</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLead.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Telefone</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                      {selectedLead.phone || '-'}
                      {selectedLead.phone && (
                        <a
                          href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700"
                          title="Abrir WhatsApp"
                        >
                          <MessageSquare size={16} />
                        </a>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Email</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                      {selectedLead.email || '-'}
                      {selectedLead.email && (
                        <a
                          href={`mailto:${selectedLead.email}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="Enviar email"
                        >
                          <Mail size={16} />
                        </a>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Cadastro</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">
                      {formatDateTimeDisplay(selectedLead.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivo do Contato */}
              {selectedLead.contactReason && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Motivo do Contato</h3>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">
                      {selectedLead.contactReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedLead.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Observações</h3>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">
                      {selectedLead.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Info de Conversão */}
              {selectedLead.status === 'CONVERTIDO' && selectedLead.convertedToClient && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Check size={20} className="text-green-600" />
                    Convertido para Cliente
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Cliente:</strong> {selectedLead.convertedToClient.name}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <strong>Data da Conversão:</strong> {formatDateTimeDisplay(selectedLead.convertedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLead(null);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
              {selectedLead.status !== 'CONVERTIDO' && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedLead);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
                  >
                    <Edit size={20} />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleConvert(selectedLead);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
                  >
                    <UserPlus size={20} />
                    Converter para Cliente
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Converter para Cliente */}
      {showConvertModal && selectedLead && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                Converter Lead para Cliente
              </h2>
              <button
                onClick={() => {
                  setShowConvertModal(false);
                  resetConvertForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="modal-body">
              {/* Lead Info Summary */}
              <div className="bg-primary-50 rounded-lg p-4 mb-6 border border-primary-200">
                <p className="text-sm font-medium text-primary-800">
                  Convertendo lead: <strong>{selectedLead.name}</strong>
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-primary-600">
                  {selectedLead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {selectedLead.phone}
                    </span>
                  )}
                  {selectedLead.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {selectedLead.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-slate-400">
                  Complete os dados adicionais para criar o cliente:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Tipo de Pessoa
                    </label>
                    <select
                      value={convertFormData.personType}
                      onChange={(e) =>
                        setConvertFormData({
                          ...convertFormData,
                          personType: e.target.value as 'FISICA' | 'JURIDICA',
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="FISICA">Pessoa Física</option>
                      <option value="JURIDICA">Pessoa Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      {convertFormData.personType === 'FISICA' ? 'CPF' : 'CNPJ'}
                    </label>
                    <input
                      type="text"
                      value={convertFormData.cpf}
                      onChange={(e) =>
                        setConvertFormData({ ...convertFormData, cpf: e.target.value })
                      }
                      placeholder={
                        convertFormData.personType === 'FISICA'
                          ? '000.000.000-00'
                          : '00.000.000/0000-00'
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                {convertFormData.personType === 'FISICA' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        RG
                      </label>
                      <input
                        type="text"
                        value={convertFormData.rg}
                        onChange={(e) =>
                          setConvertFormData({ ...convertFormData, rg: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={convertFormData.birthDate}
                        onChange={(e) =>
                          setConvertFormData({ ...convertFormData, birthDate: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Estado Civil
                      </label>
                      <select
                        value={convertFormData.maritalStatus}
                        onChange={(e) =>
                          setConvertFormData({ ...convertFormData, maritalStatus: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="">Selecione...</option>
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Profissão
                      </label>
                      <input
                        type="text"
                        value={convertFormData.profession}
                        onChange={(e) =>
                          setConvertFormData({ ...convertFormData, profession: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={convertFormData.address}
                    onChange={(e) =>
                      setConvertFormData({ ...convertFormData, address: e.target.value })
                    }
                    placeholder="Rua, número, complemento"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={convertFormData.city}
                      onChange={(e) =>
                        setConvertFormData({ ...convertFormData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Estado
                    </label>
                    <select
                      value={convertFormData.state}
                      onChange={(e) =>
                        setConvertFormData({ ...convertFormData, state: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="">UF</option>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(
                        (uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={convertFormData.zipCode}
                      onChange={(e) =>
                        setConvertFormData({ ...convertFormData, zipCode: e.target.value })
                      }
                      placeholder="00000-000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Observações Adicionais
                  </label>
                  <textarea
                    value={convertFormData.notes}
                    onChange={(e) =>
                      setConvertFormData({ ...convertFormData, notes: e.target.value })
                    }
                    rows={2}
                    placeholder="Observações adicionais para o cadastro do cliente..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertModal(false);
                    resetConvertForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-success-600 text-white hover:bg-success-700 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px] disabled:opacity-50"
                >
                  {converting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Converter para Cliente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consultar Telefone */}
      {showCheckPhoneModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-md">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                Consultar Telefone
              </h2>
              <button
                onClick={() => {
                  setShowCheckPhoneModal(false);
                  setPhoneToCheck('');
                  setPhoneCheckResult(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                Digite o número de telefone para verificar se já é cliente ou lead cadastrado.
              </p>

              <form onSubmit={handleCheckPhone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phoneToCheck}
                    onChange={(e) => setPhoneToCheck(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={checkingPhone || !phoneToCheck}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px] disabled:opacity-50"
                >
                  {checkingPhone ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Consultar
                    </>
                  )}
                </button>
              </form>

              {/* Resultado da Consulta */}
              {phoneCheckResult && (
                <div className="mt-6 space-y-4">
                  {phoneCheckResult.isClient ? (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-start gap-3">
                        <Check size={24} className="text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">
                            Este número pertence a um cliente!
                          </p>
                          <div className="mt-2 text-sm text-green-700">
                            <p>
                              <strong>Nome:</strong> {phoneCheckResult.client.name}
                            </p>
                            {phoneCheckResult.client.email && (
                              <p>
                                <strong>Email:</strong> {phoneCheckResult.client.email}
                              </p>
                            )}
                            {phoneCheckResult.client.cpf && (
                              <p>
                                <strong>CPF:</strong> {phoneCheckResult.client.cpf}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : phoneCheckResult.existingLead ? (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={24} className="text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">
                            Este número já é um lead cadastrado!
                          </p>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              <strong>Nome:</strong> {phoneCheckResult.existingLead.name}
                            </p>
                            <p>
                              <strong>Status:</strong>{' '}
                              {statusColors[phoneCheckResult.existingLead.status as LeadStatus]?.label}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowCheckPhoneModal(false);
                              setPhoneToCheck('');
                              setPhoneCheckResult(null);
                              handleViewDetails(phoneCheckResult.existingLead);
                            }}
                            className="mt-3 inline-flex items-center gap-1 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                          >
                            Ver detalhes do lead
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <UserPlus size={24} className="text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">
                            Este número não está cadastrado!
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            Você pode criar um novo lead com este número.
                          </p>
                          <button
                            onClick={() => {
                              setShowCheckPhoneModal(false);
                              setFormData({ ...formData, phone: phoneToCheck });
                              setPhoneToCheck('');
                              setPhoneCheckResult(null);
                              handleNewClient();
                            }}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Plus size={16} />
                            Criar Lead
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados da Importação */}
      {showImportResults && importResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-neutral-50 dark:bg-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Resultado da Importação</h3>
              <button
                onClick={() => setShowImportResults(false)}
                className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResults.successCount}</p>
                  <p className="text-sm text-green-700">Importados com sucesso</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{importResults.errorCount}</p>
                  <p className="text-sm text-red-700">Erros</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">Detalhes dos erros:</h4>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {importResults.errors.map((err, idx) => (
                      <div key={idx} className="text-sm bg-white dark:bg-slate-800 p-2 rounded border border-neutral-200 dark:border-slate-700">
                        <span className="font-medium">Linha {err.line}</span>
                        {err.identifier && <span className="text-neutral-500 dark:text-slate-400"> ({err.identifier})</span>}
                        <span className="text-red-600">: {err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Formato esperado do CSV:</strong> Nome, Telefone, Email, Status, Origem, Motivo do Contato, Observações
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Status: Novo, Contatado, Qualificado, Convertido, Perdido<br/>
                  Origem: WhatsApp, Telefone, Site, Indicação, Redes Sociais, Outros
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-neutral-50 dark:bg-slate-700">
              <button
                onClick={() => setShowImportResults(false)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Leads;
