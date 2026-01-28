import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { cache } from '../utils/redis';
import { appLogger } from '../utils/logger';

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  STATS: 60,           // 1 minute for main stats
  ACTIVITIES: 120,     // 2 minutes for activities
  CHARTS: 300,         // 5 minutes for chart data
};

// Obter estatísticas do dashboard (com cache)
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:stats:${companyId}`;

    // Try cache first
    const cachedStats = await cache.get<any>(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }

    // Obter data de hoje (início e fim do dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar todas as estatísticas em paralelo
    const [
      totalClients,
      totalCases,
      todayHearings,
      todayDeadlines
    ] = await Promise.all([
      // Total de clientes ativos
      prisma.client.count({
        where: {
          companyId,
          active: true
        }
      }),

      // Total de processos ativos
      prisma.case.count({
        where: {
          companyId,
          status: 'ACTIVE'
        }
      }),

      // Audiências de hoje
      prisma.scheduleEvent.count({
        where: {
          companyId,
          type: 'AUDIENCIA',
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // Prazos vencendo hoje (processos com deadline = hoje e não completado)
      prisma.case.count({
        where: {
          companyId,
          deadline: {
            gte: today,
            lt: tomorrow
          },
          deadlineCompleted: false
        }
      })
    ]);

    const stats = {
      clients: totalClients,
      cases: totalCases,
      todayHearings: todayHearings,
      todayDeadlines: todayDeadlines
    };

    // Cache the result
    await cache.set(cacheKey, stats, CACHE_TTL.STATS);

    res.json(stats);
  } catch (error: any) {
    appLogger.error('Erro ao buscar estatísticas:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Obter atividades recentes do dashboard (com cache)
export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const limit = Number(req.query.limit) || 10;
    const cacheKey = `dashboard:activities:${companyId}:${limit}`;

    // Try cache first
    const cachedActivities = await cache.get<any>(cacheKey);
    if (cachedActivities) {
      return res.json(cachedActivities);
    }

    // Buscar em paralelo com limite otimizado
    const [recentCases, recentDocuments, recentTransactions, recentClients, recentMovements] = await Promise.all([
      prisma.case.findMany({
        where: { companyId },
        include: {
          client: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.document.findMany({
        where: { companyId },
        include: {
          client: { select: { name: true } },
          case: { select: { processNumber: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.financialTransaction.findMany({
        where: { companyId },
        include: {
          client: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.client.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.caseMovement.findMany({
        where: {
          companyId, // SEGURANCA: Filtro direto por tenant
          case: { companyId }
        },
        include: {
          case: {
            select: {
              processNumber: true,
              client: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    ]);

    // Combinar todas as atividades
    const allActivities: any[] = [];

    recentCases.forEach(item => {
      allActivities.push({
        id: item.id,
        type: 'case',
        icon: 'briefcase',
        title: 'Novo Processo',
        description: `${item.processNumber} - ${item.client?.name || 'Cliente não informado'}`,
        timestamp: item.createdAt,
        metadata: {
          processNumber: item.processNumber,
          clientName: item.client?.name,
          subject: item.subject,
        }
      });
    });

    recentDocuments.forEach(item => {
      allActivities.push({
        id: item.id,
        type: 'document',
        icon: 'file',
        title: 'Novo Documento',
        description: `${item.name}${item.client ? ` - ${item.client.name}` : ''}${item.case ? ` (${item.case.processNumber})` : ''}`,
        timestamp: item.createdAt,
        metadata: {
          documentName: item.name,
          storageType: item.storageType,
          clientName: item.client?.name,
          processNumber: item.case?.processNumber,
        }
      });
    });

    recentTransactions.forEach(item => {
      allActivities.push({
        id: item.id,
        type: 'transaction',
        icon: item.type === 'INCOME' ? 'trending-up' : 'trending-down',
        title: item.type === 'INCOME' ? 'Nova Receita' : 'Nova Despesa',
        description: `${item.description} - R$ ${item.amount.toFixed(2)} - ${item.client?.name || 'Cliente não informado'}`,
        timestamp: item.createdAt,
        metadata: {
          amount: item.amount,
          transactionType: item.type,
          description: item.description,
          clientName: item.client?.name,
        }
      });
    });

    recentClients.forEach(item => {
      allActivities.push({
        id: item.id,
        type: 'client',
        icon: 'user',
        title: 'Novo Cliente',
        description: `${item.name}${item.cpf ? ` - CPF: ${item.cpf}` : ''}`,
        timestamp: item.createdAt,
        metadata: {
          clientName: item.name,
          cpf: item.cpf,
          email: item.email,
        }
      });
    });

    recentMovements.forEach(item => {
      allActivities.push({
        id: item.id,
        type: 'movement',
        icon: 'activity',
        title: 'Movimentação Processual',
        description: `${item.movementName} - ${item.case.processNumber}`,
        timestamp: item.createdAt,
        metadata: {
          movementName: item.movementName,
          processNumber: item.case.processNumber,
          clientName: item.case.client?.name,
          movementDate: item.movementDate,
        }
      });
    });

    // Ordenar e limitar
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = allActivities.slice(0, limit);

    const result = {
      activities: limitedActivities,
      total: limitedActivities.length,
    };

    // Cache the result
    await cache.set(cacheKey, result, CACHE_TTL.ACTIVITIES);

    res.json(result);
  } catch (error: any) {
    appLogger.error('Erro ao buscar atividades recentes:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar atividades recentes' });
  }
};

// Obter eventos por dia da semana (com cache)
export const getEventsPerWeekday = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:events-weekday:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const events = await prisma.scheduleEvent.findMany({
      where: {
        companyId,
        date: { gte: sevenDaysAgo }
      },
      select: { date: true, type: true }
    });

    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayData: any = {};

    weekdayNames.forEach((day, index) => {
      weekdayData[index] = { name: day, eventos: 0, audiencias: 0 };
    });

    events.forEach(event => {
      const dayOfWeek = new Date(event.date).getDay();
      weekdayData[dayOfWeek].eventos++;
      if (event.type === 'AUDIENCIA') {
        weekdayData[dayOfWeek].audiencias++;
      }
    });

    const chartData = Object.values(weekdayData);

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar eventos por dia da semana:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter distribuição de processos por status (com cache)
export const getCasesByStatus = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:cases-status:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const casesGrouped = await prisma.case.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true
    });

    const statusLabels: any = {
      'ACTIVE': 'Ativos',
      'SUSPENDED': 'Suspensos',
      'CLOSED': 'Encerrados',
      'ARCHIVED': 'Arquivados'
    };

    const chartData = casesGrouped.map(item => ({
      name: statusLabels[item.status] || item.status,
      value: item._count,
      status: item.status
    }));

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar processos por status:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter andamentos recebidos nos últimos 30 dias (com cache)
export const getMovementsTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:movements-timeline:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const movements = await prisma.caseMovement.findMany({
      where: {
        case: { companyId },
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const dailyCounts: any = {};

    movements.forEach(movement => {
      const date = new Date(movement.createdAt);
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });

    const chartData: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      chartData.push({ date: dateKey, andamentos: dailyCounts[dateKey] || 0 });
    }

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar timeline de andamentos:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter prazos próximos (com cache curto)
export const getUpcomingDeadlines = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:upcoming-deadlines:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fifteenDaysLater = new Date(today);
    fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);

    const deadlines = await prisma.scheduleEvent.findMany({
      where: {
        companyId,
        type: 'PRAZO',
        date: { gte: today, lte: fifteenDaysLater }
      },
      include: {
        client: { select: { name: true } },
        case: { select: { processNumber: true } }
      },
      orderBy: { date: 'asc' },
      take: 10
    });

    const formattedDeadlines = deadlines.map(deadline => ({
      id: deadline.id,
      title: deadline.title,
      date: deadline.date,
      clientName: deadline.client?.name || 'N/A',
      processNumber: deadline.case?.processNumber || 'N/A',
      daysUntil: Math.ceil((new Date(deadline.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }));

    await cache.set(cacheKey, formattedDeadlines, CACHE_TTL.STATS);

    res.json(formattedDeadlines);
  } catch (error: any) {
    appLogger.error('Erro ao buscar prazos próximos:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter clientes novos nos últimos 6 meses (com cache)
export const getNewClientsTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:new-clients:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const clients = await prisma.client.findMany({
      where: {
        companyId,
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const monthlyData: any = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(2)}`;
      monthlyData[monthKey] = 0;
    }

    clients.forEach(client => {
      const date = new Date(client.createdAt);
      const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(2)}`;
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey]++;
      }
    });

    const chartData = Object.keys(monthlyData).map(month => ({
      mes: month,
      clientes: monthlyData[month]
    }));

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar clientes novos:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter estatísticas de solicitações de documentos (com cache)
export const getDocumentRequestStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:doc-requests:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, overdue, received, total] = await Promise.all([
      // Pendentes (não vencidos)
      prisma.documentRequest.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'SENT', 'REMINDED'] },
          dueDate: { gte: today }
        }
      }),
      // Vencidos (prazo passou e não foi recebido)
      prisma.documentRequest.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'SENT', 'REMINDED'] },
          dueDate: { lt: today }
        }
      }),
      // Recebidos
      prisma.documentRequest.count({
        where: {
          companyId,
          status: 'RECEIVED'
        }
      }),
      // Total
      prisma.documentRequest.count({
        where: { companyId }
      })
    ]);

    const stats = {
      pending,
      overdue,
      received,
      total,
      pendingWithOverdue: pending + overdue
    };

    await cache.set(cacheKey, stats, CACHE_TTL.STATS);

    res.json(stats);
  } catch (error: any) {
    appLogger.error('Erro ao buscar estatísticas de solicitações:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// Obter audiências nos próximos 7 dias (com cache)
export const getUpcomingHearings = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cacheKey = `dashboard:upcoming-hearings:${companyId}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const hearings = await prisma.scheduleEvent.findMany({
      where: {
        companyId,
        type: 'AUDIENCIA',
        date: { gte: today, lte: sevenDaysLater }
      },
      select: { date: true },
      orderBy: { date: 'asc' }
    });

    const dailyData: any = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      dailyData[dateKey] = 0;
    }

    hearings.forEach(hearing => {
      const date = new Date(hearing.date);
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (dailyData[dateKey] !== undefined) {
        dailyData[dateKey]++;
      }
    });

    const chartData = Object.keys(dailyData).map(day => ({
      dia: day,
      audiencias: dailyData[day]
    }));

    await cache.set(cacheKey, chartData, CACHE_TTL.STATS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar audiências próximas:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};
