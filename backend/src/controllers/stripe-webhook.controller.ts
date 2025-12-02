import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

// Use latest Stripe API version
const STRIPE_API_VERSION = '2025-11-17.clover' as const;

// Helper to send notification email
async function sendNotificationEmail(
  companyId: string,
  subject: string,
  html: string
) {
  try {
    // Get SMTP config for company
    const smtpConfig = await prisma.sMTPConfig.findUnique({
      where: { companyId },
    });

    if (!smtpConfig || !smtpConfig.isActive) {
      console.log('SMTP nao configurado para empresa:', companyId);
      return;
    }

    // Get company admin email
    const admin = await prisma.user.findFirst({
      where: { companyId, role: 'ADMIN' },
    });

    if (!admin || !admin.email) {
      console.log('Admin nao encontrado para empresa:', companyId);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: decrypt(smtpConfig.password),
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'AdvWell'}" <${smtpConfig.fromEmail}>`,
      to: admin.email,
      subject,
      html,
    });

    console.log('Email de notificacao enviado para:', admin.email);
  } catch (error) {
    console.error('Erro ao enviar email de notificacao:', error);
  }
}

// Email templates
function getPaymentSuccessEmail(clientName: string, planName: string, amount: number) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">Pagamento Confirmado</h2>
      <p>O pagamento da assinatura foi processado com sucesso:</p>
      <ul>
        <li><strong>Cliente:</strong> ${clientName}</li>
        <li><strong>Plano:</strong> ${planName}</li>
        <li><strong>Valor:</strong> R$ ${amount.toFixed(2).replace('.', ',')}</li>
      </ul>
      <p style="color: #6B7280; font-size: 14px;">Este e um email automatico do AdvWell.</p>
    </div>
  `;
}

function getPaymentFailedEmail(clientName: string, planName: string, reason: string) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">Falha no Pagamento</h2>
      <p>Houve uma falha no processamento do pagamento:</p>
      <ul>
        <li><strong>Cliente:</strong> ${clientName}</li>
        <li><strong>Plano:</strong> ${planName}</li>
        <li><strong>Motivo:</strong> ${reason}</li>
      </ul>
      <p>Entre em contato com o cliente para regularizar o pagamento.</p>
      <p style="color: #6B7280; font-size: 14px;">Este e um email automatico do AdvWell.</p>
    </div>
  `;
}

