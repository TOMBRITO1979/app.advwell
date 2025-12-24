import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../utils/prisma';
import { cache } from '../utils/redis';
import { appLogger } from '../utils/logger';

// Cache TTL for company validation (5 minutes)
const COMPANY_CACHE_TTL = 300;

// Routes that are allowed even without valid subscription
const SUBSCRIPTION_EXEMPT_ROUTES = [
  '/api/subscription',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/users/me',
];

interface CompanyStatus {
  active: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
}

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
    const cacheKey = `company:status:${companyId}`;

    // Try to get from cache first
    let companyStatus = await cache.get<CompanyStatus>(cacheKey);

    if (companyStatus === null) {
      // Not in cache, query database
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          active: true,
          subscriptionStatus: true,
          trialEndsAt: true,
        },
      });

      if (!company) {
        return res.status(403).json({ error: 'Empresa não encontrada' });
      }

      companyStatus = {
        active: company.active,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt,
      };

      // Cache the result
      await cache.set(cacheKey, companyStatus, COMPANY_CACHE_TTL);
    }

    if (!companyStatus.active) {
      return res.status(403).json({ error: 'Empresa inativa' });
    }

    // Check subscription status (allow exempt routes)
    const isExemptRoute = SUBSCRIPTION_EXEMPT_ROUTES.some(route =>
      req.originalUrl.startsWith(route)
    );

    if (!isExemptRoute) {
      const subscriptionResult = checkSubscriptionValidity(companyStatus);
      if (!subscriptionResult.valid) {
        return res.status(402).json({
          error: 'Assinatura expirada',
          code: 'SUBSCRIPTION_EXPIRED',
          message: subscriptionResult.message,
          redirectTo: '/subscription',
        });
      }
    }

    next();
  } catch (error) {
    appLogger.error('Error validating tenant', error as Error);
    // On Redis error, fall back to direct database query
    try {
      const company = await prisma.company.findUnique({
        where: { id: req.user?.companyId },
        select: {
          active: true,
          subscriptionStatus: true,
          trialEndsAt: true,
        },
      });

      if (!company || !company.active) {
        return res.status(403).json({ error: 'Empresa inativa ou não encontrada' });
      }

      // Check subscription on fallback too
      const isExemptRoute = SUBSCRIPTION_EXEMPT_ROUTES.some(route =>
        req.originalUrl.startsWith(route)
      );

      if (!isExemptRoute) {
        const subscriptionResult = checkSubscriptionValidity({
          active: company.active,
          subscriptionStatus: company.subscriptionStatus,
          trialEndsAt: company.trialEndsAt,
        });

        if (!subscriptionResult.valid) {
          return res.status(402).json({
            error: 'Assinatura expirada',
            code: 'SUBSCRIPTION_EXPIRED',
            message: subscriptionResult.message,
            redirectTo: '/subscription',
          });
        }
      }

      next();
    } catch (dbError) {
      return res.status(500).json({ error: 'Erro ao validar tenant' });
    }
  }
};

/**
 * Check if subscription is valid
 */
function checkSubscriptionValidity(status: CompanyStatus): { valid: boolean; message?: string } {
  // Active subscription is always valid
  if (status.subscriptionStatus === 'ACTIVE') {
    return { valid: true };
  }

  // Trial - check if not expired
  if (status.subscriptionStatus === 'TRIAL') {
    if (!status.trialEndsAt) {
      return { valid: false, message: 'Período de teste não configurado' };
    }

    const now = new Date();
    if (now > new Date(status.trialEndsAt)) {
      return { valid: false, message: 'Seu período de teste expirou. Assine um plano para continuar.' };
    }

    return { valid: true };
  }

  // Expired or Cancelled
  if (status.subscriptionStatus === 'EXPIRED') {
    return { valid: false, message: 'Sua assinatura expirou. Renove para continuar usando o sistema.' };
  }

  if (status.subscriptionStatus === 'CANCELLED') {
    return { valid: false, message: 'Sua assinatura foi cancelada. Assine novamente para continuar.' };
  }

  // No subscription status (legacy companies) - consider as trial expired
  return { valid: false, message: 'Assine um plano para começar a usar o sistema.' };
}

// Helper to invalidate company cache (call when company is updated)
export const invalidateCompanyCache = async (companyId: string) => {
  await cache.del(`company:status:${companyId}`);
  await cache.del(`company:active:${companyId}`); // Legacy cache key
};
