import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { z } from 'zod';

const router = Router();

const createOpportunitySchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().optional(),
  currency: z.string().default('INR'),
  stage: z.enum(['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']).default('Prospecting'),
  expectedCloseDate: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  description: z.string().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

router.get('/', requirePermission('opportunities', 'all', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const where: string[] = [];

  if (!isAdmin) { where.push('o.assigned_to = @user_id'); request.input('user_id', sql.UniqueIdentifier, req.user.userId); }
  if (req.query.stage) { where.push('o.stage = @stage'); request.input('stage', sql.NVarChar, req.query.stage as string); }
  if (req.query.search) { where.push('o.title LIKE @search'); request.input('search', sql.NVarChar, `%${req.query.search}%`); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countReq = pool.request();
  if (!isAdmin) countReq.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (req.query.stage) countReq.input('stage', sql.NVarChar, req.query.stage as string);
  if (req.query.search) countReq.input('search', sql.NVarChar, `%${req.query.search}%`);
  const countResult = await countReq.query<{ total: number }>(`SELECT COUNT(1) as total FROM opportunities o ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT o.*,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      l.first_name + ISNULL(' ' + l.last_name, '') as lead_name,
      cu.first_name + ISNULL(' ' + cu.last_name, '') as customer_name
    FROM opportunities o
    LEFT JOIN users au ON o.assigned_to = au.id
    LEFT JOIN leads l ON o.lead_id = l.id
    LEFT JOIN customers cu ON o.customer_id = cu.id
    ${whereClause}
    ORDER BY o.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  const total = countResult.recordset[0]?.total ?? 0;
  sendPaginated(res, dataResult.recordset, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/', requirePermission('opportunities', 'all', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = createOpportunitySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const result = await pool.request()
    .input('title', sql.NVarChar, parsed.data.title)
    .input('value', sql.Decimal, parsed.data.value ?? null)
    .input('currency', sql.NVarChar, parsed.data.currency)
    .input('stage', sql.NVarChar, parsed.data.stage)
    .input('expected_close_date', sql.Date, parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null)
    .input('assigned_to', sql.UniqueIdentifier, parsed.data.assignedTo ?? req.user.userId)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .input('lead_id', sql.UniqueIdentifier, parsed.data.leadId ?? null)
    .input('customer_id', sql.UniqueIdentifier, parsed.data.customerId ?? null)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO opportunities (title, value, currency, stage, expected_close_date, assigned_to, description, lead_id, customer_id, created_by)
      OUTPUT INSERTED.id
      VALUES (@title, @value, @currency, @stage, @expected_close_date, @assigned_to, @description, @lead_id, @customer_id, @created_by)
    `);

  sendSuccess(res, { id: result.recordset[0].id }, 'Opportunity created', 201);
});

router.put('/:id', requirePermission('opportunities', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = createOpportunitySchema.partial().safeParse(req.body);
  if (!parsed.success) { sendError(res, 'Validation failed', 400); return; }

  const pool = getPool();
  const setClauses = ['updated_at = GETUTCDATE()'];
  const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id);

  if (parsed.data.title) { setClauses.push('title = @title'); request.input('title', sql.NVarChar, parsed.data.title); }
  if (parsed.data.value !== undefined) { setClauses.push('value = @value'); request.input('value', sql.Decimal, parsed.data.value); }
  if (parsed.data.stage) { setClauses.push('stage = @stage'); request.input('stage', sql.NVarChar, parsed.data.stage); }
  if (parsed.data.stage === 'Closed Won') { setClauses.push('closed_at = GETUTCDATE()'); }
  if (parsed.data.stage === 'Closed Lost') {
    setClauses.push('closed_at = GETUTCDATE()');
    if (req.body.wonLostReason) { setClauses.push('won_lost_reason = @reason'); request.input('reason', sql.NVarChar, req.body.wonLostReason); }
  }

  await request.query(`UPDATE opportunities SET ${setClauses.join(', ')} WHERE id = @id`);
  sendSuccess(res, null, 'Opportunity updated');
});

router.get('/:id', requirePermission('opportunities', 'all', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT o.*, CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
    FROM opportunities o LEFT JOIN users au ON o.assigned_to = au.id WHERE o.id = @id
  `);
  if (!result.recordset[0]) { sendError(res, 'Opportunity not found', 404); return; }
  sendSuccess(res, result.recordset[0]);
});

export default router;

