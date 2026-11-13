import { Router, Request, Response } from 'express';
import { ivrService } from '../integrations/ivr.service';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { notificationService } from '../services/notification.service';
import { z } from 'zod';

const router = Router();

const clickToCallSchema = z.object({
  customerPhone: z.string().min(10, 'Valid phone number required'),
  did: z.string().min(1, 'DID number required'),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const dispositionSchema = z.object({
  disposition: z.enum(['Interested', 'Not Interested', 'No Answer', 'Busy', 'Call Back Required', 'Follow-up Required', 'Converted', 'Wrong Number', 'Voicemail']),
  notes: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDatetime: z.string().datetime().optional(),
  followUpAssignedTo: z.string().uuid().optional(),
});

// Click-to-Call
router.post('/click-to-call', requirePermission('calling', 'click-to-call', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = clickToCallSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();

  // Get agent's extension
  const agentResult = await pool.request()
    .input('user_id', sql.UniqueIdentifier, req.user.userId)
    .query<{ extension: string; did_number: string }>(`
      SELECT extension, did_number FROM ivr_agents WHERE user_id = @user_id AND is_active = 1
    `);

  const agent = agentResult.recordset[0];
  let agentExtension = agent?.extension;
  if (!agentExtension) {
    const userRes = await pool.request()
      .input('user_id', sql.UniqueIdentifier, req.user.userId)
      .query<{ ivr_extension: string }>('SELECT ivr_extension FROM users WHERE id = @user_id');
    agentExtension = userRes.recordset[0]?.ivr_extension;
  }

  if (!agentExtension) {
    sendError(res, 'No IVR agent extension configured for your account. Please contact your administrator.', 400);
    return;
  }

  const did = parsed.data.did ?? agent?.did_number;

  // Create call record first
  const callResult = await pool.request()
    .input('caller_number', sql.NVarChar, agentExtension)
    .input('customer_number', sql.NVarChar, parsed.data.customerPhone)
    .input('direction', sql.NVarChar, 'outbound')
    .input('assigned_to', sql.UniqueIdentifier, req.user.userId)
    .input('lead_id', sql.UniqueIdentifier, parsed.data.leadId ?? null)
    .input('customer_id', sql.UniqueIdentifier, parsed.data.customerId ?? null)
    .input('ticket_id', sql.UniqueIdentifier, parsed.data.ticketId ?? null)
    .input('status', sql.NVarChar, 'initiated')
    .input('notes', sql.NVarChar, parsed.data.notes ?? null)
    .input('initiated_at', sql.DateTime2, new Date())
    .query<{ id: string }>(`
      INSERT INTO calls (caller_number, customer_number, direction, assigned_to, lead_id, customer_id, ticket_id, status, notes, initiated_at)
      OUTPUT INSERTED.id
      VALUES (@caller_number, @customer_number, @direction, @assigned_to, @lead_id, @customer_id, @ticket_id, @status, @notes, @initiated_at)
    `);

  const callId = callResult.recordset[0].id;

  // Initiate IVR call
  const ivrResult = await ivrService.initiateClickToCall({
    agentExtension,
    did,
    customerPhone: parsed.data.customerPhone,
  });

  if (!ivrResult.success) {
    // Update call record as failed
    await pool.request()
      .input('id', sql.UniqueIdentifier, callId)
      .input('notes', sql.NVarChar, `Call failed: ${ivrResult.message}`)
      .query('UPDATE calls SET status = \'failed\', notes = @notes WHERE id = @id');

    sendError(res, `Call initiation failed: ${ivrResult.message}`, 503);
    return;
  }

  // Update call with IVR call ID
  if (ivrResult.callId) {
    await pool.request()
      .input('id', sql.UniqueIdentifier, callId)
      .input('ivr_call_id', sql.NVarChar, ivrResult.callId)
      .query('UPDATE calls SET ivr_call_id = @ivr_call_id WHERE id = @id');
  }

  sendSuccess(res, { callId, ivrCallId: ivrResult.callId, message: ivrResult.message }, 'Call initiated successfully');
});

// Add call disposition
router.post('/:callId/disposition', requirePermission('calling', 'click-to-call', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = dispositionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();

  await pool.request()
    .input('call_id', sql.UniqueIdentifier, req.params.callId)
    .input('disposition', sql.NVarChar, parsed.data.disposition)
    .input('notes', sql.NVarChar, parsed.data.notes ?? null)
    .input('follow_up_required', sql.Bit, parsed.data.followUpRequired ? 1 : 0)
    .input('follow_up_datetime', sql.DateTime2, parsed.data.followUpDatetime ? new Date(parsed.data.followUpDatetime) : null)
    .input('follow_up_assigned_to', sql.UniqueIdentifier, parsed.data.followUpAssignedTo ?? null)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query(`
      INSERT INTO call_dispositions (call_id, disposition, notes, follow_up_required, follow_up_datetime, follow_up_assigned_to, created_by)
      VALUES (@call_id, @disposition, @notes, @follow_up_required, @follow_up_datetime, @follow_up_assigned_to, @created_by)
    `);

  // Update call outcome
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.callId)
    .input('outcome', sql.NVarChar, parsed.data.disposition)
    .query('UPDATE calls SET outcome = @outcome, status = \'completed\' WHERE id = @id');

  // Auto-create follow-up if required
  if (parsed.data.followUpRequired && parsed.data.followUpDatetime) {
    // Get call details for context
    const callResult = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.callId)
      .query<{ lead_id: string; customer_id: string; customer_number: string }>(`
        SELECT lead_id, customer_id, customer_number FROM calls WHERE id = @id
      `);
    const call = callResult.recordset[0];

    await pool.request()
      .input('type', sql.NVarChar, 'Callback')
      .input('lead_id', sql.UniqueIdentifier, call?.lead_id ?? null)
      .input('customer_id', sql.UniqueIdentifier, call?.customer_id ?? null)
      .input('call_id', sql.UniqueIdentifier, req.params.callId)
      .input('title', sql.NVarChar, `Follow-up call: ${call?.customer_number}`)
      .input('description', sql.NVarChar, `Auto-created from call disposition: ${parsed.data.disposition}`)
      .input('scheduled_at', sql.DateTime2, new Date(parsed.data.followUpDatetime))
      .input('assigned_to', sql.UniqueIdentifier, parsed.data.followUpAssignedTo ?? req.user.userId)
      .input('priority', sql.NVarChar, 'Medium')
      .input('created_by', sql.UniqueIdentifier, req.user.userId)
      .query(`
        INSERT INTO follow_ups (type, lead_id, customer_id, call_id, title, description, scheduled_at, assigned_to, priority, created_by)
        VALUES (@type, @lead_id, @customer_id, @call_id, @title, @description, @scheduled_at, @assigned_to, @priority, @created_by)
      `);

    // Notify assignee
    const assigneeId = parsed.data.followUpAssignedTo ?? req.user.userId;
    await notificationService.create({
      userId: assigneeId,
      type: 'followup_created',
      title: 'New Follow-up Scheduled',
      body: `Follow-up call scheduled for ${new Date(parsed.data.followUpDatetime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      data: { entityType: 'followup', action: 'created' },
    });
  }

  sendSuccess(res, null, 'Disposition saved successfully');
});

// Get call history
router.get('/history', requirePermission('calling', 'history', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const where: string[] = [];

  if (!isAdmin) {
    where.push('c.assigned_to = @user_id');
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }
  if (req.query.search) {
    where.push('(c.customer_number LIKE @search OR c.caller_number LIKE @search)');
    request.input('search', sql.NVarChar, `%${req.query.search}%`);
  }
  if (req.query.direction) {
    where.push('c.direction = @direction');
    request.input('direction', sql.NVarChar, req.query.direction as string);
  }
  if (req.query.status) {
    where.push('c.status = @status');
    request.input('status', sql.NVarChar, req.query.status as string);
  }
  if (req.query.dateFrom) {
    where.push('c.initiated_at >= @date_from');
    request.input('date_from', sql.DateTime2, new Date(req.query.dateFrom as string));
  }
  if (req.query.dateTo) {
    where.push('c.initiated_at <= @date_to');
    request.input('date_to', sql.DateTime2, new Date(req.query.dateTo as string + 'T23:59:59Z'));
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRequest = pool.request();
  if (!isAdmin) countRequest.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (req.query.search) countRequest.input('search', sql.NVarChar, `%${req.query.search}%`);
  if (req.query.direction) countRequest.input('direction', sql.NVarChar, req.query.direction as string);
  if (req.query.status) countRequest.input('status', sql.NVarChar, req.query.status as string);
  if (req.query.dateFrom) countRequest.input('date_from', sql.DateTime2, new Date(req.query.dateFrom as string));
  if (req.query.dateTo) countRequest.input('date_to', sql.DateTime2, new Date(req.query.dateTo as string + 'T23:59:59Z'));

  const countResult = await countRequest.query<{ total: number }>(`SELECT COUNT(1) as total FROM calls c ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT c.*,
      CONCAT(u.first_name, ' ', u.last_name) as agent_name,
      l.first_name + ISNULL(' ' + l.last_name, '') as lead_name,
      cu.first_name + ISNULL(' ' + cu.last_name, '') as customer_name
    FROM calls c
    LEFT JOIN users u ON c.assigned_to = u.id
    LEFT JOIN leads l ON c.lead_id = l.id
    LEFT JOIN customers cu ON c.customer_id = cu.id
    ${whereClause}
    ORDER BY c.initiated_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  sendPaginated(res, dataResult.recordset, { page, limit, total: countResult.recordset[0]?.total ?? 0, totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit) });
});

// IVR webhook (for inbound call events)
router.post('/webhook', async (req: Request, res: Response) => {
  // Log webhook payload
  const pool = getPool();
  const payload = req.body;

  try {
    // Handle different webhook event types
    const eventType = payload.event ?? payload.type ?? payload.status;

    if (eventType === 'inbound' || payload.direction === 'inbound') {
      const callerNumber = payload.caller_no ?? payload.from ?? payload.phone;
      const did = payload.did ?? payload.to;

      // Check if caller matches a customer or lead
      const matchResult = await pool.request()
        .input('phone', sql.NVarChar, callerNumber?.replace(/\D/g, ''))
        .query(`
          SELECT TOP 1 'lead' as type, id, first_name + ISNULL(' ' + last_name, '') as name
          FROM leads WHERE phone = @phone AND deleted_at IS NULL
          UNION ALL
          SELECT TOP 1 'customer' as type, id, first_name + ISNULL(' ' + last_name, '') as name
          FROM customers WHERE phone = @phone AND deleted_at IS NULL
        `);

      const match = matchResult.recordset[0];

      // Create call record
      await pool.request()
        .input('ivr_call_id', sql.NVarChar, payload.call_id ?? payload.unique_id ?? null)
        .input('caller_number', sql.NVarChar, callerNumber ?? null)
        .input('customer_number', sql.NVarChar, did ?? null)
        .input('direction', sql.NVarChar, 'inbound')
        .input('status', sql.NVarChar, 'answered')
        .input('lead_id', sql.UniqueIdentifier, match?.type === 'lead' ? match.id : null)
        .input('customer_id', sql.UniqueIdentifier, match?.type === 'customer' ? match.id : null)
        .input('initiated_at', sql.DateTime2, new Date())
        .query(`
          INSERT INTO calls (ivr_call_id, caller_number, customer_number, direction, status, lead_id, customer_id, initiated_at)
          VALUES (@ivr_call_id, @caller_number, @customer_number, @direction, @status, @lead_id, @customer_id, @initiated_at)
        `);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(200).json({ received: true }); // Always respond 200 to webhooks
  }
});

// IVR health check
router.get('/health', requirePermission('calling', 'ivr-settings', 'view'), async (req: Request, res: Response) => {
  const result = await ivrService.testConnection();
  sendSuccess(res, result, result.connected ? 'IVR connected' : 'IVR not connected');
});

export default router;

