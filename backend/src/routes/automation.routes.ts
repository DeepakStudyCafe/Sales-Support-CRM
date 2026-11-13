import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { z } from 'zod';

const router = Router();

const ruleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerEvent: z.enum([
    'lead_created',
    'lead_assigned',
    'lead_status_changed',
    'call_completed',
    'followup_overdue',
    'ticket_created',
    'ticket_sla_breached',
  ]),
  conditions: z.record(z.unknown()).optional(),
  actions: z.array(z.object({
    type: z.string(),
    params: z.record(z.unknown()),
  })),
  isActive: z.boolean().default(true),
});

// List automation rules
router.get('/', requirePermission('automation', 'workflows', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
    FROM automation_rules r
    LEFT JOIN users u ON r.created_by = u.id
    ORDER BY r.created_at DESC
  `);
  sendSuccess(res, result.recordset);
});

// Create automation rule
router.post('/', requirePermission('automation', 'workflows', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar, parsed.data.name)
    .input('trigger_event', sql.NVarChar, parsed.data.triggerEvent)
    .input('conditions', sql.NVarChar, parsed.data.conditions ? JSON.stringify(parsed.data.conditions) : null)
    .input('actions', sql.NVarChar, JSON.stringify(parsed.data.actions))
    .input('is_active', sql.Bit, parsed.data.isActive ? 1 : 0)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO automation_rules (name, trigger_event, conditions, actions, is_active, created_by)
      OUTPUT INSERTED.id
      VALUES (@name, @trigger_event, @conditions, @actions, @is_active, @created_by)
    `);

  sendSuccess(res, { id: result.recordset[0].id }, 'Workflow rule created', 201);
});

// Toggle rule active status
router.patch('/:id/toggle', requirePermission('automation', 'workflows', 'edit'), async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`
      UPDATE automation_rules
      SET is_active = ~is_active, updated_at = GETUTCDATE()
      WHERE id = @id
    `);
  sendSuccess(res, null, 'Rule toggled');
});

// Delete automation rule
router.delete('/:id', requirePermission('automation', 'workflows', 'delete'), async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query('DELETE FROM automation_rules WHERE id = @id');
  sendSuccess(res, null, 'Rule deleted');
});

// Execution history
router.get('/:id/executions', requirePermission('automation', 'workflows', 'view'), async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();

  const countResult = await pool.request()
    .input('rule_id', sql.UniqueIdentifier, req.params.id)
    .query<{ total: number }>('SELECT COUNT(1) as total FROM automation_executions WHERE rule_id = @rule_id');

  const dataResult = await pool.request()
    .input('rule_id', sql.UniqueIdentifier, req.params.id)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT * FROM automation_executions
      WHERE rule_id = @rule_id
      ORDER BY executed_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  sendPaginated(res, dataResult.recordset, {
    page,
    limit,
    total: countResult.recordset[0]?.total ?? 0,
    totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit),
  });
});

export default router;
