import { Router } from 'express';
import express from 'express';
import stripeWebhookController from '../controllers/stripe-webhook.controller';

const router = Router();

// Webhook route needs raw body for Stripe signature verification
// This must be applied BEFORE any other body parsers
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  stripeWebhookController.handleWebhook
);

export default router;
