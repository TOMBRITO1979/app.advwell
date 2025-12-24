import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { appLogger } from '../utils/logger';

export interface ApiKeyRequest extends Request {
  company?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Middleware para autenticação via API Key
 * Usado para webhooks e integrações externas (ex: Chatwoot)
 *
 * Header esperado: X-API-Key: sua-api-key-aqui
 */
export const authenticateApiKey = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      return res.status(401).json({
        error: 'API Key não fornecida',
        message: 'Inclua o header X-API-Key com sua chave de API'
      });
    }

    // Busca a empresa pela API Key
    const company = await prisma.company.findFirst({
      where: {
        apiKey,
        active: true
      },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    if (!company) {
      return res.status(401).json({
        error: 'API Key inválida',
        message: 'A chave de API fornecida não é válida ou a empresa está inativa'
      });
    }

    // Anexa a empresa ao request
    req.company = company;
    next();
  } catch (error) {
    appLogger.error('Erro ao autenticar API Key', error as Error);
    return res.status(500).json({ error: 'Erro ao processar autenticação' });
  }
};
