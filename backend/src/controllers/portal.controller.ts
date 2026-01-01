import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

export class PortalController {
  /**
   * Retorna os dados do perfil do cliente logado
   * GET /api/portal/profile
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          personType: true,
          cpf: true,
          rg: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          profession: true,
          nationality: true,
          maritalStatus: true,
          birthDate: true,
          stateRegistration: true,
          representativeName: true,
          representativeCpf: true,
          createdAt: true,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(client);
    } catch (error) {
      appLogger.error('Erro ao buscar perfil do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do perfil' });
    }
  }

  /**
   * Retorna os dados públicos do escritório
   * GET /api/portal/company
   */
  async getCompany(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          logo: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Escritório não encontrado' });
      }

      res.json(company);
    } catch (error) {
      appLogger.error('Erro ao buscar dados do escritório:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do escritório' });
    }
  }

  /**
   * Lista os processos do cliente
   * GET /api/portal/cases
   */
  async getCases(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const cases = await prisma.case.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          status: true,
          deadline: true,
          ultimoAndamento: true,
          informarCliente: true,
          createdAt: true,
          updatedAt: true,
          lastSyncedAt: true,
          movements: {
            orderBy: { movementDate: 'desc' },
            take: 1,
            select: {
              id: true,
              movementName: true,
              movementDate: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Formatar resposta com último movimento
      const formattedCases = cases.map(caseItem => ({
        ...caseItem,
        lastMovement: caseItem.movements[0] || null,
        movements: undefined,
      }));

      res.json(formattedCases);
    } catch (error) {
      appLogger.error('Erro ao listar processos do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processos' });
    }
  }

  /**
   * Retorna detalhes de um processo específico
   * GET /api/portal/cases/:id
   */
  async getCaseDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const caseDetails = await prisma.case.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          value: true,
          status: true,
          deadline: true,
          deadlineCompleted: true,
          ultimoAndamento: true,
          informarCliente: true,
          linkProcesso: true,
          aiSummary: true,
          createdAt: true,
          updatedAt: true,
          lastSyncedAt: true,
          parts: {
            select: {
              id: true,
              type: true,
              name: true,
              cpfCnpj: true,
            },
          },
        },
      });

      if (!caseDetails) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      res.json(caseDetails);
    } catch (error) {
      appLogger.error('Erro ao buscar detalhes do processo:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do processo' });
    }
  }

  /**
   * Lista as movimentações de um processo
   * GET /api/portal/cases/:id/movements
   */
  async getCaseMovements(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      // Verificar se o processo pertence ao cliente
      const caseExists = await prisma.case.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: { id: true },
      });

      if (!caseExists) {
        return res.status(404).json({ error: 'Processo não encontrado' });
      }

      const movements = await prisma.caseMovement.findMany({
        where: {
          caseId: id,
          companyId,
        },
        select: {
          id: true,
          movementCode: true,
          movementName: true,
          movementDate: true,
          description: true,
          createdAt: true,
        },
        orderBy: { movementDate: 'desc' },
      });

      res.json(movements);
    } catch (error) {
      appLogger.error('Erro ao listar movimentações:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * Lista os anúncios ativos do escritório
   * GET /api/portal/announcements
   * Mostra avisos globais (clientId = null) e avisos específicos para o cliente logado
   */
  async getAnnouncements(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const clientId = req.user!.clientId;
      const now = new Date();

      const announcements = await prisma.announcement.findMany({
        where: {
          companyId,
          active: true,
          publishedAt: { lte: now },
          AND: [
            // Filtro de expiração
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
            // Filtro de cliente: global (null) ou específico para este cliente
            {
              OR: [
                { clientId: null },
                { clientId: clientId },
              ],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          publishedAt: true,
          clientId: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },  // URGENT > HIGH > NORMAL > LOW
          { publishedAt: 'desc' },
        ],
      });

      res.json(announcements);
    } catch (error) {
      appLogger.error('Erro ao listar anúncios:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar anúncios' });
    }
  }

  /**
   * Lista os PNJs do cliente
   * GET /api/portal/pnjs
   */
  async getPNJs(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const pnjs = await prisma.pNJ.findMany({
        where: {
          clientId,
          companyId,
        },
        select: {
          id: true,
          number: true,
          protocol: true,
          title: true,
          description: true,
          status: true,
          openDate: true,
          closeDate: true,
          createdAt: true,
          updatedAt: true,
          movements: {
            orderBy: { date: 'desc' },
            take: 1,
            select: {
              id: true,
              description: true,
              date: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Formatar resposta com último movimento
      const formattedPNJs = pnjs.map(pnj => ({
        ...pnj,
        lastMovement: pnj.movements[0] || null,
        movements: undefined,
      }));

      res.json(formattedPNJs);
    } catch (error) {
      appLogger.error('Erro ao listar PNJs do cliente:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar processos não judiciais' });
    }
  }

  /**
   * Retorna detalhes de um PNJ específico
   * GET /api/portal/pnjs/:id
   */
  async getPNJDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      const pnjDetails = await prisma.pNJ.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: {
          id: true,
          number: true,
          protocol: true,
          title: true,
          description: true,
          status: true,
          openDate: true,
          closeDate: true,
          createdAt: true,
          updatedAt: true,
          parts: {
            select: {
              id: true,
              type: true,
              name: true,
              document: true,
            },
          },
        },
      });

      if (!pnjDetails) {
        return res.status(404).json({ error: 'Processo não judicial não encontrado' });
      }

      res.json(pnjDetails);
    } catch (error) {
      appLogger.error('Erro ao buscar detalhes do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do processo não judicial' });
    }
  }

  /**
   * Lista as movimentações de um PNJ
   * GET /api/portal/pnjs/:id/movements
   */
  async getPNJMovements(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;

      // Verificar se o PNJ pertence ao cliente
      const pnjExists = await prisma.pNJ.findFirst({
        where: {
          id,
          clientId,
          companyId,
        },
        select: { id: true },
      });

      if (!pnjExists) {
        return res.status(404).json({ error: 'Processo não judicial não encontrado' });
      }

      const movements = await prisma.pNJMovement.findMany({
        where: {
          pnjId: id,
        },
        select: {
          id: true,
          description: true,
          date: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { date: 'desc' },
      });

      res.json(movements);
    } catch (error) {
      appLogger.error('Erro ao listar movimentações do PNJ:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar movimentações' });
    }
  }

  /**
   * Retorna estatísticas do dashboard do portal
   * GET /api/portal/dashboard
   */
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const clientId = req.user!.clientId;
      const companyId = req.user!.companyId;
      const now = new Date();

      // Contagem de processos por status
      const [
        totalCases,
        activeCases,
        pendingCases,
        finishedCases,
        recentMovements,
        activeAnnouncements,
      ] = await Promise.all([
        // Total de processos
        prisma.case.count({
          where: { clientId, companyId },
        }),
        // Processos ativos
        prisma.case.count({
          where: { clientId, companyId, status: 'ACTIVE' },
        }),
        // Processos pendentes
        prisma.case.count({
          where: { clientId, companyId, status: 'PENDENTE' },
        }),
        // Processos finalizados
        prisma.case.count({
          where: { clientId, companyId, status: 'FINISHED' },
        }),
        // Últimas 5 movimentações
        prisma.caseMovement.findMany({
          where: {
            companyId,
            case: { clientId },
          },
          select: {
            id: true,
            movementName: true,
            movementDate: true,
            case: {
              select: {
                processNumber: true,
              },
            },
          },
          orderBy: { movementDate: 'desc' },
          take: 5,
        }),
        // Anúncios ativos (globais + específicos para este cliente)
        prisma.announcement.count({
          where: {
            companyId,
            active: true,
            publishedAt: { lte: now },
            AND: [
              {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: now } },
                ],
              },
              {
                OR: [
                  { clientId: null },
                  { clientId: clientId },
                ],
              },
            ],
          },
        }),
      ]);

      res.json({
        stats: {
          totalCases,
          activeCases,
          pendingCases,
          finishedCases,
          activeAnnouncements,
        },
        recentMovements: recentMovements.map(m => ({
          id: m.id,
          movementName: m.movementName,
          movementDate: m.movementDate,
          processNumber: m.case.processNumber,
        })),
      });
    } catch (error) {
      appLogger.error('Erro ao buscar dashboard do portal:', error as Error);
      res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
  }
}

export default new PortalController();
