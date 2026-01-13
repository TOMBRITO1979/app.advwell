import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { sanitizeString } from '../utils/sanitize';
import { normalizeProcessNumber } from '../utils/processNumber';
import { appLogger } from '../utils/logger';
import { enqueueOabConsulta, getConsultaQueueStatus, getMonitoringQueueStats } from '../queues/monitoring.queue';

// Brazilian states for OAB validation
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

export class MonitoringController {
  // ========================================
  // MONITORED OAB CRUD
  // ========================================

  /**
   * Listar OABs monitoradas da empresa
   */
  async listMonitoredOabs(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { status, search } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (status && ['ACTIVE', 'PAUSED', 'INACTIVE'].includes(String(status))) {
        where.status = String(status);
      }

      if (search) {
        const searchStr = String(search);
        where.OR = [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { oab: { contains: searchStr } },
        ];
      }

      const monitoredOabs = await prisma.monitoredOAB.findMany({
        where,
        include: {
          _count: {
            select: {
              publications: true,
              consultas: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(monitoredOabs);
    } catch (error) {
      appLogger.error('Erro ao listar OABs monitoradas', error as Error);
      return res.status(500).json({ error: 'Erro ao listar OABs monitoradas' });
    }
  }

  /**
   * Criar nova OAB monitorada
   */
  async createMonitoredOab(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { name, oab, oabState, tribunais, autoImport } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validações
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (!oab || !oab.trim()) {
        return res.status(400).json({ error: 'Número da OAB é obrigatório' });
      }

      if (!oabState || !BRAZILIAN_STATES.includes(oabState.toUpperCase())) {
        return res.status(400).json({ error: 'Estado da OAB inválido' });
      }

      // Verificar se já existe
      const existing = await prisma.monitoredOAB.findFirst({
        where: {
          companyId,
          oab: oab.trim(),
          oabState: oabState.toUpperCase(),
        },
      });

      if (existing) {
        return res.status(400).json({ error: 'Esta OAB já está sendo monitorada' });
      }

      const monitoredOab = await prisma.monitoredOAB.create({
        data: {
          companyId,
          name: sanitizeString(name) || name.trim(),
          oab: oab.trim(),
          oabState: oabState.toUpperCase(),
          tribunais: Array.isArray(tribunais) ? tribunais : [],
          autoImport: autoImport !== false,
        },
      });

      appLogger.info('OAB monitorada criada', {
        companyId,
        monitoredOabId: monitoredOab.id,
        oab: monitoredOab.oab,
      });

      // Auto-enfileirar consulta inicial (últimos 5 anos)
      try {
        const dataFim = new Date();
        const dataInicio = new Date();
        dataInicio.setFullYear(dataInicio.getFullYear() - 5);

        // Criar registro da consulta
        const consulta = await prisma.oABConsulta.create({
          data: {
            companyId,
            monitoredOabId: monitoredOab.id,
            dataInicio,
            dataFim,
            tribunais: monitoredOab.tribunais,
            status: 'PENDING',
          },
        });

        // Enfileirar para processamento assíncrono
        await enqueueOabConsulta(
          consulta.id,
          monitoredOab.id,
          companyId,
          monitoredOab.name,
          monitoredOab.oab,
          monitoredOab.oabState,
          dataInicio.toISOString().split('T')[0],
          dataFim.toISOString().split('T')[0],
          monitoredOab.tribunais,
          monitoredOab.autoImport
        );

        appLogger.info('Consulta inicial enfileirada automaticamente', {
          monitoredOabId: monitoredOab.id,
          consultaId: consulta.id,
          periodo: '5 anos',
        });
      } catch (enqueueError) {
        appLogger.error('Erro ao enfileirar consulta inicial', enqueueError as Error);
        // Não impede a criação da OAB, apenas loga o erro
      }

      return res.status(201).json(monitoredOab);
    } catch (error) {
      appLogger.error('Erro ao criar OAB monitorada', error as Error);
      return res.status(500).json({ error: 'Erro ao criar OAB monitorada' });
    }
  }

  /**
   * Atualizar OAB monitorada
   */
  async updateMonitoredOab(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { name, status, tribunais, autoImport } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se existe e pertence à empresa
      const existing = await prisma.monitoredOAB.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'OAB monitorada não encontrada' });
      }

      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = sanitizeString(name) || name.trim();
      }

