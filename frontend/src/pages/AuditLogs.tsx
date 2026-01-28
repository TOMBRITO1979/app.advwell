import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  History,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase,
  Plus,
  Edit3,
  Trash2,
  Download,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  CalendarDays,
  CreditCard,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuditLog {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userName?: string;
  action: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

// Labels amigáveis para campos
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  rg: 'RG',
  address: 'Endereço',
  city: 'Cidade',
  state: 'Estado',
  zipCode: 'CEP',
  birthDate: 'Data de Nascimento',
  profession: 'Profissão',
  nationality: 'Nacionalidade',
  maritalStatus: 'Estado Civil',
  notes: 'Observações',
  tag: 'Tag',
  active: 'Ativo',
  personType: 'Tipo de Pessoa',
  stateRegistration: 'Inscrição Estadual',
  representativeName: 'Nome do Representante',
  representativeCpf: 'CPF do Representante',
  processNumber: 'Número do Processo',
  court: 'Tribunal',
  subject: 'Assunto',
  value: 'Valor da Causa',
  status: 'Status',
  deadline: 'Prazo',
  deadlineResponsibleId: 'Responsável pelo Prazo',
  deadlineCompleted: 'Prazo Cumprido',
  ultimoAndamento: 'Último Andamento',
  informarCliente: 'Informar Cliente',
  linkProcesso: 'Link do Processo',
  // Campos de eventos da agenda
  title: 'Título',
  description: 'Descrição',
  type: 'Tipo',
  priority: 'Prioridade',
  date: 'Data',
  endDate: 'Data Final',
  completed: 'Concluído',
  googleMeetLink: 'Link Google Meet',
  clientId: 'Cliente',
  caseId: 'Processo',
  // Campos de contas a pagar
  supplier: 'Fornecedor',
  amount: 'Valor',
  dueDate: 'Vencimento',
  paidDate: 'Data de Pagamento',
  category: 'Categoria',
  isRecurring: 'Recorrente',
  recurrencePeriod: 'Período de Recorrência',
  parentId: 'Conta Original',
};

