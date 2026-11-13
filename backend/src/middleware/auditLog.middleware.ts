import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { logger } from '../utils/logger';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware that automatically logs mutations to the audit_logs table.
 * Should be applied after authentication middleware.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  const originalSend = res.json.bind(res);

  res.json = function (body: unknown): Response {
    // Fire-and-forget audit log write (don't block response)
    if (req.user?.userId) {
      writeAuditLog(req, res.statusCode, body).catch((err: Error) => {
        logger.warn('Failed to write audit log', { error: err.message });
      });
    }
    return originalSend(body);
  };

  next();
}

async function writeAuditLog(
  req: Request,
  statusCode: number,
  responseBody: unknown
): Promise<void> {
  // Only log successful mutations (2xx)
  if (statusCode < 200 || statusCode >= 300) return;

  try {
    const pool = getPool();

    // Extract entity info from URL pattern: /api/v1/{entityType}/{entityId?}
    const urlParts = req.path.replace(/^\/api\/v1\//, '').split('/');
    const entityType = urlParts[0] || 'unknown';
    const entityId =
      urlParts[1] && urlParts[1] !== '' ? urlParts[1] : extractEntityIdFromResponse(responseBody);

    const action = mapMethodToAction(req.method, entityId);

    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, req.user!.userId)
      .input('action', sql.NVarChar(100), action)
      .input('entityType', sql.NVarChar(50), entityType)
      .input('entityId', sql.NVarChar(100), entityId || null)
      .input('newValues', sql.NVarChar(sql.MAX), safeStringify(req.body))
      .input('ipAddress', sql.NVarChar(45), req.ip || null)
      .input('userAgent', sql.NVarChar(500), req.headers['user-agent'] || null).query(`
        INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
        VALUES
          (@userId, @action, @entityType, @entityId, @newValues, @ipAddress, @userAgent)
      `);
  } catch (error) {
    logger.warn('Audit log write failed', { error: (error as Error).message });
  }
}

function mapMethodToAction(method: string, entityId?: string | null): string {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return entityId ? 'DELETE' : 'BULK_DELETE';
    default:
      return method;
  }
}

function extractEntityIdFromResponse(body: unknown): string | null {
  if (typeof body === 'object' && body !== null) {
    const data = (body as Record<string, unknown>).data;
    if (typeof data === 'object' && data !== null) {
      const id = (data as Record<string, unknown>).id;
      if (typeof id === 'string') return id;
    }
  }
  return null;
}

function safeStringify(obj: unknown): string | null {
  try {
    // Remove password fields before logging
    const sanitized = JSON.parse(JSON.stringify(obj, (key, value: unknown) => {
      if (['password', 'password_hash', 'token', 'secret'].includes(key)) {
        return '[REDACTED]';
      }
      return value;
    }));
    return JSON.stringify(sanitized);
  } catch {
    return null;
  }
}
