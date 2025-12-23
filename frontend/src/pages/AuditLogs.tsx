import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
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

// Labels amigaveis para campos
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  rg: 'RG',
  address: 'Endereco',
  city: 'Cidade',
  state: 'Estado',
  zipCode: 'CEP',
  birthDate: 'Data de Nascimento',
  profession: 'Profissao',
  nationality: 'Nacionalidade',
  maritalStatus: 'Estado Civil',
  notes: 'Observacoes',
  tag: 'Tag',
  active: 'Ativo',
  personType: 'Tipo de Pessoa',
  stateRegistration: 'Inscricao Estadual',
  representativeName: 'Nome do Representante',
  representativeCpf: 'CPF do Representante',
  processNumber: 'Numero do Processo',
  court: 'Tribunal',
  subject: 'Assunto',
  value: 'Valor da Causa',
  status: 'Status',
  deadline: 'Prazo',
  deadlineResponsibleId: 'Responsavel pelo Prazo',
  deadlineCompleted: 'Prazo Cumprido',
  ultimoAndamento: 'Ultimo Andamento',
  informarCliente: 'Informar Cliente',
  linkProcesso: 'Link do Processo',
  // Campos de eventos da agenda
  title: 'Titulo',
  description: 'Descricao',
  type: 'Tipo',
  priority: 'Prioridade',
  date: 'Data',
  endDate: 'Data Final',
  completed: 'Concluido',
  googleMeetLink: 'Link Google Meet',
  clientId: 'Cliente',
  caseId: 'Processo',
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

  // Paginacao
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

      toast.success('Exportacao concluida');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erro ao exportar logs');
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
      CREATE: { color: 'bg-success-100 text-success-700', icon: <Plus className="w-4 h-4" />, label: 'Criacao' },
      UPDATE: { color: 'bg-warning-100 text-warning-700', icon: <Edit3 className="w-4 h-4" />, label: 'Edicao' },
      DELETE: { color: 'bg-danger-100 text-danger-700', icon: <Trash2 className="w-4 h-4" />, label: 'Exclusao' },
    };
    return configs[action] || { color: 'bg-neutral-100 text-neutral-700', icon: <History className="w-4 h-4" />, label: action };
  };

  const getEntityConfig = (entityType: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      CLIENT: { color: 'bg-blue-100 text-blue-700', icon: <Users className="w-4 h-4" />, label: 'Cliente' },
      CASE: { color: 'bg-purple-100 text-purple-700', icon: <Briefcase className="w-4 h-4" />, label: 'Processo' },
      SCHEDULE_EVENT: { color: 'bg-green-100 text-green-700', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda' },
    };
    return configs[entityType] || { color: 'bg-neutral-100 text-neutral-700', icon: <History className="w-4 h-4" />, label: entityType };
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(vazio)';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return new Date(value).toLocaleDateString('pt-BR');
      }
      return JSON.stringify(value);
    }
    // Verifica se e uma data ISO string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value).toLocaleDateString('pt-BR');
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
                <h1 className="text-2xl font-bold text-neutral-800">Logs de Auditoria</h1>
                <p className="text-neutral-600">
                  {isAdmin
                    ? 'Historico de todas as acoes em clientes, processos e agenda'
                    : 'Historico das suas acoes em clientes, processos e agenda'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-600">Filtros:</span>
            </div>

            <select
              value={filterEntityType}
              onChange={(e) => {
                setFilterEntityType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas Entidades</option>
              <option value="CLIENT">Clientes</option>
              <option value="CASE">Processos</option>
              <option value="SCHEDULE_EVENT">Agenda</option>
            </select>

            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas Acoes</option>
              <option value="CREATE">Criacao</option>
              <option value="UPDATE">Edicao</option>
              <option value="DELETE">Exclusao</option>
            </select>

            {isAdmin && (
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos Usuarios</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-neutral-400">ate</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Busca */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nome, usuario ou descricao..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 text-sm text-neutral-600">
          {total > 0 ? (
            <>Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} registros</>
          ) : (
            'Nenhum registro encontrado'
          )}
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {logs.map((log) => {
                const actionConfig = getActionConfig(log.action);
                const entityConfig = getEntityConfig(log.entityType);
                const isExpanded = expandedLogId === log.id;

                return (
                  <div key={log.id} className="hover:bg-neutral-50">
                    {/* Log Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {/* Action Icon */}
                          <div className={`p-2 rounded-lg ${actionConfig.color}`}>
                            {actionConfig.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${actionConfig.color}`}>
                                {actionConfig.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entityConfig.color}`}>
                                {entityConfig.icon}
                                {entityConfig.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-neutral-800">
                              <span className="font-medium">{log.userName || log.user?.name || 'Usuario'}</span>
                              {' '}
                              {log.description || `${actionConfig.label.toLowerCase()} ${entityConfig.label.toLowerCase()}`}
                            </p>
                            <div className="mt-1 flex items-center gap-4 text-xs text-neutral-500">
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
                        <div className="flex items-center gap-2">
                          {log.changedFields.length > 0 && (
                            <span className="text-xs text-neutral-500">
                              {log.changedFields.length} campo{log.changedFields.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-12 border-l-2 border-neutral-200 pl-4">
                          {/* Changed Fields */}
                          {log.action === 'UPDATE' && log.changedFields.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                                Campos alterados:
                              </p>
                              <div className="space-y-1">
                                {log.changedFields.map((field) => {
                                  const oldValue = log.oldValues?.[field];
                                  const newValue = log.newValues?.[field];
                                  return (
                                    <div key={field} className="flex items-start gap-2 text-sm">
                                      <span className="font-medium text-neutral-700 min-w-[120px]">
                                        {FIELD_LABELS[field] || field}:
                                      </span>
                                      <span className="text-danger-600 line-through">
                                        {formatValue(oldValue)}
                                      </span>
                                      <span className="text-neutral-400">→</span>
                                      <span className="text-success-600">
                                        {formatValue(newValue)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Create - New Values */}
                          {log.action === 'CREATE' && log.newValues && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                                Dados criados:
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(log.newValues).map(([field, value]) => (
                                  <div key={field} className="flex items-start gap-2">
                                    <span className="font-medium text-neutral-700">
                                      {FIELD_LABELS[field] || field}:
                                    </span>
                                    <span className="text-neutral-600">{formatValue(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Delete - Old Values */}
                          {log.action === 'DELETE' && log.oldValues && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                                Dados excluidos:
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(log.oldValues).map(([field, value]) => (
                                  <div key={field} className="flex items-start gap-2">
                                    <span className="font-medium text-neutral-700">
                                      {FIELD_LABELS[field] || field}:
                                    </span>
                                    <span className="text-danger-600">{formatValue(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* User Agent */}
                          {log.userAgent && (
                            <div className="mt-3 pt-3 border-t border-neutral-200">
                              <p className="text-xs text-neutral-400 break-all">
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
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                        : 'text-neutral-600 hover:bg-neutral-100'
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
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuditLogs;
