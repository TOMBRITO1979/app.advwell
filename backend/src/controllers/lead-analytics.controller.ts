import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { cache } from '../utils/redis';
import { appLogger } from '../utils/logger';
import PDFDocument from 'pdfkit';
import * as pdfStyles from '../utils/pdfStyles';

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  STATS: 60,           // 1 minute for main stats
  CHARTS: 300,         // 5 minutes for chart data
};

// Labels para status de lead
const STATUS_LABELS: Record<string, string> = {
  NOVO: 'Novo',
  CONTATADO: 'Contatado',
  QUALIFICADO: 'Qualificado',
  CONVERTIDO: 'Convertido',
  PERDIDO: 'Perdido',
};

// Labels para origem de lead
const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  TELEFONE: 'Telefone',
  SITE: 'Site',
  INDICACAO: 'Indicação',
  REDES_SOCIAIS: 'Redes Sociais',
  OUTROS: 'Outros',
};

// Helper para parsear datas do filtro
const parseDateFilters = (req: AuthRequest) => {
  const { startDate, endDate, period } = req.query;

  let start: Date | undefined;
  let end: Date | undefined;

  if (period) {
    end = new Date();
    end.setHours(23, 59, 59, 999);
    start = new Date();

    switch (period) {
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '6m':
        start.setMonth(start.getMonth() - 6);
        break;
      case '12m':
        start.setMonth(start.getMonth() - 12);
        break;
      default:
        start = undefined;
        end = undefined;
    }

    if (start) {
      start.setHours(0, 0, 0, 0);
    }
  } else if (startDate || endDate) {
    if (startDate) {
      start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
};

// GET /lead-analytics/stats - Estatísticas básicas
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);
    const cacheKey = `lead-analytics:stats:${companyId}:${start?.toISOString() || 'all'}:${end?.toISOString() || 'all'}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Buscar estatísticas em paralelo
    const [total, converted, leadsWithConversion] = await Promise.all([
      // Total de leads
      prisma.lead.count({
        where: { companyId, ...dateFilter },
      }),
      // Total convertidos
      prisma.lead.count({
        where: { companyId, status: 'CONVERTIDO', ...dateFilter },
      }),
      // Leads convertidos com datas para calcular média
      prisma.lead.findMany({
        where: {
          companyId,
          status: 'CONVERTIDO',
          convertedAt: { not: null },
          ...dateFilter,
        },
        select: {
          createdAt: true,
          convertedAt: true,
        },
      }),
    ]);

    // Calcular tempo médio de conversão
    let avgConversionDays: number | null = null;
    if (leadsWithConversion.length > 0) {
      const totalDays = leadsWithConversion.reduce((sum, lead) => {
        const diffTime = new Date(lead.convertedAt!).getTime() - new Date(lead.createdAt).getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      avgConversionDays = Math.round((totalDays / leadsWithConversion.length) * 10) / 10;
    }

    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

    const stats = {
      total,
      converted,
      conversionRate,
      avgConversionDays,
    };

    await cache.set(cacheKey, stats, CACHE_TTL.STATS);

    res.json(stats);
  } catch (error: any) {
    appLogger.error('Erro ao buscar estatísticas de leads:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// GET /lead-analytics/by-tags - Leads agrupados por tag
export const getLeadsByTags = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const converted = req.query.converted === 'true';
    const { start, end } = parseDateFilters(req);
    const cacheKey = `lead-analytics:by-tags:${companyId}:${converted}:${start?.toISOString() || 'all'}:${end?.toISOString() || 'all'}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Buscar tags com contagem de leads
    const tags = await prisma.tag.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        color: true,
        leads: {
          where: {
            lead: {
              companyId,
              status: converted ? 'CONVERTIDO' : { not: 'CONVERTIDO' },
              ...dateFilter,
            },
          },
          select: { id: true },
        },
      },
    });

    const chartData = tags
      .map(tag => ({
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        count: tag.leads.length,
      }))
      .filter(tag => tag.count > 0)
      .sort((a, b) => b.count - a.count);

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar leads por tags:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// GET /lead-analytics/by-source - Leads agrupados por origem
export const getLeadsBySource = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);
    const cacheKey = `lead-analytics:by-source:${companyId}:${start?.toISOString() || 'all'}:${end?.toISOString() || 'all'}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Agrupar por origem
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: { companyId, ...dateFilter },
      _count: true,
    });

    // Buscar convertidos por origem
    const convertedBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: { companyId, status: 'CONVERTIDO', ...dateFilter },
      _count: true,
    });

    const convertedMap = new Map(
      convertedBySource.map(item => [item.source, item._count])
    );

    const chartData = leadsBySource.map(item => {
      const convertedCount = convertedMap.get(item.source) || 0;
      return {
        source: item.source,
        label: SOURCE_LABELS[item.source] || item.source,
        count: item._count,
        convertedCount,
        conversionRate: item._count > 0
          ? ((convertedCount / item._count) * 100).toFixed(1)
          : '0.0',
      };
    }).sort((a, b) => b.count - a.count);

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar leads por origem:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// GET /lead-analytics/conversion-timeline - Timeline de conversões
export const getConversionTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);

    // Default: últimos 6 meses
    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 6);
    defaultStart.setDate(1);
    defaultStart.setHours(0, 0, 0, 0);

    const effectiveStart = start || defaultStart;
    const effectiveEnd = end || new Date();

    const cacheKey = `lead-analytics:timeline:${companyId}:${effectiveStart.toISOString()}:${effectiveEnd.toISOString()}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Buscar leads no período
    const leads = await prisma.lead.findMany({
      where: {
        companyId,
        createdAt: {
          gte: effectiveStart,
          lte: effectiveEnd,
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Agrupar por mês
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData: Record<string, { total: number; converted: number }> = {};

    // Inicializar todos os meses no range
    const currentDate = new Date(effectiveStart);
    while (currentDate <= effectiveEnd) {
      const monthKey = `${monthNames[currentDate.getMonth()]}/${currentDate.getFullYear().toString().slice(2)}`;
      monthlyData[monthKey] = { total: 0, converted: 0 };
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Contar leads
    leads.forEach(lead => {
      const date = new Date(lead.createdAt);
      const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(2)}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        if (lead.status === 'CONVERTIDO') {
          monthlyData[monthKey].converted++;
        }
      }
    });

    const chartData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      total: data.total,
      converted: data.converted,
      conversionRate: data.total > 0
        ? ((data.converted / data.total) * 100).toFixed(1)
        : '0.0',
    }));

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar timeline de conversões:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// GET /lead-analytics/tag-effectiveness - Taxa de conversão por tag
export const getTagEffectiveness = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);
    const cacheKey = `lead-analytics:tag-effectiveness:${companyId}:${start?.toISOString() || 'all'}:${end?.toISOString() || 'all'}`;

    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Buscar tags com leads totais e convertidos
    const tags = await prisma.tag.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        color: true,
        leads: {
          where: {
            lead: {
              companyId,
              ...dateFilter,
            },
          },
          select: {
            lead: {
              select: { status: true },
            },
          },
        },
      },
    });

    const chartData = tags
      .map(tag => {
        const total = tag.leads.length;
        const converted = tag.leads.filter(lt => lt.lead.status === 'CONVERTIDO').length;
        return {
          tagId: tag.id,
          tagName: tag.name,
          tagColor: tag.color,
          total,
          converted,
          conversionRate: total > 0
            ? ((converted / total) * 100).toFixed(1)
            : '0.0',
        };
      })
      .filter(tag => tag.total > 0)
      .sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate));

    await cache.set(cacheKey, chartData, CACHE_TTL.CHARTS);

    res.json(chartData);
  } catch (error: any) {
    appLogger.error('Erro ao buscar efetividade de tags:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

// GET /lead-analytics/export/csv - Exportar para CSV
export const exportCSV = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Buscar todos os dados
    const [stats, leadsBySource, tags] = await Promise.all([
      // Stats
      (async () => {
        const [total, converted, leadsWithConversion] = await Promise.all([
          prisma.lead.count({ where: { companyId, ...dateFilter } }),
          prisma.lead.count({ where: { companyId, status: 'CONVERTIDO', ...dateFilter } }),
          prisma.lead.findMany({
            where: { companyId, status: 'CONVERTIDO', convertedAt: { not: null }, ...dateFilter },
            select: { createdAt: true, convertedAt: true },
          }),
        ]);
        let avgDays: number | null = null;
        if (leadsWithConversion.length > 0) {
          const totalDays = leadsWithConversion.reduce((sum, lead) => {
            const diffTime = new Date(lead.convertedAt!).getTime() - new Date(lead.createdAt).getTime();
            return sum + diffTime / (1000 * 60 * 60 * 24);
          }, 0);
          avgDays = Math.round((totalDays / leadsWithConversion.length) * 10) / 10;
        }
        return { total, converted, avgDays, conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0' };
      })(),
      // Por origem
      prisma.lead.groupBy({
        by: ['source'],
        where: { companyId, ...dateFilter },
        _count: true,
      }),
      // Tags com leads
      prisma.tag.findMany({
        where: { companyId },
        select: {
          name: true,
          leads: {
            where: { lead: { companyId, ...dateFilter } },
            select: { lead: { select: { status: true } } },
          },
        },
      }),
    ]);

    // Montar CSV
    const lines: string[] = [];

    // Resumo
    lines.push('RESUMO GERAL');
    lines.push('Métrica;Valor');
    lines.push(`Total de Leads;${stats.total}`);
    lines.push(`Leads Convertidos;${stats.converted}`);
    lines.push(`Taxa de Conversão;${stats.conversionRate}%`);
    lines.push(`Tempo Médio de Conversão;${stats.avgDays !== null ? `${stats.avgDays} dias` : 'N/A'}`);
    lines.push('');

    // Por origem
    lines.push('LEADS POR ORIGEM');
    lines.push('Origem;Total');
    leadsBySource.forEach(item => {
      lines.push(`${SOURCE_LABELS[item.source] || item.source};${item._count}`);
    });
    lines.push('');

    // Por tag
    lines.push('LEADS POR TAG');
    lines.push('Tag;Total;Convertidos;Taxa de Conversão');
    tags.forEach(tag => {
      const total = tag.leads.length;
      const converted = tag.leads.filter(lt => lt.lead.status === 'CONVERTIDO').length;
      const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
      if (total > 0) {
        lines.push(`${tag.name};${total};${converted};${rate}%`);
      }
    });

    const csv = '\uFEFF' + lines.join('\n'); // UTF-8 BOM

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=lead-analytics_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    appLogger.error('Erro ao exportar CSV de analytics:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
};

// GET /lead-analytics/export/pdf - Exportar para PDF
export const exportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { start, end } = parseDateFilters(req);

    const dateFilter = start || end ? {
      createdAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    } : {};

    // Buscar dados da empresa e estatísticas
    const [company, stats, leadsBySource, tags] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      // Stats
      (async () => {
        const [total, converted, leadsWithConversion] = await Promise.all([
          prisma.lead.count({ where: { companyId, ...dateFilter } }),
          prisma.lead.count({ where: { companyId, status: 'CONVERTIDO', ...dateFilter } }),
          prisma.lead.findMany({
            where: { companyId, status: 'CONVERTIDO', convertedAt: { not: null }, ...dateFilter },
            select: { createdAt: true, convertedAt: true },
          }),
        ]);
        let avgDays: number | null = null;
        if (leadsWithConversion.length > 0) {
          const totalDays = leadsWithConversion.reduce((sum, lead) => {
            const diffTime = new Date(lead.convertedAt!).getTime() - new Date(lead.createdAt).getTime();
            return sum + diffTime / (1000 * 60 * 60 * 24);
          }, 0);
          avgDays = Math.round((totalDays / leadsWithConversion.length) * 10) / 10;
        }
        return { total, converted, avgDays, conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0' };
      })(),
      // Por origem
      prisma.lead.groupBy({
        by: ['source'],
        where: { companyId, ...dateFilter },
        _count: true,
      }),
      // Tags com leads
      prisma.tag.findMany({
        where: { companyId },
        select: {
          name: true,
          color: true,
          leads: {
            where: { lead: { companyId, ...dateFilter } },
            select: { lead: { select: { status: true } } },
          },
        },
      }),
    ]);

    // Criar PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=lead-analytics_${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfBuffer);
    });

    // Período do relatório
    let periodText = 'Todos os períodos';
    if (start && end) {
      periodText = `${pdfStyles.formatDate(start)} a ${pdfStyles.formatDate(end)}`;
    } else if (start) {
      periodText = `A partir de ${pdfStyles.formatDate(start)}`;
    } else if (end) {
      periodText = `Até ${pdfStyles.formatDate(end)}`;
    }

    // Header
    pdfStyles.addHeader(doc, 'Relatório de Analytics de Leads', periodText, company?.name);

    // Cards de resumo
    const cardWidth = 120;
    const cardHeight = 50;
    const cardSpacing = 15;
    const startX = doc.page.margins.left;
    const cardsY = doc.y;

    pdfStyles.addSummaryCard(doc, startX, cardsY, cardWidth, cardHeight,
      'Total de Leads', stats.total.toString(), pdfStyles.colors.cardBlue);
    pdfStyles.addSummaryCard(doc, startX + cardWidth + cardSpacing, cardsY, cardWidth, cardHeight,
      'Convertidos', stats.converted.toString(), pdfStyles.colors.cardGreen);
    pdfStyles.addSummaryCard(doc, startX + (cardWidth + cardSpacing) * 2, cardsY, cardWidth, cardHeight,
      'Taxa Conversão', `${stats.conversionRate}%`, pdfStyles.colors.cardOrange);
    pdfStyles.addSummaryCard(doc, startX + (cardWidth + cardSpacing) * 3, cardsY, cardWidth, cardHeight,
      'Tempo Médio', stats.avgDays !== null ? `${stats.avgDays} dias` : 'N/A', pdfStyles.colors.cardGray);

    doc.y = cardsY + cardHeight + 30;

    // Seção: Leads por Origem
    pdfStyles.addSection(doc, 'Leads por Origem');
    const sourceRows = leadsBySource
      .sort((a, b) => b._count - a._count)
      .map(item => [
        SOURCE_LABELS[item.source] || item.source,
        item._count.toString(),
      ]);
    pdfStyles.addTable(doc, ['Origem', 'Quantidade'], sourceRows, [300, 100]);

    doc.moveDown();

    // Seção: Efetividade por Tag
    pdfStyles.addSection(doc, 'Efetividade por Tag');
    const tagRows = tags
      .map(tag => {
        const total = tag.leads.length;
        const converted = tag.leads.filter(lt => lt.lead.status === 'CONVERTIDO').length;
        const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
        return { name: tag.name, total, converted, rate };
      })
      .filter(t => t.total > 0)
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))
      .map(t => [t.name, t.total.toString(), t.converted.toString(), `${t.rate}%`]);

    if (tagRows.length > 0) {
      pdfStyles.addTable(doc, ['Tag', 'Total', 'Convertidos', 'Taxa'], tagRows, [200, 80, 80, 80]);
    } else {
      doc.fontSize(10).text('Nenhuma tag com leads no período.', { align: 'center' });
    }

    // Footer
    pdfStyles.addFooter(doc, 1, 1);

    doc.end();
  } catch (error: any) {
    appLogger.error('Erro ao exportar PDF de analytics:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
};
