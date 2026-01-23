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
  Building2,
  Scale,
  UserCheck,
  AlertTriangle,
  Briefcase
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

interface UserProductivity {
  userId: string;
  userName: string;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byPriority: { priority: string; count: number }[];
  byUser: UserProductivity[];
}

// Interfaces para relatórios avançados
interface CaseAdvancedStats {
  totalCases: number;
  byPhase: { phase: string; count: number }[];
  byRite: { rite: string; count: number }[];
  byTribunal: { tribunal: string; count: number }[];
  byNature: { nature: string; count: number }[];
  byComarca: { comarca: string; count: number }[];
  withDeadline: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    cases: {
      id: string;
      processNumber: string;
      deadline: string;
      client: string;
      court: string;
    }[];
  };
  byLawyer: { id: string; name: string; count: number }[];
  withoutMovement180Days: {
    total: number;
    cases: {
      id: string;
      processNumber: string;
      lastSyncedAt: string | null;
      court: string;
      subject: string;
      client: string;
      lawyer: string;
    }[];
  };
}

interface PnjAdversesStats {
  totalPnjs: number;
  topAdverses: {
    name: string;
    document: string | null;
    processCount: number;
    processes: string[];
  }[];
  withoutMovement180Days: {
    total: number;
    pnjs: {
      id: string;
      number: string;
      title: string;
      lastMovement: string | null;
      lastMovementDescription: string;
      client: string;
      defendants: string[];
    }[];
  };
}

