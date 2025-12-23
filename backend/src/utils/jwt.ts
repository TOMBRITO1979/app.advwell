import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { redis } from './redis';

// Prefixo para tokens na blacklist
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
  jti?: string; // JWT ID para identificacao unica
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  jti?: string; // JWT ID para identificacao unica
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Gera um ID unico para o token (JTI - JWT ID)
const generateJti = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

// Gera access token (curta duração)
export const generateToken = (payload: JwtPayload): string => {
  const jti = generateJti();
  return jwt.sign({ ...payload, jti }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

// Gera refresh token (longa duração)
export const generateRefreshToken = (userId: string): string => {
  const jti = generateJti();
  return jwt.sign(
    { userId, type: 'refresh', jti } as RefreshTokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );
};

// Gera par de tokens (access + refresh)
export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
};

// Verifica access token
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

// Verifica refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, config.jwt.secret) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
};

// TAREFA 2.2: Reset token com nonce e userId para seguranca
export const generateResetToken = (userId: string): string => {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { type: 'reset', userId, nonce },
    config.jwt.secret,
    { expiresIn: '30m' } // Reduzido de 1h para 30m por seguranca (OWASP)
  );
};

// Token simples para verificacao de email (nao precisa de JWT, so random hex)
export const generateSimpleToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// ============================================
// BLACKLIST DE TOKENS (Para Logout Seguro)
// ============================================

/**
 * Adiciona um token a blacklist no Redis
 * O token fica na blacklist ate expirar naturalmente
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as { jti?: string; exp?: number };
    if (!decoded?.jti || !decoded?.exp) {
      return; // Token invalido ou sem JTI, nao precisa blacklist
    }

    const key = `${TOKEN_BLACKLIST_PREFIX}${decoded.jti}`;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);

    if (ttl > 0) {
      await redis.setex(key, ttl, '1');
    }
  } catch (error) {
    console.error('[JWT] Erro ao adicionar token a blacklist:', error);
  }
};

/**
 * Verifica se um token esta na blacklist
 */
export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  try {
    const key = `${TOKEN_BLACKLIST_PREFIX}${jti}`;
    const result = await redis.get(key);
    return result === '1';
  } catch (error) {
    console.error('[JWT] Erro ao verificar blacklist:', error);
    return false; // Fail-open em caso de erro do Redis
  }
};

/**
 * Invalida todos os tokens de um usuario (logout de todas as sessoes)
 * Adiciona o userId a uma lista de invalidacao
 */
export const invalidateAllUserTokens = async (userId: string): Promise<void> => {
  try {
    const key = `token:invalidated:user:${userId}`;
    // Timestamp de quando a invalidacao ocorreu
    // Todos os tokens emitidos antes desse timestamp sao invalidos
    await redis.setex(key, 7 * 24 * 60 * 60, Date.now().toString()); // 7 dias
  } catch (error) {
    console.error('[JWT] Erro ao invalidar tokens do usuario:', error);
  }
};

/**
 * Verifica se os tokens de um usuario foram invalidados apos emissao do token
 */
export const areUserTokensInvalidated = async (userId: string, tokenIssuedAt: number): Promise<boolean> => {
  try {
    const key = `token:invalidated:user:${userId}`;
    const invalidatedAt = await redis.get(key);
    if (!invalidatedAt) return false;

    // Token foi emitido antes da invalidacao?
    return tokenIssuedAt * 1000 < parseInt(invalidatedAt, 10);
  } catch (error) {
    console.error('[JWT] Erro ao verificar invalidacao:', error);
    return false;
  }
};
