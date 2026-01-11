import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

// ============================================================================
// PUBLIC ROUTES (para usuários autenticados verem o manual)
// ============================================================================

/**
 * Lista todas as categorias ativas com artigos e FAQs
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.manualCategory.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: {
        articles: {
          where: { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            videoUrl: true,
            thumbnailUrl: true,
            viewCount: true,
          },
        },
        faqs: {
          where: { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            answer: true,
            helpful: true,
            notHelpful: true,
          },
        },
        _count: {
          select: {
            articles: { where: { active: true } },
            faqs: { where: { active: true } },
          },
        },
      },
    });

    return res.json(categories);
  } catch (error) {
    appLogger.error('Erro ao buscar categorias do manual', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

/**
 * Busca uma categoria por slug
 */
export const getCategoryBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await prisma.manualCategory.findFirst({
      where: { slug, active: true },
      include: {
        articles: {
          where: { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            videoUrl: true,
            thumbnailUrl: true,
            viewCount: true,
          },
        },
        faqs: {
          where: { active: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    return res.json(category);
  } catch (error) {
    appLogger.error('Erro ao buscar categoria do manual', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar categoria' });
  }
};

/**
 * Busca um artigo por slug
 */
export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const { categorySlug, articleSlug } = req.params;

    const category = await prisma.manualCategory.findFirst({
      where: { slug: categorySlug, active: true },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const article = await prisma.manualArticle.findFirst({
      where: {
        categoryId: category.id,
        slug: articleSlug,
        active: true,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    // Incrementar contador de visualizações
    await prisma.manualArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    return res.json(article);
  } catch (error) {
    appLogger.error('Erro ao buscar artigo do manual', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar artigo' });
  }
};

/**
 * Busca todas as FAQs (opcionalmente filtradas por categoria)
 */
export const getFAQs = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    const faqs = await prisma.manualFAQ.findMany({
      where: {
        active: true,
        ...(categoryId ? { categoryId: categoryId as string } : {}),
      },
      orderBy: [{ order: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return res.json(faqs);
  } catch (error) {
    appLogger.error('Erro ao buscar FAQs', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar FAQs' });
  }
};

/**
 * Marca uma FAQ como útil/não útil
 */
export const rateFAQ = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Campo helpful é obrigatório (boolean)' });
    }

    const faq = await prisma.manualFAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    await prisma.manualFAQ.update({
      where: { id },
      data: helpful
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } },
    });

    return res.json({ message: 'Obrigado pelo feedback!' });
  } catch (error) {
    appLogger.error('Erro ao avaliar FAQ', error as Error);
    return res.status(500).json({ error: 'Erro ao avaliar FAQ' });
  }
};

/**
 * Busca no manual (artigos e FAQs)
 */
export const searchManual = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Busca deve ter pelo menos 2 caracteres' });
    }

    const searchTerm = `%${q}%`;

    // Buscar artigos
    const articles = await prisma.manualArticle.findMany({
      where: {
        active: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      take: 10,
    });

    // Buscar FAQs
    const faqs = await prisma.manualFAQ.findMany({
      where: {
        active: true,
        OR: [
          { question: { contains: q, mode: 'insensitive' } },
          { answer: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        question: true,
        answer: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      take: 10,
    });

    return res.json({ articles, faqs });
  } catch (error) {
    appLogger.error('Erro ao buscar no manual', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar no manual' });
  }
};

// ============================================================================
// ADMIN ROUTES (apenas SUPER_ADMIN)
// ============================================================================

/**
 * Lista todas as categorias (incluindo inativas) - ADMIN
 */
export const adminGetCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.manualCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            articles: true,
            faqs: true,
          },
        },
      },
    });

    return res.json(categories);
  } catch (error) {
    appLogger.error('Erro ao buscar categorias (admin)', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

/**
 * Cria uma nova categoria - ADMIN
 */
export const adminCreateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, icon, order, active } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
    }

    // Verificar se slug já existe
    const existing = await prisma.manualCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma categoria com este slug' });
    }

    const category = await prisma.manualCategory.create({
      data: {
        name,
        slug,
        description,
        icon,
        order: order || 0,
        active: active !== false,
      },
    });

    appLogger.info('Categoria do manual criada', { categoryId: category.id, name });

    return res.status(201).json(category);
  } catch (error) {
    appLogger.error('Erro ao criar categoria', error as Error);
    return res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

/**
 * Atualiza uma categoria - ADMIN
 */
export const adminUpdateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, order, active } = req.body;

    const existing = await prisma.manualCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Verificar se slug já existe em outra categoria
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.manualCategory.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return res.status(400).json({ error: 'Já existe uma categoria com este slug' });
      }
    }

    const category = await prisma.manualCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
      },
    });

    appLogger.info('Categoria do manual atualizada', { categoryId: id });

    return res.json(category);
  } catch (error) {
    appLogger.error('Erro ao atualizar categoria', error as Error);
    return res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

/**
 * Exclui uma categoria - ADMIN
 */
export const adminDeleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.manualCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { articles: true, faqs: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    if (category._count.articles > 0 || category._count.faqs > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir categoria com artigos ou FAQs. Remova-os primeiro.',
      });
    }

    await prisma.manualCategory.delete({
      where: { id },
    });

    appLogger.info('Categoria do manual excluída', { categoryId: id });

    return res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao excluir categoria', error as Error);
    return res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
};

