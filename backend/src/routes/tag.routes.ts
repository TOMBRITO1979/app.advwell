import { Router } from 'express';
import { body } from 'express-validator';
import tagController from '../controllers/tag.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { companyRateLimit } from '../middleware/company-rate-limit';

const router = Router();

// Apply authentication, rate limit and tenant validation to all routes
router.use(authenticate, companyRateLimit, validateTenant);

// Validations
const tagValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ max: 50 })
    .withMessage('Nome deve ter no máximo 50 caracteres'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Cor inválida. Use formato hex (ex: #3B82F6)'),
  validate,
];

/**
 * GET /api/tags
 * List all tags for current company (with usage counts)
 */
router.get('/', tagController.list);

/**
 * GET /api/tags/search
 * Search tags (autocomplete)
 */
router.get('/search', tagController.search);

/**
 * GET /api/tags/:id
 * Get single tag by ID
 */
router.get('/:id', tagController.get);

/**
 * POST /api/tags
 * Create new tag (Admin only)
 */
router.post('/', requireAdmin, tagValidation, tagController.create);

/**
 * PUT /api/tags/:id
 * Update tag (Admin only)
 */
router.put('/:id', requireAdmin, tagValidation, tagController.update);

/**
 * DELETE /api/tags/:id
 * Delete tag (Admin only)
 */
router.delete('/:id', requireAdmin, tagController.delete);

export default router;
