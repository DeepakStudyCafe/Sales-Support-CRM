import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

const router = Router();

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent', 'Critical']).default('Medium'),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  callId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

const addMessageSchema = z.object({
  message: z.string().min(1, 'Message required'),
  isInternal: z.boolean().default(false),
});

const updateStatusSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed']),
  notes: z.string().optional(),
});

// Generate ticket number
async function generateTicketNumber(): Promise<string> {
  const pool = getPool();
  const result = await pool.request().query<{ cnt: number }>('SELECT COUNT(1) as cnt FROM tickets');
  const count = (result.recordset[0]?.cnt ?? 0) + 1;
  return `TKT-${String(count).padStart(6, '0')}`;
}

// Get SLA due dates
async function getSLADueDates(priority: string, slaId?: string): Promise<{ firstResponseDue: Date | null; resolutionDue: Date | null; slaId: string | null }> {
  const pool = getPool();
  const request = pool.request().input('priority', sql.NVarChar, priority);
  let query = 'SELECT TOP 1 * FROM sla_configurations WHERE priority = @priority AND is_active = 1';
  if (slaId) {
    query = 'SELECT * FROM sla_configurations WHERE id = @sla_id AND is_active = 1';
    request.input('sla_id', sql.UniqueIdentifier, slaId);
  }
  const result = await request.query<{ id: string; first_response_hours: number; resolution_hours: number }>(query);
  const sla = result.recordset[0];
  if (!sla) return { firstResponseDue: null, resolutionDue: null, slaId: null };

  const now = new Date();
  const firstResponseDue = new Date(now.getTime() + sla.first_response_hours * 60 * 60 * 1000);
  const resolutionDue = new Date(now.getTime() + sla.resolution_hours * 60 * 60 * 1000);

  return { firstResponseDue, resolutionDue, slaId: sla.id };
}

// List tickets
router.get('/', requirePermission('tickets', 'all', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const where: string[] = [];

  // Non-admins only see their own tickets (assigned or created)
  if (!isAdmin) {
    where.push('(t.assigned_to = @user_id OR t.created_by = @user_id)');
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }

  if (req.query.status) {
    where.push('t.status = @status');
    request.input('status', sql.NVarChar, req.query.status as string);
  }
  if (req.query.priority) {
    where.push('t.priority = @priority');
    request.input('priority', sql.NVarChar, req.query.priority as string);
  }
  if (req.query.assignedTo) {
    where.push('t.assigned_to = @assigned_to');
    request.input('assigned_to', sql.UniqueIdentifier, req.query.assignedTo as string);
  }
  if (req.query.search) {
    where.push('(t.title LIKE @search OR t.ticket_number LIKE @search)');
    request.input('search', sql.NVarChar, `%${req.query.search}%`);
  }
  if (req.query.dateFrom) {
    where.push('t.created_at >= @date_from');
    request.input('date_from', sql.DateTime2, new Date(req.query.dateFrom as string));
  }
  if (req.query.dateTo) {
    where.push('t.created_at <= @date_to');
    request.input('date_to', sql.DateTime2, new Date(req.query.dateTo as string + 'T23:59:59Z'));
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Count (separate request to avoid parameter conflicts)
  const countReq = pool.request();
  if (!isAdmin) countReq.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (req.query.status) countReq.input('status', sql.NVarChar, req.query.status as string);
  if (req.query.priority) countReq.input('priority', sql.NVarChar, req.query.priority as string);
  if (req.query.assignedTo) countReq.input('assigned_to', sql.UniqueIdentifier, req.query.assignedTo as string);
  if (req.query.search) countReq.input('search', sql.NVarChar, `%${req.query.search}%`);
  if (req.query.dateFrom) countReq.input('date_from', sql.DateTime2, new Date(req.query.dateFrom as string));
  if (req.query.dateTo) countReq.input('date_to', sql.DateTime2, new Date(req.query.dateTo as string + 'T23:59:59Z'));

  const countResult = await countReq.query<{ total: number }>(`SELECT COUNT(1) as total FROM tickets t ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT t.*,
      tc.name as category_name,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      CONCAT(cu_name.first_name, ' ', cu_name.last_name) as customer_name
    FROM tickets t
    LEFT JOIN ticket_categories tc ON t.category_id = tc.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN customers cu_name ON t.customer_id = cu_name.id
    ${whereClause}
    ORDER BY t.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  const total = countResult.recordset[0]?.total ?? 0;
  sendPaginated(res, dataResult.recordset, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

// Get ticket by ID
router.get('/:id', requirePermission('tickets', 'all', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT t.*,
      tc.name as category_name,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      CONCAT(cu.first_name, ' ', cu.last_name) as customer_name
    FROM tickets t
    LEFT JOIN ticket_categories tc ON t.category_id = tc.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN customers cu ON t.customer_id = cu.id
    WHERE t.id = @id
  `);

  if (!result.recordset[0]) {
    sendError(res, 'Ticket not found', 404);
    return;
  }

  // Get messages
  const messages = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT tm.*, CONCAT(u.first_name, ' ', u.last_name) as sent_by_name, u.role_id
    FROM ticket_messages tm
    JOIN users u ON tm.sent_by = u.id
    WHERE tm.ticket_id = @id ORDER BY tm.created_at ASC
  `);

  // Get activities
  const activities = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT ta.*, CONCAT(u.first_name, ' ', u.last_name) as performed_by_name
    FROM ticket_activities ta
    LEFT JOIN users u ON ta.performed_by = u.id
    WHERE ta.ticket_id = @id ORDER BY ta.created_at DESC
  `);

  sendSuccess(res, { ...result.recordset[0], messages: messages.recordset, activities: activities.recordset });
});