/**
 * Lista todos os artigos (incluindo inativos) - ADMIN
 */
export const adminGetArticles = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    const articles = await prisma.manualArticle.findMany({
      where: categoryId ? { categoryId: categoryId as string } : {},
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return res.json(articles);
  } catch (error) {
    appLogger.error('Erro ao buscar artigos (admin)', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar artigos' });
  }
};

/**
 * Busca um artigo por ID - ADMIN
 */
export const adminGetArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const article = await prisma.manualArticle.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    return res.json(article);
  } catch (error) {
    appLogger.error('Erro ao buscar artigo (admin)', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar artigo' });
  }
};

/**
 * Cria um novo artigo - ADMIN
 */
export const adminCreateArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, title, slug, summary, content, videoUrl, thumbnailUrl, order, active } = req.body;

    if (!categoryId || !title || !slug || !content) {
      return res.status(400).json({ error: 'Categoria, título, slug e conteúdo são obrigatórios' });
    }

    // Verificar se categoria existe
    const category = await prisma.manualCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }

    // Verificar se slug já existe na categoria
    const existing = await prisma.manualArticle.findFirst({
      where: { categoryId, slug },
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um artigo com este slug nesta categoria' });
    }

    const article = await prisma.manualArticle.create({
      data: {
        categoryId,
        title,
        slug,
        summary,
        content,
        videoUrl,
        thumbnailUrl,
        order: order || 0,
        active: active !== false,
      },
    });

    appLogger.info('Artigo do manual criado', { articleId: article.id, title });

    return res.status(201).json(article);
  } catch (error) {
    appLogger.error('Erro ao criar artigo', error as Error);
    return res.status(500).json({ error: 'Erro ao criar artigo' });
  }
};

/**
 * Atualiza um artigo - ADMIN
 */
export const adminUpdateArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, title, slug, summary, content, videoUrl, thumbnailUrl, order, active } = req.body;

    const existing = await prisma.manualArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    // Verificar se slug já existe em outro artigo da mesma categoria
    if (slug && (slug !== existing.slug || categoryId !== existing.categoryId)) {
      const targetCategoryId = categoryId || existing.categoryId;
      const slugExists = await prisma.manualArticle.findFirst({
        where: { categoryId: targetCategoryId, slug, id: { not: id } },
      });
      if (slugExists) {
        return res.status(400).json({ error: 'Já existe um artigo com este slug nesta categoria' });
      }
    }

    const article = await prisma.manualArticle.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(title && { title }),
        ...(slug && { slug }),
        ...(summary !== undefined && { summary }),
        ...(content && { content }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
      },
    });

    appLogger.info('Artigo do manual atualizado', { articleId: id });

    return res.json(article);
  } catch (error) {
    appLogger.error('Erro ao atualizar artigo', error as Error);
    return res.status(500).json({ error: 'Erro ao atualizar artigo' });
  }
};

