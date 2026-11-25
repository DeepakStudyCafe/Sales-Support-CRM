import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { ivrService } from '../integrations/ivr.service';
import { z } from 'zod';

const router = Router();

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  dialerMode: z.enum(['preview', 'progressive', 'power', 'predictive', 'ivr_message']).default('progressive'),
  purpose: z.string().max(500).optional(),
  callingWindowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('09:00'),
  callingWindowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('18:00'),
  maxConcurrentCalls: z.number().int().min(1).max(50).default(1),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  retryIntervalMinutes: z.number().int().min(5).max(1440).default(60),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  assignedAgents: z.array(z.string().uuid()).optional(),
  leadIds: z.array(z.string().uuid()).optional(),
  pacingIntervalSeconds: z.number().int().min(5).max(300).default(30),
});

const addContactsSchema = z.object({
  leadIds: z.array(z.string().uuid()).optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  filterCriteria: z.object({
    status: z.string().optional(),
    sourceId: z.string().uuid().optional(),
    priority: z.string().optional(),
  }).optional(),
});

// List campaigns
router.get('/', requirePermission('calling', 'campaigns', 'view'), async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const where: string[] = [];

  if (req.query.status) {
    where.push('c.status = @status');
    request.input('status', sql.NVarChar, req.query.status as string);
  }
  if (req.query.search) {
    where.push('c.name LIKE @search');
    request.input('search', sql.NVarChar, `%${req.query.search}%`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countReq = pool.request();
  if (req.query.status) countReq.input('status', sql.NVarChar, req.query.status as string);
  if (req.query.search) countReq.input('search', sql.NVarChar, `%${req.query.search}%`);
  const countResult = await countReq.query<{ total: number }>(`SELECT COUNT(1) as total FROM call_campaigns c ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT c.*,
      CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      (SELECT COUNT(1) FROM campaign_contacts cc WHERE cc.campaign_id = c.id) as total_contacts,
      (SELECT COUNT(1) FROM campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.status = 'Answered') as answered_calls,
      (SELECT COUNT(1) FROM campaign_contacts cc WHERE cc.campaign_id = c.id AND cc.status = 'Completed') as completed_calls
    FROM call_campaigns c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN users au ON c.assigned_to = au.id
    ${whereClause}
    ORDER BY c.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  sendPaginated(res, dataResult.recordset, {
    page,
    limit,
    total: countResult.recordset[0]?.total ?? 0,
    totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit),
  });
});

// Create campaign with assigned agents and leads
router.post('/', requirePermission('calling', 'campaigns', 'create'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    return;
  }

  const pool = getPool();
  const assignedAgentsList = parsed.data.assignedAgents && parsed.data.assignedAgents.length > 0
    ? parsed.data.assignedAgents
    : parsed.data.assignedTo
      ? [parsed.data.assignedTo]
      : [req.user.userId];

  const primaryAssignee = assignedAgentsList[0] || req.user.userId;
  const metadataStr = JSON.stringify({
    assignedAgents: assignedAgentsList,
    pacingIntervalSeconds: parsed.data.pacingIntervalSeconds || 30,
    purpose: parsed.data.purpose || '',
  });

  const result = await pool.request()
    .input('name', sql.NVarChar, parsed.data.name)
    .input('dialer_mode', sql.NVarChar, parsed.data.dialerMode)
    .input('purpose', sql.NVarChar, metadataStr)
    .input('calling_window_start', sql.NVarChar, parsed.data.callingWindowStart)
    .input('calling_window_end', sql.NVarChar, parsed.data.callingWindowEnd)
    .input('max_concurrent_calls', sql.Int, parsed.data.maxConcurrentCalls)
    .input('max_attempts', sql.Int, parsed.data.maxAttempts)
    .input('retry_interval_minutes', sql.Int, parsed.data.retryIntervalMinutes)
    .input('start_time', sql.DateTime2, parsed.data.startTime ? new Date(parsed.data.startTime) : null)
    .input('end_time', sql.DateTime2, parsed.data.endTime ? new Date(parsed.data.endTime) : null)
    .input('assigned_to', sql.UniqueIdentifier, primaryAssignee)
    .input('created_by', sql.UniqueIdentifier, req.user.userId)
    .query<{ id: string }>(`
      INSERT INTO call_campaigns (name, dialer_mode, purpose, calling_window_start, calling_window_end, max_concurrent_calls, max_attempts, retry_interval_minutes, start_time, end_time, assigned_to, created_by)
      OUTPUT INSERTED.id
      VALUES (@name, @dialer_mode, @purpose, @calling_window_start, @calling_window_end, @max_concurrent_calls, @max_attempts, @retry_interval_minutes, @start_time, @end_time, @assigned_to, @created_by)
    `);

  const campaignId = result.recordset[0].id;

  // If leads were provided, distribute them across assigned agents in round-robin fashion
  if (parsed.data.leadIds && parsed.data.leadIds.length > 0) {
    for (let i = 0; i < parsed.data.leadIds.length; i++) {
      const leadId = parsed.data.leadIds[i];
      const targetAgentId = assignedAgentsList[i % assignedAgentsList.length];

      const leadRes = await pool.request()
        .input('id', sql.UniqueIdentifier, leadId)
        .query<{ phone: string }>(`SELECT phone FROM leads WHERE id = @id`);

      if (leadRes.recordset[0]?.phone) {
        // Reassign lead to the selected agent
        await pool.request()
          .input('leadId', sql.UniqueIdentifier, leadId)
          .input('agentId', sql.UniqueIdentifier, targetAgentId)
          .query(`UPDATE leads SET assigned_to = @agentId, updated_at = GETUTCDATE() WHERE id = @leadId`);

        // Insert into campaign_contacts
        await pool.request()
          .input('campaignId', sql.UniqueIdentifier, campaignId)
          .input('leadId', sql.UniqueIdentifier, leadId)
          .input('phone', sql.NVarChar, leadRes.recordset[0].phone)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM campaign_contacts WHERE campaign_id = @campaignId AND lead_id = @leadId)
            INSERT INTO campaign_contacts (campaign_id, lead_id, phone, status)
            VALUES (@campaignId, @leadId, @phone, 'Pending')
          `);
      }
    }
  }

  sendSuccess(res, { id: campaignId }, 'Campaign created successfully with agent allocations', 201);
});

