import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, CheckCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { formatProcessNumber } from '../utils/processNumber';

interface CaseUpdate {
  id: string;
  processNumber: string;
  court: string;
  subject: string;
  ultimoAndamento: string | null;
  linkProcesso: string | null;
  lastSyncedAt: string;
  client: {
    id: string;
    name: string;
    cpf: string | null;
  };
  movements: Array<{
    id: string;
    movementName: string;
    movementDate: string;
    description: string | null;
  }>;
}

const Updates: React.FC = () => {
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchUpdates();
  }, [page, limit]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cases/updates', {
        params: { page, limit }
      });
      setUpdates(response.data.data || response.data);
      setTotal(response.data.total || response.data.length || 0);
    } catch (error) {
      console.error('Erro ao carregar atualizações:', error);
      toast.error('Erro ao carregar atualizações');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (caseId: string, processNumber: string) => {
    // Mostra confirmação
    const confirmAck = window.confirm(
      `Tem certeza que deseja marcar o processo ${processNumber} como "ciente"?\n\nEle será removido da lista de atualizações.`
    );

    if (!confirmAck) return;

    try {
      setAcknowledging(caseId);
      await api.post(`/cases/${caseId}/acknowledge`);

      toast.success('Marcado como ciente!');

      // Remove da lista
      setUpdates(updates.filter(u => u.id !== caseId));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como ciente:', error);
      toast.error('Erro ao marcar como ciente');
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Carregando atualizações...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary-600 flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Atualizações</h1>
            <p className="text-sm text-neutral-600">
              Processos com movimentações recentes não visualizadas
            </p>
          </div>
        </div>
        {total > 0 && (
          <div className="bg-success-100 text-success-800 px-4 py-2 rounded-lg md:rounded-full font-semibold text-center">
            {total} {total === 1 ? 'atualização' : 'atualizações'}
          </div>
        )}
      </div>

      {/* Empty State */}
      {updates.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Nenhuma atualização pendente
          </h3>
          <p className="text-neutral-600">
            Todos os processos estão em dia! Você será notificado quando houver novas movimentações.
          </p>
        </div>
      )}

      {/* Updates List */}
      {updates.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-neutral-200 overflow-hidden">
          {/* Mobile Card View */}
          <div className="mobile-card-view p-4 space-y-3">
            {updates.map((update) => (
              <div key={update.id} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{formatProcessNumber(update.processNumber)}</h3>
                    <p className="text-sm text-neutral-600">{update.client?.name || 'Sem cliente'}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tribunal</span>
                    <span className="text-neutral-700">{update.court}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Assunto</span>
                    <span className="text-neutral-700 text-right max-w-[60%] truncate">{update.subject || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Último Andamento</span>
                    <span className="text-neutral-700 text-right max-w-[60%] truncate">
                      {update.movements.length > 0
                        ? `${update.movements[0].movementName}`
                        : update.ultimoAndamento || 'Sem movimentações'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Atualizado em</span>
                    <span className="text-neutral-700">{formatDateTime(update.lastSyncedAt) || '-'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledge(update.id, update.processNumber)}
                  disabled={acknowledging === update.id}
                  className="w-full mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <CheckCircle size={16} />
                  {acknowledging === update.id ? 'Processando...' : 'Ciente'}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Processo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Assunto
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Último Andamento
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Atualizado em
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {updates.map((update) => (
                  <tr key={update.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">
                          {formatProcessNumber(update.processNumber)}
                        </span>
                        {update.linkProcesso && (
                          <a
                            href={update.linkProcesso}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 transition-colors"
                            title="Abrir processo no tribunal"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">{update.court}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">{update.client?.name || 'Sem cliente'}</div>
                      {update.client?.cpf && (
                        <div className="text-xs text-neutral-500">
                          CPF: {update.client.cpf}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900 max-w-xs truncate">
                        {update.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {update.movements.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-neutral-900">
                            {update.movements[0].movementName}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {formatDate(update.movements[0].movementDate)}
                          </div>
                        </div>
                      ) : update.ultimoAndamento ? (
                        <div className="text-sm text-neutral-900">
                          {update.ultimoAndamento}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">
                          Sem movimentações
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {formatDateTime(update.lastSyncedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleAcknowledge(update.id, update.processNumber)}
                        disabled={acknowledging === update.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {acknowledging === update.id ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
                            Processando...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Ciente
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="px-6 py-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600">
                Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} atualizações
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-neutral-600">por página</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm font-medium text-neutral-700">
                  Página {page} de {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-success-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-success-800">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Processos atualizados via sincronização com DataJud aparecem aqui automaticamente</li>
              <li>Clique em "Ciente" para confirmar que você visualizou a atualização</li>
              <li>Após marcar como ciente, o processo é removido desta lista</li>
              <li>Se houver novas atualizações, o processo voltará a aparecer aqui</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default Updates;
