import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { getLastPayment } from '../services/stripe.service';

export class CompanyController {
  // Super Admin - Listar todas as empresas
  async list(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where = {
        ...(search && {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { email: { contains: String(search), mode: 'insensitive' as const } },
            { cnpj: { contains: String(search) } },
          ],
        }),
      };

      const companies = await prisma.company.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            active: true,
            createdAt: true,
            subscriptionStatus: true,
            subscriptionPlan: true,
            trialEndsAt: true,
            subscriptionEndsAt: true,
            casesLimit: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            _count: {
              select: {
                users: true,
                clients: true,
                cases: true,
              },
            },
          },
        });

      res.json({ data: companies });
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  }

  // Super Admin - Criar empresa e admin
  async create(req: AuthRequest, res: Response) {
    try {
      const { companyName, cnpj, companyEmail, adminName, adminEmail, adminPassword } = req.body;

      // Verifica se o email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email do admin já cadastrado' });
      }

      // Verifica se o CNPJ já existe
      if (cnpj) {
        const existingCompany = await prisma.company.findUnique({
          where: { cnpj },
        });

        if (existingCompany) {
          return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            ...(cnpj && { cnpj }), // Só inclui cnpj se tiver valor
            email: companyEmail,
          },
        });

        const admin = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
            companyId: company.id,
          },
        });

        return { company, admin };
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      res.status(500).json({ error: 'Erro ao criar empresa' });
    }
  }

  // Super Admin - Atualizar empresa
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, cnpj, email, phone, address, city, state, zipCode, logo, active } = req.body;

      const company = await prisma.company.update({
        where: { id },
        data: {
          name,
          ...(cnpj !== undefined && { cnpj: cnpj || null }), // Só atualiza cnpj se foi enviado
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          logo,
          active,
        },
      });

      res.json(company);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
  }

  // Admin - Ver sua própria empresa
  async getOwn(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              cases: true,
            },
          },
        },
      });

      res.json(company);
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
  }

  // Admin - Atualizar sua própria empresa (configurações)
  async updateOwn(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { name, email, phone, address, city, state, zipCode, logo, dpoName, dpoEmail } = req.body;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          name,
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          logo,
          dpoName,
          dpoEmail,
        },
      });

      res.json(company);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
  }

  // Super Admin - Deletar empresa
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verifica se a empresa existe
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              cases: true,
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Deleta a empresa (CASCADE vai deletar tudo relacionado automaticamente)
      await prisma.company.delete({
        where: { id },
      });

      res.json({
        message: 'Empresa deletada com sucesso',
        deletedItems: {
          users: company._count.users,
          clients: company._count.clients,
          cases: company._count.cases,
        }
      });
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
  }

  // Super Admin - Listar usuários de uma empresa com breakdown por role
  async getUsers(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verifica se a empresa existe
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Busca todos os usuários da empresa
      const users = await prisma.user.findMany({
        where: { companyId: id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: [
          { role: 'desc' }, // ADMIN primeiro
          { name: 'asc' },
        ],
      });

      // Calcula breakdown por role
      const adminCount = users.filter(u => u.role === 'ADMIN').length;
      const userCount = users.filter(u => u.role === 'USER').length;
      const superAdminCount = users.filter(u => u.role === 'SUPER_ADMIN').length;

      res.json({
        users,
        breakdown: {
          total: users.length,
          admin: adminCount,
          user: userCount,
          superAdmin: superAdminCount,
        },
      });
    } catch (error) {
      console.error('Erro ao listar usuários da empresa:', error);
      res.status(500).json({ error: 'Erro ao listar usuários da empresa' });
    }
  }

  // Super Admin - Toggle status ativo/inativo de um usuário
  async toggleUserActive(req: AuthRequest, res: Response) {
    try {
      const { companyId, userId } = req.params;

      // Verifica se o usuário existe e pertence à empresa
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: companyId,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Impede desativação de SUPER_ADMIN
      if (user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Não é possível desativar usuários SUPER_ADMIN' });
      }

      // Toggle do status active
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { active: !user.active },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT (Super Admin)
  // ============================================

  /**
   * Super Admin - Atualizar status de assinatura de uma empresa
   * PUT /api/companies/:id/subscription
   */
  async updateSubscription(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { subscriptionStatus, subscriptionPlan, casesLimit, trialEndsAt } = req.body;

      // Verifica se a empresa existe
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Prepara dados para atualização
      const updateData: any = {};

      if (subscriptionStatus !== undefined) {
        updateData.subscriptionStatus = subscriptionStatus;
      }

      if (subscriptionPlan !== undefined) {
        updateData.subscriptionPlan = subscriptionPlan;
      }

      if (casesLimit !== undefined) {
        updateData.casesLimit = casesLimit;
      }

      if (trialEndsAt !== undefined) {
        updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
      }

      // Se mudando para TRIAL, define data de expiração se não fornecida
      if (subscriptionStatus === 'TRIAL' && !trialEndsAt && !company.trialEndsAt) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7); // 7 dias de trial
        updateData.trialEndsAt = trialEnd;
      }

      // Se mudando para ACTIVE sem plano, define Bronze como padrão
      if (subscriptionStatus === 'ACTIVE' && !subscriptionPlan && !company.subscriptionPlan) {
        updateData.subscriptionPlan = 'BRONZE';
        updateData.casesLimit = 1000;
      }

      const updatedCompany = await prisma.company.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          casesLimit: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
        },
      });

      res.json(updatedCompany);
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
  }

  /**
   * Super Admin - Buscar último pagamento de uma empresa no Stripe
   * GET /api/companies/:id/last-payment
   */
  async getCompanyLastPayment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verifica se a empresa existe
      const company = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      if (!company.stripeCustomerId) {
        return res.json({
          companyId: id,
          companyName: company.name,
          hasPayments: false,
          lastPayment: null,
        });
      }

      const lastPayment = await getLastPayment(id);

      res.json({
        companyId: id,
        companyName: company.name,
        hasPayments: lastPayment !== null,
        lastPayment,
      });
    } catch (error) {
      console.error('Erro ao buscar último pagamento:', error);
      res.status(500).json({ error: 'Erro ao buscar último pagamento' });
    }
  }

  // ============================================
  // API KEY MANAGEMENT (Para integrações WhatsApp, N8N, etc)
  // ============================================

  /**
   * Admin - Ver API Key da empresa
   * GET /api/companies/own/api-key
   */
  async getApiKey(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          apiKey: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      res.json({
        companyName: company.name,
        apiKey: company.apiKey,
        hasApiKey: !!company.apiKey,
      });
    } catch (error) {
      console.error('Erro ao buscar API Key:', error);
      res.status(500).json({ error: 'Erro ao buscar API Key' });
    }
  }

  /**
   * Admin - Gerar/Regenerar API Key da empresa
   * POST /api/companies/own/api-key/regenerate
   */
  async regenerateApiKey(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Gera nova API Key usando UUID
      const newApiKey = crypto.randomUUID();

      const company = await prisma.company.update({
        where: { id: companyId },
        data: { apiKey: newApiKey },
        select: {
          id: true,
          name: true,
          apiKey: true,
        },
      });

      res.json({
        message: 'API Key gerada com sucesso',
        companyName: company.name,
        apiKey: company.apiKey,
      });
    } catch (error) {
      console.error('Erro ao regenerar API Key:', error);
      res.status(500).json({ error: 'Erro ao regenerar API Key' });
    }
  }

  // ============================================
  // SUBSCRIPTION ALERTS (Super Admin)
  // ============================================

  /**
   * Super Admin - Listar empresas com problemas de assinatura
   * GET /api/companies/subscription-alerts
   */
  async getSubscriptionAlerts(req: AuthRequest, res: Response) {
    try {
      const now = new Date();

      // Buscar empresas com trial expirado
      const expiredTrials = await prisma.company.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: {
            lt: now,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          createdAt: true,
          _count: {
            select: { users: true, cases: true },
          },
        },
        orderBy: { trialEndsAt: 'desc' },
      });

      // Buscar empresas com assinatura expirada
      const expiredSubscriptions = await prisma.company.findMany({
        where: {
          subscriptionStatus: 'EXPIRED',
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          subscriptionEndsAt: true,
          createdAt: true,
          _count: {
            select: { users: true, cases: true },
          },
        },
        orderBy: { subscriptionEndsAt: 'desc' },
      });

      // Buscar empresas com assinatura cancelada
      const cancelledSubscriptions = await prisma.company.findMany({
        where: {
          subscriptionStatus: 'CANCELLED',
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          subscriptionPlan: true,
          subscriptionEndsAt: true,
          createdAt: true,
          _count: {
            select: { users: true, cases: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Buscar empresas com trial expirando em breve (próximas 24h)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const expiringTrials = await prisma.company.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: {
            gte: now,
            lte: tomorrow,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          createdAt: true,
          _count: {
            select: { users: true, cases: true },
          },
        },
        orderBy: { trialEndsAt: 'asc' },
      });

      res.json({
        summary: {
          expiredTrials: expiredTrials.length,
          expiredSubscriptions: expiredSubscriptions.length,
          cancelledSubscriptions: cancelledSubscriptions.length,
          expiringTrials: expiringTrials.length,
          total: expiredTrials.length + expiredSubscriptions.length + cancelledSubscriptions.length,
        },
        expiredTrials,
        expiredSubscriptions,
        cancelledSubscriptions,
        expiringTrials,
      });
    } catch (error) {
      console.error('Erro ao buscar alertas de assinatura:', error);
      res.status(500).json({ error: 'Erro ao buscar alertas de assinatura' });
    }
  }
}

export default new CompanyController();
