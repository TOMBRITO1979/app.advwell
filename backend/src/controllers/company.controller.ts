import { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { getLastPayment, SUBSCRIPTION_PLANS } from '../services/stripe.service';
import { appLogger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';
import {
  getCompanyStorageMetrics,
  getAllCompaniesStorageMetrics,
  formatBytes,
} from '../services/storage.service';

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
            subdomain: true,
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
            storageLimit: true,
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

      // Convert BigInt to string for JSON serialization
      const companiesWithStorage = companies.map(c => ({
        ...c,
        storageLimit: c.storageLimit.toString(),
        storageLimitFormatted: formatBytes(c.storageLimit),
      }));

      res.json({ data: companiesWithStorage });
    } catch (error) {
      appLogger.error('Erro ao listar empresas', error as Error);
      res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  }

  // Super Admin - Criar empresa e admin
  async create(req: AuthRequest, res: Response) {
    try {
      const { companyName, cnpj, companyEmail, adminName, adminEmail, adminPassword } = req.body;

      // Verifica se o email já existe (globalmente para criação de novas empresas)
      const existingUser = await prisma.user.findFirst({
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
      appLogger.error('Erro ao criar empresa', error as Error);
      res.status(500).json({ error: 'Erro ao criar empresa' });
    }
  }

  // Super Admin - Atualizar empresa
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, cnpj, email, phone, address, city, state, zipCode, logo, active, subdomain } = req.body;

      // Validar subdomain se foi enviado
      if (subdomain !== undefined && subdomain !== null && subdomain !== '') {
        const RESERVED_SUBDOMAINS = [
          'app', 'api', 'www', 'cliente', 'clientes', 'admin', 'grafana',
          'mail', 'smtp', 'ftp', 'blog', 'help', 'support', 'suporte',
          'status', 'docs', 'dev', 'test', 'staging', 'prod', 'production'
        ];

        if (RESERVED_SUBDOMAINS.includes(subdomain)) {
          return res.status(400).json({ error: 'Subdomínio reservado. Escolha outro nome.' });
        }

        if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 30) {
          return res.status(400).json({ error: 'Subdomínio inválido. Use apenas letras minúsculas, números e hífens (3-30 caracteres).' });
        }

        // Verificar se já está em uso por outra empresa
        const existing = await prisma.company.findUnique({ where: { subdomain } });
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: 'Este subdomínio já está em uso por outra empresa.' });
        }
      }

      const company = await prisma.company.update({
        where: { id },
        data: {
          name,
          ...(cnpj !== undefined && { cnpj: cnpj || null }),
          ...(subdomain !== undefined && { subdomain: subdomain || null }),
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

      // Convert BigInt to string for JSON serialization
      res.json({
        ...company,
        storageLimit: company.storageLimit.toString(),
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar empresa', error as Error);
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

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Convert BigInt to string for JSON serialization
      res.json({
        ...company,
        storageLimit: company.storageLimit.toString(),
        storageLimitFormatted: formatBytes(company.storageLimit),
      });
    } catch (error) {
      appLogger.error('Erro ao buscar empresa', error as Error);
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

      // Convert BigInt to string for JSON serialization
      res.json({
        ...company,
        storageLimit: company.storageLimit.toString(),
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar empresa', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
  }

  // Admin - Deletar sua própria empresa
  async deleteOwn(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { confirmName } = req.body;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Busca a empresa com contagem de dados
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

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Verifica se o nome foi confirmado corretamente
      if (!confirmName || confirmName.trim().toLowerCase() !== company.name.trim().toLowerCase()) {
        return res.status(400).json({
          error: 'Nome da empresa não confere. Digite o nome exatamente como cadastrado para confirmar a exclusão.'
        });
      }

      // Deleta a empresa (CASCADE vai deletar tudo relacionado automaticamente)
      await prisma.company.delete({
        where: { id: companyId },
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
      appLogger.error('Erro ao deletar empresa', error as Error);
      res.status(500).json({ error: 'Erro ao deletar empresa' });
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
      appLogger.error('Erro ao deletar empresa', error as Error);
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
      appLogger.error('Erro ao listar usuários da empresa', error as Error);
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
      appLogger.error('Erro ao alterar status do usuário', error as Error);
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
      const { subscriptionStatus, subscriptionPlan, casesLimit, monitoringLimit, storageLimit, trialEndsAt } = req.body;

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
        // Auto-update limits based on plan
        const planConfig = SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
        if (planConfig) {
          updateData.casesLimit = planConfig.casesLimit;
          updateData.storageLimit = BigInt(planConfig.storageLimit);
        }
      }

      // Manual override of limits (takes precedence over plan defaults)
      if (casesLimit !== undefined) {
        updateData.casesLimit = casesLimit;
      }

      if (monitoringLimit !== undefined) {
        updateData.monitoringLimit = monitoringLimit;
      }

      if (storageLimit !== undefined) {
        // Accept bytes as string or number
        updateData.storageLimit = BigInt(storageLimit);
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
        updateData.casesLimit = SUBSCRIPTION_PLANS.BRONZE.casesLimit;
        updateData.storageLimit = BigInt(SUBSCRIPTION_PLANS.BRONZE.storageLimit);
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
          storageLimit: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
        },
      });

      res.json({
        ...updatedCompany,
        storageLimit: updatedCompany.storageLimit.toString(),
        storageLimitFormatted: formatBytes(updatedCompany.storageLimit),
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar assinatura', error as Error);
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
      appLogger.error('Erro ao buscar último pagamento', error as Error);
      res.status(500).json({ error: 'Erro ao buscar último pagamento' });
    }
  }

  // ============================================
  // PORTAL DO CLIENTE - SUBDOMAIN MANAGEMENT
  // ============================================

  /**
   * Admin - Atualizar subdomain do portal de clientes
   * PUT /api/companies/own/subdomain
   */
  async updateSubdomain(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { subdomain } = req.body;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Validar formato do subdomain
      if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ error: 'Subdomínio é obrigatório' });
      }

      const cleanSubdomain = subdomain.toLowerCase().trim();

      // Validar caracteres (apenas letras minúsculas, números e hífens)
      if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
        return res.status(400).json({
          error: 'Subdomínio deve conter apenas letras minúsculas, números e hífens'
        });
      }

      // Validar tamanho (3-30 caracteres)
      if (cleanSubdomain.length < 3 || cleanSubdomain.length > 30) {
        return res.status(400).json({
          error: 'Subdomínio deve ter entre 3 e 30 caracteres'
        });
      }

      // Não pode começar ou terminar com hífen
      if (cleanSubdomain.startsWith('-') || cleanSubdomain.endsWith('-')) {
        return res.status(400).json({
          error: 'Subdomínio não pode começar ou terminar com hífen'
        });
      }

      // Lista de subdomínios reservados
      const reserved = [
        'app', 'api', 'www', 'cliente', 'clientes', 'admin', 'grafana',
        'mail', 'smtp', 'ftp', 'blog', 'help', 'support', 'suporte',
        'status', 'docs', 'dev', 'test', 'staging', 'prod', 'production'
      ];

      if (reserved.includes(cleanSubdomain)) {
        return res.status(400).json({
          error: 'Este subdomínio é reservado e não pode ser usado'
        });
      }

      // Verificar se já está em uso por outra empresa
      const existing = await prisma.company.findUnique({
        where: { subdomain: cleanSubdomain },
      });

      if (existing && existing.id !== companyId) {
        return res.status(400).json({
          error: 'Este subdomínio já está em uso por outro escritório'
        });
      }

      // Atualizar subdomain
      const company = await prisma.company.update({
        where: { id: companyId },
        data: { subdomain: cleanSubdomain },
        select: {
          id: true,
          name: true,
          subdomain: true,
        },
      });

      res.json({
        message: 'Subdomínio configurado com sucesso',
        subdomain: company.subdomain,
        portalUrl: `https://${company.subdomain}.advwell.pro`,
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar subdomain', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar subdomínio' });
    }
  }

  /**
   * Admin - Ver subdomain atual do portal
   * GET /api/companies/own/subdomain
   */
  async getSubdomain(req: AuthRequest, res: Response) {
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
          subdomain: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      res.json({
        subdomain: company.subdomain,
        portalUrl: company.subdomain ? `https://${company.subdomain}.advwell.pro` : null,
        hasSubdomain: !!company.subdomain,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar subdomain', error as Error);
      res.status(500).json({ error: 'Erro ao buscar subdomínio' });
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
      appLogger.error('Erro ao buscar API Key', error as Error);
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

      // TAREFA 5.3: Gera nova API Key com 256 bits de entropia (32 bytes)
      // Formato: prefixo + 64 caracteres hex = 70 caracteres total
      const newApiKey = `adw_${crypto.randomBytes(32).toString('hex')}`;

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
      appLogger.error('Erro ao regenerar API Key', error as Error);
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
      appLogger.error('Erro ao buscar alertas de assinatura', error as Error);
      res.status(500).json({ error: 'Erro ao buscar alertas de assinatura' });
    }
  }

  // ============================================
  // CHATWELL INTEGRATION (Embed Chatwell no AdvWell)
  // ============================================

  /**
   * Admin/User - Obter configuração do Chatwell da própria empresa
   * GET /api/companies/own/chatwell
   * Retorna URL e status de habilitação (nunca retorna credenciais)
   */
  async getChatwellConfig(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userRole = req.user!.role;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          chatwellEnabled: true,
          chatwellUrl: true,
          chatwellEmail: true,
          chatwellToken: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Verificar permissão de acesso ao Chatwell
      // SUPER_ADMIN e ADMIN sempre têm acesso se habilitado
      // USER precisa de permissão específica
      if (userRole === 'USER') {
        const permission = await prisma.permission.findFirst({
          where: {
            userId: req.user!.userId,
            companyId: companyId,
            resource: 'chatwell',
            canView: true,
          },
        });

        if (!permission) {
          return res.status(403).json({ error: 'Sem permissão para acessar o Chatwell' });
        }
      }

      // Montar URL com autenticação se configurado
      let embedUrl = null;
      if (company.chatwellEnabled && company.chatwellUrl && company.chatwellToken) {
        try {
          const decryptedToken = decrypt(company.chatwellToken);
          // Montar URL com token para auto-login
          const baseUrl = company.chatwellUrl.replace(/\/$/, ''); // Remove trailing slash
          embedUrl = `${baseUrl}/app?token=${encodeURIComponent(decryptedToken)}`;
        } catch (err) {
          appLogger.error('Erro ao descriptografar token Chatwell', err as Error);
          embedUrl = company.chatwellUrl; // Fallback para URL sem token
        }
      }

      res.json({
        enabled: company.chatwellEnabled,
        url: company.chatwellUrl,
        embedUrl: embedUrl,
        hasCredentials: !!(company.chatwellEmail && company.chatwellToken),
      });
    } catch (error) {
      appLogger.error('Erro ao buscar config Chatwell', error as Error);
      res.status(500).json({ error: 'Erro ao buscar configuração do Chatwell' });
    }
  }

  /**
   * Super Admin - Obter configuração do Chatwell de uma empresa específica
   * GET /api/companies/:id/chatwell
   */
  async getChatwellConfigForCompany(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          chatwellEnabled: true,
          chatwellUrl: true,
          chatwellEmail: true,
          chatwellToken: true,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Para SUPER_ADMIN, mostrar email (mas não o token descriptografado)
      res.json({
        companyId: company.id,
        companyName: company.name,
        enabled: company.chatwellEnabled,
        url: company.chatwellUrl,
        email: company.chatwellEmail,
        hasToken: !!company.chatwellToken,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar config Chatwell', error as Error);
      res.status(500).json({ error: 'Erro ao buscar configuração do Chatwell' });
    }
  }

  /**
   * Super Admin - Configurar Chatwell de uma empresa
   * PUT /api/companies/:id/chatwell
   */
  async updateChatwellConfig(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { enabled, url, email, token } = req.body;

      // Verificar se a empresa existe
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Preparar dados para atualização
      const updateData: any = {};

      if (enabled !== undefined) {
        updateData.chatwellEnabled = enabled;
      }

      if (url !== undefined) {
        // Validar URL se fornecida
        if (url && url.trim()) {
          try {
            new URL(url);
            updateData.chatwellUrl = url.trim();
          } catch {
            return res.status(400).json({ error: 'URL do Chatwell inválida' });
          }
        } else {
          updateData.chatwellUrl = null;
        }
      }

      if (email !== undefined) {
        updateData.chatwellEmail = email?.trim() || null;
      }

      if (token !== undefined) {
        // Criptografar o token antes de salvar
        if (token && token.trim()) {
          updateData.chatwellToken = encrypt(token.trim());
        } else {
          updateData.chatwellToken = null;
        }
      }

      const updatedCompany = await prisma.company.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          chatwellEnabled: true,
          chatwellUrl: true,
          chatwellEmail: true,
          chatwellToken: true,
        },
      });

      res.json({
        message: 'Configuração do Chatwell atualizada com sucesso',
        companyId: updatedCompany.id,
        companyName: updatedCompany.name,
        enabled: updatedCompany.chatwellEnabled,
        url: updatedCompany.chatwellUrl,
        email: updatedCompany.chatwellEmail,
        hasToken: !!updatedCompany.chatwellToken,
      });
    } catch (error) {
      appLogger.error('Erro ao atualizar config Chatwell', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar configuração do Chatwell' });
    }
  }

  // ============================================
  // STORAGE METRICS (Super Admin)
  // ============================================

  /**
   * Super Admin - Obter métricas de armazenamento de uma empresa
   * GET /api/companies/:id/storage-metrics
   */
  async getStorageMetrics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const metrics = await getCompanyStorageMetrics(id);

      if (!metrics) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Convert BigInt to string for JSON serialization
      res.json({
        companyId: metrics.companyId,
        companyName: metrics.companyName,
        storageUsedBytes: metrics.storageUsedBytes.toString(),
        storageUsedFormatted: metrics.storageUsedFormatted,
        storageLimitBytes: metrics.storageLimitBytes.toString(),
        storageLimitFormatted: metrics.storageLimitFormatted,
        storageUsedPercent: metrics.storageUsedPercent,
        isOverLimit: metrics.isOverLimit,
        fileCount: metrics.fileCount,
        storageByType: {
          documents: metrics.storageByType.documents.toString(),
          caseDocuments: metrics.storageByType.caseDocuments.toString(),
          sharedDocuments: metrics.storageByType.sharedDocuments.toString(),
          pnjDocuments: metrics.storageByType.pnjDocuments.toString(),
        },
        storageByTypeFormatted: {
          documents: formatBytes(metrics.storageByType.documents),
          caseDocuments: formatBytes(metrics.storageByType.caseDocuments),
          sharedDocuments: formatBytes(metrics.storageByType.sharedDocuments),
          pnjDocuments: formatBytes(metrics.storageByType.pnjDocuments),
        },
      });
    } catch (error) {
      appLogger.error('Erro ao buscar métricas de storage', error as Error);
      res.status(500).json({ error: 'Erro ao buscar métricas de armazenamento' });
    }
  }

  /**
   * Super Admin - Obter métricas de armazenamento de todas as empresas
   * GET /api/companies/storage-metrics/all
   */
  async getAllStorageMetrics(req: AuthRequest, res: Response) {
    try {
      const metrics = await getAllCompaniesStorageMetrics();

      res.json(metrics);
    } catch (error) {
      appLogger.error('Erro ao buscar métricas de storage de todas empresas', error as Error);
      res.status(500).json({ error: 'Erro ao buscar métricas de armazenamento' });
    }
  }

  /**
   * Admin/User - Obter métricas de armazenamento da própria empresa
   * GET /api/companies/own/storage-metrics
   */
  async getOwnStorageMetrics(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const metrics = await getCompanyStorageMetrics(companyId);

      if (!metrics) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Convert BigInt to string for JSON serialization
      res.json({
        storageUsedBytes: metrics.storageUsedBytes.toString(),
        storageUsedFormatted: metrics.storageUsedFormatted,
        storageLimitBytes: metrics.storageLimitBytes.toString(),
        storageLimitFormatted: metrics.storageLimitFormatted,
        storageUsedPercent: metrics.storageUsedPercent,
        isOverLimit: metrics.isOverLimit,
        fileCount: metrics.fileCount,
        storageByType: {
          documents: metrics.storageByType.documents.toString(),
          caseDocuments: metrics.storageByType.caseDocuments.toString(),
          sharedDocuments: metrics.storageByType.sharedDocuments.toString(),
          pnjDocuments: metrics.storageByType.pnjDocuments.toString(),
        },
        storageByTypeFormatted: {
          documents: formatBytes(metrics.storageByType.documents),
          caseDocuments: formatBytes(metrics.storageByType.caseDocuments),
          sharedDocuments: formatBytes(metrics.storageByType.sharedDocuments),
          pnjDocuments: formatBytes(metrics.storageByType.pnjDocuments),
        },
      });
    } catch (error) {
      appLogger.error('Erro ao buscar métricas de storage própria', error as Error);
      res.status(500).json({ error: 'Erro ao buscar métricas de armazenamento' });
    }
  }
}

export default new CompanyController();
