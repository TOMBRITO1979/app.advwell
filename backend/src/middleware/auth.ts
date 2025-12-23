import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload, isTokenBlacklisted, areUserTokensInvalidated } from '../utils/jwt';

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