// Create ticket
router.post('/', requirePermission('tickets', 'all', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const ticketNumber = await generateTicketNumber();
  const slaDates = await getSLADueDates(parsed.data.priority);

  const result = await pool.request()
    .input('ticket_number', sql.NVarChar, ticketNumber)
    .input('title', sql.NVarChar, parsed.data.title)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .input('category_id', sql.UniqueIdentifier, parsed.data.categoryId ?? null)
    .input('priority', sql.NVarChar, parsed.data.priority)
    .input('customer_id', sql.UniqueIdentifier, parsed.data.customerId ?? null)
    .input('lead_id', sql.UniqueIdentifier, parsed.data.leadId ?? null)
    .input('call_id', sql.UniqueIdentifier, parsed.data.callId ?? null)
    .input('assigned_to', sql.UniqueIdentifier, parsed.data.assignedTo ?? null)
    .input('team_id', sql.UniqueIdentifier, parsed.data.teamId ?? null)
    .input('sla_id', sql.UniqueIdentifier, slaDates.slaId)
    .input('first_response_due_at', sql.DateTime2, slaDates.firstResponseDue)
    .input('resolution_due_at', sql.DateTime2, slaDates.resolutionDue)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO tickets (ticket_number, title, description, category_id, priority, customer_id, lead_id, call_id, assigned_to, team_id, sla_id, first_response_due_at, resolution_due_at, created_by)
      OUTPUT INSERTED.id
      VALUES (@ticket_number, @title, @description, @category_id, @priority, @customer_id, @lead_id, @call_id, @assigned_to, @team_id, @sla_id, @first_response_due_at, @resolution_due_at, @created_by)
    `);

  const ticketId = result.recordset[0].id;

  // Log activity
  await pool.request()
    .input('ticket_id', sql.UniqueIdentifier, ticketId)
    .input('activity_type', sql.NVarChar, 'CREATED')
    .input('description', sql.NVarChar, 'Ticket created')
    .input('performed_by', sql.UniqueIdentifier, req.user.userId)
    .query('INSERT INTO ticket_activities (ticket_id, activity_type, description, performed_by) VALUES (@ticket_id, @activity_type, @description, @performed_by)');

  // Notify assigned user
  if (parsed.data.assignedTo) {
    await notificationService.create({
      userId: parsed.data.assignedTo,
      type: 'ticket_assigned',
      title: 'New Ticket Assigned',
      body: `Ticket "${parsed.data.title}" [${ticketNumber}] has been assigned to you`,
      data: { entityType: 'ticket', entityId: ticketId, url: `/tickets/${ticketId}` },
    });
  }

  sendSuccess(res, { id: ticketId, ticketNumber }, 'Ticket created successfully', 201);
});

// Add message to ticket
router.post('/:id/messages', requirePermission('tickets', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = addMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const result = await pool.request()
    .input('ticket_id', sql.UniqueIdentifier, req.params.id)
    .input('message', sql.NVarChar, parsed.data.message)
    .input('is_internal', sql.Bit, parsed.data.isInternal ? 1 : 0)
    .input('sent_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO ticket_messages (ticket_id, message, is_internal, sent_by)
      OUTPUT INSERTED.id
      VALUES (@ticket_id, @message, @is_internal, @sent_by)
    `);

  // Mark first response time if ticket status is Open
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`
      UPDATE tickets
      SET first_responded_at = CASE WHEN first_responded_at IS NULL THEN GETUTCDATE() ELSE first_responded_at END,
          status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END,
          updated_at = GETUTCDATE()
      WHERE id = @id
    `);

  sendSuccess(res, { id: result.recordset[0].id }, 'Message added', 201);
});