const AuditLogs: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filtros
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchLogs();
  }, [page, filterEntityType, filterAction, filterUserId, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (filterEntityType) params.append('entityType', filterEntityType);
      if (filterAction) params.append('action', filterAction);
      if (filterUserId) params.append('userId', filterUserId);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (search) params.append('search', search);

      const response = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/audit-logs/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterEntityType) params.append('entityType', filterEntityType);
      if (filterAction) params.append('action', filterAction);
      if (filterUserId) params.append('userId', filterUserId);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const response = await api.get(`/audit-logs/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Exportação concluída');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filterEntityType) params.append('entityType', filterEntityType);
      if (filterAction) params.append('action', filterAction);
      if (filterUserId) {
        params.append('userId', filterUserId);
        // Encontra o nome do usuário selecionado para mostrar no PDF
        const selectedUser = users.find(u => u.id === filterUserId);
        if (selectedUser) {
          params.append('userName', selectedUser.name);
        }
      }
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const response = await api.get(`/audit-logs/export/pdf?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs_auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF exportado com sucesso');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const clearFilters = () => {
    setFilterEntityType('');
    setFilterAction('');
    setFilterUserId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
    setPage(1);
  };

  const getActionConfig = (action: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      CREATE: { color: 'bg-success-100 text-success-700', icon: <Plus className="w-4 h-4" />, label: 'Criação' },
      UPDATE: { color: 'bg-warning-100 text-warning-700', icon: <Edit3 className="w-4 h-4" />, label: 'Edição' },
      DELETE: { color: 'bg-danger-100 text-danger-700', icon: <Trash2 className="w-4 h-4" />, label: 'Exclusão' },
    };
    return configs[action] || { color: 'bg-neutral-100 text-neutral-700 dark:text-slate-300', icon: <History className="w-4 h-4" />, label: action };
  };

  const getEntityConfig = (entityType: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      CLIENT: { color: 'bg-blue-100 text-blue-700', icon: <Users className="w-4 h-4" />, label: 'Cliente' },
      CASE: { color: 'bg-purple-100 text-purple-700', icon: <Briefcase className="w-4 h-4" />, label: 'Processo' },
      SCHEDULE_EVENT: { color: 'bg-green-100 text-green-700', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda' },
      ACCOUNT_PAYABLE: { color: 'bg-orange-100 text-orange-700', icon: <CreditCard className="w-4 h-4" />, label: 'Conta a Pagar' },
    };
    return configs[entityType] || { color: 'bg-neutral-100 text-neutral-700 dark:text-slate-300', icon: <History className="w-4 h-4" />, label: entityType };
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(vazio)';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return formatDate(value);
      }
      return JSON.stringify(value);
    }
    // Verifica se é uma data ISO string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return formatDate(value);
    }
    return String(value);
  };

  const hasActiveFilters = filterEntityType || filterAction || filterUserId || filterStartDate || filterEndDate || search;

  if (loading && logs.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-slate-200">Logs de Auditoria</h1>
                <p className="text-neutral-600 dark:text-slate-400">
                  {isAdmin
                    ? 'Histórico de todas as ações em clientes, processos e agenda'
                    : 'Histórico das suas ações em clientes, processos e agenda'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors border border-primary-200"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors border border-primary-200"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-neutral-400 dark:text-slate-500" />
            <span className="text-sm font-medium text-neutral-600 dark:text-slate-400">Filtros:</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-primary-600 hover:text-primary-700"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filterEntityType}
              onChange={(e) => {
                setFilterEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas Entidades</option>
              <option value="CLIENT">Clientes</option>
              <option value="CASE">Processos</option>
              <option value="SCHEDULE_EVENT">Agenda</option>
              <option value="ACCOUNT_PAYABLE">Contas a Pagar</option>
            </select>

            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas Ações</option>
              <option value="CREATE">Criação</option>
              <option value="UPDATE">Edição</option>
              <option value="DELETE">Exclusão</option>
            </select>

            {isAdmin && (
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos Usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Range */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400 dark:text-slate-500 flex-shrink-0" />
              <span className="text-sm text-neutral-500 dark:text-slate-400 flex-shrink-0">De:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500 dark:text-slate-400 flex-shrink-0">Até:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Busca */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nome, usuário ou descrição..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm whitespace-nowrap"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 text-sm text-neutral-600 dark:text-slate-400">
          {total > 0 ? (
            <>Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} registros</>
          ) : (
            'Nenhum registro encontrado'
          )}
        </div>

        {/* Logs List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-slate-400">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {logs.map((log) => {
                const actionConfig = getActionConfig(log.action);
                const entityConfig = getEntityConfig(log.entityType);
                const isExpanded = expandedLogId === log.id;

                return (
                  <div key={log.id} className="odd:bg-white dark:odd:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 dark:even:bg-slate-700/50 hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors">
                    {/* Log Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          {/* Action Icon */}
                          <div className={`p-1.5 sm:p-2 rounded-lg ${actionConfig.color} flex-shrink-0`}>
                            {actionConfig.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${actionConfig.color}`}>
                                {actionConfig.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entityConfig.color}`}>
                                {entityConfig.icon}
                                {entityConfig.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-neutral-800 dark:text-slate-200">
                              <span className="font-medium">{log.userName || log.user?.name || 'Usuário'}</span>
                              {' '}
                              {log.description || `${actionConfig.label.toLowerCase()} ${entityConfig.label.toLowerCase()}`}
                            </p>
                            <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-neutral-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(log.createdAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {log.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {log.ipAddress}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className="flex flex-col items-center justify-center flex-shrink-0">
                          {log.changedFields.length > 0 && (
                            <>
                              <span className="text-sm font-semibold text-neutral-600 dark:text-slate-400">
                                {log.changedFields.length}
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-slate-400 hidden sm:inline">
                                {log.changedFields.length > 1 ? 'campos' : 'campo'}
                              </span>
                            </>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400 dark:text-slate-500 mt-1" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400 dark:text-slate-500 mt-1" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-0 sm:ml-12 border-l-2 border-neutral-200 dark:border-slate-700 pl-4">
                          {/* Changed Fields */}
                          {log.action === 'UPDATE' && log.changedFields.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wide">
                                Campos alterados:
                              </p>
                              <div className="space-y-2">
                                {log.changedFields.map((field) => {
                                  const oldValue = log.oldValues?.[field];
                                  const newValue = log.newValues?.[field];
                                  return (
                                    <div key={field} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm">
                                      <span className="font-medium text-neutral-700 dark:text-slate-300 sm:min-w-[120px]">
                                        {FIELD_LABELS[field] || field}:
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                        <span className="text-danger-600 line-through break-all">
                                          {formatValue(oldValue)}
                                        </span>
                                        <span className="text-neutral-400 dark:text-slate-500">→</span>
                                        <span className="text-success-600 break-all">
                                          {formatValue(newValue)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Create - New Values */}
                          {log.action === 'CREATE' && log.newValues && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wide">
                                Dados criados:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                {Object.entries(log.newValues).map(([field, value]) => (
                                  <div key={field} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                                    <span className="font-medium text-neutral-700 dark:text-slate-300">
                                      {FIELD_LABELS[field] || field}:
                                    </span>
                                    <span className="text-neutral-600 dark:text-slate-400 break-all">{formatValue(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Delete - Old Values */}
                          {log.action === 'DELETE' && log.oldValues && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wide">
                                Dados excluídos:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                {Object.entries(log.oldValues).map(([field, value]) => (
                                  <div key={field} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                                    <span className="font-medium text-neutral-700 dark:text-slate-300">
                                      {FIELD_LABELS[field] || field}:
                                    </span>
                                    <span className="text-danger-600 break-all">{formatValue(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* User Agent */}
                          {log.userAgent && (
                            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-700">
                              <p className="text-xs text-neutral-400 dark:text-slate-500 break-all">
                                Navegador: {log.userAgent}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuditLogs;
