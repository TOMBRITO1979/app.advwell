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
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Users,
  UserCheck,
  Percent,
  Clock,
  TrendingUp,
  Tag,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

// Interfaces
interface LeadStats {
  total: number;
  converted: number;
  conversionRate: string;
  avgConversionDays: number | null;
}

interface TagCount {
  tagId: string;
  tagName: string;
  tagColor: string;
  count: number;
}

interface SourceStats {
  source: string;
  label: string;
  count: number;
  convertedCount: number;
  conversionRate: string;
}

interface ConversionTimeline {
  month: string;
  total: number;
  converted: number;
  conversionRate: string;
}

interface TagEffectiveness {
  tagId: string;
  tagName: string;
  tagColor: string;
  total: number;
  converted: number;
  conversionRate: string;
}

const PERIOD_OPTIONS = [
  { value: '', label: 'Todo o período' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
];

const LeadAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [period, setPeriod] = useState('');

  // Estados dos dados
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    converted: 0,
    conversionRate: '0.0',
    avgConversionDays: null,
  });
  const [convertedByTags, setConvertedByTags] = useState<TagCount[]>([]);
  const [nonConvertedByTags, setNonConvertedByTags] = useState<TagCount[]>([]);
  const [bySource, setBySource] = useState<SourceStats[]>([]);
  const [timeline, setTimeline] = useState<ConversionTimeline[]>([]);
  const [tagEffectiveness, setTagEffectiveness] = useState<TagEffectiveness[]>([]);

  // Cores
  const COLORS = ['#4CAF50', '#5C6BC0', '#FF7043', '#26A69A', '#AB47BC', '#FFB74D', '#78909C', '#EC407A'];
  const PRIMARY_COLOR = '#4CAF50';
  const SECONDARY_COLOR = '#5C6BC0';

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = period ? { period } : {};

      const [
        statsRes,
        convertedRes,
        nonConvertedRes,
        sourceRes,
        timelineRes,
        effectivenessRes,
      ] = await Promise.all([
        api.get('/lead-analytics/stats', { params }),
        api.get('/lead-analytics/by-tags', { params: { ...params, converted: true } }),
        api.get('/lead-analytics/by-tags', { params: { ...params, converted: false } }),
        api.get('/lead-analytics/by-source', { params }),
        api.get('/lead-analytics/conversion-timeline', { params }),
        api.get('/lead-analytics/tag-effectiveness', { params }),
      ]);

      setStats(statsRes.data);
      setConvertedByTags(convertedRes.data);
      setNonConvertedByTags(nonConvertedRes.data);
      setBySource(sourceRes.data);
      setTimeline(timelineRes.data);
      setTagEffectiveness(effectivenessRes.data);
    } catch (error: any) {
      console.error('Erro ao carregar analytics:', error);
      toast.error('Erro ao carregar dados de analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const params = period ? { period } : {};
      const response = await api.get('/lead-analytics/export/csv', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lead-analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = period ? { period } : {};
      const response = await api.get('/lead-analytics/export/pdf', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lead-analytics_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportingPDF(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 flex items-center gap-2">
              <BarChart3 className="text-primary-600" size={24} />
              Analytics de Leads
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              Estatísticas detalhadas de conversão e performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Período */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Botões de Exportação */}
            <button
              onClick={handleExportCSV}
              disabled={exportingCSV}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">{exportingCSV ? 'Exportando...' : 'CSV'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">{exportingPDF ? 'Exportando...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="stats-grid">
          <div className="stat-card bg-gradient-to-br from-blue-400 to-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-blue-100">Total de Leads</p>
                <p className="stat-card-value">{stats.total}</p>
              </div>
              <Users size={32} className="text-blue-200 hidden sm:block" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-br from-primary-400 to-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-primary-100">Convertidos</p>
                <p className="stat-card-value">{stats.converted}</p>
              </div>
              <UserCheck size={32} className="text-primary-200 hidden sm:block" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-br from-orange-400 to-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-orange-100">Taxa de Conversão</p>
                <p className="stat-card-value">{stats.conversionRate}%</p>
              </div>
              <Percent size={32} className="text-orange-200 hidden sm:block" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-br from-indigo-400 to-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label text-indigo-100">Tempo Médio</p>
                <p className="stat-card-value">
                  {stats.avgConversionDays !== null ? `${stats.avgConversionDays}d` : 'N/A'}
                </p>
              </div>
              <Clock size={32} className="text-indigo-200 hidden sm:block" />
            </div>
          </div>
        </div>

        {/* Primeira Linha de Gráficos - Por Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Leads Convertidos por Tag */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Tag className="text-primary-600" size={20} />
              Leads Convertidos por Tag
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">
              Distribuição por tags
            </p>
            {convertedByTags.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={convertedByTags} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="tagName"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads">
                    {convertedByTags.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.tagColor || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-neutral-500">
                Nenhum lead convertido com tags
              </div>
            )}
          </div>

          {/* Leads Não Convertidos por Tag */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Tag className="text-orange-600" size={20} />
              Leads Não Convertidos por Tag
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">
              Em processo de conversão
            </p>
            {nonConvertedByTags.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={nonConvertedByTags} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="tagName"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads">
                    {nonConvertedByTags.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.tagColor || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-neutral-500">
                Nenhum lead não convertido com tags
              </div>
            )}
          </div>
        </div>

        {/* Segunda Linha de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Leads por Origem */}
          <div className="chart-container">
            <h2 className="chart-title">
              <Users className="text-primary-600" size={20} />
              Leads por Origem
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">
              De onde vêm seus leads
            </p>
            {bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={bySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ label, percent }) => `${label}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="count"
                  >
                    {bySource.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-neutral-500">
                Nenhum lead registrado
              </div>
            )}
          </div>

          {/* Timeline de Conversões */}
          <div className="chart-container">
            <h2 className="chart-title">
              <TrendingUp className="text-primary-600" size={20} />
              Timeline de Conversões
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">
              Leads e conversões ao longo do tempo
            </p>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={SECONDARY_COLOR}
                    strokeWidth={2}
                    name="Total"
                    dot={{ fill: SECONDARY_COLOR, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="converted"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={2}
                    name="Convertidos"
                    dot={{ fill: PRIMARY_COLOR, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-neutral-500">
                Sem dados no período
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Efetividade por Tag */}
        <div className="chart-container">
          <h2 className="chart-title">
            <Tag className="text-primary-600" size={20} />
            Taxa de Conversão por Tag
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-4">
            Efetividade de cada tag na conversão de leads
          </p>

          {tagEffectiveness.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Convertidos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Taxa
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {tagEffectiveness.map((tag) => (
                    <tr key={tag.tagId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.tagColor || '#6B7280' }}
                        >
                          {tag.tagName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-neutral-900">
                        {tag.total}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-neutral-900">
                        {tag.converted}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            parseFloat(tag.conversionRate) >= 50
                              ? 'bg-green-100 text-green-800'
                              : parseFloat(tag.conversionRate) >= 25
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tag.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-neutral-500">
              Nenhuma tag com leads no período
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LeadAnalytics;
