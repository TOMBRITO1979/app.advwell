import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Clock, Calendar, Eye, AlertCircle, Edit, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import { formatDate } from '../utils/dateFormatter';

interface Case {
  id: string;
  processNumber: string;
  subject: string;
  deadline: string;
  deadlineCompleted: boolean;
  deadlineCompletedAt?: string;
  deadlineResponsible?: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  client: {
    id: string;
    name: string;
    cpf?: string;
  };
  movements?: any[];
  informarCliente?: string;
  ultimoAndamento?: string;
  linkProcesso?: string;
  notes?: string;
  value?: number;
  court?: string;
  lastSyncedAt?: string;
  createdAt: string;
}

const Deadlines: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editDeadline, setEditDeadline] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    loadDeadlines();
  }, [search, page, limit]);

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cases/deadlines', {
        params: { search, page, limit },
      });
      setCases(response.data.data || response.data);
      setTotal(response.data.total || response.data.length || 0);
    } catch (error) {
      toast.error('Erro ao carregar prazos');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (deadline: string): number => {
    // Extrair apenas a data (YYYY-MM-DD) para evitar problemas de timezone
    const deadlineDateOnly = deadline.split('T')[0];
    const [year, month, day] = deadlineDateOnly.split('-').map(Number);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Criar data do prazo usando componentes locais (não UTC)
    const deadlineDate = new Date(year, month - 1, day);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysRemaining: number): string => {
    if (daysRemaining < 0) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 7) return 'bg-orange-100 text-orange-800';
    if (daysRemaining <= 15) return 'bg-yellow-100 text-yellow-800';
    return 'bg-success-100 text-success-800';
  };

  const getDeadlineLabel = (daysRemaining: number): string => {
    if (daysRemaining < 0) return `Vencido há ${Math.abs(daysRemaining)} dia(s)`;
    if (daysRemaining === 0) return 'Vence hoje';
    if (daysRemaining === 1) return 'Vence amanhã';
    return `${daysRemaining} dia(s)`;
  };

  const getDeadlineIcon = (daysRemaining: number) => {
    if (daysRemaining < 0) return <AlertCircle size={18} className="text-red-600" />;
    if (daysRemaining <= 7) return <Clock size={18} className="text-orange-600" />;
    return <Calendar size={18} className="text-success-600" />;
  };

  const handleCaseClick = async (caseId: string) => {
    try {
      const response = await api.get(`/cases/${caseId}`);
      setSelectedCase(response.data);
      setShowDetailsModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar detalhes do processo');
    }
  };

  const handleEditClick = (caseItem: Case) => {
    setSelectedCase(caseItem);
    // Format date for input (YYYY-MM-DD) - extrair diretamente sem usar Date
    setEditDeadline(caseItem.deadline.split('T')[0]);
    setShowEditModal(true);
  };

  const handleSaveDeadline = async () => {
    if (!selectedCase) return;

    setSavingDeadline(true);
    try {
      await api.put(`/cases/${selectedCase.id}/deadline`, {
        deadline: editDeadline,
      });
      toast.success('Prazo atualizado com sucesso!');
      setShowEditModal(false);
      setSelectedCase(null);
      loadDeadlines();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar prazo');
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleToggleCompleted = async (caseItem: Case) => {
    const newStatus = !caseItem.deadlineCompleted;
    try {
      await api.post(`/cases/${caseItem.id}/deadline/toggle`, {
        completed: newStatus,
      });
      toast.success(newStatus ? 'Prazo marcado como cumprido!' : 'Prazo reaberto!');
      loadDeadlines();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status do prazo');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statusColors = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-success-100 text-success-800',
    ARCHIVED: 'bg-neutral-100 text-neutral-800',
    FINISHED: 'bg-info-100 text-info-700',
  };

  const statusLabels = {
    PENDENTE: 'Pendente',
    ACTIVE: 'Ativo',
    ARCHIVED: 'Arquivado',
    FINISHED: 'Finalizado',
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-2">Prazos</h1>
          <p className="text-sm text-neutral-600 dark:text-slate-400">Processos com prazos definidos, ordenados por urgência</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por processo, cliente ou assunto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : cases.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={48} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-600 dark:text-slate-400">Nenhum processo com prazo definido</p>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                {search ? 'Tente ajustar sua busca' : 'Adicione prazos aos processos para vê-los aqui'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={cases.map((caseItem): MobileCardItem => {
                    const daysRemaining = calculateDaysRemaining(caseItem.deadline);
                    const getBadgeColor = (): 'green' | 'red' | 'yellow' | 'gray' => {
                      if (caseItem.deadlineCompleted) return 'green';
                      if (daysRemaining < 0) return 'red';
                      if (daysRemaining <= 7) return 'yellow';
                      return 'green';
                    };
                    const getBadgeText = (): string => {
                      if (caseItem.deadlineCompleted) return 'Cumprido';
                      return getDeadlineLabel(daysRemaining);
                    };
                    return {
                      id: caseItem.id,
                      title: caseItem.processNumber,
                      subtitle: caseItem.client?.name || 'Sem cliente',
                      badge: {
                        text: getBadgeText(),
                        color: getBadgeColor(),
                      },
                      fields: [
                        { label: 'Assunto', value: caseItem.subject },
                        { label: 'Prazo', value: formatDate(caseItem.deadline) },
                        { label: 'Status', value: statusLabels[caseItem.status as keyof typeof statusLabels] || caseItem.status },
                      ],
                      onView: () => handleCaseClick(caseItem.id),
                      onEdit: () => handleEditClick(caseItem),
                    };
                  })}
                  emptyMessage={search ? 'Nenhum prazo encontrado' : 'Nenhum processo com prazo definido'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Urgência
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Número do Processo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Assunto
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Prazo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Dias Restantes
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {cases.map((caseItem) => {
                      const daysRemaining = calculateDaysRemaining(caseItem.deadline);
                      const deadlineColor = getDeadlineColor(daysRemaining);

                      return (
                        <tr key={caseItem.id} className={`odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors ${caseItem.deadlineCompleted ? 'bg-success-50 dark:bg-success-900/30' : ''}`}>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center">
                              {caseItem.deadlineCompleted ? (
                                <CheckCircle size={18} className="text-success-600" />
                              ) : (
                                getDeadlineIcon(daysRemaining)
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleCaseClick(caseItem.id)}
                              className={`hover:underline font-medium transition-colors ${caseItem.deadlineCompleted ? 'text-success-600 hover:text-success-800' : 'text-primary-600 hover:text-primary-800'}`}
                              title="Ver detalhes do processo"
                            >
                              {caseItem.processNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                            {caseItem.client?.name || 'Sem cliente'}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                            <div className="max-w-xs truncate" title={caseItem.subject}>
                              {caseItem.subject}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                            {formatDate(caseItem.deadline)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {caseItem.deadlineCompleted ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                                Cumprido
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${deadlineColor}`}>
                                {getDeadlineLabel(daysRemaining)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[caseItem.status as keyof typeof statusColors] || 'bg-neutral-100 text-neutral-800'}`}>
                              {statusLabels[caseItem.status as keyof typeof statusLabels] || caseItem.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center">
                              <ActionsDropdown
                                actions={[
                                  {
                                    label: 'Ver detalhes',
                                    icon: <Eye size={16} />,
                                    onClick: () => handleCaseClick(caseItem.id),
                                    variant: 'info',
                                  },
                                  {
                                    label: 'Editar prazo',
                                    icon: <Edit size={16} />,
                                    onClick: () => handleEditClick(caseItem),
                                    variant: 'primary',
                                  },
                                  {
                                    label: caseItem.deadlineCompleted ? 'Reabrir prazo' : 'Marcar como cumprido',
                                    icon: <CheckCircle size={16} />,
                                    onClick: () => handleToggleCompleted(caseItem),
                                    variant: caseItem.deadlineCompleted ? 'warning' : 'success',
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-slate-700">
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} prazos
                  </p>
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
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-slate-400 px-2">
                      Página {page} de {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                      disabled={page >= Math.ceil(total / limit)}
                      className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Processo */}
      {showDetailsModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                  {selectedCase.processNumber}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                  {selectedCase.court} • Criado em {formatDate(selectedCase.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Informações Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                      <span className="mr-2">👤</span>
                      <span>Cliente</span>
                    </div>
                    <p className="text-neutral-900 dark:text-slate-100 font-medium">{selectedCase.client?.name || 'Sem cliente'}</p>
                    {selectedCase.client?.cpf && (
                      <p className="text-sm text-neutral-500 dark:text-slate-400">CPF: {selectedCase.client.cpf}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                      <span className="mr-2">📄</span>
                      <span>Assunto</span>
                    </div>
                    <p className="text-neutral-900 dark:text-slate-100">{selectedCase.subject}</p>
                  </div>

                  {selectedCase.value && (
                    <div>
                      <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                        <span className="mr-2">💰</span>
                        <span>Valor da Causa</span>
                      </div>
                      <p className="text-neutral-900 dark:text-slate-100 font-semibold">
                        {formatCurrency(selectedCase.value)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                      <span className="mr-2">⚖️</span>
                      <span>Status</span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedCase.status as keyof typeof statusColors] || 'bg-neutral-100 text-neutral-800'}`}>
                      {statusLabels[selectedCase.status as keyof typeof statusLabels] || selectedCase.status}
                    </span>
                  </div>

                  {selectedCase.deadline && (
                    <div>
                      <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                        <Calendar size={16} className="mr-2" />
                        <span>Prazo</span>
                      </div>
                      <p className="text-neutral-900 dark:text-slate-100 font-medium">
                        {formatDate(selectedCase.deadline)}
                      </p>
                      <div className="mt-2">
                        {(() => {
                          const daysRemaining = calculateDaysRemaining(selectedCase.deadline);
                          const deadlineColor = getDeadlineColor(daysRemaining);
                          return (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${deadlineColor}`}>
                              {getDeadlineIcon(daysRemaining)}
                              {getDeadlineLabel(daysRemaining)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedCase.lastSyncedAt && (
                    <div>
                      <div className="flex items-center text-neutral-500 dark:text-slate-400 text-sm mb-1">
                        <Clock size={16} className="mr-2" />
                        <span>Última Sincronização</span>
                      </div>
                      <p className="text-neutral-900 dark:text-slate-100">{formatDate(selectedCase.lastSyncedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCase.notes && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">Observações</h3>
                  <p className="text-neutral-900 dark:text-slate-100 bg-neutral-50 dark:bg-slate-700 p-3 rounded-md">{selectedCase.notes}</p>
                </div>
              )}

              {selectedCase.informarCliente && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">Informação para o Cliente</h3>
                  <div className="bg-success-50 border border-primary-200 rounded-md p-4">
                    <p className="text-primary-800 whitespace-pre-wrap">{selectedCase.informarCliente}</p>
                  </div>
                </div>
              )}

              {selectedCase.linkProcesso && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">Link do Processo</h3>
                  <a
                    href={selectedCase.linkProcesso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-800 hover:underline break-all"
                  >
                    {selectedCase.linkProcesso}
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-neutral-50 dark:bg-slate-700 border-t border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-end min-h-[44px]">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição do Prazo */}
      {showEditModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto my-4">
            {/* Header */}
            <div className="border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">Editar Prazo</h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{selectedCase.processNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCase(null);
                }}
                className="text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Cliente
                </label>
                <p className="text-neutral-600 dark:text-slate-400">{selectedCase.client?.name || 'Sem cliente'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Assunto
                </label>
                <p className="text-neutral-600 dark:text-slate-400">{selectedCase.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Nova Data do Prazo <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCase(null);
                }}
                className="px-4 py-2 border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDeadline}
                disabled={savingDeadline || !editDeadline}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDeadline ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Deadlines;
