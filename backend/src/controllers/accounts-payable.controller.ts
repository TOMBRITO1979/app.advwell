import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

export class AccountsPayableController {
  // Criar nova conta a pagar
  async create(req: AuthRequest, res: Response) {
    try {
      const {
        supplier, description, amount, dueDate, category, notes,
        isRecurring, recurrencePeriod, parentId
      } = req.body;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const account = await prisma.accountPayable.create({
        data: {
          companyId,
          supplier,
          description,
          amount: parseFloat(amount),
          dueDate: new Date(dueDate),
          category,
          notes,
          createdBy,
          isRecurring: isRecurring || false,
          recurrencePeriod: recurrencePeriod || null,
          parentId: parentId || null,
        },
      });

      res.status(201).json(account);
    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      res.status(500).json({ error: 'Erro ao criar conta a pagar' });
    }
  }

  // Listar contas a pagar
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const {
        page = 1,
        limit = 20,
        search = '',
        status,
      } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {
        companyId,
      };

      // Filtro de busca
      if (search) {
        where.OR = [
          { supplier: { contains: String(search), mode: 'insensitive' as const } },
          { description: { contains: String(search), mode: 'insensitive' as const } },
        ];
      }

      // Filtro por status
      if (status) {
        where.status = status;
      }

      const [accounts, total] = await Promise.all([
        prisma.accountPayable.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { dueDate: 'asc' },
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }),
        prisma.accountPayable.count({ where }),
      ]);

      res.json({
        data: accounts,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error('Erro ao listar contas a pagar:', error);
      res.status(500).json({ error: 'Erro ao listar contas a pagar' });
    }
  }

  // Buscar conta específica
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      res.json(account);
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  }

  // Atualizar conta a pagar
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const {
        supplier, description, amount, dueDate, paidDate, status, category, notes
      } = req.body;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      const updatedAccount = await prisma.accountPayable.update({
        where: { id },
        data: {
          supplier,
          description,
          amount: amount !== undefined ? parseFloat(amount) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          paidDate: paidDate ? new Date(paidDate) : null,
          status,
          category,
          notes,
        },
      });

      res.json(updatedAccount);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  }

  // Excluir conta a pagar
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      await prisma.accountPayable.delete({
        where: { id },
      });

      res.json({ message: 'Conta excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      res.status(500).json({ error: 'Erro ao excluir conta' });
    }
  }

  // Marcar como pago
  async markAsPaid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;
      const { paidDate } = req.body;

      const account = await prisma.accountPayable.findFirst({
        where: {
          id,
          companyId: companyId!,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      // Marcar como paga
      const updatedAccount = await prisma.accountPayable.update({
        where: { id },
        data: {
          status: 'PAID',
          paidDate: paidDate ? new Date(paidDate) : new Date(),
        },
      });

      // Se for recorrente, criar a próxima conta
      if (account.isRecurring && account.recurrencePeriod) {
        const nextDueDate = this.calculateNextDueDate(account.dueDate, account.recurrencePeriod);

        await prisma.accountPayable.create({
          data: {
            companyId: account.companyId,
            supplier: account.supplier,
            description: account.description,
            amount: account.amount,
            dueDate: nextDueDate,
            category: account.category,
            notes: account.notes,
            createdBy: createdBy!,
            isRecurring: true,
            recurrencePeriod: account.recurrencePeriod,
            parentId: account.parentId || account.id, // Mantém o ID da conta original
          },
        });
      }

      res.json(updatedAccount);
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      res.status(500).json({ error: 'Erro ao marcar conta como paga' });
    }
  }

  // Calcular próxima data de vencimento
  private calculateNextDueDate(currentDueDate: Date, period: string): Date {
    const nextDate = new Date(currentDueDate);

    switch (period) {
      case 'DAYS_15':
        nextDate.setDate(nextDate.getDate() + 15);
        break;
      case 'DAYS_30':
        nextDate.setDate(nextDate.getDate() + 30);
        break;
      case 'MONTHS_6':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'YEAR_1':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default: mensal
    }

    return nextDate;
  }
}

export default new AccountsPayableController();
