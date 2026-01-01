import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { whatsappService } from '../services/whatsapp.service';
import { appLogger } from '../utils/logger';

/**
 * Controller para webhooks do WhatsApp Business API
 * Recebe notificações de status de mensagens e mensagens recebidas
 *
 * Documentação Meta:
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */
export class WhatsAppWebhookController {
  /**
   * Verificação do webhook (GET)
   * Meta envia uma requisição GET para verificar o endpoint
   */
  async verify(req: Request, res: Response) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      appLogger.info('WhatsApp Webhook: Verificação recebida', {
        mode,
        hasToken: !!token,
        hasChallenge: !!challenge,
      });

      // Verificar se é uma requisição de verificação válida
      if (mode !== 'subscribe') {
        appLogger.warn('WhatsApp Webhook: Modo inválido', { mode });
        return res.status(400).send('Invalid mode');
      }

      if (!token || !challenge) {
        appLogger.warn('WhatsApp Webhook: Token ou challenge ausente');
        return res.status(400).send('Missing token or challenge');
      }

      // Buscar configuração com o token correspondente
      const config = await prisma.whatsAppConfig.findFirst({
        where: { webhookVerifyToken: token as string },
      });

      if (!config) {
        appLogger.warn('WhatsApp Webhook: Token não encontrado', {
          token: (token as string).substring(0, 10) + '...',
        });
        return res.status(403).send('Invalid token');
      }

      appLogger.info('WhatsApp Webhook: Verificação bem-sucedida', {
        companyId: config.companyId,
      });