// Update ticket status
router.patch('/:id/status', requirePermission('tickets', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const statusDates: Record<string, string> = {
    'Resolved': ', resolved_at = GETUTCDATE()',
    'Closed': ', closed_at = GETUTCDATE()',
  };

  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('status', sql.NVarChar, parsed.data.status)
    .query(`
      UPDATE tickets SET status = @status, updated_at = GETUTCDATE()${statusDates[parsed.data.status] ?? ''}
      WHERE id = @id
    `);

  await pool.request()
    .input('ticket_id', sql.UniqueIdentifier, req.params.id)
    .input('activity_type', sql.NVarChar, 'STATUS_CHANGED')
    .input('description', sql.NVarChar, `Status changed to ${parsed.data.status}`)
    .input('performed_by', sql.UniqueIdentifier, req.user.userId)
    .query('INSERT INTO ticket_activities (ticket_id, activity_type, description, performed_by) VALUES (@ticket_id, @activity_type, @description, @performed_by)');

  sendSuccess(res, null, 'Ticket status updated');
});

// Assign ticket
router.patch('/:id/assign', requirePermission('tickets', 'all', 'assign'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { assignedTo } = req.body;
  if (!assignedTo) { sendError(res, 'assignedTo is required', 400); return; }

  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('assigned_to', sql.UniqueIdentifier, assignedTo)
    .query('UPDATE tickets SET assigned_to = @assigned_to, updated_at = GETUTCDATE() WHERE id = @id');

  await notificationService.create({
    userId: assignedTo,
    type: 'ticket_assigned',
    title: 'Ticket Assigned to You',
    body: `A support ticket has been assigned to you`,
    data: { entityType: 'ticket', entityId: req.params.id, url: `/tickets/${req.params.id}` },
  });

  sendSuccess(res, null, 'Ticket assigned successfully');
});

// Get ticket categories
router.get('/categories/all', async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query('SELECT * FROM ticket_categories ORDER BY name');
  sendSuccess(res, result.recordset);
});

// Create ticket category
const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultPriority: z.enum(['Low', 'Medium', 'High', 'Urgent', 'Critical']).default('Medium'),
});

router.post('/categories', requirePermission('tickets', 'categories', 'manage'), async (req: Request, res: Response) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }
  const pool = getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar, parsed.data.name)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .input('default_priority', sql.NVarChar, parsed.data.defaultPriority)
    .query<{ id: string }>(`
      INSERT INTO ticket_categories (name, description, default_priority)
      OUTPUT INSERTED.id
      VALUES (@name, @description, @default_priority)
    `);
  sendSuccess(res, { id: result.recordset[0].id }, 'Category created', 201);
});

// Toggle category active
router.patch('/categories/:id/toggle', requirePermission('tickets', 'categories', 'manage'), async (req: Request, res: Response) => {
  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query('UPDATE ticket_categories SET is_active = ~is_active WHERE id = @id');
  sendSuccess(res, null, 'Category updated');
});

// SLA configurations
router.get('/sla/all', requirePermission('tickets', 'sla', 'manage'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query('SELECT * FROM sla_configurations ORDER BY priority');
  sendSuccess(res, result.recordset);
});

// Update SLA configuration
const updateSlaSchema = z.object({
  firstResponseHours: z.number().min(0.1),
  resolutionHours: z.number().min(0.5),
  workingHoursOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.put('/sla/:id', requirePermission('tickets', 'sla', 'manage'), async (req: Request, res: Response) => {
  const parsed = updateSlaSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }
  const pool = getPool();
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('first_response_hours', sql.Decimal(5, 2), parsed.data.firstResponseHours)
    .input('resolution_hours', sql.Decimal(5, 2), parsed.data.resolutionHours)
    .input('working_hours_only', sql.Bit, parsed.data.workingHoursOnly !== undefined ? (parsed.data.workingHoursOnly ? 1 : 0) : 1)
    .input('is_active', sql.Bit, parsed.data.isActive !== undefined ? (parsed.data.isActive ? 1 : 0) : 1)
    .query(`
      UPDATE sla_configurations
      SET first_response_hours = @first_response_hours,
          resolution_hours = @resolution_hours,
          working_hours_only = @working_hours_only,
          is_active = @is_active,
          updated_at = GETUTCDATE()
      WHERE id = @id
    `);
  sendSuccess(res, null, 'SLA policy updated');
});

// Dashboard stats for support
router.get('/stats/support', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const request = pool.request();
  let where = '';
  if (!isAdmin) {
    where = 'WHERE assigned_to = @user_id OR created_by = @user_id';
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }

  const result = await request.query<{
    total: number; open: number; in_progress: number; waiting: number; resolved: number; overdue: number;
  }>(`
    SELECT
      COUNT(1) as total,
      SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as [open],
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Waiting for Customer' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN resolution_due_at < GETUTCDATE() AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as overdue
    FROM tickets ${where}
  `);

  sendSuccess(res, result.recordset[0]);
});

export default router;

