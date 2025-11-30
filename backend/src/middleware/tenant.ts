import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../utils/prisma';
import { cache } from '../utils/redis';

// Cache TTL for company validation (5 minutes)
const COMPANY_CACHE_TTL = 300;

export const validateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Super admin não precisa de validação de tenant
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.user?.companyId) {
      return res.status(403).json({ error: 'Empresa não associada ao usuário' });
    }

    const companyId = req.user.companyId;
    const cacheKey = `company:active:${companyId}`;

    // Try to get from cache first
    let isActive = await cache.get<boolean>(cacheKey);

    if (isActive === null) {
      // Not in cache, query database
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { active: true },
      });

      if (!company) {
        return res.status(403).json({ error: 'Empresa não encontrada' });
      }

      isActive = company.active;

      // Cache the result
      await cache.set(cacheKey, isActive, COMPANY_CACHE_TTL);
    }

    if (!isActive) {
      return res.status(403).json({ error: 'Empresa inativa' });
    }

    next();
  } catch (error) {
    console.error('Error validating tenant:', error);
    // On Redis error, fall back to direct database query
    try {
      const company = await prisma.company.findUnique({
        where: { id: req.user?.companyId },
        select: { active: true },
      });

      if (!company || !company.active) {
        return res.status(403).json({ error: 'Empresa inativa ou não encontrada' });
      }

      next();
    } catch (dbError) {
      return res.status(500).json({ error: 'Erro ao validar tenant' });
    }
  }
};

// Helper to invalidate company cache (call when company is updated)
export const invalidateCompanyCache = async (companyId: string) => {
  await cache.del(`company:active:${companyId}`);
};
