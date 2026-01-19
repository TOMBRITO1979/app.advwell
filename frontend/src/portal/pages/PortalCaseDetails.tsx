import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Archive,
  FileText,
} from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalCaseDetails as CaseDetailsType, PortalMovement } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: Clock },
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  FINISHED: { label: 'Finalizado', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  ARCHIVED: { label: 'Arquivado', color: 'bg-gray-100 text-gray-500', icon: Archive },
};

const partTypeLabels: Record<string, string> = {
  AUTOR: 'Demandante',
  REU: 'Demandado',
  REPRESENTANTE_LEGAL: 'Representante Legal',
};

export default function PortalCaseDetails() {
  const { id } = useParams<{ id: string }>();
  const [caseDetails, setCaseDetails] = useState<CaseDetailsType | null>(null);
  const [movements, setMovements] = useState<PortalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'movements'>('details');

  useEffect(() => {
    if (id) {
      loadCaseDetails();
    }
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      const [details, movs] = await Promise.all([
        portalApi.getCaseDetails(id!),
        portalApi.getCaseMovements(id!),
      ]);
      setCaseDetails(details);
      setMovements(movs);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do processo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </PortalLayout>
    );
  }

  if (!caseDetails) {
    return (
      <PortalLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-slate-400">Processo não encontrado</p>
          <Link to="/portal/cases" className="text-green-600 dark:text-green-400 hover:underline mt-2 inline-block">
            Voltar para lista
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const status = statusConfig[caseDetails.status] || statusConfig.ACTIVE;
  const StatusIcon = status.icon;

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/portal/cases"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-slate-300"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{caseDetails.processNumber}</h1>
            <p className="text-gray-500 dark:text-slate-400">{caseDetails.court}</p>
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex flex-wrap items-center gap-4">
          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${status.color}`}>
            <StatusIcon size={16} />
            {status.label}
          </span>
          {caseDetails.linkProcesso && (
            <a
              href={caseDetails.linkProcesso}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={16} />
              Ver no Tribunal
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movements'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              Movimentações ({movements.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'details' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Informações do Processo</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Assunto</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{caseDetails.subject}</p>
                </div>
                {caseDetails.value && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Valor da Causa</p>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(caseDetails.value))}
                    </p>
                  </div>
                )}
                {caseDetails.deadline && (
                  <div className="flex items-start gap-2">
                    <Calendar className="text-gray-400 dark:text-slate-500 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Prazo</p>
                      <p className={`font-medium ${caseDetails.deadlineCompleted ? 'text-gray-500 dark:text-slate-400 line-through' : 'text-red-600 dark:text-red-400'}`}>
                        {format(new Date(caseDetails.deadline), "dd/MM/yyyy", { locale: ptBR })}
                        {caseDetails.deadlineCompleted && ' (Cumprido)'}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Data de Cadastro</p>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {format(new Date(caseDetails.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Partes do Processo</h2>
              {caseDetails.parts.length > 0 ? (
                <div className="space-y-4">
                  {caseDetails.parts.map((part) => (
                    <div key={part.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <User className="text-gray-400 dark:text-slate-500 mt-0.5" size={20} />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium">{partTypeLabels[part.type] || part.type}</p>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{part.name}</p>
                        {part.cpfCnpj && <p className="text-sm text-gray-500 dark:text-slate-400">{part.cpfCnpj}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhuma parte cadastrada</p>
              )}
            </div>

            {/* Info for client */}
            {caseDetails.informarCliente && (
              <div className="lg:col-span-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">Informação do Escritório</h2>
                <p className="text-green-700 dark:text-green-300 whitespace-pre-wrap">{caseDetails.informarCliente}</p>
              </div>
            )}

            {/* AI Summary */}
            {caseDetails.aiSummary && (
              <div className="lg:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                  <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-400">Resumo do Processo</h2>
                </div>
                <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{caseDetails.aiSummary}</p>
              </div>
            )}
          </div>
        ) : (
          /* Movements tab */
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            {movements.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {movements.map((movement, index) => (
                  <div key={movement.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                        {index < movements.length - 1 && (
                          <div className="absolute top-4 left-1.5 w-0.5 h-full bg-gray-200 dark:bg-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-slate-100">{movement.movementName}</p>
                        {movement.description && (
                          <p className="text-gray-600 dark:text-slate-300 mt-1">{movement.description}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                          {format(new Date(movement.movementDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Clock className="mx-auto h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Nenhuma movimentação</h3>
                <p className="text-gray-500 dark:text-slate-400">Este processo ainda não possui movimentações registradas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
