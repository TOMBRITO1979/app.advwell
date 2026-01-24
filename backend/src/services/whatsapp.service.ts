import axios, { AxiosError } from 'axios';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import { appLogger } from '../utils/logger';

const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Tipos para componentes de template
interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters?: TemplateParameter[];
}

interface SendTemplateParams {
  companyId: string;
  phone: string;
  templateName: string;
  language?: string;
  components?: TemplateComponent[];
  variables?: Record<string, string>;
  // Referências opcionais para rastreamento
  campaignId?: string;
  eventId?: string;
  clientId?: string;
  messageType?: 'CAMPAIGN' | 'REMINDER' | 'MANUAL';
}

interface SendTemplateResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
}

class WhatsAppService {
  /**
   * Formata número de telefone para o padrão internacional do WhatsApp
   * Suporta números internacionais e brasileiros
   *
   * Formatos aceitos:
   * - +1234567890 (internacional com +)
   * - 1234567890 (internacional sem +, já com código do país)
   * - (11) 99999-9999 (brasileiro)
   * - 11999999999 (brasileiro sem formatação)
   *
   * Retorna: número apenas com dígitos (ex: 5511999999999 ou 14077608242)
   */
  formatPhone(phone: string): string {
    // Verifica se tem + no início (número internacional explícito)
    const hasPlus = phone.trim().startsWith('+');

    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Se tinha +, o número já tem código do país - retorna como está
    if (hasPlus && cleaned.length >= 10) {
      return cleaned;
    }

    // Lista de códigos de país comuns (1-3 dígitos)
    // Se o número já começa com um código de país válido, retorna como está
    const countryCodes = [
      '1',    // EUA, Canadá
      '44',   // Reino Unido
      '351',  // Portugal
      '34',   // Espanha
      '33',   // França
      '49',   // Alemanha
      '39',   // Itália
      '55',   // Brasil
      '54',   // Argentina
      '56',   // Chile
      '57',   // Colômbia
      '52',   // México
      '51',   // Peru
      '598',  // Uruguai
      '595',  // Paraguai
    ];

    // Verifica se já começa com código de país conhecido
    for (const code of countryCodes) {
      if (cleaned.startsWith(code) && cleaned.length >= 10) {
        return cleaned;
      }
    }

    // Se tem 10 ou 11 dígitos sem código de país, assume brasileiro e adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }

    // Se tem 8 ou 9 dígitos (só número sem DDD), avisa e retorna como está
    if (cleaned.length === 8 || cleaned.length === 9) {
      appLogger.warn('WhatsApp: Número sem DDD', { phone, cleaned });
      return cleaned;
    }

    // Retorna o número limpo - a API da Meta vai retornar erro se for inválido
    return cleaned;
  }

  // Alias para compatibilidade
  formatBrazilianPhone(phone: string): string {
    return this.formatPhone(phone);
  }

  /**
   * Obtém configuração WhatsApp da empresa (descriptografada)
   */
  async getConfig(companyId: string): Promise<WhatsAppConfig> {
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      throw new Error('Configuração WhatsApp não encontrada para esta empresa');
    }

    if (!config.isActive) {
      throw new Error('WhatsApp está desativado para esta empresa');
    }

