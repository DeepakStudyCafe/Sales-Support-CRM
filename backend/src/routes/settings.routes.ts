import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { z } from 'zod';

const router = Router();

const updateSettingsSchema = z.record(z.string(), z.string());

// Get all settings or by category
router.get('/', requirePermission('settings', 'general', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const request = pool.request();
  let query = 'SELECT * FROM settings';

  if (req.query.category) {
    query += ' WHERE category = @category';
    request.input('category', sql.NVarChar, req.query.category as string);
  }

  const result = await request.query(query);
  sendSuccess(res, result.recordset);
});

// Update settings by category
router.put('/:category', requirePermission('settings', 'general', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }

  const pool = getPool();
  const category = req.params.category;

  for (const [key, value] of Object.entries(parsed.data)) {
    await pool.request()
      .input('category', sql.NVarChar, category)
      .input('key', sql.NVarChar, key)
      .input('value', sql.NVarChar, value)
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
});

export default router;