function getSubscriptionCanceledEmail(clientName: string, planName: string, reason: string | null) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #F59E0B;">Assinatura Cancelada</h2>
      <p>Uma assinatura foi cancelada:</p>
      <ul>
        <li><strong>Cliente:</strong> ${clientName}</li>
        <li><strong>Plano:</strong> ${planName}</li>
        ${reason ? `<li><strong>Motivo:</strong> ${reason}</li>` : ''}
      </ul>
      <p>Considere entrar em contato com o cliente para entender os motivos.</p>
      <p style="color: #6B7280; font-size: 14px;">Este e um email automatico do AdvWell.</p>
    </div>
  `;
}

export class StripeWebhookController {
  // Process Stripe webhook events
  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body;

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Verify webhook signature using platform webhook secret
    const platformWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const platformSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!platformWebhookSecret || !platformSecretKey) {
      console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event: any;

    try {
      // Verify signature with platform webhook secret
      const stripe = new Stripe(platformSecretKey, { apiVersion: STRIPE_API_VERSION });
      event = stripe.webhooks.constructEvent(rawBody, sig, platformWebhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      // Extract companyId from event metadata
      let companyId: string | undefined;
      const obj = event.data?.object as any;

      if (obj) {
        companyId = obj.metadata?.companyId ||
          obj.subscription_details?.metadata?.companyId ||
          obj.lines?.data?.[0]?.metadata?.companyId;
      }

      if (!companyId) {
        console.log('CompanyId nao encontrado no evento:', event.type);
        return res.status(200).json({ received: true, warning: 'companyId not found' });
      }

      console.log('Webhook recebido:', event.type, 'companyId:', companyId);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        default:
          console.log('Evento nao tratado:', event.type);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Erro ao processar webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Handle checkout session completed
  private async handleCheckoutCompleted(session: any) {
    const subscriptionId = session.metadata?.subscriptionId;

    if (!subscriptionId) {
      console.log('subscriptionId nao encontrado no checkout session');
      return;
    }

    // Update subscription with Stripe subscription ID
    await prisma.clientSubscription.update({
      where: { id: subscriptionId },
      data: {
        stripeSubscriptionId: session.subscription as string,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
      },
    });

    console.log('Assinatura ativada:', subscriptionId);
  }

  // Handle invoice paid
  private async handleInvoicePaid(invoice: any) {
    // Get subscription ID from parent or subscription_details
    const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription ||
      invoice.subscription_details?.subscription ||
      invoice.subscription;

    if (!stripeSubscriptionId) {
      console.log('subscription nao encontrado no invoice');
      return;
    }

    // Find our subscription
    const subscription = await prisma.clientSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscriptionId as string },
      include: {
        client: true,
        servicePlan: true,
      },
    });

    if (!subscription) {
      console.log('Assinatura nao encontrada para:', stripeSubscriptionId);
      return;
    }

    // Get payment intent from payment or parent
    const paymentIntentId = invoice.payment?.payment_intent ||
      invoice.parent?.payment_intent ||
      null;

    // Record payment
    await prisma.subscriptionPayment.create({
      data: {
        clientSubscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: paymentIntentId,
        amount: (invoice.amount_paid || invoice.total || 0) / 100,
        currency: invoice.currency || 'brl',
        status: 'paid',
        paidAt: new Date(),
        receiptUrl: invoice.hosted_invoice_url || null,
      },
    });

    // Get period from subscription_details if available
    const periodStart = invoice.subscription_details?.metadata?.period_start ||
      invoice.period_start;
    const periodEnd = invoice.subscription_details?.metadata?.period_end ||
      invoice.period_end;

    // Update subscription status and period
    await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    // Send notification email
    await sendNotificationEmail(
      subscription.companyId,
      `Pagamento Confirmado - ${subscription.client.name}`,
      getPaymentSuccessEmail(
        subscription.client.name,
        subscription.servicePlan.name,
        (invoice.amount_paid || invoice.total || 0) / 100
      )
    );

    console.log('Pagamento registrado para assinatura:', subscription.id);
  }

  // Handle invoice payment failed
  private async handleInvoicePaymentFailed(invoice: any) {
    const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription ||
      invoice.subscription_details?.subscription ||
      invoice.subscription;

    if (!stripeSubscriptionId) {
      return;
    }

    // Find our subscription
    const subscription = await prisma.clientSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscriptionId as string },
      include: {
        client: true,
        servicePlan: true,
      },
    });

    if (!subscription) {
      console.log('Assinatura nao encontrada para:', stripeSubscriptionId);
      return;
    }

    // Get failure reason
    const failureReason = invoice.last_finalization_error?.message ||
      invoice.last_finalization_error?.code ||
      'Erro desconhecido';

    const paymentIntentId = invoice.payment?.payment_intent ||
      invoice.parent?.payment_intent ||
      null;

    // Record failed payment
    await prisma.subscriptionPayment.create({
      data: {
        clientSubscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: paymentIntentId,
        amount: (invoice.amount_due || invoice.total || 0) / 100,
        currency: invoice.currency || 'brl',
        status: 'failed',
        failedAt: new Date(),
        failureReason,
      },
    });

    // Update subscription status
    await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAST_DUE',
      },
    });

    // Send notification email
    await sendNotificationEmail(
      subscription.companyId,
      `Falha no Pagamento - ${subscription.client.name}`,
      getPaymentFailedEmail(
        subscription.client.name,
        subscription.servicePlan.name,
        failureReason
      )
    );

    console.log('Falha de pagamento registrada para assinatura:', subscription.id);
  }

  // Handle subscription updated
  private async handleSubscriptionUpdated(stripeSubscription: any) {
    const subscription = await prisma.clientSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    // Map Stripe status to our status
    let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'TRIALING' = 'ACTIVE';
    switch (stripeSubscription.status) {
      case 'active':
        status = 'ACTIVE';
        break;
      case 'past_due':
        status = 'PAST_DUE';
        break;
      case 'canceled':
        status = 'CANCELED';
        break;
      case 'unpaid':
        status = 'UNPAID';
        break;
      case 'incomplete':
        status = 'INCOMPLETE';
        break;
      case 'trialing':
        status = 'TRIALING';
        break;
    }

    // Get current period from subscription or items
    const currentPeriodStart = stripeSubscription.current_period_start ||
      stripeSubscription.items?.data?.[0]?.current_period_start;
    const currentPeriodEnd = stripeSubscription.current_period_end ||
      stripeSubscription.items?.data?.[0]?.current_period_end;

    await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status,
        currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : undefined,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
      },
    });

    console.log('Assinatura atualizada:', subscription.id, 'status:', status);
  }

  // Handle subscription deleted/canceled
  private async handleSubscriptionDeleted(stripeSubscription: any) {
    const subscription = await prisma.clientSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
      include: {
        client: true,
        servicePlan: true,
      },
    });

    if (!subscription) {
      return;
    }

    await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: stripeSubscription.cancellation_details?.reason || null,
      },
    });

    // Send notification email
    await sendNotificationEmail(
      subscription.companyId,
      `Assinatura Cancelada - ${subscription.client.name}`,
      getSubscriptionCanceledEmail(
        subscription.client.name,
        subscription.servicePlan.name,
        stripeSubscription.cancellation_details?.reason || null
      )
    );

    console.log('Assinatura cancelada:', subscription.id);
  }
}

export default new StripeWebhookController();
