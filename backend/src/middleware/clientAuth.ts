import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware que valida se o usuário é do tipo CLIENT e tem clientId vinculado
 * Usado para proteger rotas do portal do cliente
 */
export const requireClient = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (req.user.role !== 'CLIENT') {
    return res.status(403).json({
      error: 'Acesso restrito',
      message: 'Esta área é exclusiva para clientes do portal'
    });
  }

  if (!req.user.clientId) {
    return res.status(403).json({
      error: 'Cliente não vinculado',
      message: 'Seu usuário não está vinculado a um cadastro de cliente. Contate o escritório.'
    });
  }

  next();
};

/**
 * Middleware que permite acesso tanto para clientes quanto para admins do sistema
 * Útil para rotas compartilhadas entre portal e sistema principal
 */
export const requireClientOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const isClient = req.user.role === 'CLIENT' && req.user.clientId;
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'USER'].includes(req.user.role);

  if (!isClient && !isAdmin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  next();
};
