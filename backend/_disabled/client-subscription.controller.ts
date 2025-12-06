import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import Stripe from 'stripe';

// Use latest Stripe API version
const STRIPE_API_VERSION = '2025-11-17.clover' as const;

// Helper to get Stripe instance for a company
async function getStripeInstance(companyId: string): Promise<Stripe | null> {
  try {
    const config = await prisma.stripeConfig.findUnique({
      where: { companyId },
    });

    if (!config || !config.isActive) {
      return null;
    }

    const secretKey = decrypt(config.stripeSecretKey);
    return new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  } catch (error) {
    console.error('Erro ao obter instância Stripe:', error);
    return null;
  }
}

export class ClientSubscriptionController {
  // List all subscriptions for the company
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { status, clientId, servicePlanId } = req.query;

      const where: any = { companyId: companyId! };

      if (status) {
        where.status = status;
      }
      if (clientId) {
        where.clientId = clientId;
      }
      if (servicePlanId) {
        where.servicePlanId = servicePlanId;
      }

      const subscriptions = await prisma.clientSubscription.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          servicePlan: {
            select: {
              id: true,
              name: true,
              price: true,
              interval: true,
            },
          },
          payments: {
            take: 12,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(subscriptions);
    } catch (error) {
      console.error('Erro ao listar assinaturas:', error);
      res.status(500).json({ error: 'Erro ao listar assinaturas' });
    }
  }

  // Get a single subscription with payment history
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const subscription = await prisma.clientSubscription.findFirst({
        where: { id, companyId: companyId! },
        include: {
          client: true,
          servicePlan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      res.json(subscription);
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
  }

  // Create a new subscription and generate Stripe Checkout URL
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { clientId, servicePlanId } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validate client exists
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId: companyId! },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Validate service plan exists
      const servicePlan = await prisma.servicePlan.findFirst({
        where: { id: servicePlanId, companyId: companyId!, isActive: true },
      });

      if (!servicePlan) {
        return res.status(404).json({ error: 'Plano de serviço não encontrado' });
      }

      // Check if subscription already exists
      const existingSubscription = await prisma.clientSubscription.findFirst({
        where: {
          clientId,
          servicePlanId,
          status: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING', 'INCOMPLETE'] },
        },
      });

      if (existingSubscription) {
        return res.status(400).json({
          error: 'Cliente já possui assinatura ativa neste plano',
          subscriptionId: existingSubscription.id,
        });
      }

      // Get Stripe instance
      const stripe = await getStripeInstance(companyId);
      if (!stripe) {
        return res.status(400).json({
          error: 'Stripe não configurado. Configure as chaves do Stripe primeiro.',
        });
      }

      // Ensure plan has Stripe price
      if (!servicePlan.stripePriceId) {
        return res.status(400).json({
          error: 'Plano não sincronizado com Stripe. Sincronize o plano primeiro.',
        });
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId: string;

      // Search for existing customer by email
      if (client.email) {
        const customers = await stripe.customers.list({
          email: client.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: client.email,
            name: client.name,
            phone: client.phone || undefined,
            metadata: {
              companyId: companyId!,
              clientId: client.id,
            },
          });
          stripeCustomerId = customer.id;
        }
      } else {
        // Create customer without email
        const customer = await stripe.customers.create({
          name: client.name,
          phone: client.phone || undefined,
          metadata: {
            companyId: companyId!,
            clientId: client.id,
          },
        });
        stripeCustomerId = customer.id;
      }

      // Create subscription in database (INCOMPLETE status)
      const subscription = await prisma.clientSubscription.create({
        data: {
          companyId: companyId!,
          clientId,
          servicePlanId,
          stripeCustomerId,
          status: 'INCOMPLETE',
        },
        include: {
          client: true,
          servicePlan: true,
        },
      });

      // Get company info for success/cancel URLs
      const company = await prisma.company.findUnique({
        where: { id: companyId! },
      });

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        line_items: [
          {
            price: servicePlan.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          subscriptionId: subscription.id,
          companyId: companyId!,
          clientId,
          servicePlanId,
        },
        success_url: `${process.env.FRONTEND_URL || 'https://app.advwell.pro'}/client-subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://app.advwell.pro'}/client-subscriptions?canceled=true`,
        billing_address_collection: 'required',
        payment_method_types: ['card'],
        locale: 'pt-BR',
        subscription_data: {
          metadata: {
            subscriptionId: subscription.id,
            companyId: companyId!,
          },
        },
      });

      res.status(201).json({
        message: 'Assinatura criada. Envie o link de pagamento ao cliente.',
        subscription,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      res.status(500).json({
        error: 'Erro ao criar assinatura',
        details: error.message,
      });
    }
  }

  // Cancel a subscription
  async cancel(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { reason } = req.body;

      const subscription = await prisma.clientSubscription.findFirst({
        where: { id, companyId: companyId! },
        include: {
          client: true,
          servicePlan: true,
        },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      // Cancel in Stripe if exists
      if (subscription.stripeSubscriptionId) {
        const stripe = await getStripeInstance(companyId!);
        if (stripe) {
          try {
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
          } catch (stripeError: any) {
            console.error('Erro ao cancelar no Stripe:', stripeError);
          }
        }
      }

      // Update subscription status
      const updatedSubscription = await prisma.clientSubscription.update({
        where: { id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: reason || null,
        },
        include: {
          client: true,
          servicePlan: true,
        },
      });

      res.json({
        message: 'Assinatura cancelada com sucesso',
        subscription: updatedSubscription,
      });
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  }

  // Regenerate checkout link for incomplete subscription
  async regenerateCheckout(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const subscription = await prisma.clientSubscription.findFirst({
        where: { id, companyId: companyId! },
        include: {
          servicePlan: true,
        },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      if (subscription.status !== 'INCOMPLETE') {
        return res.status(400).json({
          error: 'Só é possível regenerar link para assinaturas incompletas',
        });
      }

      const stripe = await getStripeInstance(companyId!);
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe não configurado' });
      }

      if (!subscription.servicePlan.stripePriceId) {
        return res.status(400).json({ error: 'Plano não sincronizado com Stripe' });
      }

      // Create new checkout session
      const session = await stripe.checkout.sessions.create({
        customer: subscription.stripeCustomerId || undefined,
        mode: 'subscription',
        line_items: [
          {
            price: subscription.servicePlan.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          subscriptionId: subscription.id,
          companyId: companyId!,
          clientId: subscription.clientId,
          servicePlanId: subscription.servicePlanId,
        },
        success_url: `${process.env.FRONTEND_URL || 'https://app.advwell.pro'}/client-subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://app.advwell.pro'}/client-subscriptions?canceled=true`,
        billing_address_collection: 'required',
        payment_method_types: ['card'],
        locale: 'pt-BR',
        subscription_data: {
          metadata: {
            subscriptionId: subscription.id,
            companyId: companyId!,
          },
        },
      });

      res.json({
        message: 'Novo link de checkout gerado',
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('Erro ao regenerar checkout:', error);
      res.status(500).json({
        error: 'Erro ao regenerar link de checkout',
        details: error.message,
      });
    }
  }

  // Get subscription reports/summary
  async getReports(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      // Get current date info
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Active subscriptions count
      const activeCount = await prisma.clientSubscription.count({
        where: {
          companyId: companyId!,
          status: 'ACTIVE',
        },
      });

      // Past due subscriptions (delinquent)
      const pastDueCount = await prisma.clientSubscription.count({
        where: {
          companyId: companyId!,
          status: 'PAST_DUE',
        },
      });

      // Canceled this month
      const canceledThisMonth = await prisma.clientSubscription.count({
        where: {
          companyId: companyId!,
          status: 'CANCELED',
          canceledAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      // Total received this month
      const paymentsThisMonth = await prisma.subscriptionPayment.aggregate({
        where: {
          clientSubscription: {
            companyId: companyId!,
          },
          status: 'paid',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Monthly revenue (last 12 months)
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const payments = await prisma.subscriptionPayment.aggregate({
          where: {
            clientSubscription: {
              companyId: companyId!,
            },
            status: 'paid',
            paidAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        monthlyRevenue.push({
          month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
          total: payments._sum.amount || 0,
        });
      }

      // Revenue forecast (based on active subscriptions)
      const activeSubscriptions = await prisma.clientSubscription.findMany({
        where: {
          companyId: companyId!,
          status: 'ACTIVE',
        },
        include: {
          servicePlan: true,
        },
      });

      const monthlyForecast = activeSubscriptions.reduce((total, sub) => {
        const price = sub.servicePlan.price;
        switch (sub.servicePlan.interval) {
          case 'MONTHLY':
            return total + price;
          case 'QUARTERLY':
            return total + (price / 3);
          case 'YEARLY':
            return total + (price / 12);
          default:
            return total + price;
        }
      }, 0);

      // Delinquent clients list
      const delinquentClients = await prisma.clientSubscription.findMany({
        where: {
          companyId: companyId!,
          status: 'PAST_DUE',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          servicePlan: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      });

      res.json({
        summary: {
          activeSubscriptions: activeCount,
          pastDueSubscriptions: pastDueCount,
          canceledThisMonth,
          receivedThisMonth: paymentsThisMonth._sum.amount || 0,
          monthlyForecast,
        },
        monthlyRevenue,
        delinquentClients,
      });
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      res.status(500).json({ error: 'Erro ao buscar relatórios de assinaturas' });
    }
  }

  // Get payment history for a subscription
  async getPayments(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const subscription = await prisma.clientSubscription.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const payments = await prisma.subscriptionPayment.findMany({
        where: { clientSubscriptionId: id },
        orderBy: { createdAt: 'desc' },
      });

      res.json(payments);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      res.status(500).json({ error: 'Erro ao buscar pagamentos' });
    }
  }
}

export default new ClientSubscriptionController();
