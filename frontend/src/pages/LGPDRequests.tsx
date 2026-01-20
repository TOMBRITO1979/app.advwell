import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate, formatTime } from '../utils/dateFormatter';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Download,
  Filter,
  User,
  FileText,
  Trash2,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';

interface DataRequest {
  id: string;
  requestType: string;
  status: string;
  description?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
  rejectionReason?: string;
  resultUrl?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const LGPDRequests: React.FC = () => {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lgpd/admin/requests/pending');
      // Backend retorna { requests: [...] }
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erro ao carregar solicitacoes');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (request: DataRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status === 'PENDING' ? 'IN_PROGRESS' : request.status);
    setNotes(request.notes || '');
    setRejectionReason(request.rejectionReason || '');
    setResultUrl(request.resultUrl || '');
    setShowModal(true);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !newStatus) return;

    if (newStatus === 'REJECTED' && !rejectionReason) {
      toast.error('Informe o motivo da rejeicao');
      return;
    }

    setProcessing(true);
    try {
      await api.put(`/lgpd/admin/requests/${selectedRequest.id}`, {
        status: newStatus,
        notes,
        rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined,
        resultUrl: newStatus === 'COMPLETED' ? resultUrl : undefined,
      });
      toast.success('Solicitacao processada com sucesso');
      setShowModal(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao processar solicitacao');
    } finally {
      setProcessing(false);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      ACCESS: { label: 'Acesso aos Dados', icon: <Eye className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
      CORRECTION: { label: 'Correcao de Dados', icon: <Edit3 className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
      DELETION: { label: 'Exclusao de Dados', icon: <Trash2 className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
      PORTABILITY: { label: 'Portabilidade', icon: <Download className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
      REVOKE_CONSENT: { label: 'Revogacao', icon: <XCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
    };
    return labels[type] || { label: type, icon: <FileText className="w-4 h-4" />, color: 'bg-neutral-100 text-neutral-700 dark:text-slate-300' };
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-warning-100 text-warning-700', icon: <Clock className="w-4 h-4" />, label: 'Pendente' },
      IN_PROGRESS: { color: 'bg-primary-100 text-primary-700', icon: <RefreshCw className="w-4 h-4" />, label: 'Em Processamento' },
      COMPLETED: { color: 'bg-success-100 text-success-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Concluído' },
      REJECTED: { color: 'bg-danger-100 text-danger-700', icon: <XCircle className="w-4 h-4" />, label: 'Rejeitado' },
    };
    const config = configs[status] || configs.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const filteredRequests = requests.filter((request) => {
    if (filterStatus && request.status !== filterStatus) return false;
    if (filterType && request.requestType !== filterType) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS').length;

  if (loading) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-slate-200">Solicitacoes LGPD</h1>
                <p className="text-neutral-600 dark:text-slate-400">Gerencie as solicitacoes de direitos dos titulares</p>
              </div>
            </div>
            <button
              onClick={fetchRequests}
              className="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Clock className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-slate-200">{pendingCount}</p>
                <p className="text-sm text-neutral-500 dark:text-slate-400">Pendentes</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-slate-200">{inProgressCount}</p>
                <p className="text-sm text-neutral-500 dark:text-slate-400">Em Andamento</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-slate-200">
                  {requests.filter(r => r.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-neutral-500 dark:text-slate-400">Concluidas</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-lg">
                <FileText className="w-5 h-5 text-neutral-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-slate-200">{requests.length}</p>
                <p className="text-sm text-neutral-500 dark:text-slate-400">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400 dark:text-slate-500" />
              <span className="text-sm font-medium text-neutral-600 dark:text-slate-400">Filtros:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos os Status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em Processamento</option>
              <option value="COMPLETED">Concluído</option>
              <option value="REJECTED">Rejeitado</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="ACCESS">Acesso</option>
              <option value="CORRECTION">Correcao</option>
              <option value="DELETION">Exclusao</option>
              <option value="PORTABILITY">Portabilidade</option>
              <option value="REVOKE_CONSENT">Revogacao</option>
            </select>
            {(filterStatus || filterType) && (
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterType('');
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-700/20 border border-neutral-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-slate-400">Nenhuma solicitacao encontrada</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={filteredRequests.map((request): MobileCardItem => {
                    const typeInfo = getRequestTypeLabel(request.requestType);
                    const statusConfig: Record<string, { label: string; color: 'yellow' | 'blue' | 'green' | 'red' | 'gray' }> = {
                      PENDING: { label: 'Pendente', color: 'yellow' },
                      IN_PROGRESS: { label: 'Em Processamento', color: 'blue' },
                      COMPLETED: { label: 'Concluído', color: 'green' },
                      REJECTED: { label: 'Rejeitado', color: 'red' },
                    };
                    const status = statusConfig[request.status] || { label: request.status, color: 'gray' };
                    return {
                      id: request.id,
                      title: request.user.name,
                      subtitle: request.user.email,
                      badge: {
                        text: status.label,
                        color: status.color,
                      },
                      fields: [
                        { label: 'Tipo', value: typeInfo.label },
                        { label: 'Data', value: formatDate(request.requestedAt) },
                      ],
                      onView: () => handleOpenModal(request),
                    };
                  })}
                  emptyMessage="Nenhuma solicitacao encontrada"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700 border-b border-neutral-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Solicitante</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {filteredRequests.map((request) => {
                      const typeInfo = getRequestTypeLabel(request.requestType);
                      return (
                        <tr key={request.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-800 dark:text-slate-200">{request.user.name}</p>
                                <p className="text-sm text-neutral-500 dark:text-slate-400">{request.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.icon}
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-neutral-800 dark:text-slate-200">
                              {formatDate(request.requestedAt)}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-slate-400">
                              {formatTime(request.requestedAt)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleOpenModal(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              {request.status === 'PENDING' || request.status === 'IN_PROGRESS' ? 'Processar' : 'Ver'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Process Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl dark:shadow-slate-900/50 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-800 dark:text-slate-200 mb-4">
                  Processar Solicitacao LGPD
                </h3>

                {/* Request Info */}
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-slate-400">Solicitante</label>
                      <p className="font-medium text-neutral-800 dark:text-slate-200">{selectedRequest.user.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{selectedRequest.user.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-slate-400">Tipo</label>
                      <p className="font-medium text-neutral-800 dark:text-slate-200">
                        {getRequestTypeLabel(selectedRequest.requestType).label}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-slate-400">Data da Solicitacao</label>
                      <p className="font-medium text-neutral-800 dark:text-slate-200">
                        {formatDate(selectedRequest.requestedAt)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-slate-400">Status Atual</label>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                  </div>
                  {selectedRequest.description && (
                    <div className="mt-4">
                      <label className="text-xs text-neutral-500 dark:text-slate-400">Descricao do Solicitante</label>
                      <p className="text-sm text-neutral-700 dark:text-slate-300 mt-1">{selectedRequest.description}</p>
                    </div>
                  )}
                </div>

                {/* Form */}
                {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'IN_PROGRESS') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                        Novo Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="IN_PROGRESS">Em Processamento</option>
                        <option value="COMPLETED">Concluído</option>
                        <option value="REJECTED">Rejeitado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                        Observacoes (visivel para o solicitante)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Informacoes sobre o processamento..."
                      />
                    </div>

                    {newStatus === 'REJECTED' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                          Motivo da Rejeicao *
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-danger-300 dark:border-danger-700 text-neutral-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-danger-500"
                          placeholder="Explique o motivo da rejeicao..."
                          required
                        />
                      </div>
                    )}

                    {newStatus === 'COMPLETED' && selectedRequest.requestType === 'PORTABILITY' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                          URL do Arquivo Exportado
                        </label>
                        <input
                          type="url"
                          value={resultUrl}
                          onChange={(e) => setResultUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {selectedRequest.requestType === 'DELETION' && (
                      <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-danger-700">
                            <strong>Atencao:</strong> Ao concluir esta solicitacao, os dados do usuario serao permanentemente anonimizados.
                            Esta acao e irreversivel.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed/Rejected Info */}
                {(selectedRequest.status === 'COMPLETED' || selectedRequest.status === 'REJECTED') && (
                  <div className="space-y-4">
                    {selectedRequest.notes && (
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">Observacoes</label>
                        <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">{selectedRequest.notes}</p>
                      </div>
                    )}
                    {selectedRequest.rejectionReason && (
                      <div>
                        <label className="text-sm font-medium text-danger-700">Motivo da Rejeicao</label>
                        <p className="text-sm text-danger-600 mt-1">{selectedRequest.rejectionReason}</p>
                      </div>
                    )}
                    {selectedRequest.resultUrl && (
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">Arquivo</label>
                        <a
                          href={selectedRequest.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline mt-1 block"
                        >
                          Baixar arquivo exportado
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors"
                >
                  {selectedRequest.status === 'COMPLETED' || selectedRequest.status === 'REJECTED' ? 'Fechar' : 'Cancelar'}
                </button>
                {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'IN_PROGRESS') && (
                  <button
                    onClick={handleProcessRequest}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Processando...' : 'Salvar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LGPDRequests;
