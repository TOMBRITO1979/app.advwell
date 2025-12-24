import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { companyRateLimit } from '../middleware/company-rate-limit';
import { redis } from '../utils/redis';

const router = Router();

// TAREFA 5.1: Rate limiting Redis-backed para webhook
const createRedisStore = (prefix: string) => new RedisStore({
  // @ts-expect-error - ioredis sendCommand é compatível
  sendCommand: (...args: string[]) => redis.call(...args),
  prefix: `ratelimit:subscription:${prefix}:`,
});

// Rate limit para webhook Stripe (protege contra abuso, mas permite uso normal)
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 webhooks por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('webhook'),
  message: { error: 'Muitas requisições de webhook. Tente novamente mais tarde.' },
});

// Public route - get available plans (no auth needed)
router.get('/plans', subscriptionController.getPlans);

// Webhook endpoint - needs raw body, no auth
// O express.raw() é aplicado no index.ts ANTES do express.json() global
// TAREFA 5.1: Rate limit aplicado
router.post(
  '/webhook',
  webhookRateLimiter,
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