/**
 * Exclui um artigo - ADMIN
 */
export const adminDeleteArticle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const article = await prisma.manualArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    await prisma.manualArticle.delete({
      where: { id },
    });

    appLogger.info('Artigo do manual excluído', { articleId: id });

    return res.json({ message: 'Artigo excluído com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao excluir artigo', error as Error);
    return res.status(500).json({ error: 'Erro ao excluir artigo' });
  }
};

/**
 * Lista todas as FAQs (incluindo inativas) - ADMIN
 */
export const adminGetFAQs = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    const faqs = await prisma.manualFAQ.findMany({
      where: categoryId ? { categoryId: categoryId as string } : {},
      orderBy: [{ order: 'asc' }],
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return res.json(faqs);
  } catch (error) {
    appLogger.error('Erro ao buscar FAQs (admin)', error as Error);
    return res.status(500).json({ error: 'Erro ao buscar FAQs' });
  }
};

/**
 * Cria uma nova FAQ - ADMIN
 */
export const adminCreateFAQ = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, question, answer, order, active } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });
    }

    // Verificar se categoria existe (se fornecida)
    if (categoryId) {
      const category = await prisma.manualCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(400).json({ error: 'Categoria não encontrada' });
      }
    }

    const faq = await prisma.manualFAQ.create({
      data: {
        categoryId,
        question,
        answer,
        order: order || 0,
        active: active !== false,
      },
    });

    appLogger.info('FAQ criada', { faqId: faq.id });

    return res.status(201).json(faq);
  } catch (error) {
    appLogger.error('Erro ao criar FAQ', error as Error);
    return res.status(500).json({ error: 'Erro ao criar FAQ' });
  }
};

/**
 * Atualiza uma FAQ - ADMIN
 */
export const adminUpdateFAQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, question, answer, order, active } = req.body;

    const existing = await prisma.manualFAQ.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    const faq = await prisma.manualFAQ.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(question && { question }),
        ...(answer && { answer }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
      },
    });

    appLogger.info('FAQ atualizada', { faqId: id });

    return res.json(faq);
  } catch (error) {
    appLogger.error('Erro ao atualizar FAQ', error as Error);
    return res.status(500).json({ error: 'Erro ao atualizar FAQ' });
  }
};

/**
 * Exclui uma FAQ - ADMIN
 */
export const adminDeleteFAQ = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const faq = await prisma.manualFAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    await prisma.manualFAQ.delete({
      where: { id },
    });

    appLogger.info('FAQ excluída', { faqId: id });

    return res.json({ message: 'FAQ excluída com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao excluir FAQ', error as Error);
    return res.status(500).json({ error: 'Erro ao excluir FAQ' });
  }
};

/**
 * Reordena itens (categorias, artigos ou FAQs) - ADMIN
 */
export const adminReorder = async (req: AuthRequest, res: Response) => {
  try {
    const { type, items } = req.body;

    if (!type || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Tipo e items são obrigatórios' });
    }

    if (!['category', 'article', 'faq'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: category, article ou faq' });
    }

    // Atualizar ordem de cada item
    const updates = items.map((item: { id: string; order: number }, index: number) => {
      const order = item.order !== undefined ? item.order : index;

      switch (type) {
        case 'category':
          return prisma.manualCategory.update({
            where: { id: item.id },
            data: { order },
          });
        case 'article':
          return prisma.manualArticle.update({
            where: { id: item.id },
            data: { order },
          });
        case 'faq':
          return prisma.manualFAQ.update({
            where: { id: item.id },
            data: { order },
          });
        default:
          throw new Error('Tipo inválido');
      }
    });

    await Promise.all(updates);

    appLogger.info('Itens do manual reordenados', { type, count: items.length });

    return res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    appLogger.error('Erro ao reordenar itens', error as Error);
    return res.status(500).json({ error: 'Erro ao reordenar itens' });
  }
};
