import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Clock, Calendar, Eye, AlertCircle } from 'lucide-react';

interface Case {
  id: string;
  processNumber: string;
  subject: string;
  deadline: string;
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
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    loadDeadlines();
  }, [search]);

  const loadDeadlines = async () => {
    try {
      const response = await api.get('/cases/deadlines', {
        params: { search },
      });
      setCases(response.data);
    } catch (error) {
      toast.error('Erro ao carregar prazos');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (deadline: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysRemaining: number): string => {
    if (daysRemaining < 0) return 'bg-red-100 text-red-800';
    if (daysRemaining <= 7) return 'bg-orange-100 text-orange-800';
    if (daysRemaining <= 15) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getDeadlineLabel = (daysRemaining: number): string => {
    if (daysRemaining < 0) return `Vencido há ${Math.abs(daysRemaining)} dia(s)`;
    if (daysRemaining === 0) return 'Vence hoje';
    if (daysRemaining === 1) return 'Vence amanhã';
    return `${daysRemaining} dia(s)`;
  };

  const getDeadlineIcon = (daysRemaining: number) => {
    if (daysRemaining < 0) return <AlertCircle size={16} className="text-red-600" />;
    if (daysRemaining <= 7) return <Clock size={16} className="text-orange-600" />;
    return <Calendar size={16} className="text-green-600" />;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statusColors = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    FINISHED: 'bg-blue-100 text-blue-800',
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
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">Prazos</h1>
          <p className="text-sm text-neutral-600">Processos com prazos definidos, ordenados por urgência</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por processo, cliente ou assunto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : cases.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={48} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-600">Nenhum processo com prazo definido</p>
              <p className="text-sm text-neutral-500 mt-1">
                {search ? 'Tente ajustar sua busca' : 'Adicione prazos aos processos para vê-los aqui'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Urgência
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Número do Processo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Assunto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Prazo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Dias Restantes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cases.map((caseItem) => {
                    const daysRemaining = calculateDaysRemaining(caseItem.deadline);
                    const deadlineColor = getDeadlineColor(daysRemaining);

                    return (
                      <tr key={caseItem.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center">
                            {getDeadlineIcon(daysRemaining)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleCaseClick(caseItem.id)}
                            className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
                            title="Ver detalhes do processo"
                          >
                            {caseItem.processNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {caseItem.client.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          <div className="max-w-xs truncate" title={caseItem.subject}>
                            {caseItem.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {new Date(caseItem.deadline).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${deadlineColor}`}>
                            {getDeadlineLabel(daysRemaining)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[caseItem.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                            {statusLabels[caseItem.status as keyof typeof statusLabels] || caseItem.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleCaseClick(caseItem.id)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Processo */}
      {showDetailsModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">
                  {selectedCase.processNumber}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {selectedCase.court} • Criado em {formatDate(selectedCase.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
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
                    <div className="flex items-center text-neutral-500 text-sm mb-1">
                      <span className="mr-2">👤</span>
                      <span>Cliente</span>
                    </div>
                    <p className="text-neutral-900 font-medium">{selectedCase.client.name}</p>
                    {selectedCase.client.cpf && (
                      <p className="text-sm text-neutral-500">CPF: {selectedCase.client.cpf}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center text-neutral-500 text-sm mb-1">
                      <span className="mr-2">📄</span>
                      <span>Assunto</span>
                    </div>
                    <p className="text-neutral-900">{selectedCase.subject}</p>
                  </div>

                  {selectedCase.value && (
                    <div>
                      <div className="flex items-center text-neutral-500 text-sm mb-1">
                        <span className="mr-2">💰</span>
                        <span>Valor da Causa</span>
                      </div>
                      <p className="text-neutral-900 font-semibold">
                        {formatCurrency(selectedCase.value)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-neutral-500 text-sm mb-1">
                      <span className="mr-2">⚖️</span>
                      <span>Status</span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedCase.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[selectedCase.status as keyof typeof statusLabels] || selectedCase.status}
                    </span>
                  </div>

                  {selectedCase.deadline && (
                    <div>
                      <div className="flex items-center text-neutral-500 text-sm mb-1">
                        <Calendar size={16} className="mr-2" />
                        <span>Prazo</span>
                      </div>
                      <p className="text-neutral-900 font-medium">
                        {new Date(selectedCase.deadline).toLocaleDateString('pt-BR')}
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
                      <div className="flex items-center text-neutral-500 text-sm mb-1">
                        <Clock size={16} className="mr-2" />
                        <span>Última Sincronização</span>
                      </div>
                      <p className="text-neutral-900">{formatDate(selectedCase.lastSyncedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCase.notes && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Observações</h3>
                  <p className="text-neutral-900 bg-neutral-50 p-3 rounded-md">{selectedCase.notes}</p>
                </div>
              )}

              {selectedCase.informarCliente && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Informação para o Cliente</h3>
                  <div className="bg-green-50 border border-primary-200 rounded-md p-4">
                    <p className="text-green-900 whitespace-pre-wrap">{selectedCase.informarCliente}</p>
                  </div>
                </div>
              )}

              {selectedCase.linkProcesso && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Link do Processo</h3>
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
            <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex justify-end min-h-[44px]">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
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

export default Deadlines;