// Get campaign by ID with metrics and assigned agent details
router.get('/:id', requirePermission('calling', 'campaigns', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const campaignResult = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`
      SELECT c.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
        CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
      FROM call_campaigns c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN users au ON c.assigned_to = au.id
      WHERE c.id = @id
    `);

  if (!campaignResult.recordset[0]) {
    sendError(res, 'Campaign not found', 404);
    return;
  }

  const metrics = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`
      SELECT
        COUNT(1) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Calling' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'Skipped' THEN 1 ELSE 0 END) as skipped,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM campaign_contacts WHERE campaign_id = @id
    `);

  let parsedMetadata: any = {};
  try {
    parsedMetadata = JSON.parse(campaignResult.recordset[0].purpose || '{}');
  } catch {
    parsedMetadata = { purpose: campaignResult.recordset[0].purpose };
  }

  sendSuccess(res, {
    ...campaignResult.recordset[0],
    metadata: parsedMetadata,
    metrics: metrics.recordset[0] ?? {},
  });
});

// Get all contacts in campaign with assigned agent info
router.get('/:id/contacts', requirePermission('calling', 'campaigns', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const contacts = await pool.request()
    .input('campaignId', sql.UniqueIdentifier, req.params.id)
    .query(`
      SELECT cc.*,
        l.first_name, l.last_name, l.company, l.status as lead_status, l.priority,
        CONCAT(u.first_name, ' ', u.last_name) as assigned_agent_name,
        u.email as assigned_agent_email
      FROM campaign_contacts cc
      LEFT JOIN leads l ON cc.lead_id = l.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE cc.campaign_id = @campaignId
      ORDER BY cc.created_at ASC
    `);
  sendSuccess(res, contacts.recordset);
});

