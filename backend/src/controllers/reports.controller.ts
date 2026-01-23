import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

/**
 * Relatório de Processos Avançado
 * GET /reports/cases/advanced
 *
 * Retorna:
 * - byPhase: Processos por fase
 * - byRite: Processos por rito
 * - withDeadline: Processos com prazo definido
 * - byLawyer: Processos por advogado responsável
 * - withoutMovement180Days: Processos sem movimento nos últimos 180 dias
 */
export const getCaseAdvancedReport = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const now = new Date();
    const days180Ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Buscar todos os processos ativos da empresa
    const allCases = await prisma.case.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'PENDENTE'] },
      },
      select: {
        id: true,
        processNumber: true,
        phase: true,
        rite: true,
        nature: true,
        comarca: true,
        deadline: true,
        deadlineCompleted: true,
        lawyerId: true,
        lastSyncedAt: true,
        court: true,
        subject: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        lawyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 1. Processos por Fase
    const phaseCounts: Record<string, number> = {};
    allCases.forEach((c) => {
      const phase = c.phase || 'Não definida';
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    });
    const byPhase = Object.entries(phaseCounts)
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Processos por Rito
    const riteCounts: Record<string, number> = {};
    allCases.forEach((c) => {
      const rite = c.rite || 'Não definido';
      riteCounts[rite] = (riteCounts[rite] || 0) + 1;
    });
    const byRite = Object.entries(riteCounts)
      .map(([rite, count]) => ({ rite, count }))
      .sort((a, b) => b.count - a.count);

    // 2.1. Processos por Tribunal
    const tribunalCounts: Record<string, number> = {};
    allCases.forEach((c) => {
      const tribunal = c.court || 'Não definido';
      tribunalCounts[tribunal] = (tribunalCounts[tribunal] || 0) + 1;
    });
    const byTribunal = Object.entries(tribunalCounts)
      .map(([tribunal, count]) => ({ tribunal, count }))
      .sort((a, b) => b.count - a.count);

    // 2.2. Processos por Natureza
    const natureCounts: Record<string, number> = {};
    allCases.forEach((c) => {
      const nature = c.nature || 'Não definida';
      natureCounts[nature] = (natureCounts[nature] || 0) + 1;
    });
    const byNature = Object.entries(natureCounts)
      .map(([nature, count]) => ({ nature, count }))
      .sort((a, b) => b.count - a.count);

    // 2.3. Processos por Comarca
    const comarcaCounts: Record<string, number> = {};
    allCases.forEach((c) => {
      const comarca = c.comarca || 'Não definida';
      comarcaCounts[comarca] = (comarcaCounts[comarca] || 0) + 1;
    });
    const byComarca = Object.entries(comarcaCounts)
      .map(([comarca, count]) => ({ comarca, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Processos com Prazo definido
    const casesWithDeadline = allCases.filter((c) => c.deadline !== null);
    const withDeadline = {
      total: casesWithDeadline.length,
      completed: casesWithDeadline.filter((c) => c.deadlineCompleted).length,
      pending: casesWithDeadline.filter((c) => !c.deadlineCompleted).length,
      overdue: casesWithDeadline.filter((c) => !c.deadlineCompleted && c.deadline && new Date(c.deadline) < now).length,
      cases: casesWithDeadline
        .filter((c) => !c.deadlineCompleted)
        .sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        })
        .slice(0, 20)
        .map((c) => ({
          id: c.id,
          processNumber: c.processNumber,
          deadline: c.deadline,
          client: c.client?.name || 'Sem cliente',
          court: c.court,
        })),
    };

    // 4. Processos por Advogado Responsável
    const lawyerCounts: Record<string, { name: string; count: number }> = {};
    allCases.forEach((c) => {
      const lawyerId = c.lawyerId || 'sem-advogado';
      const lawyerName = c.lawyer?.name || 'Sem advogado responsável';
      if (!lawyerCounts[lawyerId]) {
        lawyerCounts[lawyerId] = { name: lawyerName, count: 0 };
      }
      lawyerCounts[lawyerId].count++;
    });
    const byLawyer = Object.entries(lawyerCounts)
      .map(([id, data]) => ({ id, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count);

    // 5. Processos sem movimento nos últimos 180 dias
    // Considera lastSyncedAt como indicador de última atualização DataJud
    const casesWithoutMovement = allCases.filter((c) => {
      // Se nunca foi sincronizado, considerar como sem movimento
      if (!c.lastSyncedAt) return true;
      // Se última sync foi há mais de 180 dias, considerar sem movimento
      return new Date(c.lastSyncedAt) < days180Ago;
    });

    const withoutMovement180Days = {
      total: casesWithoutMovement.length,
      cases: casesWithoutMovement
        .sort((a, b) => {
          if (!a.lastSyncedAt) return -1;
          if (!b.lastSyncedAt) return 1;
          return new Date(a.lastSyncedAt).getTime() - new Date(b.lastSyncedAt).getTime();
        })
        .slice(0, 50)
        .map((c) => ({
          id: c.id,
          processNumber: c.processNumber,
          lastSyncedAt: c.lastSyncedAt,
          court: c.court,
          subject: c.subject,
          client: c.client?.name || 'Sem cliente',
          lawyer: c.lawyer?.name || 'Sem advogado',
        })),
    };

    res.json({
      success: true,
      data: {
        totalCases: allCases.length,
        byPhase,
        byRite,
        byTribunal,
        byNature,
        byComarca,
        withDeadline,
        byLawyer,
        withoutMovement180Days,
      },
    });
  } catch (error) {
    console.error('Error in getCaseAdvancedReport:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório avançado de processos' });
  }
};

/**
 * Relatório de PNJ - Top Adversos
 * GET /reports/pnj/adverses
 *
 * Retorna:
 * - topAdverses: Top 15 adversos com mais processos
 * - withoutMovement180Days: PNJs sem movimento nos últimos 180 dias
 */
export const getPnjAdversesReport = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const now = new Date();
    const days180Ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Buscar todos os PNJs ativos com suas partes
    const allPnjs = await prisma.pNJ.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE'] },
      },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        parts: {
          select: {
            id: true,
            name: true,
            document: true,
            type: true,
          },
        },
        movements: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            date: true,
            description: true,
          },
        },
      },
    });

    // Contar processos por adverso (partes do tipo DEFENDANT)
    const adverseCounts: Record<string, { name: string; document: string | null; count: number; pnjs: string[] }> = {};

    allPnjs.forEach((pnj) => {
      pnj.parts
        .filter((part) => part.type === 'DEFENDANT')
        .forEach((part) => {
          const key = part.document || part.name.toLowerCase().trim();
          if (!adverseCounts[key]) {
            adverseCounts[key] = {
              name: part.name,
              document: part.document,
              count: 0,
              pnjs: [],
            };
          }
          adverseCounts[key].count++;
          adverseCounts[key].pnjs.push(pnj.number);
        });
    });

    // Top 15 adversos
    const topAdverses = Object.values(adverseCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map((adv) => ({
        name: adv.name,
        document: adv.document,
        processCount: adv.count,
        processes: adv.pnjs.slice(0, 10), // Máximo 10 números de processo
      }));

    // PNJs sem movimento nos últimos 180 dias
    const pnjsWithoutMovement = allPnjs.filter((pnj) => {
      // Se não tem movimentos, considerar sem movimento
      if (!pnj.movements || pnj.movements.length === 0) return true;

      const lastMovementDate = pnj.movements[0]?.date;
      if (!lastMovementDate) return true;

      return new Date(lastMovementDate) < days180Ago;
    });

    const withoutMovement180Days = {
      total: pnjsWithoutMovement.length,
      pnjs: pnjsWithoutMovement
        .sort((a, b) => {
          const dateA = a.movements[0]?.date || a.updatedAt;
          const dateB = b.movements[0]?.date || b.updatedAt;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        })
        .slice(0, 50)
        .map((pnj) => ({
          id: pnj.id,
          number: pnj.number,
          title: pnj.title,
          lastMovement: pnj.movements[0]?.date || null,
          lastMovementDescription: pnj.movements[0]?.description || 'Nenhum andamento',
          client: pnj.client?.name || 'Sem cliente',
          defendants: pnj.parts
            .filter((p) => p.type === 'DEFENDANT')
            .map((p) => p.name)
            .slice(0, 3),
        })),
    };

    res.json({
      success: true,
      data: {
        totalPnjs: allPnjs.length,
        topAdverses,
        withoutMovement180Days,
      },
    });
  } catch (error) {
    console.error('Error in getPnjAdversesReport:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de PNJ/Adversos' });
  }
};

export default {
  getCaseAdvancedReport,
  getPnjAdversesReport,
};
