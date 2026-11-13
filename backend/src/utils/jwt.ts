import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from './logger';

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  sessionId?: string;
}

export interface DecodedJwtPayload extends JwtPayload {
  iat: number;
  exp: number;
}

export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
    issuer: 'sales-crm',
    audience: 'crm-users',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'],
    issuer: 'sales-crm',
    audience: 'crm-users',
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): DecodedJwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'sales-crm',
      audience: 'crm-users',
    }) as DecodedJwtPayload;
  } catch (error) {
    const err = error as Error;
    logger.debug('Access token verification failed', { error: err.message });
    return null;
  }
}

export function verifyRefreshToken(token: string): DecodedJwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'sales-crm',
      audience: 'crm-users',
    }) as DecodedJwtPayload;
  } catch (error) {
    const err = error as Error;
    logger.debug('Refresh token verification failed', { error: err.message });
    return null;
  }
}

export function decodeToken(token: string): DecodedJwtPayload | null {
  try {
    return jwt.decode(token) as DecodedJwtPayload;
  } catch {
    return null;
  }
}