// Get per-agent progress breakdown in campaign
router.get('/:id/agent-progress', requirePermission('calling', 'campaigns', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const progress = await pool.request()
    .input('campaignId', sql.UniqueIdentifier, req.params.id)
    .query(`
      SELECT
        u.id as user_id,
        CONCAT(u.first_name, ' ', u.last_name) as agent_name,
        r.name as role_name,
        COUNT(cc.id) as assigned_leads,
        SUM(CASE WHEN cc.status = 'Completed' OR cc.status = 'Answered' THEN 1 ELSE 0 END) as calls_completed,
        SUM(CASE WHEN l.status = 'Interested' THEN 1 ELSE 0 END) as interested_count,
        SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) as converted_count,
        SUM(CASE WHEN cc.status = 'Pending' THEN 1 ELSE 0 END) as pending_calls
      FROM campaign_contacts cc
      JOIN leads l ON cc.lead_id = l.id
      JOIN users u ON l.assigned_to = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE cc.campaign_id = @campaignId
      GROUP BY u.id, u.first_name, u.last_name, r.name
    `);
  sendSuccess(res, progress.recordset);
});

// Progressive dialer: Fetch next lead in active campaign for the logged-in agent
router.get('/active-feed/my-next', requirePermission('calling', 'click-to-call', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  const nextLead = await pool.request()
    .input('userId', sql.UniqueIdentifier, req.user.userId)
    .query(`
      SELECT TOP 1
        cc.id as contact_id,
        cc.campaign_id,
        cc.phone,
        cc.status as call_status,
        c.name as campaign_name,
        c.purpose,
        l.id as lead_id,
        l.first_name,
        l.last_name,
        l.company,
        l.email,
        l.status as lead_status,
        l.priority,
        l.value
      FROM campaign_contacts cc
      JOIN call_campaigns c ON cc.campaign_id = c.id
      JOIN leads l ON cc.lead_id = l.id
      WHERE l.assigned_to = @userId
        AND c.status = 'Active'
        AND cc.status = 'Pending'
        AND l.deleted_at IS NULL
      ORDER BY cc.created_at ASC
    `);

  sendSuccess(res, nextLead.recordset[0] ?? null);
});

// Progressive dialer: Record outcome and advance lead
router.post('/active-feed/outcome', requirePermission('calling', 'click-to-call', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { contactId, leadId, callOutcome, leadStatus, notes, followUpDate } = req.body;
  const pool = getPool();

  if (contactId) {
    await pool.request()
      .input('contactId', sql.UniqueIdentifier, contactId)
      .input('outcome', sql.NVarChar, callOutcome || 'Completed')
      .query(`
        UPDATE campaign_contacts
        SET status = 'Completed', last_outcome = @outcome, last_attempt_at = GETUTCDATE(), attempts = attempts + 1, updated_at = GETUTCDATE()
        WHERE id = @contactId
      `);
  }

  if (leadId && leadStatus) {
    await pool.request()
      .input('leadId', sql.UniqueIdentifier, leadId)
      .input('status', sql.NVarChar, leadStatus)
      .query(`UPDATE leads SET status = @status, updated_at = GETUTCDATE() WHERE id = @leadId`);
  }

  if (followUpDate && leadId) {
    await pool.request()
      .input('leadId', sql.UniqueIdentifier, leadId)
      .input('assignedTo', sql.UniqueIdentifier, req.user.userId)
      .input('dueAt', sql.DateTime2, new Date(followUpDate))
      .input('notes', sql.NVarChar, notes || 'Auto-assignment follow-up')
      .query(`
        INSERT INTO follow_ups (lead_id, assigned_to, due_at, type, status, notes)
        VALUES (@leadId, @assignedTo, @dueAt, 'Call', 'Pending', @notes)
      `);
  }

  sendSuccess(res, { success: true }, 'Outcome recorded and advanced to next lead');
});

