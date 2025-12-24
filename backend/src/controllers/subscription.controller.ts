import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as stripeService from '../services/stripe.service';
import { appLogger } from '../utils/logger';

/**
 * Get subscription info for current company
 */
export const getSubscriptionInfo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const companyId = req.user.companyId;
    const info = await stripeService.getSubscriptionInfo(companyId);
    res.json(info);
  } catch (error) {
    appLogger.error('Error getting subscription info', error as Error);
    res.status(500).json({ error: 'Failed to get subscription info' });
  }
};

/**
 * Get available plans
 */
export const getPlans = async (req: Request, res: Response) => {
  try {
    res.json({
      plans: stripeService.SUBSCRIPTION_PLANS,
      trialDuration: stripeService.TRIAL_DURATION_DAYS,
    });
  } catch (error) {
    appLogger.error('Error getting plans', error as Error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
};

/**
 * Create checkout session for subscription
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const companyId = req.user.companyId;

    if (!plan || !['BRONZE', 'PRATA', 'OURO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose: BRONZE, PRATA, or OURO' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.advwell.pro';
    const successUrl = `${frontendUrl}/subscription?success=true`;
    const cancelUrl = `${frontendUrl}/subscription?canceled=true`;

    const checkoutUrl = await stripeService.createCheckoutSession(
      companyId,
      plan,
      successUrl,
      cancelUrl
    );

    res.json({ url: checkoutUrl });
  } catch (error) {
    appLogger.error('Error creating checkout session', error as Error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * Create billing portal session
 */
export const createBillingPortal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const companyId = req.user.companyId;
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.advwell.pro';
    const returnUrl = `${frontendUrl}/subscription`;

    const portalUrl = await stripeService.createBillingPortalSession(companyId, returnUrl);
    res.json({ url: portalUrl });
  } catch (error: any) {
    appLogger.error('Error creating billing portal', error as Error);

    if (error.message === 'No Stripe customer found for this company') {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    res.status(500).json({ error: 'Failed to create billing portal' });
  }
};

/**
 * Handle Stripe webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const result = await stripeService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error: any) {
    appLogger.error('Webhook error', error as Error);
    res.status(400).json({ error: 'Erro ao processar webhook' }); // Safe: no error.message exposure
  }
};

/**
 * Check subscription status (for middleware validation)
 */
export const checkStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const companyId = req.user.companyId;
    const status = await stripeService.checkSubscriptionStatus(companyId);
    res.json(status);
  } catch (error) {
    appLogger.error('Error checking subscription status', error as Error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
};
