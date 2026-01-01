import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { enqueueCampaignMessages, getWhatsAppQueueStats } from '../queues/whatsapp.queue';
import { whatsappService } from '../services/whatsapp.service';
import { appLogger } from '../utils/logger';

export class WhatsAppCampaignController {
  /**
   * Lista campanhas da empresa com paginação
   */
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { page = 1, limit = 20, status } = req.query;

      const where: any = { companyId: companyId! };
      if (status) where.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const [campaigns, total] = await Promise.all([
        prisma.whatsAppCampaign.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            template: { select: { id: true, name: true, category: true } },
            user: { select: { id: true, name: true } },
            _count: { select: { recipients: true } },
          },
        }),
        prisma.whatsAppCampaign.count({ where }),
      ]);

      res.json({
        data: campaigns,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar campanhas WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
  }

  /**
   * Busca campanha por ID com destinatários
   */
  async get(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
        include: {
          template: true,
          user: { select: { id: true, name: true, email: true } },
          recipients: {
            take: 100, // Limitar destinatários na resposta
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      res.json(campaign);
    } catch (error) {
      appLogger.error('Erro ao buscar campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao buscar campanha' });
    }
  }

  /**
   * Cria nova campanha em rascunho
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;
      const { name, templateId, recipients } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validações
      if (!name || !templateId) {
        return res.status(400).json({ error: 'Nome e template são obrigatórios' });
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Adicione pelo menos um destinatário' });
      }

      if (recipients.length > 500) {
        return res.status(400).json({ error: 'Máximo de 500 destinatários por campanha' });
      }

      // Verificar se template existe e pertence à empresa
      const template = await prisma.whatsAppTemplate.findFirst({
        where: { id: templateId, companyId: companyId! },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      if (template.status !== 'APPROVED') {
        return res.status(400).json({
          error: 'Template não aprovado pela Meta. Status: ' + template.status,
        });
      }

      // Criar campanha
      const campaign = await prisma.whatsAppCampaign.create({
        data: {
          companyId: companyId!,
          name,
          templateId,
          createdBy,
          totalRecipients: recipients.length,
          status: 'draft',
        },
      });

      // Criar destinatários
      await prisma.whatsAppCampaignRecipient.createMany({
        data: recipients.map((r: any) => ({
          campaignId: campaign.id,
          companyId: companyId!,
          recipientPhone: r.phone,
          recipientName: r.name || null,
          variables: r.variables || null,
        })),
      });

      // Retornar campanha com contagem
      const result = await prisma.whatsAppCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          template: { select: { id: true, name: true } },
          _count: { select: { recipients: true } },
        },
      });

      res.status(201).json(result);
    } catch (error) {
      appLogger.error('Erro ao criar campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao criar campanha' });
    }
  }

  /**
   * Atualiza campanha em rascunho
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { name, templateId, recipients } = req.body;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status !== 'draft') {
        return res.status(400).json({ error: 'Apenas rascunhos podem ser editados' });
      }

      // Verificar template se foi alterado
      if (templateId && templateId !== campaign.templateId) {
        const template = await prisma.whatsAppTemplate.findFirst({
          where: { id: templateId, companyId: companyId! },
        });

        if (!template) {
          return res.status(404).json({ error: 'Template não encontrado' });
        }

        if (template.status !== 'APPROVED') {
          return res.status(400).json({ error: 'Template não aprovado' });
        }
      }

      // Atualizar campanha
      const updateData: any = {};
      if (name) updateData.name = name;
      if (templateId) updateData.templateId = templateId;

      // Se há novos destinatários, substituir todos
      if (recipients && Array.isArray(recipients) && recipients.length > 0) {
        if (recipients.length > 500) {
          return res.status(400).json({ error: 'Máximo de 500 destinatários' });
        }

        // Remover destinatários antigos
        await prisma.whatsAppCampaignRecipient.deleteMany({
          where: { campaignId: id },
        });

        // Criar novos
        await prisma.whatsAppCampaignRecipient.createMany({
          data: recipients.map((r: any) => ({
            campaignId: id,
            companyId: companyId!,
            recipientPhone: r.phone,
            recipientName: r.name || null,
            variables: r.variables || null,
          })),
        });

        updateData.totalRecipients = recipients.length;
      }

      const updated = await prisma.whatsAppCampaign.update({
        where: { id },
        data: updateData,
        include: {
          template: { select: { id: true, name: true } },
          _count: { select: { recipients: true } },
        },
      });

      res.json(updated);
    } catch (error) {
      appLogger.error('Erro ao atualizar campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao atualizar campanha' });
    }
  }

  /**
   * Exclui campanha (apenas rascunhos)
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status === 'sending') {
        return res.status(400).json({ error: 'Não é possível excluir campanha em envio' });
      }

      // Cascade delete vai remover recipients
      await prisma.whatsAppCampaign.delete({ where: { id } });

      res.json({ message: 'Campanha excluída com sucesso' });
    } catch (error) {
      appLogger.error('Erro ao excluir campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao excluir campanha' });
    }
  }

  /**
   * Inicia envio da campanha
   */
  async send(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
        include: {
          template: true,
          _count: { select: { recipients: true } },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status !== 'draft') {
        return res.status(400).json({ error: 'Apenas rascunhos podem ser enviados' });
      }

      if (campaign._count.recipients === 0) {
        return res.status(400).json({ error: 'Campanha não possui destinatários' });
      }

      // Verificar se empresa tem WhatsApp configurado
      const whatsappConfig = await prisma.whatsAppConfig.findUnique({
        where: { companyId: companyId! },
      });

      if (!whatsappConfig || !whatsappConfig.isActive) {
        return res.status(400).json({
          error: 'Configure o WhatsApp antes de enviar campanhas',
        });
      }

      // Verificar se template está aprovado
      if (campaign.template.status !== 'APPROVED') {
        return res.status(400).json({
          error: 'Template não está aprovado pela Meta',
        });
      }

      // Atualizar status para sending
      await prisma.whatsAppCampaign.update({
        where: { id },
        data: { status: 'sending' },
      });

      // Enfileirar mensagens em background
      enqueueCampaignMessages(id).catch((err) => {
        appLogger.error('Erro ao enfileirar campanha WhatsApp', err as Error, {
          campaignId: id,
        });
      });

      res.json({
        message: 'Campanha iniciada! As mensagens serão enviadas em breve.',
        totalRecipients: campaign._count.recipients,
      });
    } catch (error) {
      appLogger.error('Erro ao enviar campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao enviar campanha' });
    }
  }

  /**
   * Cancela campanha em envio
   */
  async cancel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      if (campaign.status !== 'sending') {
        return res.status(400).json({ error: 'Apenas campanhas em envio podem ser canceladas' });
      }

      // Atualizar status
      await prisma.whatsAppCampaign.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      // Marcar destinatários pendentes como cancelados
      await prisma.whatsAppCampaignRecipient.updateMany({
        where: { campaignId: id, status: 'pending' },
        data: { status: 'failed', errorMessage: 'Campanha cancelada' },
      });

      res.json({ message: 'Campanha cancelada. Mensagens pendentes não serão enviadas.' });
    } catch (error) {
      appLogger.error('Erro ao cancelar campanha WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao cancelar campanha' });
    }
  }

  /**
   * Estatísticas de uma campanha
   */
  async stats(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
        select: {
          id: true,
          name: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          deliveredCount: true,
          readCount: true,
          createdAt: true,
          sentAt: true,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      // Calcular taxas
      const total = campaign.totalRecipients;
      const stats = {
        ...campaign,
        pendingCount: total - campaign.sentCount - campaign.failedCount,
        deliveryRate: total > 0 ? ((campaign.deliveredCount / total) * 100).toFixed(1) : '0',
        readRate: total > 0 ? ((campaign.readCount / total) * 100).toFixed(1) : '0',
        failureRate: total > 0 ? ((campaign.failedCount / total) * 100).toFixed(1) : '0',
      };

      res.json(stats);
    } catch (error) {
      appLogger.error('Erro ao buscar estatísticas da campanha', error as Error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  /**
   * Lista destinatários de uma campanha com paginação
   */
  async listRecipients(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const { page = 1, limit = 50, status } = req.query;

      // Verificar se campanha existe
      const campaign = await prisma.whatsAppCampaign.findFirst({
        where: { id, companyId: companyId! },
        select: { id: true },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
      }

      const where: any = { campaignId: id };
      if (status) where.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const [recipients, total] = await Promise.all([
        prisma.whatsAppCampaignRecipient.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.whatsAppCampaignRecipient.count({ where }),
      ]);

      res.json({
        data: recipients,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      appLogger.error('Erro ao listar destinatários', error as Error);
      res.status(500).json({ error: 'Erro ao listar destinatários' });
    }
  }

  /**
   * Estatísticas gerais de WhatsApp da empresa
   */
  async companyStats(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate } = req.query;

      const stats = await whatsappService.getCompanyStats(
        companyId!,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Adicionar estatísticas da fila
      const queueStats = await getWhatsAppQueueStats();

      res.json({
        messages: stats,
        queue: queueStats,
      });
    } catch (error) {
      appLogger.error('Erro ao buscar estatísticas WhatsApp', error as Error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  /**
   * Envia mensagem de teste para um número
   */
  async sendTest(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { phone, templateName, variables } = req.body;

      if (!phone || !templateName) {
        return res.status(400).json({ error: 'Telefone e template são obrigatórios' });
      }

      // Verificar se template existe
      const template = await prisma.whatsAppTemplate.findFirst({
        where: { companyId: companyId!, name: templateName },
      });

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      if (template.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Template não está aprovado' });
      }

      const result = await whatsappService.sendTemplate({
        companyId: companyId!,
        phone,
        templateName,
        language: template.language,
        variables: variables || {},
        messageType: 'MANUAL',
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Mensagem de teste enviada!',
          messageId: result.messageId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      appLogger.error('Erro ao enviar mensagem de teste', error as Error);
      res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
    }
  }

  /**
   * Importa destinatários de clientes da empresa
   */
  async importFromClients(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { filter, limit = 500 } = req.body;

      const where: any = {
        companyId: companyId!,
        phone: { not: null },
        active: true,
      };

      // Aplicar filtros opcionais
      if (filter?.tag) where.tag = filter.tag;
      if (filter?.city) where.city = filter.city;
      if (filter?.state) where.state = filter.state;

      const clients = await prisma.client.findMany({
        where,
        take: Math.min(Number(limit), 500),
        select: {
          id: true,
          name: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      });

      // Formatar para uso em campanha
      const recipients = clients
        .filter((c) => c.phone) // Garantir que tem telefone
        .map((client) => ({
          clientId: client.id,
          name: client.name,
          phone: client.phone!,
          variables: {
            nome: client.name.split(' ')[0], // Primeiro nome
          },
        }));

      res.json({
        total: recipients.length,
        recipients,
      });
    } catch (error) {
      appLogger.error('Erro ao importar clientes', error as Error);
      res.status(500).json({ error: 'Erro ao importar clientes' });
    }
  }
}

export default new WhatsAppCampaignController();