      // Responder com o challenge para confirmar
      res.status(200).send(challenge);
    } catch (error) {
      appLogger.error('WhatsApp Webhook: Erro na verificação', error as Error);
      res.status(500).send('Internal error');
    }
  }

  /**
   * Recebe notificações do webhook (POST)
   * Processa status de mensagens e mensagens recebidas
   */
  async receive(req: Request, res: Response) {
    try {
      // Sempre responder 200 rapidamente para evitar retry da Meta
      res.status(200).send('OK');

      const body = req.body;

      // Verificar se é uma notificação válida do WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        appLogger.debug('WhatsApp Webhook: Objeto não é WhatsApp', {
          object: body.object,
        });
        return;
      }

      // Processar cada entrada
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const value = change.value;

          // Processar status de mensagens
          if (value.statuses && Array.isArray(value.statuses)) {
            await this.processStatuses(value.statuses);
          }

          // Processar mensagens recebidas (para futura implementação de respostas)
          if (value.messages && Array.isArray(value.messages)) {
            await this.processIncomingMessages(value.messages, value.metadata);
          }
        }
      }
    } catch (error) {
      appLogger.error('WhatsApp Webhook: Erro ao processar', error as Error);
      // Não retornar erro - já respondemos 200
    }
  }

  /**
   * Processa atualizações de status de mensagens
   */
  private async processStatuses(statuses: any[]) {
    for (const status of statuses) {
      try {
        const messageId = status.id;
        const statusType = status.status; // sent, delivered, read, failed
        const timestamp = status.timestamp
          ? new Date(parseInt(status.timestamp) * 1000)
          : new Date();

        // Extrair informações de erro se houver
        let errorCode: string | undefined;
        let errorMessage: string | undefined;

        if (status.errors && status.errors.length > 0) {
          const error = status.errors[0];
          errorCode = error.code?.toString();
          errorMessage = error.title || error.message;
        }

        appLogger.info('WhatsApp Webhook: Status recebido', {
          messageId,
          status: statusType,
          timestamp,
          hasError: !!errorCode,
        });

        // Atualizar status no banco
        if (['delivered', 'read', 'failed'].includes(statusType)) {
          await whatsappService.updateMessageStatus(
            messageId,
            statusType as 'delivered' | 'read' | 'failed',
            timestamp,
            errorCode,
            errorMessage
          );
        }

        // Atualizar destinatário de campanha se aplicável
        await this.updateCampaignRecipientStatus(messageId, statusType, timestamp);
      } catch (error) {
        appLogger.error('WhatsApp Webhook: Erro ao processar status', error as Error, {
          messageId: status.id,
        });
      }
    }
  }

  /**
   * Atualiza status do destinatário de campanha
   */
  private async updateCampaignRecipientStatus(
    messageId: string,
    status: string,
    timestamp: Date
  ) {
    try {
      const recipient = await prisma.whatsAppCampaignRecipient.findFirst({
        where: { messageId },
      });

      if (!recipient) return;

      const updateData: any = {};

      switch (status) {
        case 'delivered':
          updateData.deliveredAt = timestamp;
          break;
        case 'read':
          updateData.readAt = timestamp;
          break;
        case 'failed':
          updateData.status = 'failed';
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: updateData,
        });

        // Atualizar contadores da campanha
        await whatsappService.updateCampaignCounters(recipient.campaignId);
      }
    } catch (error) {
      appLogger.error('WhatsApp Webhook: Erro ao atualizar recipient', error as Error);
    }
  }

  /**
   * Processa mensagens recebidas (para futura implementação)
   * Pode ser usado para:
   * - Confirmação de consultas ("Sim, confirmo")
   * - Respostas automáticas
   * - Integração com chatbot
   */
  private async processIncomingMessages(messages: any[], metadata: any) {
    for (const message of messages) {
      try {
        const from = message.from; // Número do remetente
        const messageType = message.type; // text, image, document, etc.
        const timestamp = message.timestamp
          ? new Date(parseInt(message.timestamp) * 1000)
          : new Date();

        appLogger.info('WhatsApp Webhook: Mensagem recebida', {
          from,
          type: messageType,
          timestamp,
          phoneNumberId: metadata?.phone_number_id,
        });

        // Extrair conteúdo da mensagem
        let content = '';
        if (messageType === 'text' && message.text) {
          content = message.text.body;
        } else if (messageType === 'button' && message.button) {
          content = message.button.text;
        } else if (messageType === 'interactive' && message.interactive) {
          if (message.interactive.button_reply) {
            content = message.interactive.button_reply.title;
          } else if (message.interactive.list_reply) {
            content = message.interactive.list_reply.title;
          }
        }

        // Verificar se é uma confirmação de consulta
        if (content) {
          await this.checkForAppointmentConfirmation(from, content, metadata?.phone_number_id);
        }

        // TODO: Implementar lógica adicional de processamento
        // - Salvar mensagem recebida no banco
        // - Notificar usuários do sistema
        // - Resposta automática
      } catch (error) {
        appLogger.error('WhatsApp Webhook: Erro ao processar mensagem', error as Error);
      }
    }
  }

  /**
   * Verifica se a mensagem é uma confirmação de consulta
   */
  private async checkForAppointmentConfirmation(
    from: string,
    content: string,
    phoneNumberId?: string
  ) {
    // Palavras-chave de confirmação
    const confirmKeywords = ['sim', 'confirmo', 'confirmado', 'ok', 'vou', 'estarei'];
    const cancelKeywords = ['não', 'nao', 'cancela', 'remarcar', 'desmarcar'];

    const normalizedContent = content.toLowerCase().trim();

    const isConfirmation = confirmKeywords.some((kw) => normalizedContent.includes(kw));
    const isCancellation = cancelKeywords.some((kw) => normalizedContent.includes(kw));

    if (!isConfirmation && !isCancellation) return;

    // Buscar empresa pelo phoneNumberId
    let companyId: string | undefined;
    if (phoneNumberId) {
      const config = await prisma.whatsAppConfig.findFirst({
        where: { phoneNumberId },
        select: { companyId: true },
      });
      companyId = config?.companyId;
    }

    // Formatar número para busca
    const formattedPhone = from.replace(/\D/g, '');

    // Buscar cliente pelo telefone
    const client = await prisma.client.findFirst({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: [
          { phone: { contains: formattedPhone.slice(-9) } }, // Últimos 9 dígitos
          { phone: { contains: formattedPhone.slice(-11) } }, // Com DDD
        ],
      },
    });

    if (!client) {
      appLogger.debug('WhatsApp Webhook: Cliente não encontrado para confirmação', {
        from,
        formattedPhone,
      });
      return;
    }

    // Buscar próximo evento do cliente
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEvent = await prisma.scheduleEvent.findFirst({
      where: {
        clientId: client.id,
        date: { gte: now, lte: nextWeek },
        completed: false,
        type: { in: ['COMPROMISSO', 'AUDIENCIA', 'GOOGLE_MEET'] },
      },
      orderBy: { date: 'asc' },
    });

    if (!upcomingEvent) {
      appLogger.debug('WhatsApp Webhook: Nenhum evento próximo para confirmar', {
        clientId: client.id,
      });
      return;
    }

    // Registrar a confirmação/cancelamento
    appLogger.info('WhatsApp Webhook: Confirmação de consulta recebida', {
      eventId: upcomingEvent.id,
      clientId: client.id,
      isConfirmation,
      isCancellation,
      content: normalizedContent,
    });

    // TODO: Implementar ações baseadas na confirmação
    // - Marcar evento como confirmado (adicionar campo no modelo)
    // - Enviar notificação para o usuário responsável
    // - Atualizar status no Google Calendar
  }

  /**
   * Endpoint para debug/teste do webhook
   */
  async status(req: Request, res: Response) {
    try {
      // Contar configurações ativas
      const activeConfigs = await prisma.whatsAppConfig.count({
        where: { isActive: true, webhookVerifyToken: { not: null } },
      });

      // Últimas mensagens processadas
      const recentMessages = await prisma.whatsAppMessage.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      // Últimos status recebidos
      const deliveredCount = await prisma.whatsAppMessage.count({
        where: {
          deliveredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const readCount = await prisma.whatsAppMessage.count({
        where: {
          readAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      res.json({
        status: 'operational',
        activeConfigs,
        last24Hours: {
          messagesSent: recentMessages,
          delivered: deliveredCount,
          read: readCount,
        },
      });
    } catch (error) {
      appLogger.error('WhatsApp Webhook: Erro ao buscar status', error as Error);
      res.status(500).json({ error: 'Erro ao buscar status' });
    }
  }
}

export default new WhatsAppWebhookController();
