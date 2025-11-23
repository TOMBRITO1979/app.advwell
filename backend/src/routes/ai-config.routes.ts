import { Router } from 'express';
import * as controller from '../controllers/ai-config.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticate, validateTenant);

// All AI config routes require ADMIN or SUPER_ADMIN role
router.use(requireAdmin);

/**
 * GET /api/ai-config
 * Get AI configuration for current company
 */
router.get('/', controller.getConfig);

/**
 * POST /api/ai-config
 * Create or update AI configuration for current company
 */
router.post('/', controller.upsertConfig);

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
router.post('/test-provider', controller.testProviderConnection);

/**
 * GET /api/ai-config/models
 * Get available AI models for each provider
 */
router.get('/models', controller.getAvailableModels);

export default router;