type ReportType = 'clients' | 'cases' | 'financial' | 'tasks' | 'casesAdvanced' | 'pnjAdverses';

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
  const [caseAdvancedStats, setCaseAdvancedStats] = useState<CaseAdvancedStats | null>(null);
  const [pnjAdversesStats, setPnjAdversesStats] = useState<PnjAdversesStats | null>(null);

  // Lists for filters
  const [, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>('');

  useEffect(() => {
    loadClients();
    loadUsers();
  }, []);

  // Carrega dados automaticamente quando a aba muda
  useEffect(() => {
    loadReportData();
  }, [activeReport]);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', { params: { limit: 1000 } });
      setUsers(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
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
        case 'casesAdvanced':
          await loadCaseAdvancedReport();
          break;
        case 'pnjAdverses':
          await loadPnjAdversesReport();
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

      const stats: ClientStats = {
        total: clientsData.length,
        activeClients: clientsData.filter((c: any) => c.cases && c.cases.length > 0).length,
        newThisMonth: clientsData.filter((c: any) => new Date(c.createdAt) >= monthStart).length,
        topCities: [],
      };

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

      const stats: CaseStats = {
        total: casesData.length,
        active: casesData.filter((c: any) => c.status === 'ACTIVE' || c.status === 'EM_ANDAMENTO').length,
        completed: casesData.filter((c: any) => c.status === 'COMPLETED' || c.status === 'ARQUIVADO' || c.status === 'ENCERRADO').length,
        byPhase: [],
        byMonth: [],
      };

      const phaseCounts: Record<string, number> = {};
      casesData.forEach((c: any) => {
        const phase = c.phase || 'Não definida';
        phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
      });

      stats.byPhase = Object.entries(phaseCounts)
        .map(([phase, count]) => ({ phase, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

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
      const payableResponse = await api.get('/accounts-payable', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const receivableResponse = await api.get('/financial', {
        params: {
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      });

      const accountsPayable = payableResponse.data.data || [];
      const financialTransactions = receivableResponse.data.data || [];
      const now = new Date();

      // Separar transações por tipo: INCOME = a receber, EXPENSE = a pagar
      const incomeTransactions = financialTransactions.filter((t: any) => t.type === 'INCOME');
      const expenseTransactions = financialTransactions.filter((t: any) => t.type === 'EXPENSE');

      const stats: FinancialStats = {
        // A receber = transações do tipo INCOME
        totalReceivable: incomeTransactions.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0),
        // A pagar = contas a pagar + transações do tipo EXPENSE
        totalPayable: accountsPayable.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) +
                      expenseTransactions.reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0),
        // Recebido = INCOME com status PAID
        received: incomeTransactions.filter((r: any) => r.status === 'PAID').reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0),
        // Pago = contas a pagar PAID + EXPENSE com status PAID
        paid: accountsPayable.filter((p: any) => p.status === 'PAID').reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0) +
              expenseTransactions.filter((e: any) => e.status === 'PAID').reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0),
        // Vencido = contas a pagar pendentes vencidas
        overdue: accountsPayable.filter((p: any) => p.status !== 'PAID' && p.status !== 'CANCELLED' && new Date(p.dueDate) < now).reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0),
        byMonth: [],
      };

      const monthData: Record<string, { income: number; expense: number }> = {};

      // Receitas pagas (INCOME com status PAID)
      incomeTransactions.forEach((r: any) => {
        if (r.status === 'PAID') {
          const date = new Date(r.date || r.createdAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthData[month]) monthData[month] = { income: 0, expense: 0 };
          monthData[month].income += parseFloat(r.amount) || 0;
        }
      });

      // Despesas pagas (contas a pagar + EXPENSE com status PAID)
      accountsPayable.forEach((p: any) => {
        if (p.status === 'PAID') {
          const date = new Date(p.paidDate || p.dueDate || p.createdAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthData[month]) monthData[month] = { income: 0, expense: 0 };
          monthData[month].expense += parseFloat(p.amount) || 0;
        }
      });

      expenseTransactions.forEach((e: any) => {
        if (e.status === 'PAID') {
          const date = new Date(e.date || e.createdAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthData[month]) monthData[month] = { income: 0, expense: 0 };
          monthData[month].expense += parseFloat(e.amount) || 0;
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
      const params: any = {
        type: 'TAREFA',
        limit: 1000,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      // Adicionar filtro por usuário se selecionado
      if (filterUserId) {
        params.assignedUserId = filterUserId;
      }

      const response = await api.get('/schedule', { params });

      const tasksData = response.data.data || [];
      const now = new Date();

      // Filtrar por usuário se selecionado (fallback caso o backend não suporte o filtro)
      let filteredTasks = tasksData;
      if (filterUserId) {
        filteredTasks = tasksData.filter((t: any) =>
          t.assignedUsers?.some((au: any) => au.userId === filterUserId || au.user?.id === filterUserId)
        );
      }

      const stats: TaskStats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter((t: any) => t.completed).length,
        pending: filteredTasks.filter((t: any) => !t.completed).length,
        overdue: filteredTasks.filter((t: any) => !t.completed && t.date && new Date(t.date) < now).length,
        byPriority: [],
        byUser: [],
      };

      // Contagem por prioridade
      const priorityCounts: Record<string, number> = {};
      filteredTasks.forEach((t: any) => {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });

      stats.byPriority = Object.entries(priorityCounts)
        .map(([priority, count]) => ({ priority, count }));

      // Calcular produtividade por usuário
      const userStats: Record<string, UserProductivity> = {};

      tasksData.forEach((task: any) => {
        const assignedUsers = task.assignedUsers || [];
        assignedUsers.forEach((assignment: any) => {
          const userId = assignment.userId || assignment.user?.id;
          const userName = assignment.user?.name || 'Usuário';

          if (!userId) return;

          if (!userStats[userId]) {
            userStats[userId] = {
              userId,
              userName,
              assigned: 0,
              completed: 0,
              pending: 0,
              overdue: 0,
              completionRate: 0,
            };
          }

          userStats[userId].assigned++;
          if (task.completed) {
            userStats[userId].completed++;
          } else {
            userStats[userId].pending++;
            if (task.date && new Date(task.date) < now) {
              userStats[userId].overdue++;
            }
          }
        });
      });

      // Calcular taxa de conclusão e ordenar por produtividade
      stats.byUser = Object.values(userStats)
        .map(u => ({
          ...u,
          completionRate: u.assigned > 0 ? Math.round((u.completed / u.assigned) * 100) : 0,
        }))
        .sort((a, b) => b.completionRate - a.completionRate);

      setTaskStats(stats);
    } catch (error) {
      console.error('Error loading task report:', error);
      throw error;
    }
  };

  const loadCaseAdvancedReport = async () => {
    try {
      const response = await api.get('/reports/cases/advanced');
      setCaseAdvancedStats(response.data.data);
    } catch (error) {
      console.error('Error loading advanced case report:', error);
      throw error;
    }
  };

  const loadPnjAdversesReport = async () => {
    try {
      const response = await api.get('/reports/pnj/adverses');
      setPnjAdversesStats(response.data.data);
    } catch (error) {
      console.error('Error loading PNJ adverses report:', error);
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
        csvContent = 'RELATÓRIO DE TAREFAS E PRODUTIVIDADE\n\n';
        csvContent += 'RESUMO GERAL\n';
        csvContent += 'Métrica,Valor\n';
        csvContent += `Total de Tarefas,${taskStats.total}\n`;
        csvContent += `Concluídas,${taskStats.completed}\n`;
        csvContent += `Pendentes,${taskStats.pending}\n`;
        csvContent += `Atrasadas,${taskStats.overdue}\n`;
        csvContent += `Taxa de Conclusão,${taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%\n`;

        csvContent += '\nPOR PRIORIDADE\n';
        csvContent += 'Prioridade,Quantidade\n';
        taskStats.byPriority.forEach(p => {
          const label = p.priority === 'BAIXA' ? 'Baixa' : p.priority === 'MEDIA' ? 'Média' : p.priority === 'ALTA' ? 'Alta' : 'Urgente';
          csvContent += `${label},${p.count}\n`;
        });

        if (taskStats.byUser && taskStats.byUser.length > 0) {
          csvContent += '\nPRODUTIVIDADE POR USUÁRIO\n';
          csvContent += 'Usuário,Atribuídas,Concluídas,Pendentes,Atrasadas,Taxa de Conclusão\n';
          taskStats.byUser.forEach(u => {
            csvContent += `${u.userName},${u.assigned},${u.completed},${u.pending},${u.overdue},${u.completionRate}%\n`;
          });
        }

        filename = 'relatorio_tarefas_produtividade.csv';
        break;

      case 'casesAdvanced':
        if (!caseAdvancedStats) return;
        csvContent = 'RELATÓRIO AVANÇADO DE PROCESSOS\n\n';
        csvContent += 'POR FASE\nFase,Quantidade\n';
        caseAdvancedStats.byPhase.forEach(p => {
          csvContent += `${p.phase},${p.count}\n`;
        });
        csvContent += '\nPOR RITO\nRito,Quantidade\n';
        caseAdvancedStats.byRite.forEach(r => {
          csvContent += `${r.rite},${r.count}\n`;
        });
        csvContent += '\nPOR TRIBUNAL\nTribunal,Quantidade\n';
        caseAdvancedStats.byTribunal?.forEach(t => {
          csvContent += `${t.tribunal},${t.count}\n`;
        });
        csvContent += '\nPOR NATUREZA\nNatureza,Quantidade\n';
        caseAdvancedStats.byNature?.forEach(n => {
          csvContent += `${n.nature},${n.count}\n`;
        });
        csvContent += '\nPOR COMARCA\nComarca,Quantidade\n';
        caseAdvancedStats.byComarca?.forEach(c => {
          csvContent += `${c.comarca},${c.count}\n`;
        });
        csvContent += '\nPOR ADVOGADO\nAdvogado,Quantidade\n';
        caseAdvancedStats.byLawyer.forEach(l => {
          csvContent += `${l.name},${l.count}\n`;
        });
        csvContent += '\nCOM PRAZO\n';
        csvContent += `Total,${caseAdvancedStats.withDeadline.total}\n`;
        csvContent += `Cumpridos,${caseAdvancedStats.withDeadline.completed}\n`;
        csvContent += `Pendentes,${caseAdvancedStats.withDeadline.pending}\n`;
        csvContent += `Vencidos,${caseAdvancedStats.withDeadline.overdue}\n`;
        csvContent += '\nSEM MOVIMENTO 180 DIAS\n';
        csvContent += `Total,${caseAdvancedStats.withoutMovement180Days.total}\n`;
        csvContent += 'Número,Tribunal,Cliente,Advogado\n';
        caseAdvancedStats.withoutMovement180Days.cases.forEach(c => {
          csvContent += `${c.processNumber},${c.court || ''},${c.client},${c.lawyer}\n`;
        });
        filename = 'relatorio_processos_avancado.csv';
        break;

      case 'pnjAdverses':
        if (!pnjAdversesStats) return;
        csvContent = 'RELATÓRIO PNJ / ADVERSOS\n\n';
        csvContent += 'TOP 15 ADVERSOS\nNome,CPF/CNPJ,Qtd Processos\n';
        pnjAdversesStats.topAdverses.forEach(a => {
          csvContent += `${a.name},${a.document || ''},${a.processCount}\n`;
        });
        csvContent += '\nPNJs SEM MOVIMENTO 180 DIAS\n';
        csvContent += `Total,${pnjAdversesStats.withoutMovement180Days.total}\n`;
        csvContent += 'Número,Título,Cliente,Último Movimento\n';
        pnjAdversesStats.withoutMovement180Days.pnjs.forEach(p => {
          csvContent += `${p.number},${p.title},${p.client},${p.lastMovementDescription}\n`;
        });
        filename = 'relatorio_pnj_adversos.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Relatório exportado!');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const reportTabs = [
    { id: 'clients' as ReportType, label: 'Clientes', icon: Users },
    { id: 'cases' as ReportType, label: 'Processos', icon: FileText },
    { id: 'casesAdvanced' as ReportType, label: 'Processos Avançado', icon: Scale },
    { id: 'financial' as ReportType, label: 'Financeiro', icon: DollarSign },
    { id: 'tasks' as ReportType, label: 'Tarefas', icon: CheckCircle2 },
    { id: 'pnjAdverses' as ReportType, label: 'PNJ / Adversos', icon: Briefcase },
  ];

  const renderClientReport = () => {
    if (!clientStats) return null;

    return (
      <div className="space-y-6">
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

        {/* Produtividade por Usuário */}
        {taskStats.byUser && taskStats.byUser.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              <UserCheck className="w-5 h-5 inline mr-2" />
              Produtividade por Usuário
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Usuário</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Atribuídas</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Concluídas</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Pendentes</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Atrasadas</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Taxa de Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {taskStats.byUser.map((user) => (
                    <tr key={user.userId} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-slate-100 font-medium">{user.userName}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-slate-400">{user.assigned}</td>
                      <td className="py-3 px-4 text-sm text-center text-green-600 dark:text-green-400 font-medium">{user.completed}</td>
                      <td className="py-3 px-4 text-sm text-center text-amber-600 dark:text-amber-400">{user.pending}</td>
                      <td className="py-3 px-4 text-sm text-center text-red-600 dark:text-red-400">{user.overdue}</td>
                      <td className="py-3 px-4 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                user.completionRate >= 80 ? 'bg-green-500' :
                                user.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${user.completionRate}%` }}
                            />
                          </div>
                          <span className={`font-medium ${
                            user.completionRate >= 80 ? 'text-green-600 dark:text-green-400' :
                            user.completionRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {user.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCaseAdvancedReport = () => {
    if (!caseAdvancedStats) return null;

    return (
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total Processos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{caseAdvancedStats.totalCases}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Com Prazo Definido</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{caseAdvancedStats.withDeadline.total}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Prazos Vencidos</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{caseAdvancedStats.withDeadline.overdue}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Sem Movimento 180d</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{caseAdvancedStats.withoutMovement180Days.total}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Por Fase e Por Rito lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Fase */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Por Fase
            </h3>
            {caseAdvancedStats.byPhase.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {caseAdvancedStats.byPhase.map((phase) => (
                  <div key={phase.phase} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 dark:text-slate-300 text-sm">{phase.phase}</span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">{phase.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(phase.count / caseAdvancedStats.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
            )}
          </div>

          {/* Por Rito */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Por Rito
            </h3>
            {caseAdvancedStats.byRite.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {caseAdvancedStats.byRite.map((rite) => (
                  <div key={rite.rite} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 dark:text-slate-300 text-sm">{rite.rite}</span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">{rite.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(rite.count / caseAdvancedStats.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Por Tribunal, Natureza e Comarca */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Por Tribunal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Por Tribunal
            </h3>
            {caseAdvancedStats.byTribunal && caseAdvancedStats.byTribunal.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {caseAdvancedStats.byTribunal.map((item) => (
                  <div key={item.tribunal} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 dark:text-slate-300 text-sm truncate" title={item.tribunal}>{item.tribunal}</span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium ml-2">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${(item.count / caseAdvancedStats.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
            )}
          </div>

          {/* Por Natureza */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Por Natureza
            </h3>
            {caseAdvancedStats.byNature && caseAdvancedStats.byNature.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {caseAdvancedStats.byNature.map((item) => (
                  <div key={item.nature} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 dark:text-slate-300 text-sm truncate" title={item.nature}>{item.nature}</span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium ml-2">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full"
                          style={{ width: `${(item.count / caseAdvancedStats.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
            )}
          </div>

          {/* Por Comarca */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Por Comarca
            </h3>
            {caseAdvancedStats.byComarca && caseAdvancedStats.byComarca.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {caseAdvancedStats.byComarca.map((item) => (
                  <div key={item.comarca} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 dark:text-slate-300 text-sm truncate" title={item.comarca}>{item.comarca}</span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm font-medium ml-2">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${(item.count / caseAdvancedStats.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Por Advogado Responsável */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Por Advogado Responsável
          </h3>
          {caseAdvancedStats.byLawyer.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseAdvancedStats.byLawyer.map((lawyer, index) => (
                <div key={lawyer.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{lawyer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{lawyer.count} processos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum dado disponível</p>
          )}
        </div>

        {/* Processos com Prazo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Processos com Prazo Definido
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{caseAdvancedStats.withDeadline.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{caseAdvancedStats.withDeadline.completed}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Cumpridos</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{caseAdvancedStats.withDeadline.pending}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Pendentes</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{caseAdvancedStats.withDeadline.overdue}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Vencidos</p>
            </div>
          </div>
          {caseAdvancedStats.withDeadline.cases.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Processo</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Prazo</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Cliente</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Tribunal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {caseAdvancedStats.withDeadline.cases.slice(0, 10).map((c) => (
                    <tr key={c.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                      <td className="py-2 px-2 text-gray-900 dark:text-slate-100 font-mono text-xs">{c.processNumber}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          new Date(c.deadline) < new Date()
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {formatDate(c.deadline)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-600 dark:text-slate-300">{c.client}</td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400 text-xs">{c.court || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processos sem Movimento 180 dias */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-orange-200 dark:border-orange-800 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Processos sem Movimento (180 dias)
            <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
              {caseAdvancedStats.withoutMovement180Days.total} processos
            </span>
          </h3>
          {caseAdvancedStats.withoutMovement180Days.cases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Processo</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Última Sync</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Tribunal</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Cliente</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Advogado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {caseAdvancedStats.withoutMovement180Days.cases.map((c) => (
                    <tr key={c.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                      <td className="py-2 px-2 text-gray-900 dark:text-slate-100 font-mono text-xs">{c.processNumber}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 rounded text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                          {formatDate(c.lastSyncedAt)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400 text-xs">{c.court || '-'}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-slate-300">{c.client}</td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400">{c.lawyer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum processo sem movimento nos últimos 180 dias</p>
          )}
        </div>
      </div>
    );
  };

  const renderPnjAdversesReport = () => {
    if (!pnjAdversesStats) return null;

    return (
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Total PNJs Ativos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{pnjAdversesStats.totalPnjs}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Adversos Identificados</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{pnjAdversesStats.topAdverses.length}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Sem Movimento 180d</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{pnjAdversesStats.withoutMovement180Days.total}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top 15 Adversos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top 15 Adversos com Mais Processos
          </h3>
          {pnjAdversesStats.topAdverses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">#</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Nome</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">CPF/CNPJ</th>
                    <th className="text-center py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Processos</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Números</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {pnjAdversesStats.topAdverses.map((adv, index) => (
                    <tr key={index} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                      <td className="py-2 px-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          index < 3
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-900 dark:text-slate-100 font-medium">{adv.name}</td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400 font-mono text-xs">{adv.document || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold">
                          {adv.processCount}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400 text-xs">
                        {adv.processes.slice(0, 3).join(', ')}
                        {adv.processes.length > 3 && ` +${adv.processes.length - 3}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum adverso encontrado</p>
          )}
        </div>

        {/* PNJs sem Movimento 180 dias */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-orange-200 dark:border-orange-800 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            PNJs sem Movimento (180 dias)
            <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
              {pnjAdversesStats.withoutMovement180Days.total} processos
            </span>
          </h3>
          {pnjAdversesStats.withoutMovement180Days.pnjs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Número</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Título</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Último Movimento</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Cliente</th>
                    <th className="text-left py-2 px-2 text-gray-500 dark:text-slate-400 font-medium">Réus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {pnjAdversesStats.withoutMovement180Days.pnjs.map((pnj) => (
                    <tr key={pnj.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                      <td className="py-2 px-2 text-gray-900 dark:text-slate-100 font-mono text-xs">{pnj.number}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-slate-300 max-w-xs truncate">{pnj.title}</td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col">
                          <span className="px-2 py-1 rounded text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 inline-block w-fit">
                            {formatDate(pnj.lastMovement)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 truncate max-w-[150px]">
                            {pnj.lastMovementDescription}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400">{pnj.client}</td>
                      <td className="py-2 px-2 text-gray-500 dark:text-slate-400 text-xs">
                        {pnj.defendants.join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum PNJ sem movimento nos últimos 180 dias</p>
          )}
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
                  setTimeout(() => loadReportData(), 0);
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

        {/* Filters - only show for reports that use date filters */}
        {(activeReport === 'clients' || activeReport === 'cases' || activeReport === 'financial' || activeReport === 'tasks') && (
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
                <div className={`grid grid-cols-1 gap-4 ${activeReport === 'tasks' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
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
                  {activeReport === 'tasks' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Usuário</label>
                      <select
                        value={filterUserId}
                        onChange={(e) => setFilterUserId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      >
                        <option value="">Todos os usuários</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
        )}

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
            {activeReport === 'casesAdvanced' && renderCaseAdvancedReport()}
            {activeReport === 'pnjAdverses' && renderPnjAdversesReport()}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
