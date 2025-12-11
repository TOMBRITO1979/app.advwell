import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
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
import legalDocumentRoutes from './legal-document.routes';
import subscriptionRoutes from './subscription.routes';
import leadRoutes from './lead.routes';
import lgpdRoutes from './lgpd.routes';
import auditLogRoutes from './audit-log.routes';
// Temporariamente desabilitado - aguardando schema Prisma
// import stripeConfigRoutes from './stripe-config.routes';
// import servicePlanRoutes from './service-plan.routes';
// import clientSubscriptionRoutes from './client-subscription.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
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
router.use('/legal-documents', legalDocumentRoutes); // Documentos jurídicos (recibos, contratos, etc.)
router.use('/subscription', subscriptionRoutes); // Assinatura e pagamentos (Stripe)
router.use('/leads', leadRoutes); // Gestão de leads (potenciais clientes)
router.use('/lgpd', lgpdRoutes); // Rotas LGPD (consentimento, direitos do titular)
router.use('/audit-logs', auditLogRoutes); // Logs de auditoria (CRUD de clientes e processos)
// router.use('/stripe-config', stripeConfigRoutes); // Configuração Stripe do escritório para cobranças de clientes
// router.use('/service-plans', servicePlanRoutes); // Planos de serviço do escritório
// router.use('/client-subscriptions', clientSubscriptionRoutes); // Assinaturas de clientes em planos

export default router;
