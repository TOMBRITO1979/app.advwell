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

  // Cores para os gráficos
  const COLORS = ['#2563eb', '#7c3aed', '#dc2626', '#059669'];
  const PRIMARY_COLOR = '#2563eb';
  const SECONDARY_COLOR = '#7c3aed';

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Activity className="text-primary-600" size={28} />
            Dashboard
          </h1>
          <p className="text-neutral-600 mt-1">
            Bem-vindo, {user?.name}! Visão geral das suas atividades e estatísticas
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total de Clientes</p>
                <p className="text-3xl font-bold mt-2">{stats.clients}</p>
              </div>
              <Users size={40} className="text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Processos Ativos</p>
                <p className="text-3xl font-bold mt-2">{stats.cases}</p>
              </div>
              <Briefcase size={40} className="text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Audiências Hoje</p>
                <p className="text-3xl font-bold mt-2">{stats.todayHearings}</p>
              </div>
              <Calendar size={40} className="text-green-200" />
            </div>
          </div>

          {stats.companies !== undefined && user?.role === 'SUPER_ADMIN' && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total de Empresas</p>
                  <p className="text-3xl font-bold mt-2">{stats.companies}</p>
                </div>
                <Building2 size={40} className="text-orange-200" />
              </div>
            </div>
          )}
        </div>

        {/* Primeira Linha de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eventos por Dia da Semana */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <CalendarCheck className="text-primary-600" size={20} />
              Eventos por Dia da Semana
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Últimos 7 dias</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventsPerWeekday}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="eventos" fill={PRIMARY_COLOR} name="Eventos" />
                <Bar dataKey="audiencias" fill={SECONDARY_COLOR} name="Audiências" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Processos por Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Briefcase className="text-primary-600" size={20} />
              Processos por Status
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Distribuição atual</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={casesByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Andamentos Recebidos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Activity className="text-primary-600" size={20} />
              Andamentos Recebidos
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Últimos 30 dias</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={movementsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="andamentos"
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  name="Andamentos"
                  dot={{ fill: PRIMARY_COLOR }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Audiências Próximas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Calendar className="text-primary-600" size={20} />
              Audiências Próximas
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Próximos 7 dias</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={upcomingHearings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="audiencias" fill={SECONDARY_COLOR} name="Audiências" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Terceira Linha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Novos Clientes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <TrendingUp className="text-primary-600" size={20} />
              Novos Clientes
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={newClientsTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clientes" fill="#059669" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Prazos Próximos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Clock className="text-primary-600" size={20} />
              Prazos Próximos
            </h2>
            <p className="text-sm text-neutral-600 mb-4">Próximos 15 dias</p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  Nenhum prazo próximo
                </p>
              ) : (
                upcomingDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-start justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-800">{deadline.title}</p>
                      <p className="text-sm text-neutral-600">
                        {deadline.clientName} • {deadline.processNumber}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(deadline.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      deadline.daysUntil <= 3
                        ? 'bg-red-100 text-red-700'
                        : deadline.daysUntil <= 7
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
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
