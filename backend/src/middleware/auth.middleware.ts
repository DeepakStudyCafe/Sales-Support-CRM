import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string };
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Check http-only cookie
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token as string;
  }

  return null;
}

/**
 * Middleware: Requires a valid JWT. Blocks request with 401 if invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    sendError(res, 'Invalid or expired token', 401);
    return;
  }

  req.user = { ...payload, id: payload.userId };
  logger.debug('Authenticated user', { userId: payload.userId, email: payload.email });
  next();
}

/**
 * Middleware: Optionally authenticates. Does NOT block if no/invalid token.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = { ...payload, id: payload.userId };
    }
  }

  next();
}
