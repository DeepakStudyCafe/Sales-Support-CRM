import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { z } from 'zod';

const router = Router();

const updateSettingsSchema = z.record(z.string(), z.string());

// Get all settings or by category
router.get('/', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const isTheme = req.query.category === 'theme';
  if (!isTheme && !['Super Admin', 'Admin'].includes(req.user.roleName)) {
    // Only admins can view general system settings
    return requirePermission('settings', 'general', 'view')(req, res, () => fetchSettings(req, res));
  }
  return fetchSettings(req, res);
});

async function fetchSettings(req: Request, res: Response) {
  try {
    const pool = getPool();
    const request = pool.request();
    let query = 'SELECT * FROM settings';

    if (req.query.category) {
      query += ' WHERE category = @category';
      request.input('category', sql.NVarChar, req.query.category as string);
    }

    const result = await request.query(query);
    sendSuccess(res, result.recordset);
  } catch (err: any) {
    sendSuccess(res, []);
  }
}

// Update settings by category
router.put('/:category', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const category = req.params.category;
  if (category !== 'theme' && !['Super Admin', 'Admin'].includes(req.user.roleName)) {
    return requirePermission('settings', 'general', 'edit')(req, res, () => saveSettings(req, res));
  }
  return saveSettings(req, res);
});

async function saveSettings(req: Request, res: Response) {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }

  const pool = getPool();
  const category = req.params.category;

  try {
    for (const [key, value] of Object.entries(parsed.data)) {
      await pool.request()
        .input('category', sql.NVarChar, category)
        .input('key', sql.NVarChar, key)
        .input('value', sql.NVarChar, String(value))
        .input('updated_by', sql.UniqueIdentifier, req.user.userId)
        .query(`
          MERGE settings AS target
          USING (SELECT @category as category, @key as [key]) AS source
          ON target.category = source.category AND target.[key] = source.[key]
          WHEN MATCHED THEN
            UPDATE SET value = @value, updated_by = @updated_by, updated_at = GETUTCDATE()
          WHEN NOT MATCHED THEN
            INSERT (category, [key], value, updated_by)
            VALUES (@category, @key, @value, @updated_by);
        `);
    }

    sendSuccess(res, null, 'Settings updated successfully');
  } catch (err: any) {
    sendError(res, 'Failed to save settings: ' + err.message, 500);
  }
}

export default router;
