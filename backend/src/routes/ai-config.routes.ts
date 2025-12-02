import { Router } from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/ai-config.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { validate } from '../middleware/validation';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticate, validateTenant);

// All AI config routes require ADMIN or SUPER_ADMIN role
router.use(requireAdmin);

// Validações
const configValidation = [
  body('provider').isIn(['openai', 'gemini', 'anthropic', 'groq']).withMessage('Provider inválido'),
  body('model').trim().notEmpty().withMessage('Modelo é obrigatório').isLength({ max: 100 }),
  body('apiKey').trim().notEmpty().withMessage('API Key é obrigatória').isLength({ min: 10 }),
  body('autoSummarize').optional().isBoolean().withMessage('autoSummarize deve ser booleano'),
  validate,
];

const testProviderValidation = [
  body('provider').isIn(['openai', 'gemini', 'anthropic', 'groq']).withMessage('Provider inválido'),
  body('apiKey').trim().notEmpty().withMessage('API Key é obrigatória').isLength({ min: 10 }),
  body('model').optional().trim().isLength({ max: 100 }),
  validate,
];

/**
 * GET /api/ai-config
 * Get AI configuration for current company
 */
router.get('/', controller.getConfig);

/**
 * POST /api/ai-config
 * Create or update AI configuration for current company
 */
router.post('/', configValidation, controller.upsertConfig);

/**
 * DELETE /api/ai-config
 * Delete AI configuration for current company
 */
router.delete('/', controller.deleteConfig);

/**
 * POST /api/ai-config/test
 * Test connection with configured AI provider
 */
router.post('/test', controller.testConnection);

/**
 * POST /api/ai-config/test-provider
 * Test connection with specific provider (for setup wizard)
 */
router.post('/test-provider', testProviderValidation, controller.testProviderConnection);

/**
 * GET /api/ai-config/models
 * Get available AI models for each provider
 */
router.get('/models', controller.getAvailableModels);

export default router;
