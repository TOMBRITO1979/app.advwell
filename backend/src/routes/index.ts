import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import adverseRoutes from './adverse.routes';
import lawyerRoutes from './lawyer.routes';
import caseRoutes from './case.routes';
import casePartRoutes from './case-part.routes';
import companyRoutes from './company.routes';
import userRoutes from './user.routes';
import financialRoutes from './financial.routes';
import documentRoutes from './document.routes';
import integrationRoutes from './integration.routes';
import dashboardRoutes from './dashboard.routes';
import scheduleRoutes from './schedule.routes';
import accountsPayableRoutes from './accounts-payable.routes';
import smtpConfigRoutes from './smtp-config.routes';
import campaignRoutes from './campaign.routes';
import aiConfigRoutes from './ai-config.routes';
import aiTokenShareRoutes from './ai-token-share.routes';
import legalDocumentRoutes from './legal-document.routes';
import subscriptionRoutes from './subscription.routes';
import leadRoutes from './lead.routes';
import leadAnalyticsRoutes from './lead-analytics.routes';
import tagRoutes from './tag.routes';
import pnjRoutes from './pnj.routes';
import lgpdRoutes from './lgpd.routes';
import auditLogRoutes from './audit-log.routes';
import backupEmailRoutes from './backup-email.routes';
import databaseBackupRoutes from './database-backup.routes';
import holidaysRoutes from './holidays.routes';
import portalRoutes from './portal.routes';
import announcementsRoutes from './announcements.routes';
import googleCalendarRoutes from './google-calendar.routes';
import googleCalendarConfigRoutes from './google-calendar-config.routes';
import whatsappConfigRoutes from './whatsapp-config.routes';
import whatsappCampaignRoutes from './whatsapp-campaign.routes';
import whatsappWebhookRoutes from './whatsapp-webhook.routes';
import telegramRoutes from './telegram.routes';
import sharedDocumentRoutes from './shared-document.routes';
import clientMessageRoutes from './client-message.routes';
import monitoringRoutes from './monitoring.routes';
import advapiWebhookRoutes from './advapi-webhook.routes';
import deadLetterRoutes from './dead-letter.routes';
import manualRoutes from './manual.routes';
import costCenterRoutes from './costCenter.routes';
import reportsRoutes from './reports.routes';
import documentRequestRoutes from './document-request.routes';
import servicePlanRoutes from './service-plan.routes';
import clientSubscriptionRoutes from './client-subscription.routes';

const router = Router();

// Auth routes (sem rate limit por empresa - nao autenticado)
router.use('/auth', authRoutes);

// WhatsApp Webhook (sem autenticação - verificado por token)
router.use('/whatsapp-webhook', whatsappWebhookRoutes);

// ADVAPI Webhook (sem autenticação - verificado por X-API-Key)
router.use('/advapi-webhook', advapiWebhookRoutes);

// Nota: companyRateLimit é aplicado em cada route file após authenticate
// para garantir que req.user esteja disponível

router.use('/clients', clientRoutes);
router.use('/adverses', adverseRoutes);
router.use('/lawyers', lawyerRoutes);
router.use('/cases', caseRoutes);
router.use('/cases', casePartRoutes); // Rotas de partes do processo (/cases/:caseId/parts)
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/financial', financialRoutes);
router.use('/documents', documentRoutes);
router.use('/integration', integrationRoutes); // Rotas de integração (Chatwoot, etc)
router.use('/dashboard', dashboardRoutes); // Rotas do dashboard
router.use('/schedule', scheduleRoutes); // Rotas da agenda
router.use('/accounts-payable', accountsPayableRoutes); // Rotas de contas a pagar
router.use('/smtp-config', smtpConfigRoutes); // Configuração SMTP por empresa
router.use('/campaigns', campaignRoutes); // Campanhas de email
router.use('/ai-config', aiConfigRoutes); // Configuração de IA por empresa
router.use('/ai-token-share', aiTokenShareRoutes); // Compartilhamento de tokens de IA entre empresas (SUPER_ADMIN)
router.use('/legal-documents', legalDocumentRoutes); // Documentos jurídicos (recibos, contratos, etc.)
router.use('/subscription', subscriptionRoutes); // Assinatura e pagamentos (Stripe)
router.use('/leads', leadRoutes); // Gestão de leads (potenciais clientes)
router.use('/lead-analytics', leadAnalyticsRoutes); // Analytics e relatórios de leads
router.use('/tags', tagRoutes); // Sistema de tags centralizado (para clientes e leads)
router.use('/pnj', pnjRoutes); // Processos Não Judiciais (PNJ)
router.use('/lgpd', lgpdRoutes); // Rotas LGPD (consentimento, direitos do titular)
router.use('/audit-logs', auditLogRoutes); // Logs de auditoria (CRUD de clientes e processos)
router.use('/backup-email', backupEmailRoutes); // Configuração de backup por email
router.use('/database-backup', databaseBackupRoutes); // Backup do banco de dados para S3 (SUPER_ADMIN only)
router.use('/holidays', holidaysRoutes); // Feriados nacionais (BrasilAPI com cache Redis)
router.use('/portal', portalRoutes); // Portal do cliente (acesso restrito a usuários CLIENT)
router.use('/announcements', announcementsRoutes); // Gestão de anúncios do portal (ADMIN)
router.use('/google-calendar', googleCalendarRoutes); // Integração Google Calendar (OAuth + sync)
router.use('/google-calendar-config', googleCalendarConfigRoutes); // Configuração Google Calendar por empresa (ADMIN)
router.use('/whatsapp-config', whatsappConfigRoutes); // Configuração WhatsApp Business API por empresa (ADMIN)
router.use('/whatsapp-campaigns', whatsappCampaignRoutes); // Campanhas de marketing WhatsApp (ADMIN)
router.use('/telegram', telegramRoutes); // Configuração Telegram Bot por empresa
router.use('/', sharedDocumentRoutes); // Documentos compartilhados entre escritório e cliente (Portal)
router.use('/client-messages', clientMessageRoutes); // Mensagens bidirecionais entre clientes e escritório
router.use('/monitoring', monitoringRoutes); // Monitoramento de OABs e publicações (ADVAPI v2)
router.use('/admin/dead-letter', deadLetterRoutes); // Dead Letter Queue (jobs falhados) - ADMIN/SUPER_ADMIN
router.use('/manual', manualRoutes); // Manual do usuário e FAQ (público + admin SUPER_ADMIN)
router.use('/cost-centers', costCenterRoutes); // Centros de custo (categorização de despesas/receitas)
router.use('/reports', reportsRoutes); // Relatórios avançados (processos por fase, rito, prazo, etc.)
router.use('/document-requests', documentRequestRoutes); // Solicitação de documentos aos clientes
router.use('/service-plans', servicePlanRoutes); // Planos de serviço (assinaturas de clientes)
router.use('/client-subscriptions', clientSubscriptionRoutes); // Assinaturas de clientes

export default router;
