import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, CheckCircle, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cases/updates');
      setUpdates(response.data);
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
    } catch (error) {
      console.error('Erro ao marcar como ciente:', error);
      toast.error('Erro ao marcar como ciente');
    } finally {
      setAcknowledging(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando atualizações...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Atualizações</h1>
            <p className="text-sm text-gray-600">
              Processos com movimentações recentes não visualizadas
            </p>
          </div>
        </div>
        {updates.length > 0 && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
            {updates.length} {updates.length === 1 ? 'atualização' : 'atualizações'}
          </div>
        )}
      </div>

      {/* Empty State */}
      {updates.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma atualização pendente
          </h3>
          <p className="text-gray-600">
            Todos os processos estão em dia! Você será notificado quando houver novas movimentações.
          </p>
        </div>
      )}

      {/* Updates List */}
      {updates.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assunto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Andamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atualizado em
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {updates.map((update) => (
                  <tr key={update.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {update.processNumber}
                        </span>
                        {update.linkProcesso && (
                          <a
                            href={update.linkProcesso}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                            title="Abrir processo no tribunal"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{update.court}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{update.client.name}</div>
                      {update.client.cpf && (
                        <div className="text-xs text-gray-500">
                          CPF: {update.client.cpf}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {update.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {update.movements.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {update.movements[0].movementName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(update.movements[0].movementDate)}
                          </div>
                        </div>
                      ) : update.ultimoAndamento ? (
                        <div className="text-sm text-gray-900">
                          {update.ultimoAndamento}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Sem movimentações
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(update.lastSyncedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleAcknowledge(update.id, update.processNumber)}
                        disabled={acknowledging === update.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {acknowledging === update.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Processando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
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
        </div>
      )}

      {/* Info Box */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
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
