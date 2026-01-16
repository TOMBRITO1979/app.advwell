import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight, Clock, CheckCircle, AlertCircle, Archive, FileText } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalCase, PortalPNJ } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: Clock },
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  FINISHED: { label: 'Finalizado', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  ARCHIVED: { label: 'Arquivado', color: 'bg-gray-100 text-gray-500', icon: Archive },
};

type TabType = 'judicial' | 'pnj';

export default function PortalCases() {
  const [cases, setCases] = useState<PortalCase[]>([]);
  const [pnjs, setPnjs] = useState<PortalPNJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<TabType>('judicial');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casesResponse, pnjsResponse] = await Promise.all([
        portalApi.getCases(),
        portalApi.getPNJs(),
      ]);
      setCases(casesResponse);
      setPnjs(pnjsResponse);
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = filter === 'ALL'
    ? cases
    : cases.filter(c => c.status === filter);

  const filteredPNJs = filter === 'ALL'
    ? pnjs
    : pnjs.filter(p => p.status === filter);

  const totalCount = cases.length + pnjs.length;

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Processos</h1>
            <p className="text-gray-500">{totalCount} processo(s) encontrado(s)</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { value: 'ALL', label: 'Todos' },
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'PENDENTE', label: 'Pendentes' },
              { value: 'FINISHED', label: 'Finalizados' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === item.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('judicial')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'judicial'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase size={18} />
              Processos Judiciais
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'judicial' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {cases.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pnj')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'pnj'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText size={18} />
              Processos Não Judiciais
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'pnj' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {pnjs.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Judicial Cases list */}
        {activeTab === 'judicial' && (
          <>
            {filteredCases.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Briefcase className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum processo judicial encontrado</h3>
                <p className="text-gray-500">
                  {filter === 'ALL'
                    ? 'Você ainda não possui processos judiciais cadastrados.'
                    : 'Nenhum processo judicial com este status.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCases.map((caseItem) => {
                  const status = statusConfig[caseItem.status] || statusConfig.ACTIVE;
                  const StatusIcon = status.icon;
                  return (
                    <Link
                      key={caseItem.id}
                      to={`/portal/cases/${caseItem.id}`}
                      className="block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon size={14} />
                              {status.label}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {caseItem.processNumber}
                          </h3>
                          <p className="text-gray-600 mb-2">{caseItem.subject}</p>
                          <p className="text-sm text-gray-500">{caseItem.court}</p>

                          {/* Last movement */}
                          {caseItem.lastMovement && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Última Movimentação</p>
                              <p className="text-sm text-gray-700">{caseItem.lastMovement.movementName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(caseItem.lastMovement.movementDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          )}

                          {/* Info for client */}
                          {caseItem.informarCliente && (
                            <div className="mt-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                              <p className="text-xs text-green-600 uppercase font-medium mb-1">Informação do Escritório</p>
                              <p className="text-sm text-green-800">{caseItem.informarCliente}</p>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="text-gray-400 flex-shrink-0 mt-4" size={24} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* PNJ list */}
        {activeTab === 'pnj' && (
          <>
            {filteredPNJs.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum processo não judicial encontrado</h3>
                <p className="text-gray-500">
                  {filter === 'ALL'
                    ? 'Você ainda não possui processos não judiciais cadastrados.'
                    : 'Nenhum processo não judicial com este status.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPNJs.map((pnj) => {
                  const status = statusConfig[pnj.status] || statusConfig.ACTIVE;
                  const StatusIcon = status.icon;
                  return (
                    <Link
                      key={pnj.id}
                      to={`/portal/pnjs/${pnj.id}`}
                      className="block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon size={14} />
                              {status.label}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              PNJ
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {pnj.number}
                          </h3>
                          <p className="text-gray-600 mb-2">{pnj.title}</p>
                          {pnj.protocol && (
                            <p className="text-sm text-gray-500">Protocolo: {pnj.protocol}</p>
                          )}

                          {/* Last movement */}
                          {pnj.lastMovement && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Último Andamento</p>
                              <p className="text-sm text-gray-700">{pnj.lastMovement.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(pnj.lastMovement.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          )}

                          {/* Description */}
                          {pnj.description && (
                            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                              <p className="text-xs text-blue-600 uppercase font-medium mb-1">Descrição</p>
                              <p className="text-sm text-blue-800 line-clamp-2">{pnj.description}</p>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="text-gray-400 flex-shrink-0 mt-4" size={24} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