      if (status && ['ACTIVE', 'PAUSED', 'INACTIVE'].includes(status)) {
        updateData.status = status;
      }

      if (tribunais !== undefined) {
        updateData.tribunais = Array.isArray(tribunais) ? tribunais : [];
      }

      if (autoImport !== undefined) {
        updateData.autoImport = autoImport === true;
      }

      const monitoredOab = await prisma.monitoredOAB.update({
        where: { id },
        data: updateData,
      });

      return res.json(monitoredOab);
    } catch (error) {
      appLogger.error('Erro ao atualizar OAB monitorada', error as Error);
      return res.status(500).json({ error: 'Erro ao atualizar OAB monitorada' });
    }
  }

  /**
   * Deletar OAB monitorada
   */
  async deleteMonitoredOab(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se existe e pertence à empresa
      const existing = await prisma.monitoredOAB.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'OAB monitorada não encontrada' });
      }

      await prisma.monitoredOAB.delete({ where: { id } });

      appLogger.info('OAB monitorada deletada', {
        companyId,
        monitoredOabId: id,
      });

      return res.json({ message: 'OAB monitorada removida com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao deletar OAB monitorada', error as Error);
      return res.status(500).json({ error: 'Erro ao deletar OAB monitorada' });
    }
  }

  /**
   * Buscar manualmente publicações de uma OAB (enfileira consulta dos últimos 5 anos)
   */
  async refreshOab(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se existe e pertence à empresa
      const monitoredOab = await prisma.monitoredOAB.findFirst({
        where: { id, companyId },
      });

      if (!monitoredOab) {
        return res.status(404).json({ error: 'OAB monitorada não encontrada' });
      }

      // Período: últimos 5 anos
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setFullYear(dataInicio.getFullYear() - 5);

      // Criar registro da consulta
      const consulta = await prisma.oABConsulta.create({
        data: {
          companyId,
          monitoredOabId: monitoredOab.id,
          dataInicio,
          dataFim,
          tribunais: monitoredOab.tribunais,
          status: 'PENDING',
        },
      });

      // Enfileirar para processamento assíncrono
      const jobId = await enqueueOabConsulta(
        consulta.id,
        monitoredOab.id,
        companyId,
        monitoredOab.name,
        monitoredOab.oab,
        monitoredOab.oabState,
        dataInicio.toISOString().split('T')[0],
        dataFim.toISOString().split('T')[0],
        monitoredOab.tribunais,
        monitoredOab.autoImport
      );

      appLogger.info('Busca manual enfileirada', {
        monitoredOabId: monitoredOab.id,
        consultaId: consulta.id,
        jobId,
      });

      return res.status(201).json({
        ...consulta,
        jobId,
        message: 'Busca enfileirada! Acompanhe o progresso na aba Consultas.',
      });
    } catch (error) {
      appLogger.error('Erro ao enfileirar busca manual', error as Error);
      return res.status(500).json({ error: 'Erro ao enfileirar busca manual' });
    }
  }

  // ========================================
  // CONSULTAS
  // ========================================

  /**
   * Iniciar nova consulta para uma OAB (via fila assíncrona)
   */
  async iniciarConsulta(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { monitoredOabId, dataInicio, dataFim, tribunais, autoImport } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se a OAB monitorada existe
      const monitoredOab = await prisma.monitoredOAB.findFirst({
        where: { id: monitoredOabId, companyId },
      });

      if (!monitoredOab) {
        return res.status(404).json({ error: 'OAB monitorada não encontrada' });
      }

      // Validar datas
      const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 dias atrás
      const fim = dataFim ? new Date(dataFim) : new Date();

      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        return res.status(400).json({ error: 'Datas inválidas' });
      }

      if (inicio > fim) {
        return res.status(400).json({ error: 'Data inicial deve ser anterior à data final' });
      }

      // Criar registro da consulta
      const consulta = await prisma.oABConsulta.create({
        data: {
          companyId,
          monitoredOabId,
          dataInicio: inicio,
          dataFim: fim,
          tribunais: tribunais || monitoredOab.tribunais,
          status: 'PENDING',
        },
      });

      // Enfileirar consulta para processamento assíncrono
      const jobId = await enqueueOabConsulta(
        consulta.id,
        monitoredOab.id,
        companyId,
        monitoredOab.name,
        monitoredOab.oab,
        monitoredOab.oabState,
        inicio.toISOString().split('T')[0],
        fim.toISOString().split('T')[0],
        tribunais || monitoredOab.tribunais,
        autoImport !== undefined ? autoImport : monitoredOab.autoImport
      );

      appLogger.info('Consulta enfileirada', {
        consultaId: consulta.id,
        jobId,
        monitoredOabId,
      });

      return res.status(201).json({
        ...consulta,
        jobId,
        message: 'Consulta enfileirada para processamento. Acompanhe o status em tempo real.',
      });
    } catch (error) {
      appLogger.error('Erro ao iniciar consulta', error as Error);
      return res.status(500).json({ error: 'Erro ao iniciar consulta' });
    }
  }

  /**
   * Obter status em tempo real de uma consulta na fila
   */
  async getConsultaStatus(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Verificar se a consulta pertence à empresa
      const consulta = await prisma.oABConsulta.findFirst({
        where: { id, companyId },
        include: {
          monitoredOab: {
            select: { id: true, name: true, oab: true, oabState: true },
          },
        },
      });

      if (!consulta) {
        return res.status(404).json({ error: 'Consulta não encontrada' });
      }

      // Buscar status da fila (progresso em tempo real)
      const queueStatus = await getConsultaQueueStatus(id);

      return res.json({
        consulta,
        queueStatus,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar status da consulta', error as Error);
      return res.status(500).json({ error: 'Erro ao buscar status' });
    }
  }

  /**
   * Obter estatísticas da fila de monitoramento
   */
  async getQueueStats(req: AuthRequest, res: Response) {
    try {
      const stats = await getMonitoringQueueStats();
      return res.json(stats);
    } catch (error) {
      appLogger.error('Erro ao buscar stats da fila', error as Error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas da fila' });
    }
  }

  /**
   * Listar consultas de uma OAB ou todas
   */
  async listConsultas(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { monitoredOabId, status } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (monitoredOabId) {
        where.monitoredOabId = String(monitoredOabId);
      }

      if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(String(status))) {
        where.status = String(status);
      }

      const consultas = await prisma.oABConsulta.findMany({
        where,
        include: {
          monitoredOab: {
            select: { id: true, name: true, oab: true, oabState: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json(consultas);
    } catch (error) {
      appLogger.error('Erro ao listar consultas', error as Error);
      return res.status(500).json({ error: 'Erro ao listar consultas' });
    }
  }

  // ========================================
  // PUBLICAÇÕES
  // ========================================

  /**
   * Listar publicações
   */
  async listPublications(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { monitoredOabId, imported, search, page = 1, limit = 50 } = req.query;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const where: any = { companyId };

      if (monitoredOabId) {
        where.monitoredOabId = String(monitoredOabId);
      }

      if (imported !== undefined) {
        where.imported = imported === 'true';
      }

      if (search) {
        const searchStr = String(search);
        where.OR = [
          { numeroProcesso: { contains: searchStr } },
          { siglaTribunal: { contains: searchStr, mode: 'insensitive' } },
          { textoComunicacao: { contains: searchStr, mode: 'insensitive' } },
        ];
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [publications, total] = await Promise.all([
        prisma.publication.findMany({
          where,
          include: {
            monitoredOab: {
              select: { id: true, name: true, oab: true, oabState: true },
            },
          },
          orderBy: { dataPublicacao: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.publication.count({ where }),
      ]);

      return res.json({
        publications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      appLogger.error('Erro ao listar publicações', error as Error);
      return res.status(500).json({ error: 'Erro ao listar publicações' });
    }
  }

  /**
   * Importar publicação como processo
   */
  async importPublication(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { clientName, clientCpf, clientEmail, clientPhone } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar publicação
      const publication = await prisma.publication.findFirst({
        where: { id, companyId },
        include: { monitoredOab: true },
      });

      if (!publication) {
        return res.status(404).json({ error: 'Publicação não encontrada' });
      }

      if (publication.imported) {
        return res.status(400).json({ error: 'Publicação já foi importada' });
      }

      // Normalizar número do processo
      const processNumber = normalizeProcessNumber(publication.numeroProcesso);

      // Verificar se já existe processo com este número
      const existingCase = await prisma.case.findFirst({
        where: { companyId, processNumber },
      });

      if (existingCase) {
        // Apenas marcar como importado
        await prisma.publication.update({
          where: { id },
          data: {
            imported: true,
            importedCaseId: existingCase.id,
            importedAt: new Date(),
          },
        });

        return res.json({
          message: 'Processo já existe no sistema',
          case: existingCase,
          newClient: false,
        });
      }

      // Criar cliente APENAS se o usuário forneceu dados manualmente
      let client = null;
      if (clientName && clientName.trim()) {
        // Verificar se cliente já existe por CPF ou email
        if (clientCpf) {
          client = await prisma.client.findFirst({
            where: { companyId, cpf: clientCpf },
          });
        }

        if (!client && clientEmail) {
          client = await prisma.client.findFirst({
            where: { companyId, email: clientEmail.toLowerCase() },
          });
        }

        if (!client) {
          // Criar novo cliente com dados fornecidos pelo usuário
          client = await prisma.client.create({
            data: {
              companyId,
              name: sanitizeString(clientName) || clientName.trim(),
              cpf: clientCpf || null,
              email: clientEmail?.toLowerCase() || null,
              phone: clientPhone || null,
              notes: `Cliente criado via importação de publicação. Tribunal: ${publication.siglaTribunal}`,
            },
          });

          appLogger.info('Cliente criado via importação de publicação', {
            companyId,
            clientId: client.id,
            publicationId: id,
          });
        }
      }
      // Se não forneceu dados de cliente, NÃO cria cliente genérico
      // O usuário pode vincular um cliente depois manualmente

      // Criar processo apenas com número e andamento ADVAPI
      // Demais dados (tribunal, assunto) serão preenchidos manualmente pelo usuário
      const newCase = await prisma.case.create({
        data: {
          companyId,
          clientId: client?.id || null,
          processNumber,
          ultimaPublicacaoAdvapi: publication.textoComunicacao,
        },
      });

      // Atualizar publicação
      await prisma.publication.update({
        where: { id },
        data: {
          imported: true,
          importedCaseId: newCase.id,
          importedClientId: client?.id || null,
          importedAt: new Date(),
        },
      });

      appLogger.info('Publicação importada como processo', {
        companyId,
        publicationId: id,
        caseId: newCase.id,
        clientId: client?.id || null,
      });

      return res.json({
        message: 'Publicação importada com sucesso',
        case: newCase,
        client: client || null,
        newClient: !!client,
      });
    } catch (error) {
      appLogger.error('Erro ao importar publicação', error as Error);
      return res.status(500).json({ error: 'Erro ao importar publicação' });
    }
  }

  /**
   * Webhook para receber resultado de consulta da ADVAPI
   */
  async webhookConsulta(req: AuthRequest, res: Response) {
    try {
      const { consultaId, status, publicacoes, error: errorMsg } = req.body;

      if (!consultaId) {
        return res.status(400).json({ error: 'consultaId é obrigatório' });
      }

      // Buscar consulta pelo ID da API
      const consulta = await prisma.oABConsulta.findFirst({
        where: { advApiConsultaId: consultaId },
        include: { monitoredOab: true },
      });

      if (!consulta) {
        appLogger.warn('Webhook: consulta não encontrada', { consultaId });
        return res.status(404).json({ error: 'Consulta não encontrada' });
      }

      // Atualizar status
      if (status === 'completed' && Array.isArray(publicacoes)) {
        // Salvar publicações
        const savedCount = await this.savePublicationsFromWebhook(
          consulta.companyId,
          consulta.monitoredOabId,
          publicacoes
        );

        await prisma.oABConsulta.update({
          where: { id: consulta.id },
          data: {
            status: 'COMPLETED',
            totalPublicacoes: publicacoes.length,
            importedCount: savedCount,
            completedAt: new Date(),
          },
        });

        appLogger.info('Webhook: consulta concluída', {
          consultaId,
          total: publicacoes.length,
          saved: savedCount,
        });
      } else if (status === 'failed') {
        await prisma.oABConsulta.update({
          where: { id: consulta.id },
          data: {
            status: 'FAILED',
            errorMessage: errorMsg || 'Erro desconhecido',
            completedAt: new Date(),
          },
        });

        appLogger.error('Webhook: consulta falhou', new Error(errorMsg || 'Consulta falhou'), { consultaId });
      }

      return res.json({ success: true });
    } catch (err) {
      appLogger.error('Erro no webhook de consulta', err as Error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  /**
   * Helper para salvar publicações recebidas via webhook
   */
  private async savePublicationsFromWebhook(
    companyId: string,
    monitoredOabId: string,
    publicacoes: any[]
  ): Promise<number> {
    let savedCount = 0;

    for (const pub of publicacoes) {
      try {
        // Verificar se já existe
        const existing = await prisma.publication.findFirst({
          where: {
            companyId,
            monitoredOabId,
            numeroProcesso: pub.numeroProcesso,
          },
        });

        if (!existing) {
          await prisma.publication.create({
            data: {
              companyId,
              monitoredOabId,
              numeroProcesso: pub.numeroProcesso,
              siglaTribunal: pub.siglaTribunal,
              dataPublicacao: new Date(pub.dataPublicacao),
              tipoComunicacao: pub.tipoComunicacao || null,
              textoComunicacao: pub.textoComunicacao || null,
            },
          });
          savedCount++;
        }
      } catch (err) {
        appLogger.error('Erro ao salvar publicação', err as Error, {
          numeroProcesso: pub.numeroProcesso,
        });
      }
    }

    return savedCount;
  }

  /**
   * Marcar publicação como importada (quando processo é criado manualmente)
   */
  async markPublicationImported(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { caseId } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Buscar publicação
      const publication = await prisma.publication.findFirst({
        where: { id, companyId },
      });

      if (!publication) {
        return res.status(404).json({ error: 'Publicação não encontrada' });
      }

      if (publication.imported) {
        return res.status(400).json({ error: 'Publicação já foi importada' });
      }

      // Atualizar publicação como importada
      await prisma.publication.update({
        where: { id },
        data: {
          imported: true,
          importedCaseId: caseId || null,
          importedAt: new Date(),
        },
      });

      appLogger.info('Publicação marcada como importada manualmente', {
        companyId,
        publicationId: id,
        caseId,
      });

      return res.json({ message: 'Publicação marcada como importada' });
    } catch (error) {
      appLogger.error('Erro ao marcar publicação como importada', error as Error);
      return res.status(500).json({ error: 'Erro ao marcar publicação' });
    }
  }

  /**
   * Dashboard stats
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      const [
        totalOabs,
        activeOabs,
        totalPublications,
        pendingPublications,
        recentConsultas,
      ] = await Promise.all([
        prisma.monitoredOAB.count({ where: { companyId } }),
        prisma.monitoredOAB.count({ where: { companyId, status: 'ACTIVE' } }),
        prisma.publication.count({ where: { companyId } }),
        prisma.publication.count({ where: { companyId, imported: false } }),
        prisma.oABConsulta.count({
          where: {
            companyId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return res.json({
        totalOabs,
        activeOabs,
        totalPublications,
        pendingPublications,
        recentConsultas,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar stats de monitoramento', error as Error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export const monitoringController = new MonitoringController();