// Add contacts to campaign
router.post('/:id/contacts', requirePermission('calling', 'campaigns', 'edit'), async (req: Request, res: Response) => {
  const parsed = addContactsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }

  const pool = getPool();
  let addedCount = 0;

  // Add individual leads
  if (parsed.data.leadIds && parsed.data.leadIds.length > 0) {
    for (const leadId of parsed.data.leadIds) {
      const lead = await pool.request()
        .input('id', sql.UniqueIdentifier, leadId)
        .query<{ id: string; phone: string; status: string }>(`
          SELECT id, phone, status FROM leads WHERE id = @id AND deleted_at IS NULL
        `);
      if (lead.recordset[0]?.phone) {
        await pool.request()
          .input('campaign_id', sql.UniqueIdentifier, req.params.id)
          .input('lead_id', sql.UniqueIdentifier, leadId)
          .input('phone', sql.NVarChar, lead.recordset[0].phone)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM campaign_contacts WHERE campaign_id = @campaign_id AND phone = @phone)
            INSERT INTO campaign_contacts (campaign_id, lead_id, phone, status)
            VALUES (@campaign_id, @lead_id, @phone, 'Pending')
          `);
        addedCount++;
      }
    }
  }

  // Add individual customers
  if (parsed.data.customerIds && parsed.data.customerIds.length > 0) {
    for (const custId of parsed.data.customerIds) {
      const cust = await pool.request()
        .input('id', sql.UniqueIdentifier, custId)
        .query<{ id: string; phone: string }>(`
          SELECT id, phone FROM customers WHERE id = @id AND deleted_at IS NULL
        `);
      if (cust.recordset[0]?.phone) {
        await pool.request()
          .input('campaign_id', sql.UniqueIdentifier, req.params.id)
          .input('customer_id', sql.UniqueIdentifier, custId)
          .input('phone', sql.NVarChar, cust.recordset[0].phone)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM campaign_contacts WHERE campaign_id = @campaign_id AND phone = @phone)
            INSERT INTO campaign_contacts (campaign_id, customer_id, phone, status)
            VALUES (@campaign_id, @customer_id, @phone, 'Pending')
          `);
        addedCount++;
      }
    }
  }

  sendSuccess(res, { addedCount }, `${addedCount} contacts added to campaign`);
});

// Update campaign status (start, pause, stop)
router.patch('/:id/status', requirePermission('calling', 'campaigns', 'edit'), async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['Active', 'Paused', 'Stopped', 'Completed'].includes(status)) {
    sendError(res, 'Invalid status', 400);
    return;
  }

  const pool = getPool();
  const campaign = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query<{ id: string; ivr_dialer_id: string }>(`
      SELECT id, ivr_dialer_id FROM call_campaigns WHERE id = @id
    `);

  if (!campaign.recordset[0]) {
    sendError(res, 'Campaign not found', 404);
    return;
  }

  // If connected to IVR Solutions dialer ID, trigger remote status change
  if (campaign.recordset[0].ivr_dialer_id) {
    const ivrActionMap: Record<string, 'start' | 'pause' | 'stop'> = {
      Active: 'start',
      Paused: 'pause',
      Stopped: 'stop',
    };
    if (ivrActionMap[status]) {
      await ivrService.changeDialerStatus(campaign.recordset[0].ivr_dialer_id, ivrActionMap[status]);
    }
  }

  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('status', sql.NVarChar, status)
    .query('UPDATE call_campaigns SET status = @status, updated_at = GETUTCDATE() WHERE id = @id');

  sendSuccess(res, null, `Campaign status updated to ${status}`);
});

export default router;
