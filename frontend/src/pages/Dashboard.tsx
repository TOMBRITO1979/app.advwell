import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  Users,
  Briefcase,
  Calendar,
  Building2,
  TrendingUp,
  Activity,
  Clock,
  CalendarCheck
} from 'lucide-react';

interface Stats {
  clients: number;
  cases: number;
  todayHearings: number;
  companies?: number;
}

interface EventsPerWeekday {
  name: string;
  eventos: number;
  audiencias: number;
}

interface CasesByStatus {
  name: string;
  value: number;
  status: string;
  [key: string]: string | number;
}

interface MovementsTimeline {
  date: string;
  andamentos: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  date: string;
  clientName: string;
  processNumber: string;
  daysUntil: number;
}

interface NewClientsTimeline {
  mes: string;
  clientes: number;
}

interface UpcomingHearings {
  dia: string;
  audiencias: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    cases: 0,
    todayHearings: 0,
  });

  const [eventsPerWeekday, setEventsPerWeekday] = useState<EventsPerWeekday[]>([]);
  const [casesByStatus, setCasesByStatus] = useState<CasesByStatus[]>([]);
  const [movementsTimeline, setMovementsTimeline] = useState<MovementsTimeline[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [newClientsTimeline, setNewClientsTimeline] = useState<NewClientsTimeline[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<UpcomingHearings[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        statsRes,
        eventsRes,
        casesRes,
        movementsRes,
        deadlinesRes,
        clientsRes,
        hearingsRes
      ] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/events-per-weekday'),
        api.get('/dashboard/cases-by-status'),
        api.get('/dashboard/movements-timeline'),
        api.get('/dashboard/upcoming-deadlines'),
        api.get('/dashboard/new-clients-timeline'),
        api.get('/dashboard/upcoming-hearings')
      ]);

      setStats({
        clients: statsRes.data.clients || 0,
        cases: statsRes.data.cases || 0,
        todayHearings: statsRes.data.todayHearings || 0,
        companies: statsRes.data.companies,
      });
      setEventsPerWeekday(eventsRes.data);
      setCasesByStatus(casesRes.data);
      setMovementsTimeline(movementsRes.data);
      setUpcomingDeadlines(deadlinesRes.data);
      setNewClientsTimeline(clientsRes.data);
      setUpcomingHearings(hearingsRes.data);
    } catch (error: any) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Cores suaves para os gráficos (Nova Paleta)
  const COLORS = ['#66BB6A', '#7986CB', '#EF5350', '#FFB74D']; // Verde, Índigo, Vermelho, Laranja
  const PRIMARY_COLOR = '#4CAF50';   // Verde principal
  const SECONDARY_COLOR = '#5C6BC0'; // Índigo suave

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-neutral-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Activity className="text-primary-600" size={24} />
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 mt-1">
            Bem-vindo, {user?.name}!
          </p>
        </div>

        {/* Cards de Estatísticas - Nova Paleta Suave */}
        <div className="stats-grid">
          <div className="stat-card bg-gradient-to-br from-primary-400 to-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-primary-100">Clientes</p>
                <p className="stat-card-value">{stats.clients}</p>
              </div>
              <Users size={32} className="text-primary-200 hidden sm:block" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-br from-indigo-400 to-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-indigo-100">Processos</p>
                <p className="stat-card-value">{stats.cases}</p>
              </div>
              <Briefcase size={32} className="text-indigo-200 hidden sm:block" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-br from-info-400 to-info-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-info-100">Audiências Hoje</p>
                <p className="stat-card-value">{stats.todayHearings}</p>
              </div>
              <Calendar size={32} className="text-info-200 hidden sm:block" />
            </div>
          </div>

          {stats.companies !== undefined && user?.role === 'SUPER_ADMIN' && (
            <div className="stat-card bg-gradient-to-br from-orange-400 to-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-card-label text-orange-100">Empresas</p>
                  <p className="stat-card-value">{stats.companies}</p>
                </div>
                <Building2 size={32} className="text-orange-200 hidden sm:block" />
              </div>
            </div>
          )}
        </div>

        {/* Primeira Linha de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Eventos por Dia da Semana */}
          <div className="chart-container">
            <h2 className="chart-title">
              <CalendarCheck className="text-primary-600" size={20} />
              Eventos por Dia
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Últimos 7 dias</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={eventsPerWeekday}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="eventos" fill={PRIMARY_COLOR} name="Eventos" />
                <Bar dataKey="audiencias" fill={SECONDARY_COLOR} name="Audiências" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Processos por Status */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Briefcase className="text-primary-600" size={20} />
              Processos por Status
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Distribuição atual</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={casesByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {casesByStatus.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segunda Linha de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Andamentos Recebidos */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Activity className="text-primary-600" size={20} />
              Andamentos Recebidos
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Últimos 30 dias</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={movementsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="andamentos"
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  name="Andamentos"
                  dot={{ fill: PRIMARY_COLOR, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Audiências Próximas */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Calendar className="text-primary-600" size={20} />
              Audiências Próximas
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Próximos 7 dias</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={upcomingHearings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="audiencias" fill={SECONDARY_COLOR} name="Audiências" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Terceira Linha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Novos Clientes */}
          <div className="chart-container">
            <h2 className="chart-title">
              <TrendingUp className="text-primary-600" size={20} />
              Novos Clientes
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={newClientsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="clientes" fill="#059669" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Prazos Próximos */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Clock className="text-primary-600" size={20} />
              Prazos Próximos
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">Próximos 15 dias</p>
            <div className="space-y-2 sm:space-y-3 max-h-[250px] overflow-y-auto">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  Nenhum prazo próximo
                </p>
              ) : (
                upcomingDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-start justify-between p-2 sm:p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-neutral-800 text-sm truncate">{deadline.title}</p>
                      <p className="text-xs sm:text-sm text-neutral-600 truncate">
                        {deadline.clientName}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {formatDate(deadline.date)}
                      </p>
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                      deadline.daysUntil <= 3
                        ? 'bg-red-100 text-red-700'
                        : deadline.daysUntil <= 7
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-success-100 text-success-700'
                    }`}>
                      <span className="text-xs font-bold">{deadline.daysUntil}d</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
