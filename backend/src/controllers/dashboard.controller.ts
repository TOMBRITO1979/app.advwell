import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

// Obter atividades recentes do dashboard
export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const limit = Number(req.query.limit) || 10;

    // Buscar últimos casos criados
    const recentCases = await prisma.case.findMany({
      where: { companyId },
      include: {
        client: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Buscar últimos documentos adicionados
    const recentDocuments = await prisma.document.findMany({
      where: { companyId },
      include: {
        client: {
          select: { name: true }
        },
        case: {
          select: { processNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Buscar últimas transações financeiras
    const recentTransactions = await prisma.financialTransaction.findMany({
      where: { companyId },
      include: {
        client: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Buscar últimos clientes cadastrados
    const recentClients = await prisma.client.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Buscar últimas movimentações de processos (DataJud sync)
    const recentMovements = await prisma.caseMovement.findMany({
      where: {
        case: {
          companyId
        }
      },
      include: {
        case: {
          select: {
            processNumber: true,
            client: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Combinar todas as atividades e ordenar por data
    const allActivities: any[] = [];

    // Adicionar casos
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

    // Adicionar documentos
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

    // Adicionar transações
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

    // Adicionar clientes
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

    // Adicionar movimentações
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

    // Ordenar todas as atividades por timestamp (mais recentes primeiro)
    allActivities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limitar ao número solicitado
    const limitedActivities = allActivities.slice(0, limit);

    res.json({
      activities: limitedActivities,
      total: limitedActivities.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar atividades recentes:', error);
    res.status(500).json({ error: 'Erro ao buscar atividades recentes' });
  }
};
