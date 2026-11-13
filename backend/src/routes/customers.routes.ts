import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { z } from 'zod';

const router = Router();

// List customers
router.get('/', requirePermission('customers', 'all', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  const request = pool.request();
  const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
  const where: string[] = ['c.deleted_at IS NULL'];

  if (!isAdmin) {
    where.push('c.assigned_to = @user_id');
    request.input('user_id', sql.UniqueIdentifier, req.user.userId);
  }
  if (req.query.search) {
    where.push('(c.first_name LIKE @search OR c.last_name LIKE @search OR c.email LIKE @search OR c.phone LIKE @search OR c.company LIKE @search)');
    request.input('search', sql.NVarChar, `%${req.query.search}%`);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const countReq = pool.request();
  if (!isAdmin) countReq.input('user_id', sql.UniqueIdentifier, req.user.userId);
  if (req.query.search) countReq.input('search', sql.NVarChar, `%${req.query.search}%`);
  const countResult = await countReq.query<{ total: number }>(`SELECT COUNT(1) as total FROM customers c ${whereClause}`);

  request.input('limit', sql.Int, limit);
  request.input('offset', sql.Int, offset);

  const dataResult = await request.query(`
    SELECT c.*,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name
    FROM customers c
    LEFT JOIN users au ON c.assigned_to = au.id
    ${whereClause}
    ORDER BY c.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  const total = countResult.recordset[0]?.total ?? 0;
  sendPaginated(res, dataResult.recordset, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

// Get customer 360 profile
router.get('/:id', requirePermission('customers', 'all', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id);

  const customerResult = await request.query(`
    SELECT c.*,
      CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
      l.id as original_lead_id, l.source_id as lead_source_id, ls.name as lead_source_name
    FROM customers c
    LEFT JOIN users au ON c.assigned_to = au.id
    LEFT JOIN leads l ON c.lead_id = l.id
    LEFT JOIN lead_sources ls ON l.source_id = ls.id
    WHERE c.id = @id AND c.deleted_at IS NULL
  `);

  if (!customerResult.recordset[0]) {
    sendError(res, 'Customer not found', 404);
    return;
  }

  // Calls
  const calls = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT TOP 20 c.*, CONCAT(u.first_name, ' ', u.last_name) as agent_name
    FROM calls c LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.customer_id = @id ORDER BY c.initiated_at DESC
  `);

  // Tickets
  const tickets = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT TOP 20 t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at
    FROM tickets t WHERE t.customer_id = @id ORDER BY t.created_at DESC
  `);

  // Follow-ups
  const followUps = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT TOP 20 f.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
    FROM follow_ups f LEFT JOIN users u ON f.assigned_to = u.id
    WHERE f.customer_id = @id ORDER BY f.scheduled_at DESC
  `);

  // Opportunities
  const opportunities = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`
    SELECT TOP 10 o.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
    FROM opportunities o LEFT JOIN users u ON o.assigned_to = u.id
    WHERE o.customer_id = @id ORDER BY o.created_at DESC
  `);

  sendSuccess(res, {
    ...customerResult.recordset[0],
    calls: calls.recordset,
    tickets: tickets.recordset,
    followUps: followUps.recordset,
    opportunities: opportunities.recordset,
  });
});

// Update customer
router.put('/:id', requirePermission('customers', 'all', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  const { first_name, last_name, email, phone, alt_phone, company, address, city, state, country, pincode, assigned_to, notes } = req.body;

  const setClauses = ['updated_at = GETUTCDATE()'];
  const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id);

  if (first_name) { setClauses.push('first_name = @first_name'); request.input('first_name', sql.NVarChar, first_name); }
  if (last_name !== undefined) { setClauses.push('last_name = @last_name'); request.input('last_name', sql.NVarChar, last_name); }
  if (email !== undefined) { setClauses.push('email = @email'); request.input('email', sql.NVarChar, email); }
  if (phone) { setClauses.push('phone = @phone'); request.input('phone', sql.NVarChar, phone); }
  if (company !== undefined) { setClauses.push('company = @company'); request.input('company', sql.NVarChar, company); }
  if (address !== undefined) { setClauses.push('address = @address'); request.input('address', sql.NVarChar, address); }
  if (city !== undefined) { setClauses.push('city = @city'); request.input('city', sql.NVarChar, city); }
  if (state !== undefined) { setClauses.push('state = @state'); request.input('state', sql.NVarChar, state); }
  if (assigned_to) { setClauses.push('assigned_to = @assigned_to'); request.input('assigned_to', sql.UniqueIdentifier, assigned_to); }
  if (notes !== undefined) { setClauses.push('notes = @notes'); request.input('notes', sql.NVarChar, notes); }

  await request.query(`UPDATE customers SET ${setClauses.join(', ')} WHERE id = @id AND deleted_at IS NULL`);
  sendSuccess(res, null, 'Customer updated');
});

// Customer stats for dashboard
router.get('/stats/total', async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query<{ total: number }>('SELECT COUNT(1) as total FROM customers WHERE deleted_at IS NULL AND is_active = 1');
  sendSuccess(res, { total: result.recordset[0]?.total ?? 0 });
});

export default router;

