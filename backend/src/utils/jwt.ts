import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Gera access token (curta duração)
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

// Gera refresh token (longa duração)
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' } as RefreshTokenPayload,
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

export const generateResetToken = (): string => {
  return jwt.sign(
    { type: 'reset' },
    config.jwt.secret,
    { expiresIn: '30m' } // Reduzido de 1h para 30m por seguranca (OWASP)
  );
};
