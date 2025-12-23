import { Router } from 'express';
import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Public route - get available plans (no auth needed)
router.get('/plans', subscriptionController.getPlans);

// Webhook endpoint - needs raw body, no auth
// IMPORTANT: This must be registered before json middleware parses the body
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);

// Protected routes - require authentication and rate limit
router.use(authenticate);
router.use(companyRateLimit);
router.use(validateTenant);

// Get subscription info for current company
router.get('/info', subscriptionController.getSubscriptionInfo);

// Check subscription status
router.get('/status', subscriptionController.checkStatus);

// Create checkout session
router.post('/checkout', subscriptionController.createCheckoutSession);

// Create billing portal session
router.post('/billing-portal', subscriptionController.createBillingPortal);

export default router;
