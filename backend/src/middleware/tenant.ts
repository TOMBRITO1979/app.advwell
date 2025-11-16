import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../utils/prisma';

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

    // Verifica se a empresa está ativa
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
    });

    if (!company || !company.active) {
      return res.status(403).json({ error: 'Empresa inativa ou não encontrada' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao validar tenant' });
  }
};
