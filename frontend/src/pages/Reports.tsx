import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { formatCurrency } from '../utils/dateFormatter';

interface ReportFilters {
  startDate: string;
  endDate: string;
  clientId: string;
  status: string;
  type: string;
}

interface ClientStats {
  total: number;
  activeClients: number;
  newThisMonth: number;
  topCities: { city: string; count: number }[];
}

interface CaseStats {
  total: number;
  active: number;
  completed: number;
  byPhase: { phase: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

interface FinancialStats {
  totalReceivable: number;
  totalPayable: number;
  received: number;
  paid: number;
  overdue: number;
  byMonth: { month: string; income: number; expense: number }[];
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byPriority: { priority: string; count: number }[];
}

type ReportType = 'clients' | 'cases' | 'financial' | 'tasks';

const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('clients');
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    clientId: '',
    status: '',
    type: '',
  });

  // Report data
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);

  // Lists for filters (reserved for future use)
  const [, setClients] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
    loadReportData();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      switch (activeReport) {
        case 'clients':
          await loadClientReport();
          break;
        case 'cases':
          await loadCaseReport();
          break;
        case 'financial':
          await loadFinancialReport();
          break;
        case 'tasks':
          await loadTaskReport();
          break;
      }
    } catch (error: any) {
      console.error('Error loading report:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const loadClientReport = async () => {
    try {
      const response = await api.get('/clients', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const clientsData = response.data.data || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate stats
      const stats: ClientStats = {
        total: clientsData.length,
        activeClients: clientsData.filter((c: any) => c.cases && c.cases.length > 0).length,
        newThisMonth: clientsData.filter((c: any) => new Date(c.createdAt) >= monthStart).length,
        topCities: [],
      };

      // Count by city
      const cityCounts: Record<string, number> = {};
      clientsData.forEach((c: any) => {
        if (c.city) {
          cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
        }
      });

      stats.topCities = Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setClientStats(stats);
    } catch (error) {
      console.error('Error loading client report:', error);
      throw error;
    }
  };

  const loadCaseReport = async () => {
    try {
      const response = await api.get('/cases', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const casesData = response.data.data || [];

      // Calculate stats
      const stats: CaseStats = {
        total: casesData.length,
        active: casesData.filter((c: any) => c.status === 'ACTIVE' || c.status === 'EM_ANDAMENTO').length,
        completed: casesData.filter((c: any) => c.status === 'COMPLETED' || c.status === 'ARQUIVADO' || c.status === 'ENCERRADO').length,
        byPhase: [],
        byMonth: [],
      };

      // Count by phase
      const phaseCounts: Record<string, number> = {};
      casesData.forEach((c: any) => {
        const phase = c.phase || 'Não definida';
        phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
      });

      stats.byPhase = Object.entries(phaseCounts)
        .map(([phase, count]) => ({ phase, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Count by month
      const monthCounts: Record<string, number> = {};
      casesData.forEach((c: any) => {
        const date = new Date(c.createdAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      stats.byMonth = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);

      setCaseStats(stats);
    } catch (error) {
      console.error('Error loading case report:', error);
      throw error;
    }
  };

  const loadFinancialReport = async () => {
    try {
      // Load accounts payable
      const payableResponse = await api.get('/accounts-payable', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      // Load financial (receivable)
      const receivableResponse = await api.get('/financial', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const payables = payableResponse.data.data || [];
      const receivables = receivableResponse.data.data || [];
      const now = new Date();

      const stats: FinancialStats = {
        totalReceivable: receivables.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
        totalPayable: payables.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        received: receivables.filter((r: any) => r.status === 'PAID' || r.status === 'PAGO').reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
        paid: payables.filter((p: any) => p.paid || p.status === 'PAGO').reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        overdue: payables.filter((p: any) => !p.paid && new Date(p.dueDate) < now).reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        byMonth: [],
      };

      // Group by month
      const monthData: Record<string, { income: number; expense: number }> = {};

      receivables.forEach((r: any) => {
        if (r.status === 'PAID' || r.status === 'PAGO') {
          const date = new Date(r.paymentDate || r.date || r.createdAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthData[month]) monthData[month] = { income: 0, expense: 0 };
          monthData[month].income += r.amount || 0;
        }
      });

      payables.forEach((p: any) => {
        if (p.paid || p.status === 'PAGO') {
          const date = new Date(p.paymentDate || p.dueDate || p.createdAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthData[month]) monthData[month] = { income: 0, expense: 0 };
          monthData[month].expense += p.amount || 0;
        }
      });

      stats.byMonth = Object.entries(monthData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);

      setFinancialStats(stats);
    } catch (error) {
      console.error('Error loading financial report:', error);
      throw error;
    }
  };

  const loadTaskReport = async () => {
    try {
      const response = await api.get('/schedule', {
        params: {
          type: 'TAREFA',
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const tasksData = response.data.data || [];
      const now = new Date();

      const stats: TaskStats = {
        total: tasksData.length,
        completed: tasksData.filter((t: any) => t.completed).length,
        pending: tasksData.filter((t: any) => !t.completed).length,
        overdue: tasksData.filter((t: any) => !t.completed && t.date && new Date(t.date) < now).length,
        byPriority: [],
      };

      // Count by priority
      const priorityCounts: Record<string, number> = {};
      tasksData.forEach((t: any) => {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });

      stats.byPriority = Object.entries(priorityCounts)
        .map(([priority, count]) => ({ priority, count }));

      setTaskStats(stats);
    } catch (error) {
      console.error('Error loading task report:', error);
      throw error;
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadReportData();
  };

  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (activeReport) {
      case 'clients':
        if (!clientStats) return;
        csvContent = 'Métrica,Valor\n';
        csvContent += `Total de Clientes,${clientStats.total}\n`;
        csvContent += `Clientes Ativos,${clientStats.activeClients}\n`;
        csvContent += `Novos este Mês,${clientStats.newThisMonth}\n`;
        csvContent += '\nTop Cidades\n';
        clientStats.topCities.forEach(c => {
          csvContent += `${c.city},${c.count}\n`;
        });
        filename = 'relatorio_clientes.csv';
        break;

      case 'cases':
        if (!caseStats) return;
        csvContent = 'Métrica,Valor\n';
        csvContent += `Total de Processos,${caseStats.total}\n`;
        csvContent += `Ativos,${caseStats.active}\n`;
        csvContent += `Concluídos,${caseStats.completed}\n`;
        csvContent += '\nPor Fase\n';
        caseStats.byPhase.forEach(p => {
          csvContent += `${p.phase},${p.count}\n`;
        });
        filename = 'relatorio_processos.csv';
        break;

      case 'financial':
        if (!financialStats) return;
        csvContent = 'Métrica,Valor\n';
        csvContent += `Total a Receber,${financialStats.totalReceivable.toFixed(2)}\n`;
        csvContent += `Total a Pagar,${financialStats.totalPayable.toFixed(2)}\n`;
        csvContent += `Recebido,${financialStats.received.toFixed(2)}\n`;
        csvContent += `Pago,${financialStats.paid.toFixed(2)}\n`;
        csvContent += `Vencido,${financialStats.overdue.toFixed(2)}\n`;
        filename = 'relatorio_financeiro.csv';
        break;

      case 'tasks':
        if (!taskStats) return;
        csvContent = 'Métrica,Valor\n';
        csvContent += `Total de Tarefas,${taskStats.total}\n`;
        csvContent += `Concluídas,${taskStats.completed}\n`;
        csvContent += `Pendentes,${taskStats.pending}\n`;
        csvContent += `Atrasadas,${taskStats.overdue}\n`;
        filename = 'relatorio_tarefas.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Relatório exportado!');
  };

  const reportTabs = [
    { id: 'clients' as ReportType, label: 'Clientes', icon: Users },
    { id: 'cases' as ReportType, label: 'Processos', icon: FileText },
    { id: 'financial' as ReportType, label: 'Financeiro', icon: DollarSign },
    { id: 'tasks' as ReportType, label: 'Tarefas', icon: CheckCircle2 },
  ];

  const renderClientReport = () => {
    if (!clientStats) return null;

    return (
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total de Clientes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{clientStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Clientes Ativos</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{clientStats.activeClients}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Novos este Mês</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{clientStats.newThisMonth}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Top Cidades
          </h3>
          {clientStats.topCities.length > 0 ? (
            <div className="space-y-3">
              {clientStats.topCities.map((city, index) => (
                <div key={city.city} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 dark:text-slate-300">{city.city}</span>
                      <span className="text-gray-500 dark:text-slate-400">{city.count} clientes</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${(city.count / clientStats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado de cidade disponível</p>
          )}
        </div>
      </div>
    );
  };

  const renderCaseReport = () => {
    if (!caseStats) return null;

    return (
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total de Processos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{caseStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Ativos</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{caseStats.active}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Concluídos</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{caseStats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* By Phase */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Processos por Fase</h3>
          {caseStats.byPhase.length > 0 ? (
            <div className="space-y-3">
              {caseStats.byPhase.map((phase) => (
                <div key={phase.phase} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 dark:text-slate-300">{phase.phase}</span>
                      <span className="text-gray-500 dark:text-slate-400">{phase.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${(phase.count / caseStats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado de fase disponível</p>
          )}
        </div>
      </div>
    );
  };

  const renderFinancialReport = () => {
    if (!financialStats) return null;

    const balance = financialStats.received - financialStats.paid;

    return (
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total a Receber</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {formatCurrency(financialStats.totalReceivable)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total a Pagar</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {formatCurrency(financialStats.totalPayable)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Recebido</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(financialStats.received)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Vencido</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(financialStats.overdue)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className={`rounded-xl p-6 border shadow-sm ${
          balance >= 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Saldo do Período</p>
              <p className={`text-3xl font-bold mt-1 ${
                balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              balance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {balance >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskReport = () => {
    if (!taskStats) return null;

    const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

    const priorityColors: Record<string, string> = {
      BAIXA: 'bg-gray-500',
      MEDIA: 'bg-blue-500',
      ALTA: 'bg-orange-500',
      URGENTE: 'bg-red-500',
    };

    const priorityLabels: Record<string, string> = {
      BAIXA: 'Baixa',
      MEDIA: 'Média',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    };

    return (
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total de Tarefas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{taskStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Concluídas</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{taskStats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Pendentes</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{taskStats.pending}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Atrasadas</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{taskStats.overdue}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Taxa de Conclusão</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${completionRate * 3.52} 352`}
                  className="text-green-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{completionRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 dark:text-slate-400">
                {taskStats.completed} de {taskStats.total} tarefas concluídas
              </p>
            </div>
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Tarefas por Prioridade</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {taskStats.byPriority.map((item) => (
              <div key={item.priority} className="text-center">
                <div className={`w-12 h-12 rounded-full ${priorityColors[item.priority]} mx-auto flex items-center justify-center text-white font-bold text-lg`}>
                  {item.count}
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{priorityLabels[item.priority]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Relatórios
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Visualize métricas e estatísticas do seu escritório
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Report tabs */}
        <div className="flex flex-wrap gap-2">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReport(tab.id);
                  loadReportData();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeReport === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-slate-100">
              <Filter className="w-5 h-5" />
              Filtros
            </span>
            {filtersOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {filtersOpen && (
            <div className="p-4 pt-0 border-t border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleApplyFilters}
                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {activeReport === 'clients' && renderClientReport()}
            {activeReport === 'cases' && renderCaseReport()}
            {activeReport === 'financial' && renderFinancialReport()}
            {activeReport === 'tasks' && renderTaskReport()}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
