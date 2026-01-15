import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { auditLogService } from '../services/audit-log.service';
import { AuditEntityType, AuditAction, CostCenterType } from '@prisma/client';

// List all cost centers for a company
export const list = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { active, type, search } = req.query;

    const where: any = { companyId };

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (type) {
      where.type = type as CostCenterType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            accountsPayable: true,
          },
        },
      },
    });

    res.json(costCenters);
  } catch (error) {
    console.error('Error listing cost centers:', error);
    res.status(500).json({ error: 'Erro ao listar centros de custo' });
  }
};

// Get a single cost center
export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const costCenter = await prisma.costCenter.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            accountsPayable: true,
          },
        },
      },
    });

    if (!costCenter) {
      return res.status(404).json({ error: 'Centro de custo não encontrado' });
    }

    res.json(costCenter);
  } catch (error) {
    console.error('Error getting cost center:', error);
    res.status(500).json({ error: 'Erro ao buscar centro de custo' });
  }
};

// Create a new cost center
export const create = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const userName = undefined; // Name fetched from token if needed

    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { name, code, description, type, color, active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Check if name already exists
    const existing = await prisma.costCenter.findFirst({
      where: { companyId, name },
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um centro de custo com este nome' });
    }

    // Check if code already exists (if provided)
    if (code) {
      const existingCode = await prisma.costCenter.findFirst({
        where: { companyId, code },
      });

      if (existingCode) {
        return res.status(400).json({ error: 'Já existe um centro de custo com este código' });
      }
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        companyId,
        name,
        code: code || null,
        description: description || null,
        type: (type as CostCenterType) || 'BOTH',
        color: color || null,
        active: active !== false,
      },
    });

    // Audit log
    if (userId) {
      await auditLogService.log({
        companyId,
        entityType: 'OTHER' as AuditEntityType,
        entityId: costCenter.id,
        entityName: name,
        userId,
        userName,
        action: 'CREATE' as AuditAction,
        description: `Centro de custo "${name}" criado`,
        newValues: costCenter as any,
      });
    }

    res.status(201).json(costCenter);
  } catch (error) {
    console.error('Error creating cost center:', error);
    res.status(500).json({ error: 'Erro ao criar centro de custo' });
  }
};

// Update a cost center
export const update = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const userName = undefined; // Name fetched from token if needed
    const { id } = req.params;

    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const existing = await prisma.costCenter.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Centro de custo não encontrado' });
    }

    const { name, code, description, type, color, active } = req.body;

    // Check if name already exists (for another record)
    if (name && name !== existing.name) {
      const duplicate = await prisma.costCenter.findFirst({
        where: { companyId, name, id: { not: id } },
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Já existe um centro de custo com este nome' });
      }
    }

    // Check if code already exists (for another record)
    if (code && code !== existing.code) {
      const duplicateCode = await prisma.costCenter.findFirst({
        where: { companyId, code, id: { not: id } },
      });

      if (duplicateCode) {
        return res.status(400).json({ error: 'Já existe um centro de custo com este código' });
      }
    }

    const costCenter = await prisma.costCenter.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        code: code !== undefined ? code : existing.code,
        description: description !== undefined ? description : existing.description,
        type: type !== undefined ? (type as CostCenterType) : existing.type,
        color: color !== undefined ? color : existing.color,
        active: active !== undefined ? active : existing.active,
      },
    });

    // Audit log
    if (userId) {
      await auditLogService.log({
        companyId,
        entityType: 'OTHER' as AuditEntityType,
        entityId: costCenter.id,
        entityName: costCenter.name,
        userId,
        userName,
        action: 'UPDATE' as AuditAction,
        description: `Centro de custo "${costCenter.name}" atualizado`,
        oldValues: existing as any,
        newValues: costCenter as any,
      });
    }

    res.json(costCenter);
  } catch (error) {
    console.error('Error updating cost center:', error);
    res.status(500).json({ error: 'Erro ao atualizar centro de custo' });
  }
};

// Delete a cost center
export const remove = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const userName = undefined; // Name fetched from token if needed
    const { id } = req.params;

    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const existing = await prisma.costCenter.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            accountsPayable: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Centro de custo não encontrado' });
    }

    // Check if there are related transactions
    const totalUsage = existing._count.financialTransactions + existing._count.accountsPayable;
    if (totalUsage > 0) {
      return res.status(400).json({
        error: `Este centro de custo está sendo usado em ${totalUsage} transação(ões). Desative-o em vez de excluir.`,
      });
    }

    await prisma.costCenter.delete({
      where: { id },
    });

    // Audit log
    if (userId) {
      await auditLogService.log({
        companyId,
        entityType: 'OTHER' as AuditEntityType,
        entityId: id,
        entityName: existing.name,
        userId,
        userName,
        action: 'DELETE' as AuditAction,
        description: `Centro de custo "${existing.name}" excluído`,
        oldValues: existing as any,
      });
    }

    res.json({ message: 'Centro de custo excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting cost center:', error);
    res.status(500).json({ error: 'Erro ao excluir centro de custo' });
  }
};

// Get cost center statistics
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { startDate, endDate } = req.query;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Get all cost centers with their totals
    const costCenters = await prisma.costCenter.findMany({
      where: { companyId, active: true },
      include: {
        financialTransactions: {
          where: {
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
          },
          select: {
            amount: true,
            type: true,
            status: true,
          },
        },
        accountsPayable: {
          where: {
            ...(Object.keys(dateFilter).length > 0 ? { dueDate: dateFilter } : {}),
          },
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

    // Calculate stats for each cost center
    const stats = costCenters.map((cc) => {
      const income = cc.financialTransactions
        .filter((t: { type: string; status: string }) => t.type === 'INCOME' && t.status === 'PAID')
        .reduce((sum: number, t: { amount: any }) => sum + Number(t.amount), 0);

      const expense = cc.accountsPayable
        .filter((a: { status: string }) => a.status === 'PAID')
        .reduce((sum: number, a: { amount: any }) => sum + Number(a.amount), 0);

      return {
        id: cc.id,
        name: cc.name,
        code: cc.code,
        color: cc.color,
        type: cc.type,
        income,
        expense,
        balance: income - expense,
        transactionCount: cc.financialTransactions.length + cc.accountsPayable.length,
      };
    });

    // Calculate totals
    const totals = {
      totalIncome: stats.reduce((sum: number, s) => sum + s.income, 0),
      totalExpense: stats.reduce((sum: number, s) => sum + s.expense, 0),
      totalBalance: stats.reduce((sum: number, s) => sum + s.balance, 0),
    };

    res.json({ costCenters: stats, totals });
  } catch (error) {
    console.error('Error getting cost center stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
