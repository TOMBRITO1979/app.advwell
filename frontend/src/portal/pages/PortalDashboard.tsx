import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle, Clock, Archive, Megaphone, ArrowRight } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalDashboard as DashboardData } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function PortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await portalApi.getDashboard();
      setData(response);
    } catch (error) {
      toast.error('Erro ao carregar dados do painel');
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

  const stats = [
    { label: 'Total de Processos', value: data?.stats.totalCases || 0, icon: Briefcase, color: 'bg-blue-500' },
    { label: 'Processos Ativos', value: data?.stats.activeCases || 0, icon: Clock, color: 'bg-green-500' },
    { label: 'Pendentes', value: data?.stats.pendingCases || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Finalizados', value: data?.stats.finishedCases || 0, icon: CheckCircle, color: 'bg-gray-500' },
  ];

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
          <p className="text-gray-500">Acompanhe seus processos e novidades</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Movements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Últimas Movimentações</h2>
              <Link
                to="/portal/cases"
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {data?.recentMovements && data.recentMovements.length > 0 ? (
                data.recentMovements.map((movement) => (
                  <div key={movement.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <p className="font-medium text-gray-900">{movement.movementName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        Processo: {movement.processNumber}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(movement.movementDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Nenhuma movimentação recente</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements preview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Avisos do Escritório</h2>
              <Link
                to="/portal/announcements"
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
            <div className="p-6">
              {data?.stats.activeAnnouncements && data.stats.activeAnnouncements > 0 ? (
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <Megaphone className="text-green-600" size={24} />
                  <div>
                    <p className="font-medium text-green-700">
                      {data.stats.activeAnnouncements} aviso(s) do escritório
                    </p>
                    <p className="text-sm text-green-600">Clique para ver os detalhes</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <Megaphone className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Nenhum aviso no momento</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick access */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/portal/cases"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Briefcase className="text-green-600" size={28} />
              <span className="text-sm font-medium text-gray-700">Meus Processos</span>
            </Link>
            <Link
              to="/portal/profile"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Archive className="text-green-600" size={28} />
              <span className="text-sm font-medium text-gray-700">Meus Dados</span>
            </Link>
            <Link
              to="/portal/company"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Clock className="text-green-600" size={28} />
              <span className="text-sm font-medium text-gray-700">Escritório</span>
            </Link>
            <Link
              to="/portal/announcements"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Megaphone className="text-green-600" size={28} />
              <span className="text-sm font-medium text-gray-700">Avisos</span>
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
