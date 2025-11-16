import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Users, FileText, Building2, Activity, Briefcase, File, TrendingUp, TrendingDown, User } from 'lucide-react';

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
    companies: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentActivities();
  }, []);

  const loadStats = async () => {
    try {
      // Busca estatísticas básicas
      const [clientsRes, casesRes] = await Promise.all([
        api.get('/clients?limit=1'),
        api.get('/cases?limit=1'),
      ]);

      setStats({
        clients: clientsRes.data.pagination?.total || 0,
        cases: casesRes.data.pagination?.total || 0,
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
        return <Briefcase className="text-blue-600" {...iconProps} />;
      case 'file':
        return <File className="text-purple-600" {...iconProps} />;
      case 'trending-up':
        return <TrendingUp className="text-green-600" {...iconProps} />;
      case 'trending-down':
        return <TrendingDown className="text-red-600" {...iconProps} />;
      case 'user':
        return <User className="text-indigo-600" {...iconProps} />;
      case 'activity':
        return <Activity className="text-orange-600" {...iconProps} />;
      default:
        return <Activity className="text-gray-600" {...iconProps} />;
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.clients}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="text-green-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Processos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cases}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="text-green-600" size={32} />
              </div>
            </div>
          </div>

          {user?.role === 'SUPER_ADMIN' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Empresas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.companies}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Building2 className="text-purple-600" size={32} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-gray-700" size={24} />
            <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-0.5">{getActivityIcon(activity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-semibold">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
