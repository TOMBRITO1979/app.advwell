import Stripe from 'stripe';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

// Lazy initialize Stripe - only create when needed and API key is available
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured. Stripe features are unavailable.');
    }
    stripeInstance = new Stripe(apiKey);
  }
  return stripeInstance;
}

// Getter for use in places that check availability
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Plan configuration
export const SUBSCRIPTION_PLANS = {
  BRONZE: {
    name: 'Bronze',
    priceUsd: 99,
    casesLimit: 1000,
    features: ['Até 1.000 processos', 'Suporte por email', 'Integração DataJud'],
  },
  PRATA: {
    name: 'Prata',
    priceUsd: 159,
    casesLimit: 2500,
    features: ['Até 2.500 processos', 'Suporte prioritário', 'Integração DataJud', 'IA para resumos'],
  },
  OURO: {
    name: 'Ouro',
    priceUsd: 219,
    casesLimit: 5000,
    features: ['Até 5.000 processos', 'Suporte 24/7', 'Integração DataJud', 'IA para resumos', 'API exclusiva'],
  },
};

// Trial duration in days
export const TRIAL_DURATION_DAYS = 7;

/**
 * Create or get Stripe customer for a company
 */
export async function getOrCreateStripeCustomer(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        where: { role: 'ADMIN' },
        take: 1,
      },
    },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  // If already has a Stripe customer ID, return it
  if (company.stripeCustomerId) {
    return company.stripeCustomerId;
  }

  // Create new Stripe customer
  const adminEmail = company.users[0]?.email || company.email;
  const customer = await getStripe().customers.create({
    email: adminEmail,
    name: company.name,
    metadata: {
      companyId: company.id,
    },
  });

  // Save customer ID
  await prisma.company.update({
    where: { id: companyId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  companyId: string,
  plan: 'BRONZE' | 'PRATA' | 'OURO',
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(companyId);
  const planConfig = SUBSCRIPTION_PLANS[plan];

  // Create Stripe checkout session
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AdvWell ${planConfig.name}`,
            description: planConfig.features.join(', '),
          },
          unit_amount: planConfig.priceUsd * 100, // Stripe uses cents
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      companyId,
      plan,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url || '';
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(
  companyId: string,
  returnUrl: string
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company?.stripeCustomerId) {
    throw new Error('No Stripe customer found for this company');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(
  payload: Buffer,
  signature: string
): Promise<{ received: boolean; event?: string }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }

    default:
      appLogger.info('Unhandled Stripe event type', { eventType: event.type });
  }

  return { received: true, event: event.type };
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  const plan = session.metadata?.plan as 'BRONZE' | 'PRATA' | 'OURO';

  if (!companyId || !plan) {
    appLogger.error('Missing metadata in checkout session', new Error('Missing metadata'));
    return;
  }

  const planConfig = SUBSCRIPTION_PLANS[plan];

  // Update company subscription
  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: plan,
      stripeSubscriptionId: session.subscription as string,
      casesLimit: planConfig.casesLimit,
      trialEndsAt: null, // Clear trial
    },
  });

  appLogger.info('Company subscribed to plan', { companyId, plan });
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find company by Stripe customer ID
  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!company) {
    appLogger.error('Company not found for Stripe customer', new Error('Company not found'), { customerId });
    return;
  }

  // Update subscription end date
  const periodEnd = new Date((subscription as any).current_period_end * 1000);

  let status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' = 'ACTIVE';
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'CANCELLED';
  } else if (subscription.status === 'past_due') {
    status = 'EXPIRED';
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: status,
      subscriptionEndsAt: periodEnd,
    },
  });

  appLogger.info('Company subscription updated', { companyId: company.id, status });
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!company) {
    appLogger.error('Company not found for Stripe customer', new Error('Company not found'), { customerId });
    return;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: 'CANCELLED',
      subscriptionPlan: null,
      stripeSubscriptionId: null,
    },
  });

  appLogger.info('Company subscription cancelled', { companyId: company.id });
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!company) {
    appLogger.error('Company not found for Stripe customer', new Error('Company not found'), { customerId });
    return;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: 'EXPIRED',
    },
  });

  appLogger.warn('Company payment failed - subscription expired', { companyId: company.id });
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!company) {
    return; // Not an error, might be non-subscription payment
  }

  // Reactivate if was expired
  if (company.subscriptionStatus === 'EXPIRED') {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        subscriptionStatus: 'ACTIVE',
      },
    });

    appLogger.info('Company subscription reactivated', { companyId: company.id });
  }
}

/**
 * Initialize trial for new company
 */
export async function initializeTrial(companyId: string): Promise<void> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'TRIAL',
      trialEndsAt,
      casesLimit: 1000, // Trial gets Bronze limit
    },
  });
}

/**
 * Check if company has valid subscription
 */
export async function checkSubscriptionStatus(companyId: string): Promise<{
  valid: boolean;
  status: string;
  daysRemaining?: number;
  casesLimit: number;
  casesUsed: number;
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: { cases: true },
      },
    },
  });

  if (!company) {
    return { valid: false, status: 'NOT_FOUND', casesLimit: 0, casesUsed: 0 };
  }

  const casesUsed = company._count.cases;
  const casesLimit = company.casesLimit || 1000;

  // Check trial status
  if (company.subscriptionStatus === 'TRIAL') {
    if (!company.trialEndsAt) {
      return {
        valid: false,
        status: 'TRIAL_EXPIRED',
        casesLimit,
        casesUsed,
      };
    }

    const now = new Date();
    if (now > company.trialEndsAt) {
      // Trial expired - update status
      await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: 'EXPIRED' },
      });

      return {
        valid: false,
        status: 'TRIAL_EXPIRED',
        casesLimit,
        casesUsed,
      };
    }

    const daysRemaining = Math.ceil(
      (company.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      valid: true,
      status: 'TRIAL',
      daysRemaining,
      casesLimit,
      casesUsed,
    };
  }

  // Check active subscription
  if (company.subscriptionStatus === 'ACTIVE') {
    let daysRemaining: number | undefined;

    if (company.subscriptionEndsAt) {
      const now = new Date();
      daysRemaining = Math.ceil(
        (company.subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      valid: true,
      status: 'ACTIVE',
      daysRemaining,
      casesLimit,
      casesUsed,
    };
  }

  // Expired or cancelled
  return {
    valid: false,
    status: company.subscriptionStatus || 'EXPIRED',
    casesLimit,
    casesUsed,
  };
}

/**
 * Get subscription info for display
 */
export async function getSubscriptionInfo(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: { cases: true },
      },
    },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const status = await checkSubscriptionStatus(companyId);

  return {
    status: company.subscriptionStatus,
    plan: company.subscriptionPlan,
    planDetails: company.subscriptionPlan ? SUBSCRIPTION_PLANS[company.subscriptionPlan] : null,
    trialEndsAt: company.trialEndsAt,
    subscriptionEndsAt: company.subscriptionEndsAt,
    casesLimit: company.casesLimit,
    casesUsed: company._count.cases,
    casesRemaining: (company.casesLimit || 1000) - company._count.cases,
    isValid: status.valid,
    daysRemaining: status.daysRemaining,
    availablePlans: SUBSCRIPTION_PLANS,
    hasStripeCustomer: !!company.stripeCustomerId,
    hasStripeSubscription: !!company.stripeSubscriptionId,
  };
}

/**
 * Get last payment info for a company from Stripe
 */
export async function getLastPayment(companyId: string): Promise<{
  lastPaymentDate: Date | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  lastPaymentStatus: string | null;
} | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company?.stripeCustomerId) {
    return null;
  }

  try {
    // Get the last successful invoice from Stripe
    const invoices = await getStripe().invoices.list({
      customer: company.stripeCustomerId,
      status: 'paid',
      limit: 1,
    });

    if (invoices.data.length === 0) {
      return null;
    }

    const lastInvoice = invoices.data[0];

    return {
      lastPaymentDate: lastInvoice.status_transitions?.paid_at
        ? new Date(lastInvoice.status_transitions.paid_at * 1000)
        : null,
      lastPaymentAmount: lastInvoice.amount_paid / 100, // Convert from cents
      lastPaymentCurrency: lastInvoice.currency?.toUpperCase() || 'USD',
      lastPaymentStatus: lastInvoice.status,
    };
  } catch (error) {
    appLogger.error('Error fetching last payment from Stripe', error as Error);
    return null;
  }
}
