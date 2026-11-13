import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

const rateLimitHandler = (req: Request, res: Response): void => {
  sendError(res, 'Too many requests. Please try again later.', 429);
};

/**
 * Global rate limit: 100 requests per 15 minutes per IP.
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: (req: Request) => req.path === '/health',
});

/**
 * Auth rate limit: 100 attempts in development, 20 in production per 15 minutes per IP.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    sendError(
      res,
      'Too many login attempts. Please try again in a few moments.',
      429
    );
  },
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * API rate limit: 300 requests per minute per authenticated user.
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, fall back to IP
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || 'unknown';
  },
});

/**
 * Password reset rate limit: 3 requests per hour per IP.
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    sendError(res, 'Too many password reset requests. Please try again after an hour.', 429);
  },
  keyGenerator: (req: Request) => req.ip || 'unknown',
});
