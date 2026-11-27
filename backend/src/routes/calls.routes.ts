import { Router, Request, Response } from 'express';
import { ivrService } from '../integrations/ivr.service';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { notificationService } from '../services/notification.service';
import { parseDateFrom, parseDateTo } from '../utils/date';
import { logger } from '../utils/logger';
import { env } from '../config/environment';
import { z } from 'zod';

const router = Router();

const clickToCallSchema = z.object({
  customerPhone: z.string().min(8, 'Valid phone number required'),
  did: z.string().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const dispositionSchema = z.object({
  disposition: z.enum(['Interested', 'Not Interested', 'No Answer', 'Busy', 'Call Back Required', 'Follow-up Required', 'Converted', 'Wrong Number', 'Voicemail']),
  notes: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDatetime: z.string().optional(),
  followUpAssignedTo: z.string().uuid().optional(),
});

// Click-to-Call (Initiates bridge call between agent & customer via https://api.ivrsolutions.in)
router.post('/click-to-call', requirePermission('calling', 'click-to-call', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = clickToCallSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();

  // 1. Get agent's extension
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
      .query<{ ivr_extension: string; phone: string }>('SELECT ivr_extension, phone FROM users WHERE id = @user_id');
    agentExtension = userRes.recordset[0]?.ivr_extension || userRes.recordset[0]?.phone;
  }

  // Fallback to default extension if still empty
  if (!agentExtension) {
    agentExtension = '101';
  }

  // 2. Resolve DID number
  let did = parsed.data.did;
  if (!did || did === 'DEFAULT_DID') {
    did = agent?.did_number || env.IVR_DID_NUMBER || '01140005000';
    try {
      const settRes = await pool.request().query<{ value: string }>(`
        SELECT value FROM settings WHERE [key] = 'ivr_did_number'
      `);
      if (settRes.recordset[0]?.value) {
        did = settRes.recordset[0].value.trim();
      }
    } catch {}
  }

  // 3. Create call record first
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

  // 4. Initiate IVR Solutions call
  const ivrResult = await ivrService.initiateClickToCall({
    agentExtension,
    did,
    customerPhone: parsed.data.customerPhone,
    customId: callId,
  });

  if (!ivrResult.success) {
    await pool.request()
      .input('id', sql.UniqueIdentifier, callId)
      .input('notes', sql.NVarChar, `Call failed: ${ivrResult.message}`)
      .query("UPDATE calls SET status = 'failed', notes = @notes WHERE id = @id");

    sendError(res, `Call initiation failed: ${ivrResult.message}`, 503);
    return;
  }

  // Update call with IVR call ID if returned
  if (ivrResult.callId) {
    await pool.request()
      .input('id', sql.UniqueIdentifier, callId)
      .input('ivr_call_id', sql.NVarChar, ivrResult.callId)
      .query('UPDATE calls SET ivr_call_id = @ivr_call_id WHERE id = @id');
  }

  sendSuccess(res, { callId, ivrCallId: ivrResult.callId, message: ivrResult.message }, 'Call initiated successfully via IVR Solutions bridge');
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
    .query("UPDATE calls SET outcome = @outcome, status = 'completed' WHERE id = @id");

  // Auto-create follow-up if required
  if (parsed.data.followUpRequired && parsed.data.followUpDatetime) {
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

    const assigneeId = parsed.data.followUpAssignedTo ?? req.user.userId;
    try {
      await notificationService.create({
        userId: assigneeId,
        type: 'followup_created',
        title: 'New Follow-up Scheduled',
        body: `Follow-up call scheduled for ${new Date(parsed.data.followUpDatetime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        data: { entityType: 'followup', action: 'created' },
      });
    } catch {}
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
    request.input('date_from', sql.DateTime2, parseDateFrom(req.query.dateFrom));
  }
  if (req.query.dateTo) {
    where.push('c.initiated_at <= @date_to');
    request.input('date_to', sql.DateTime2, parseDateTo(req.query.dateTo));
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRequest = pool.request();
  if (!isAdmin) countRequest.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (req.query.search) countRequest.input('search', sql.NVarChar, `%${req.query.search}%`);
  if (req.query.direction) countRequest.input('direction', sql.NVarChar, req.query.direction as string);
  if (req.query.status) countRequest.input('status', sql.NVarChar, req.query.status as string);
  if (req.query.dateFrom) countRequest.input('date_from', sql.DateTime2, parseDateFrom(req.query.dateFrom));
  if (req.query.dateTo) countRequest.input('date_to', sql.DateTime2, parseDateTo(req.query.dateTo));

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

  sendPaginated(res, dataResult.recordset, {
    page,
    limit,
    total: countResult.recordset[0]?.total ?? 0,
    totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit),
  });
});

// Synchronize Call Detail Records (CDR) & Audio Recordings from https://api.ivrsolutions.in
router.post('/sync-logs', requirePermission('calling', 'history', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const pastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fromDate = (req.body.fromDate || pastWeekStr).toString().trim();
    const toDate = (req.body.toDate || todayStr).toString().trim();

    const [callLogs, ctcLogs] = await Promise.all([
      ivrService.getCallLogs({ fromDate, toDate }),
      ivrService.getCTCLogs({ fromDate, toDate }),
    ]);

    const combinedLogs = [...callLogs, ...ctcLogs];
    let syncedCount = 0;

    for (const log of combinedLogs) {
      if (!log.customerNumber && !log.callerNumber) continue;

      const customerPhone = (log.customerNumber || log.callerNumber || '').replace(/\D/g, '');
      const callStatus = (log.status || 'completed').toLowerCase();
      const ivrCallId = log.callId || `IVR-${customerPhone}-${Date.now()}`;

      // Check if call already exists by ivr_call_id
      const existing = await pool.request()
        .input('ivr_call_id', sql.NVarChar, ivrCallId)
        .query<{ id: string }>('SELECT id FROM calls WHERE ivr_call_id = @ivr_call_id');

      if (existing.recordset.length > 0) {
        // Update call duration & recording
        await pool.request()
          .input('id', sql.UniqueIdentifier, existing.recordset[0].id)
          .input('duration', sql.Int, log.duration || 0)
          .input('status', sql.NVarChar, callStatus)
          .input('recording_url', sql.NVarChar, log.recordingUrl || null)
          .query(`
            UPDATE calls
            SET duration = CASE WHEN @duration > 0 THEN @duration ELSE duration END,
                status = @status,
                recording_url = ISNULL(@recording_url, recording_url)
            WHERE id = @id
          `);
        syncedCount++;
      } else {
        // Match caller/customer phone to existing lead or customer
        const searchDigits = customerPhone.length > 10 ? customerPhone.slice(-10) : customerPhone;
        const matchRes = await pool.request()
          .input('phone', sql.NVarChar, searchDigits)
          .query<{ type: string; id: string }>(`
            SELECT TOP 1 'lead' as type, id FROM leads WHERE phone LIKE '%' + @phone AND deleted_at IS NULL
            UNION ALL
            SELECT TOP 1 'customer' as type, id FROM customers WHERE phone LIKE '%' + @phone AND deleted_at IS NULL
          `);
        const match = matchRes.recordset[0];

        const initiatedAt = log.startTime ? new Date(log.startTime) : new Date();

        await pool.request()
          .input('ivr_call_id', sql.NVarChar, ivrCallId)
          .input('caller_number', sql.NVarChar, log.callerNumber || log.agentExtension || 'Agent')
          .input('customer_number', sql.NVarChar, log.customerNumber || customerPhone)
          .input('direction', sql.NVarChar, log.direction || 'outbound')
          .input('status', sql.NVarChar, callStatus)
          .input('duration', sql.Int, log.duration || 0)
          .input('recording_url', sql.NVarChar, log.recordingUrl || null)
          .input('lead_id', sql.UniqueIdentifier, match?.type === 'lead' ? match.id : null)
          .input('customer_id', sql.UniqueIdentifier, match?.type === 'customer' ? match.id : null)
          .input('assigned_to', sql.UniqueIdentifier, req.user.userId)
          .input('initiated_at', sql.DateTime2, initiatedAt)
          .query(`
            INSERT INTO calls (ivr_call_id, caller_number, customer_number, direction, status, duration, recording_url, lead_id, customer_id, assigned_to, initiated_at)
            VALUES (@ivr_call_id, @caller_number, @customer_number, @direction, @status, @duration, @recording_url, @lead_id, @customer_id, @assigned_to, @initiated_at)
          `);
        syncedCount++;
      }
    }

    sendSuccess(
      res,
      { syncedCount, totalFetched: combinedLogs.length },
      `Successfully synced ${syncedCount} call records and audio recordings from IVR Solutions`
    );
  } catch (err: any) {
    sendError(res, 'Failed to sync call logs: ' + err.message, 500);
  }
});

// Register Webhook URL with IVR Solutions
router.post('/register-webhook', requirePermission('calling', 'ivr-settings', 'edit'), async (req: Request, res: Response) => {
  const webhookUrl = req.body.webhookUrl || 'https://crm.automationcafe.in/api/v1/calls/webhook';
  const result = await ivrService.registerWebhook(webhookUrl);
  if (result.success) {
    sendSuccess(res, result, result.message);
  } else {
    sendError(res, result.message, 400);
  }
});

// IVR Solutions Real-Time Webhook (Handles Inbound calls, Hangup events, Recordings, and CDR updates)
const handleWebhook = async (req: Request, res: Response) => {
  const pool = getPool();
  const payload = { ...req.query, ...req.body };

  try {
    const callerNumber = (payload.caller_no || payload.from || payload.phone || payload.caller || '').toString().trim();
    const did = (payload.did || payload.to || payload.did_number || '').toString().trim();
    const ivrCallId = payload.call_id || payload.unique_id || payload.CallId || null;
    const duration = typeof payload.duration === 'number' ? payload.duration : parseInt(payload.duration || '0', 10);
    const recordingUrl = payload.recording_url || payload.recording || payload.record_file || null;
    const status = (payload.status || payload.event || payload.disposition || 'answered').toString().toLowerCase();

    // 1. Update existing call if ivrCallId matches
    if (ivrCallId) {
      const existing = await pool.request()
        .input('ivr_call_id', sql.NVarChar, ivrCallId)
        .query<{ id: string }>('SELECT id FROM calls WHERE ivr_call_id = @ivr_call_id');

      if (existing.recordset.length > 0) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, existing.recordset[0].id)
          .input('status', sql.NVarChar, status)
          .input('duration', sql.Int, duration)
          .input('recording_url', sql.NVarChar, recordingUrl)
          .input('ended_at', sql.DateTime2, new Date())
          .query(`
            UPDATE calls
            SET status = @status,
                duration = CASE WHEN @duration > 0 THEN @duration ELSE duration END,
                recording_url = ISNULL(@recording_url, recording_url),
                ended_at = ISNULL(@ended_at, ended_at)
            WHERE id = @id
          `);
        res.status(200).json({ received: true, updated: true });
        return;
      }
    }

    // 2. Otherwise insert new inbound call record
    if (callerNumber || did) {
      const cleanPhone = callerNumber.replace(/\D/g, '');
      const searchDigits = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      const matchResult = await pool.request()
        .input('phone', sql.NVarChar, searchDigits)
        .query<{ type: string; id: string; name: string }>(`
          SELECT TOP 1 'lead' as type, id, first_name + ISNULL(' ' + last_name, '') as name
          FROM leads WHERE phone LIKE '%' + @phone AND deleted_at IS NULL
          UNION ALL
          SELECT TOP 1 'customer' as type, id, first_name + ISNULL(' ' + last_name, '') as name
          FROM customers WHERE phone LIKE '%' + @phone AND deleted_at IS NULL
        `);

      const match = matchResult.recordset[0];

      await pool.request()
        .input('ivr_call_id', sql.NVarChar, ivrCallId)
        .input('caller_number', sql.NVarChar, callerNumber || null)
        .input('customer_number', sql.NVarChar, did || null)
        .input('direction', sql.NVarChar, payload.direction || 'inbound')
        .input('status', sql.NVarChar, status)
        .input('duration', sql.Int, duration)
        .input('recording_url', sql.NVarChar, recordingUrl)
        .input('lead_id', sql.UniqueIdentifier, match?.type === 'lead' ? match.id : null)
        .input('customer_id', sql.UniqueIdentifier, match?.type === 'customer' ? match.id : null)
        .input('initiated_at', sql.DateTime2, new Date())
        .query(`
          INSERT INTO calls (ivr_call_id, caller_number, customer_number, direction, status, duration, recording_url, lead_id, customer_id, initiated_at)
          VALUES (@ivr_call_id, @caller_number, @customer_number, @direction, @status, @duration, @recording_url, @lead_id, @customer_id, @initiated_at)
        `);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.warn('IVR Webhook processing warning', { error: err.message });
    res.status(200).json({ received: true });
  }
};

router.post('/webhook', handleWebhook);
router.get('/webhook', handleWebhook);

// IVR Solutions gateway health check
router.get('/health', requirePermission('calling', 'ivr-settings', 'view'), async (req: Request, res: Response) => {
  const result = await ivrService.testConnection();
  sendSuccess(res, result, result.connected ? 'IVR connected successfully' : result.message);
});

export default router;
