import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from '../utils/redis';
import { appLogger } from '../utils/logger';

// ============================================
// TAREFA 12: CSRF Protection Middleware
// Implementa Double Submit Cookie + Origin/Referer validation
// ============================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_TTL = 3600; // 1 hora
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Metodos que requerem validacao CSRF (modificam dados)
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Rotas isentas de CSRF (webhooks externos, APIs publicas)
// NOTA: req.path pode ou nao incluir /api dependendo de onde o middleware e aplicado
const EXEMPT_ROUTES = [
  '/api/subscription/webhook',      // Stripe webhook (usa assinatura propria)
  '/subscription/webhook',          // Sem prefixo /api
  '/api/auth/login',                // Login inicial (sem token ainda)
  '/auth/login',                    // Sem prefixo /api
  '/api/auth/register',             // Registro (sem token ainda)
  '/auth/register',                 // Sem prefixo /api
  '/api/auth/forgot-password',      // Recuperacao de senha
  '/auth/forgot-password',          // Sem prefixo /api
  '/api/auth/reset-password',       // Reset de senha
  '/auth/reset-password',           // Sem prefixo /api
  '/api/auth/verify-email',         // Verificacao de email
  '/auth/verify-email',             // Sem prefixo /api
  '/api/lgpd/consent',              // Consentimento LGPD (publico)
  '/lgpd/consent',                  // Sem prefixo /api
  '/api/integration/chatwoot/sso',  // SSO externo
  '/integration/chatwoot/sso',      // Sem prefixo /api
  '/api/whatsapp-webhook',          // WhatsApp webhook (valida por token)
  '/whatsapp-webhook',              // Sem prefixo /api
  '/api/advapi-webhook',            // ADVAPI webhook (valida por X-API-Key)
  '/advapi-webhook',                // Sem prefixo /api
  '/health',                        // Health checks
];

// Origens permitidas (configuradas no CORS)
const getAllowedOrigins = (): string[] => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://app.advwell.pro';
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'];
  }
  return [frontendUrl];
};

/**
 * Gera um token CSRF criptograficamente seguro
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Armazena token CSRF no Redis com TTL
 */
const storeToken = async (token: string, userId?: string): Promise<void> => {
  const key = `csrf:${token}`;
  const value = userId || 'anonymous';
  await redis.setex(key, CSRF_TOKEN_TTL, value);
};

/**
 * Valida se o token existe no Redis
 */
const validateToken = async (token: string): Promise<boolean> => {
  if (!token || token.length !== CSRF_TOKEN_LENGTH * 2) {
    return false;
  }

  const key = `csrf:${token}`;
  const exists = await redis.exists(key);
  return exists === 1;
};

/**
 * Valida Origin/Referer header contra origens permitidas
 */
const validateOrigin = (req: Request): boolean => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = getAllowedOrigins();

  // Se tem Origin header, validar
  if (origin) {
    return allowedOrigins.some(allowed => origin === allowed);
  }

  // Se tem Referer, validar
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return allowedOrigins.some(allowed => refererOrigin === allowed);
    } catch {
      return false;
    }
  }

  // Sem Origin ou Referer - pode ser request direto (curl, Postman)
  // Em producao, bloquear; em dev, permitir para facilitar testes
  return process.env.NODE_ENV === 'development';
};

/**
 * Verifica se a rota esta isenta de CSRF
 */
const isExemptRoute = (path: string): boolean => {
  return EXEMPT_ROUTES.some(exempt => path.startsWith(exempt));
};

/**
 * Middleware para gerar e enviar token CSRF
 * Usar em rotas GET que precedem formularios/acoes
 */
export const csrfTokenGenerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = generateCsrfToken();
    const userId = (req as any).user?.id;

    await storeToken(token, userId);

    // Enviar token no cookie (HttpOnly=false para JS acessar) e no header
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,        // JS precisa ler para enviar no header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',     // Protecao adicional contra CSRF
      maxAge: CSRF_TOKEN_TTL * 1000,
      path: '/',
    });

    // Tambem enviar no header para SPAs
    res.setHeader('X-CSRF-Token', token);

    next();
  } catch (error) {
    appLogger.error('Error generating CSRF token', error as Error);
    next();
  }
};

/**
 * Middleware principal de validacao CSRF
 * Aplica Double Submit Cookie pattern + Origin validation
 */
export const csrfProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Verificar se o metodo requer protecao
    if (!PROTECTED_METHODS.includes(req.method)) {
      return next();
    }

    // 2. Verificar se a rota esta isenta
    if (isExemptRoute(req.path)) {
      return next();
    }

    // 3. Verificar JWT primeiro - requisicoes com Authorization header customizado
    // sao seguras contra CSRF pois navegadores nao permitem enviar headers customizados
    // em forms HTML ou requisicoes cross-origin simples
    const hasJwt = req.headers.authorization?.startsWith('Bearer ');
    if (hasJwt) {
      // JWT com header Authorization e suficiente para APIs REST
      // A maioria dos ataques CSRF nao consegue enviar headers customizados
      return next();
    }

    // 4. Validar Origin/Referer para requisicoes sem JWT
    if (!validateOrigin(req)) {
      appLogger.warn('CSRF: Invalid origin/referer', {
        path: req.path,
        origin: req.headers.origin,
        referer: req.headers.referer,
        ip: req.ip,
      });

      res.status(403).json({
        error: 'CSRF validation failed',
        message: 'Invalid request origin',
      });
      return;
    }

    // 5. Validar Double Submit Cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    // Se nao tem tokens e chegou aqui, bloquear
    if (!cookieToken && !headerToken) {

      // Sem JWT e sem CSRF token - bloquear
      appLogger.warn('CSRF: Missing token', {
        path: req.path,
        ip: req.ip,
      });

      res.status(403).json({
        error: 'CSRF validation failed',
        message: 'Missing CSRF token',
      });
      return;
    }

    // 5. Se tem tokens, validar Double Submit (cookie == header)
    if (cookieToken && headerToken) {
      if (cookieToken !== headerToken) {
        appLogger.warn('CSRF: Token mismatch', {
          path: req.path,
          ip: req.ip,
        });

        res.status(403).json({
          error: 'CSRF validation failed',
          message: 'Token mismatch',
        });
        return;
      }

      // Validar token no Redis
      const isValid = await validateToken(headerToken);
      if (!isValid) {
        appLogger.warn('CSRF: Invalid/expired token', {
          path: req.path,
          ip: req.ip,
        });

        res.status(403).json({
          error: 'CSRF validation failed',
          message: 'Invalid or expired token',
        });
        return;
      }
    }

    next();
  } catch (error) {
    appLogger.error('CSRF middleware error', error as Error);

    // Em caso de erro (ex: Redis indisponivel), fail-closed em producao
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Security validation failed',
      });
      return;
    }

    next();
  }
};

/**
 * Endpoint para obter token CSRF
 * GET /api/csrf-token
 */
export const getCsrfToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = generateCsrfToken();
    const userId = (req as any).user?.id;

    await storeToken(token, userId);

    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_TTL * 1000,
      path: '/',
    });

    res.json({
      token,
      expiresIn: CSRF_TOKEN_TTL,
    });
  } catch (error) {
    appLogger.error('Error generating CSRF token endpoint', error as Error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
};
