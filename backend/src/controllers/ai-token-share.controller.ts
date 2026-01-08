import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

/**
 * AI Token Share Controller
 * Manages AI token sharing between companies
 * Only accessible by SUPER_ADMIN
 */

/**
 * List all token shares provided by a company (as provider)
 */
export const listProvidedShares = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    const shares = await prisma.aITokenShare.findMany({
      where: { providerCompanyId: companyId },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shares);
  } catch (error) {
    appLogger.error('Error listing provided token shares:', error as Error);
    res.status(500).json({ error: 'Erro ao listar compartilhamentos de tokens' });
  }
};

/**
 * Get token share received by current company (as client)
 */
export const getReceivedShare = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Usuário não possui empresa associada' });
    }

    const share = await prisma.aITokenShare.findFirst({
      where: {
        clientCompanyId: companyId,
        enabled: true,
      },
      include: {
        providerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!share) {
      return res.json(null);
    }

    // Calculate percentage used
    const percentUsed = share.tokenLimit > 0
      ? Math.round((share.tokensUsed / share.tokenLimit) * 100)
      : 0;

    res.json({
      ...share,
      percentUsed,
      tokensRemaining: Math.max(0, share.tokenLimit - share.tokensUsed),
    });
  } catch (error) {
    appLogger.error('Error getting received token share:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar compartilhamento de tokens' });
  }
};

/**
 * Create a new token share (provider sharing with client)
 */
export const createShare = async (req: AuthRequest, res: Response) => {
  try {
    const { providerCompanyId, clientCompanyId, tokenLimit, enabled } = req.body;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    // Validate required fields
    if (!providerCompanyId || !clientCompanyId || !tokenLimit) {
      return res.status(400).json({
        error: 'Campos obrigatórios: providerCompanyId, clientCompanyId, tokenLimit',
      });
    }

    // Can't share with yourself
    if (providerCompanyId === clientCompanyId) {
      return res.status(400).json({
        error: 'Uma empresa não pode compartilhar tokens consigo mesma',
      });
    }

    // Verify provider company has AI config
    const providerConfig = await prisma.aIConfig.findUnique({
      where: { companyId: providerCompanyId },
    });

    if (!providerConfig) {
      return res.status(400).json({
        error: 'A empresa provedora não possui configuração de IA',
      });
    }

    // Check if share already exists
    const existingShare = await prisma.aITokenShare.findUnique({
      where: {
        providerCompanyId_clientCompanyId: {
          providerCompanyId,
          clientCompanyId,
        },
      },
    });

    if (existingShare) {
      return res.status(400).json({
        error: 'Já existe um compartilhamento entre essas empresas',
      });
    }

    // Create share
    const share = await prisma.aITokenShare.create({
      data: {
        providerCompanyId,
        clientCompanyId,
        tokenLimit: parseInt(tokenLimit),
        enabled: enabled !== undefined ? enabled : true,
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        providerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    appLogger.info('AI token share created', {
      providerCompanyId,
      clientCompanyId,
      tokenLimit,
    });

    res.status(201).json({
      message: 'Compartilhamento de tokens criado com sucesso',
      share,
    });
  } catch (error) {
    appLogger.error('Error creating token share:', error as Error);
    res.status(500).json({ error: 'Erro ao criar compartilhamento de tokens' });
  }
};

/**
 * Update a token share
 */
export const updateShare = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tokenLimit, enabled, resetUsage } = req.body;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    // Find existing share
    const existingShare = await prisma.aITokenShare.findUnique({
      where: { id },
    });

    if (!existingShare) {
      return res.status(404).json({ error: 'Compartilhamento não encontrado' });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (tokenLimit !== undefined) {
      updateData.tokenLimit = parseInt(tokenLimit);
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    // Reset usage counters if requested
    if (resetUsage) {
      updateData.tokensUsed = 0;
      updateData.notifiedAt80 = false;
      updateData.notifiedAt100 = false;
    }

    // Update share
    const share = await prisma.aITokenShare.update({
      where: { id },
      data: updateData,
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    appLogger.info('AI token share updated', { shareId: id, updates: updateData });

    res.json({
      message: 'Compartilhamento atualizado com sucesso',
      share,
    });
  } catch (error) {
    appLogger.error('Error updating token share:', error as Error);
    res.status(500).json({ error: 'Erro ao atualizar compartilhamento de tokens' });
  }
};

/**
 * Delete a token share
 */
export const deleteShare = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    // Find existing share
    const existingShare = await prisma.aITokenShare.findUnique({
      where: { id },
    });

    if (!existingShare) {
      return res.status(404).json({ error: 'Compartilhamento não encontrado' });
    }

    // Delete share
    await prisma.aITokenShare.delete({
      where: { id },
    });

    appLogger.info('AI token share deleted', { shareId: id });

    res.json({ message: 'Compartilhamento removido com sucesso' });
  } catch (error) {
    appLogger.error('Error deleting token share:', error as Error);
    res.status(500).json({ error: 'Erro ao remover compartilhamento de tokens' });
  }
};

/**
 * Get all companies that can be clients (for dropdown)
 * Returns companies that don't have their own AI config
 */
export const getAvailableClients = async (req: AuthRequest, res: Response) => {
  try {
    const { providerCompanyId } = req.params;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    // Get companies that:
    // 1. Are not the provider company
    // 2. Don't already have a share from this provider
    const existingShares = await prisma.aITokenShare.findMany({
      where: { providerCompanyId },
      select: { clientCompanyId: true },
    });

    const excludedIds = [providerCompanyId, ...existingShares.map(s => s.clientCompanyId)];

    const availableCompanies = await prisma.company.findMany({
      where: {
        id: { notIn: excludedIds },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        aiConfig: {
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Mark which ones have their own AI config
    const result = availableCompanies.map(company => ({
      id: company.id,
      name: company.name,
      email: company.email,
      hasOwnAIConfig: !!company.aiConfig,
    }));

    res.json(result);
  } catch (error) {
    appLogger.error('Error getting available clients:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar empresas disponíveis' });
  }
};

/**
 * Get usage statistics for shared tokens
 */
export const getShareStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify user is SUPER_ADMIN
    if (req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a SUPER_ADMIN' });
    }

    const share = await prisma.aITokenShare.findUnique({
      where: { id },
      include: {
        clientCompany: {
          select: { name: true },
        },
      },
    });

    if (!share) {
      return res.status(404).json({ error: 'Compartilhamento não encontrado' });
    }

    const percentUsed = share.tokenLimit > 0
      ? Math.round((share.tokensUsed / share.tokenLimit) * 100)
      : 0;

    res.json({
      id: share.id,
      clientName: share.clientCompany.name,
      tokenLimit: share.tokenLimit,
      tokensUsed: share.tokensUsed,
      tokensRemaining: Math.max(0, share.tokenLimit - share.tokensUsed),
      percentUsed,
      enabled: share.enabled,
      notifiedAt80: share.notifiedAt80,
      notifiedAt100: share.notifiedAt100,
    });
  } catch (error) {
    appLogger.error('Error getting share stats:', error as Error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
