import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

const router = Router();

const createFollowUpSchema = z.object({
  type: z.enum(['Task', 'Callback', 'Meeting', 'Email']).default('Task'),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  scheduledAt: z.string().datetime({ message: 'Valid datetime required' }),
  assignedTo: z.string().uuid(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  callId: z.string().uuid().optional(),
});

// List follow-ups
router.get('/', requirePermission('followups', 'all', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const where: string[] = [];

  if (!isAdmin) {
    where.push('f.assigned_to = @user_id');
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }

  const filter = req.query.filter as string;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (filter === 'today') {
    where.push('f.scheduled_at BETWEEN @today_start AND @today_end');
    request.input('today_start', sql.DateTime2, todayStart);
    request.input('today_end', sql.DateTime2, todayEnd);
  } else if (filter === 'upcoming') {
    where.push('f.scheduled_at > @now AND f.status = \'Pending\'');
    request.input('now', sql.DateTime2, now);
  } else if (filter === 'overdue') {
    where.push('f.scheduled_at < @now AND f.status IN (\'Pending\', \'In Progress\')');
    request.input('now', sql.DateTime2, now);
  } else if (filter === 'completed') {
    where.push('f.status = \'Completed\'');
  }

  if (req.query.status) {
    where.push('f.status = @status');
    request.input('status', sql.NVarChar, req.query.status as string);
  }
  if (req.query.priority) {
    where.push('f.priority = @priority');
    request.input('priority', sql.NVarChar, req.query.priority as string);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Count
  const countReq = pool.request();
  if (!isAdmin) countReq.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (filter === 'today') { countReq.input('today_start', sql.DateTime2, todayStart); countReq.input('today_end', sql.DateTime2, todayEnd); }
  if (filter === 'upcoming' || filter === 'overdue') countReq.input('now', sql.DateTime2, now);
  if (req.query.status) countReq.input('status', sql.NVarChar, req.query.status as string);
  if (req.query.priority) countReq.input('priority', sql.NVarChar, req.query.priority as string);

  const countResult = await countReq.query<{ total: number }>(`SELECT COUNT(1) as total FROM follow_ups f ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT f.*,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      l.first_name + ISNULL(' ' + l.last_name, '') as lead_name,
      cu.first_name + ISNULL(' ' + cu.last_name, '') as customer_name
    FROM follow_ups f
    LEFT JOIN users au ON f.assigned_to = au.id
    LEFT JOIN leads l ON f.lead_id = l.id
    LEFT JOIN customers cu ON f.customer_id = cu.id
    ${whereClause}
    ORDER BY f.scheduled_at ASC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  const total = countResult.recordset[0]?.total ?? 0;
  sendPaginated(res, dataResult.recordset, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

// Create follow-up
router.post('/', requirePermission('followups', 'all', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = createFollowUpSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const result = await pool.request()
    .input('type', sql.NVarChar, parsed.data.type)
    .input('title', sql.NVarChar, parsed.data.title)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .input('scheduled_at', sql.DateTime2, new Date(parsed.data.scheduledAt))
    .input('assigned_to', sql.UniqueIdentifier, parsed.data.assignedTo)
    .input('priority', sql.NVarChar, parsed.data.priority)
    .input('lead_id', sql.UniqueIdentifier, parsed.data.leadId ?? null)
    .input('customer_id', sql.UniqueIdentifier, parsed.data.customerId ?? null)
    .input('ticket_id', sql.UniqueIdentifier, parsed.data.ticketId ?? null)
    .input('call_id', sql.UniqueIdentifier, parsed.data.callId ?? null)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO follow_ups (type, title, description, scheduled_at, assigned_to, priority, lead_id, customer_id, ticket_id, call_id, created_by)
      OUTPUT INSERTED.id
      VALUES (@type, @title, @description, @scheduled_at, @assigned_to, @priority, @lead_id, @customer_id, @ticket_id, @call_id, @created_by)
    `);

  // Notify assignee
  if (parsed.data.assignedTo !== req.user.userId) {
    await notificationService.create({
      userId: parsed.data.assignedTo,
      type: 'followup_assigned',
      title: 'New Task Assigned',
      body: `Task "${parsed.data.title}" scheduled for ${new Date(parsed.data.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      data: { entityType: 'followup', entityId: result.recordset[0].id, url: `/follow-ups` },
    });
  }

  sendSuccess(res, { id: result.recordset[0].id }, 'Follow-up created successfully', 201);
});

// Update follow-up
router.put('/:id', requirePermission('followups', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = createFollowUpSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id);

  if (parsed.data.title) { setClauses.push('title = @title'); request.input('title', sql.NVarChar, parsed.data.title); }
  if (parsed.data.description !== undefined) { setClauses.push('description = @description'); request.input('description', sql.NVarChar, parsed.data.description ?? null); }
  if (parsed.data.scheduledAt) { setClauses.push('scheduled_at = @scheduled_at'); request.input('scheduled_at', sql.DateTime2, new Date(parsed.data.scheduledAt)); }
  if (parsed.data.assignedTo) { setClauses.push('assigned_to = @assigned_to'); request.input('assigned_to', sql.UniqueIdentifier, parsed.data.assignedTo); }
  if (parsed.data.priority) { setClauses.push('priority = @priority'); request.input('priority', sql.NVarChar, parsed.data.priority); }

  await request.query(`UPDATE follow_ups SET ${setClauses.join(', ')} WHERE id = @id`);
  sendSuccess(res, null, 'Follow-up updated');
});

// Complete follow-up
router.patch('/:id/complete', requirePermission('followups', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('completed_by', sql.UniqueIdentifier, req.user.userId)
    .query(`
      UPDATE follow_ups SET status = 'Completed', completed_at = GETUTCDATE(), completed_by = @completed_by, updated_at = GETUTCDATE()
      WHERE id = @id
    `);
  sendSuccess(res, null, 'Follow-up marked as completed');
});

// Follow-up dashboard stats
router.get('/stats', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const request = pool.request();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  let where = '';
  if (!isAdmin) {
    where = 'WHERE assigned_to = @user_id';
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }

  request.input('today_start', sql.DateTime2, todayStart);
  request.input('today_end', sql.DateTime2, todayEnd);
  request.input('now', sql.DateTime2, now);

  const result = await request.query<{ today: number; upcoming: number; overdue: number; completed: number }>(`
    SELECT
      SUM(CASE WHEN scheduled_at BETWEEN @today_start AND @today_end AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as today,
      SUM(CASE WHEN scheduled_at > @today_end AND status = 'Pending' THEN 1 ELSE 0 END) as upcoming,
      SUM(CASE WHEN scheduled_at < @now AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
    FROM follow_ups ${where}
  `);

  sendSuccess(res, result.recordset[0]);
});

export default router;

