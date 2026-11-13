import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { env } from '../config/environment';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, 400, true, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

function isMssqlError(error: unknown): error is { number: number; message: string } {
  return typeof error === 'object' && error !== null && 'number' in error;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', {
    message: error.message,
    stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
    ip: req.ip,
  });

  // Handle AppError (operational errors)
  if (error instanceof AppError) {
    sendError(res, error.message, error.statusCode, error.errors);
    return;
  }

  // Handle Zod validation errors that escaped middleware
  if (error.name === 'ZodError') {
    sendError(res, 'Validation failed', 400);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 'Token expired', 401);
    return;
  }

  // Handle MSSQL errors
  if (isMssqlError(error)) {
    const mssqlError = error as { number: number; message: string };

    // Unique constraint violation
    if (mssqlError.number === 2627 || mssqlError.number === 2601) {
      sendError(res, 'A record with this information already exists', 409);
      return;
    }

    // Foreign key violation
    if (mssqlError.number === 547) {
      sendError(res, 'Referenced record does not exist', 400);
      return;
    }

    // Generic DB error — never expose details in production
    const dbMessage =
      env.NODE_ENV !== 'production'
        ? `Database error: ${mssqlError.message}`
        : 'A database error occurred. Please try again.';

    sendError(res, dbMessage, 500);
    return;
  }

  // Generic unknown error — never expose internal details in production
  const message =
    env.NODE_ENV !== 'production'
      ? `Internal server error: ${error.message}`
      : 'An internal server error occurred. Please try again.';

  sendError(res, message, 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}
