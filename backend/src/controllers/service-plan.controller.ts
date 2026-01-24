import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/encryption';
import Stripe from 'stripe';

// Use latest Stripe API version
const STRIPE_API_VERSION = '2025-12-15.clover' as const;

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

// Convert BillingInterval to Stripe interval
function toStripeInterval(interval: string): 'month' | 'year' {
  switch (interval) {
    case 'QUARTERLY':
      return 'month'; // 3 months - handled with interval_count
    case 'YEARLY':
      return 'year';
    case 'MONTHLY':
    default:
      return 'month';
  }
}

function getIntervalCount(interval: string): number {
  switch (interval) {
    case 'QUARTERLY':
      return 3;
    case 'YEARLY':
      return 1;
    case 'MONTHLY':
    default:
      return 1;
  }
}

export class ServicePlanController {
  // List all service plans for the company
  async list(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;

      const plans = await prisma.servicePlan.findMany({
        where: { companyId: companyId! },
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(plans);
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      res.status(500).json({ error: 'Erro ao listar planos de serviço' });
    }
  }

  // Get a single plan
  async get(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const plan = await prisma.servicePlan.findFirst({
        where: { id, companyId: companyId! },
        include: {
          subscriptions: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      res.status(500).json({ error: 'Erro ao buscar plano de serviço' });
    }
  }

  // Create a new service plan
  async create(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { name, description, price, interval } = req.body;

      if (!companyId) {
        return res.status(403).json({ error: 'Usuário não possui empresa associada' });
      }

      // Validate required fields
      if (!name || price === undefined) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
      }

      // Get Stripe instance
      const stripe = await getStripeInstance(companyId);

      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;

      // If Stripe is configured, create product and price
      if (stripe) {
        try {
          // Create product in Stripe
          const product = await stripe.products.create({
            name,
            description: description || undefined,
            metadata: {
              companyId,
            },
          });

          stripeProductId = product.id;

          // Create price in Stripe
          const stripePrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(price * 100), // Convert to cents
            currency: 'brl',
            recurring: {
              interval: toStripeInterval(interval || 'MONTHLY'),
              interval_count: getIntervalCount(interval || 'MONTHLY'),
            },
            metadata: {
              companyId,
            },
          });

          stripePriceId = stripePrice.id;
        } catch (stripeError: any) {
          console.error('Erro ao criar produto no Stripe:', stripeError);
          // Continue without Stripe IDs if it fails
        }
      }

      // Create plan in database
      const plan = await prisma.servicePlan.create({
        data: {
          companyId,
          name,
          description: description || null,
          price: parseFloat(price),
          interval: interval || 'MONTHLY',
          stripeProductId,
          stripePriceId,
          isActive: true,
        },
      });

      res.status(201).json({
        message: 'Plano criado com sucesso',
        plan,
        stripeConfigured: !!stripe,
      });
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      res.status(500).json({ error: 'Erro ao criar plano de serviço' });
    }
  }

  // Update a service plan
  async update(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { name, description, price, interval, isActive } = req.body;

      // Check if plan exists and belongs to company
      const existingPlan = await prisma.servicePlan.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!existingPlan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Get Stripe instance
      const stripe = await getStripeInstance(companyId!);

      let stripeProductId = existingPlan.stripeProductId;
      let stripePriceId = existingPlan.stripePriceId;

      // Update in Stripe if configured and price/interval changed
      if (stripe) {
        try {
          // Update product name/description
          if (existingPlan.stripeProductId && (name || description !== undefined)) {
            await stripe.products.update(existingPlan.stripeProductId, {
              name: name || existingPlan.name,
              description: description || undefined,
              active: isActive !== undefined ? isActive : existingPlan.isActive,
            });
          }

          // If price or interval changed, create new price (Stripe prices are immutable)
          if (price !== undefined && (price !== existingPlan.price || interval !== existingPlan.interval)) {
            if (existingPlan.stripeProductId) {
              // Archive old price
              if (existingPlan.stripePriceId) {
                await stripe.prices.update(existingPlan.stripePriceId, { active: false });
              }

              // Create new price
              const newPrice = await stripe.prices.create({
                product: existingPlan.stripeProductId,
                unit_amount: Math.round(price * 100),
                currency: 'brl',
                recurring: {
                  interval: toStripeInterval(interval || existingPlan.interval),
                  interval_count: getIntervalCount(interval || existingPlan.interval),
                },
                metadata: {
                  companyId: companyId!,
                },
              });

              stripePriceId = newPrice.id;
            }
          }
        } catch (stripeError: any) {
          console.error('Erro ao atualizar produto no Stripe:', stripeError);
          // Continue with update even if Stripe fails
        }
      }

      // Update plan in database
      const plan = await prisma.servicePlan.update({
        where: { id },
        data: {
          name: name || existingPlan.name,
          description: description !== undefined ? description : existingPlan.description,
          price: price !== undefined ? parseFloat(price) : existingPlan.price,
          interval: interval || existingPlan.interval,
          stripeProductId,
          stripePriceId,
          isActive: isActive !== undefined ? isActive : existingPlan.isActive,
        },
      });

      res.json({
        message: 'Plano atualizado com sucesso',
        plan,
      });
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      res.status(500).json({ error: 'Erro ao atualizar plano de serviço' });
    }
  }

  // Delete a service plan
  async delete(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      // Check if plan exists and belongs to company
      const plan = await prisma.servicePlan.findFirst({
        where: { id, companyId: companyId! },
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Check for active subscriptions
      const activeSubscriptions = await prisma.clientSubscription.count({
        where: {
          servicePlanId: id,
          status: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING'] },
        },
      });

      if (activeSubscriptions > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir plano com assinaturas ativas',
          activeSubscriptions,
        });
      }

      // Archive in Stripe instead of deleting
      const stripe = await getStripeInstance(companyId!);
      if (stripe && plan.stripeProductId) {
        try {
          await stripe.products.update(plan.stripeProductId, { active: false });
          if (plan.stripePriceId) {
            await stripe.prices.update(plan.stripePriceId, { active: false });
          }
        } catch (stripeError: any) {
          console.error('Erro ao arquivar produto no Stripe:', stripeError);
        }
      }

      // Delete from database
      await prisma.servicePlan.delete({
        where: { id },
      });

      res.json({ message: 'Plano excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      res.status(500).json({ error: 'Erro ao excluir plano de serviço' });
    }
  }

  // Sync plan with Stripe (create product/price if missing)
  async syncWithStripe(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const plan = await prisma.servicePlan.findFirst({
        where: { id, companyId: companyId! },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      const stripe = await getStripeInstance(companyId!);
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe não configurado' });
      }

      let stripeProductId = plan.stripeProductId;
      let stripePriceId = plan.stripePriceId;

      // Create product if missing
      if (!stripeProductId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description || undefined,
          metadata: {
            companyId: companyId!,
            planId: plan.id,
          },
        });
        stripeProductId = product.id;
      }

      // Create price if missing
      if (!stripePriceId && stripeProductId) {
        const price = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round(Number(plan.price) * 100),
          currency: 'brl',
          recurring: {
            interval: toStripeInterval(plan.interval),
            interval_count: getIntervalCount(plan.interval),
          },
          metadata: {
            companyId: companyId!,
            planId: plan.id,
          },
        });
        stripePriceId = price.id;
      }

      // Update plan with Stripe IDs
      const updatedPlan = await prisma.servicePlan.update({
        where: { id },
        data: {
          stripeProductId,
          stripePriceId,
        },
      });

      res.json({
        message: 'Plano sincronizado com Stripe',
        plan: updatedPlan,
      });
    } catch (error: any) {
      console.error('Erro ao sincronizar com Stripe:', error);
      res.status(500).json({
        error: 'Erro ao sincronizar com Stripe',
        details: error.message,
      });
    }
  }
}

export default new ServicePlanController();
