import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  // Public routes (authenticated users)
  getCategories,
  getCategoryBySlug,
  getArticleBySlug,
  getFAQs,
  rateFAQ,
  searchManual,
  // Admin routes (SUPER_ADMIN only)
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetArticles,
  adminGetArticle,
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminGetFAQs,
  adminCreateFAQ,
  adminUpdateFAQ,
  adminDeleteFAQ,
  adminReorder,
} from '../controllers/manual.controller';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (usuários autenticados podem ver o manual)
// ============================================================================

// Listar todas as categorias ativas
router.get('/categories', authenticate, getCategories);

// Buscar categoria por slug
router.get('/categories/:slug', authenticate, getCategoryBySlug);

// Buscar artigo por slug
router.get('/categories/:categorySlug/articles/:articleSlug', authenticate, getArticleBySlug);

// Listar FAQs
router.get('/faqs', authenticate, getFAQs);

// Avaliar FAQ (útil/não útil)
router.post('/faqs/:id/rate', authenticate, rateFAQ);

// Buscar no manual
router.get('/search', authenticate, searchManual);

// ============================================================================
// ADMIN ROUTES (apenas SUPER_ADMIN)
// ============================================================================

// Categorias - Admin
router.get('/admin/categories', authenticate, requireSuperAdmin, adminGetCategories);
router.post('/admin/categories', authenticate, requireSuperAdmin, adminCreateCategory);
router.put('/admin/categories/:id', authenticate, requireSuperAdmin, adminUpdateCategory);
router.delete('/admin/categories/:id', authenticate, requireSuperAdmin, adminDeleteCategory);

// Artigos - Admin
router.get('/admin/articles', authenticate, requireSuperAdmin, adminGetArticles);
router.get('/admin/articles/:id', authenticate, requireSuperAdmin, adminGetArticle);
router.post('/admin/articles', authenticate, requireSuperAdmin, adminCreateArticle);
router.put('/admin/articles/:id', authenticate, requireSuperAdmin, adminUpdateArticle);
router.delete('/admin/articles/:id', authenticate, requireSuperAdmin, adminDeleteArticle);

// FAQs - Admin
router.get('/admin/faqs', authenticate, requireSuperAdmin, adminGetFAQs);
router.post('/admin/faqs', authenticate, requireSuperAdmin, adminCreateFAQ);
router.put('/admin/faqs/:id', authenticate, requireSuperAdmin, adminUpdateFAQ);
router.delete('/admin/faqs/:id', authenticate, requireSuperAdmin, adminDeleteFAQ);

// Reordenação - Admin
router.post('/admin/reorder', authenticate, requireSuperAdmin, adminReorder);

export default router;
