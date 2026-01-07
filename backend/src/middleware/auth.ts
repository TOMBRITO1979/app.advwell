import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload, isTokenBlacklisted, areUserTokensInvalidated } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verifyToken(token);

    // TAREFA 2.1: Verificar se o token esta na blacklist (logout)
    if (decoded.jti) {
      const blacklisted = await isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
        return res.status(401).json({ error: 'Token revogado - por favor, faça login novamente' });
      }
    }

    // TAREFA 2.1: Verificar se todos os tokens do usuario foram invalidados
    // Isso acontece quando o usuario faz "logout de todas as sessoes"
    const tokenPayload = decoded as JwtPayload & { iat?: number };
    if (tokenPayload.iat) {
      const invalidated = await areUserTokensInvalidated(decoded.userId, tokenPayload.iat);
      if (invalidated) {
        return res.status(401).json({ error: 'Sessão expirada - por favor, faça login novamente' });
      }
    }

    // SEGURANCA: Validar que usuarios USER e ADMIN devem ter companyId
    // Apenas SUPER_ADMIN pode operar sem empresa
    if (decoded.role !== 'SUPER_ADMIN' && !decoded.companyId) {
      return res.status(403).json({
        error: 'Usuário sem empresa associada',
        message: 'Este usuário não possui uma empresa vinculada. Contate o administrador.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');

// Check if user has permission for a specific resource
// ADMIN and SUPER_ADMIN always have access
// USER role needs explicit permission in the database
export const requirePermission = (resource: string, action: 'view' | 'edit' | 'delete' = 'view') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // SUPER_ADMIN and ADMIN always have access
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    // For USER role, check permission in database
    if (req.user.role === 'USER') {
      try {
        const permission = await prisma.permission.findFirst({
          where: {
            userId: req.user.userId,
            companyId: req.user.companyId,
            resource: resource,
          },
        });

        if (!permission) {
          return res.status(403).json({ error: 'Acesso negado - sem permissão para este recurso' });
        }

        const actionMap = {
          view: permission.canView,
          edit: permission.canEdit,
          delete: permission.canDelete,
        };

        if (!actionMap[action]) {
          return res.status(403).json({ error: `Acesso negado - sem permissão para ${action}` });
        }

        return next();
      } catch (error) {
        console.error('Error checking permission:', error);
        return res.status(500).json({ error: 'Erro ao verificar permissões' });
      }
    }

    // CLIENT or other roles don't have access
    return res.status(403).json({ error: 'Acesso negado' });
  };
};