    return {
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      accessToken: decrypt(config.accessToken),
    };
  }

  /**
   * Constrói os componentes do template a partir de variáveis simples
   * Converte { nome: "João", data: "10/01" } em formato de componentes da Meta
   */
  buildComponentsFromVariables(variables: Record<string, string>): TemplateComponent[] {
    const values = Object.values(variables);

    if (values.length === 0) {
      return [];
    }

    // A maioria dos templates usa variáveis no body
    return [
      {
        type: 'body',
        parameters: values.map((value) => ({
          type: 'text' as const,
          text: value,
        })),
      },
    ];
  }

  /**
   * Envia mensagem de template via WhatsApp Business API
   */
  async sendTemplate(params: SendTemplateParams): Promise<SendTemplateResult> {
    const {
      companyId,
      phone,
      templateName,
      language = 'pt_BR',
      components,
      variables,
      campaignId,
      eventId,
      clientId,
      messageType = 'MANUAL',
    } = params;

    const formattedPhone = this.formatBrazilianPhone(phone);

    // Criar registro de mensagem como pendente
    const message = await prisma.whatsAppMessage.create({
      data: {
        companyId,
        phone: formattedPhone,
        templateName,
        variables: variables || {},
        type: messageType,
        status: 'pending',
        campaignId,
        eventId,
        clientId,
      },
    });

    try {
      const config = await this.getConfig(companyId);

      // Construir componentes do template
      let templateComponents = components;
      if (!templateComponents && variables) {
        templateComponents = this.buildComponentsFromVariables(variables);
      }

      // Payload para a Meta API
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
        },
      };

      // Adicionar componentes se existirem
      if (templateComponents && templateComponents.length > 0) {
        payload.template.components = templateComponents;
      }

      // Enviar para Meta API
      const response = await axios.post(
        `${META_API_BASE_URL}/${config.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const messageId = response.data.messages?.[0]?.id;

      // Atualizar mensagem como enviada
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          messageId,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      appLogger.info('WhatsApp: Mensagem enviada', {
        messageId,
        phone: formattedPhone,
        templateName,
        companyId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const axiosError = error as AxiosError<any>;

      let errorMessage = 'Erro desconhecido ao enviar mensagem';
      let errorCode: string | undefined;

      if (axiosError.response?.data?.error) {
        const metaError = axiosError.response.data.error;
        errorCode = metaError.code?.toString();

        // Traduzir códigos de erro comuns da Meta para mensagens amigáveis
        const errorMessages: Record<string, string> = {
          '132000': `Template "${templateName}" não encontrado ou não aprovado. Verifique se o template existe no Meta Business Suite e está aprovado.`,
          '132001': 'Parâmetros do template inválidos. Verifique se o número de variáveis corresponde ao template.',
          '132005': 'Template possui parâmetros mas nenhum foi enviado.',
          '132007': 'Política de template violada. O template pode ter sido rejeitado.',
          '132012': 'Template pausado por baixa qualidade.',
          '132015': 'Template desativado.',
          '131047': 'Não é possível enviar para este número. O usuário não iniciou conversa nas últimas 24h.',
          '131051': 'Tipo de mensagem não suportado.',
          '131052': 'Download de mídia falhou.',
          '131053': 'Upload de mídia falhou.',
          '130429': 'Limite de taxa excedido. Muitas mensagens em pouco tempo.',
          '131031': 'Conta não verificada ou sem permissões.',
          '100': 'Parâmetro inválido na requisição.',
          '190': 'Token de acesso inválido ou expirado.',
          '200': 'Permissão negada. Verifique as permissões do app.',
          '368': 'Conta bloqueada temporariamente por spam.',
          '80007': 'Limite de taxa da conta excedido.',
        };

        errorMessage = errorMessages[errorCode || ''] || metaError.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Atualizar mensagem como falha
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          status: 'failed',
          errorCode,
          errorMessage,
          failedAt: new Date(),
        },
      });

      appLogger.error('WhatsApp: Falha ao enviar mensagem', error as Error, {
        phone: formattedPhone,
        templateName,
        companyId,
        errorCode,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  /**
   * Envia lembrete de consulta/evento
   */
  async sendAppointmentReminder(params: {
    companyId: string;
    eventId: string;
    clientId: string;
    phone: string;
    clientName: string;
    eventTitle: string;
    eventDate: Date;
    templateName?: string;
  }): Promise<SendTemplateResult> {
    const {
      companyId,
      eventId,
      clientId,
      phone,
      clientName,
      eventTitle,
      eventDate,
      templateName = 'appointment_reminder', // Nome padrão do template
    } = params;

    // Formatar data/hora para exibição
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedDate = dateFormatter.format(eventDate);
    const formattedTime = timeFormatter.format(eventDate);

    return this.sendTemplate({
      companyId,
      phone,
      templateName,
      variables: {
        nome: clientName,
        evento: eventTitle,
        data: formattedDate,
        horario: formattedTime,
      },
      eventId,
      clientId,
      messageType: 'REMINDER',
    });
  }

  /**
   * Envia lembrete de solicitação de documento
   */
  async sendDocumentRequestReminder(params: {
    companyId: string;
    documentRequestId: string;
    clientId: string;
    phone: string;
    clientName: string;
    documentName: string;
    dueDate: Date;
    isOverdue: boolean;
    companyName: string;
    templateName?: string;
  }): Promise<SendTemplateResult> {
    const {
      companyId,
      documentRequestId,
      clientId,
      phone,
      clientName,
      documentName,
      dueDate,
      isOverdue,
      companyName,
      templateName = 'document_request_reminder', // Nome padrão do template
    } = params;

    // Formatar data para exibição
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const formattedDate = dateFormatter.format(dueDate);
    const status = isOverdue ? 'VENCIDO' : 'pendente';

    return this.sendTemplate({
      companyId,
      phone,
      templateName,
      variables: {
        nome: clientName,
        documento: documentName,
        prazo: formattedDate,
        status: status,
        empresa: companyName,
      },
      clientId,
      messageType: 'REMINDER',
    });
  }

  /**
   * Atualiza status da mensagem via webhook
   * Chamado quando recebemos webhook da Meta com status updates
   */
  async updateMessageStatus(
    messageId: string,
    status: 'delivered' | 'read' | 'failed',
    timestamp?: Date,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const message = await prisma.whatsAppMessage.findFirst({
      where: { messageId },
    });

    if (!message) {
      appLogger.warn('WhatsApp: Mensagem não encontrada para atualização de status', {
        messageId,
        status,
      });
      return;
    }

    const updateData: any = { status };

    if (status === 'delivered') {
      updateData.deliveredAt = timestamp || new Date();
    } else if (status === 'read') {
      updateData.readAt = timestamp || new Date();
    } else if (status === 'failed') {
      updateData.failedAt = timestamp || new Date();
      updateData.errorCode = errorCode;
      updateData.errorMessage = errorMessage;
    }

    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: updateData,
    });

    // Se for de campanha, atualizar contadores da campanha
    if (message.campaignId) {
      await this.updateCampaignCounters(message.campaignId);
    }

    appLogger.info('WhatsApp: Status atualizado', {
      messageId,
      status,
      campaignId: message.campaignId,
    });
  }

  /**
   * Atualiza contadores de uma campanha
   */
  async updateCampaignCounters(campaignId: string): Promise<void> {
    const [sentCount, failedCount, deliveredCount, readCount] = await Promise.all([
      prisma.whatsAppMessage.count({
        where: { campaignId, status: 'sent' },
      }),
      prisma.whatsAppMessage.count({
        where: { campaignId, status: 'failed' },
      }),
      prisma.whatsAppMessage.count({
        where: { campaignId, status: 'delivered' },
      }),
      prisma.whatsAppMessage.count({
        where: { campaignId, status: 'read' },
      }),
    ]);

    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: sentCount + deliveredCount + readCount, // sent inclui delivered e read
        failedCount,
        deliveredCount,
        readCount,
      },
    });
  }

  /**
   * Busca estatísticas de mensagens de uma empresa
   */
  async getCompanyStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, delivered, read, failed] = await Promise.all([
      prisma.whatsAppMessage.count({ where }),
      prisma.whatsAppMessage.count({ where: { ...where, status: 'sent' } }),
      prisma.whatsAppMessage.count({ where: { ...where, status: 'delivered' } }),
      prisma.whatsAppMessage.count({ where: { ...where, status: 'read' } }),
      prisma.whatsAppMessage.count({ where: { ...where, status: 'failed' } }),
    ]);

    return {
      total,
      sent,
      delivered,
      read,
      failed,
      deliveryRate: total > 0 ? ((delivered + read) / total * 100).toFixed(1) : '0',
      readRate: total > 0 ? (read / total * 100).toFixed(1) : '0',
    };
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
