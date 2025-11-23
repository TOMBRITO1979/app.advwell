import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, FileText, Building2, Activity, Briefcase, File, TrendingUp, TrendingDown, User, Calendar } from 'lucide-react';
import { Card, EmptyState } from '../components/ui';

interface RecentActivity {
  id: string;
  type: 'client' | 'case' | 'transaction' | 'document' | 'movement';
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    cases: 0,
    todayHearings: 0,
    companies: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentActivities();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');

      setStats({
        clients: response.data.clients || 0,
        cases: response.data.cases || 0,
        todayHearings: response.data.todayHearings || 0,
        companies: 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await api.get('/dashboard/recent-activities?limit=10');
      if (response.data.activities) {
        setRecentActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades recentes:', error);
      setRecentActivities([]);
    }
  };

  const getActivityIcon = (activity: RecentActivity) => {
    const iconProps = { size: 20 };

    switch (activity.icon) {
      case 'briefcase':
        return <Briefcase className="text-primary-600" {...iconProps} />;
      case 'file':
        return <File className="text-info-600" {...iconProps} />;
      case 'trending-up':
        return <TrendingUp className="text-success-600" {...iconProps} />;
      case 'trending-down':
        return <TrendingDown className="text-error-600" {...iconProps} />;
      case 'user':
        return <User className="text-primary-500" {...iconProps} />;
      case 'activity':
        return <Activity className="text-warning-600" {...iconProps} />;
      default:
        return <Activity className="text-neutral-600" {...iconProps} />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `${diffMins} min atrás`;
      if (diffHours < 24) return `${diffHours}h atrás`;
      if (diffDays < 7) return `${diffDays}d atrás`;

      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-600 mt-1 text-base">Bem-vindo, {user?.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card hover className="transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Clientes Ativos</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.clients}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-xl">
                <Users className="text-primary-600" size={32} />
              </div>
            </div>
          </Card>

          <Card hover className="transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Processos Ativos</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.cases}</p>
              </div>
              <div className="bg-info-100 p-3 rounded-xl">
                <FileText className="text-info-600" size={32} />
              </div>
            </div>
          </Card>

          <Card hover className="transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Audiências Hoje</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.todayHearings}</p>
              </div>
              <div className="bg-warning-100 p-3 rounded-xl">
                <Calendar className="text-warning-600" size={32} />
              </div>
            </div>
          </Card>

          {user?.role === 'SUPER_ADMIN' && (
            <Card hover className="transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total de Empresas</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{stats.companies}</p>
                </div>
                <div className="bg-success-100 p-3 rounded-xl">
                  <Building2 className="text-success-600" size={32} />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Activities */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-neutral-700" size={24} />
            <h2 className="text-lg font-semibold text-neutral-900">Atividades Recentes</h2>
          </div>

          {recentActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhuma atividade recente"
              description="As atividades do sistema aparecerão aqui"
            />
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <div className="mt-0.5">{getActivityIcon(activity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 font-semibold">
                      {activity.title}
                    </p>
                    <p className="text-sm text-neutral-600 mt-0.5 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
