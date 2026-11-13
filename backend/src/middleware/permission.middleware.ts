import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { getPool, sql } from '../config/database';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

const PERMISSION_CACHE_TTL = 300; // 5 minutes

export interface UserPermission {
  module: string;
  submodule: string | null;
  action: string;
  granted: boolean;
}

async function fetchUserPermissionsFromDB(userId: string): Promise<UserPermission[]> {
  const pool = getPool();

  // Get role-level permissions
  const roleResult = await pool
    .request()
    .input('userId', sql.UniqueIdentifier, userId)
    .query<UserPermission>(`
      SELECT
        p.module,
        p.submodule,
        p.action,
        CASE
          WHEN up.granted IS NOT NULL THEN up.granted
          ELSE rp.granted
        END AS granted
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      LEFT JOIN user_permissions up
        ON up.user_id = u.id AND up.permission_id = p.id
      WHERE u.id = @userId
        AND u.deleted_at IS NULL
        AND u.is_active = 1
      ORDER BY p.module, p.submodule, p.action
    `);

  return roleResult.recordset.filter((r: any) => r.module !== null);
}

async function getCachedPermissions(userId: string): Promise<UserPermission[] | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get(`permissions:${userId}`);
    if (cached) {
      return JSON.parse(cached) as UserPermission[];
    }
    return null;
  } catch (error) {
    logger.warn('Failed to read permissions from cache', { userId, error: (error as Error).message });
    return null;
  }
}

async function setCachedPermissions(userId: string, permissions: UserPermission[]): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(`permissions:${userId}`, PERMISSION_CACHE_TTL, JSON.stringify(permissions));
  } catch (error) {
    logger.warn('Failed to cache permissions', { userId, error: (error as Error).message });
  }
}

export function requirePermission(module: string, submodule: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // Super Admin bypasses all permission checks
    if (req.user.roleName === 'Super Admin') {
      next();
      return;
    }

    const userId = req.user.userId;

    try {
      // Try Redis cache first
      let permissions = await getCachedPermissions(userId);

      if (!permissions) {
        // Fall back to DB
        permissions = await fetchUserPermissionsFromDB(userId);
        await setCachedPermissions(userId, permissions);
      }

      const hasPermission = permissions.some(
        (p) =>
          p.module === module &&
          (p.submodule === submodule || p.submodule === null || submodule === '*') &&
          (p.action === action || p.action === '*') &&
          p.granted === true
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId,
          module,
          submodule,
          action,
          roleName: req.user.roleName,
        });
        sendError(res, 'You do not have permission to perform this action', 403);
        return;
      }

      next();
    } catch (error) {
      const err = error as Error;
      logger.error('Permission check error', { error: err.message, userId, module, submodule, action });
      sendError(res, 'Internal server error during permission check', 500);
    }
  };
}
