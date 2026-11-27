import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { parseDateFrom, parseDateTo } from '../utils/date';

const router = Router();

// Overview dashboard data
router.get('/overview', requirePermission('dashboard', 'overview', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  try {
    const pool = getPool();
    const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);

    // Safe Date range filter
    const dateFrom = parseDateFrom(req.query.dateFrom, 30);
    const dateTo = parseDateTo(req.query.dateTo);

    const request = pool.request();
    request.input('date_from', sql.DateTime2, dateFrom);
    request.input('date_to', sql.DateTime2, dateTo);
    if (!isAdmin) request.input('user_id', sql.UniqueIdentifier, req.user.userId);

    const userWhere = !isAdmin ? 'AND assigned_to = @user_id' : '';

    // Leads stats
    const leadsResult = await request.query<{
      total_leads: number; new_leads: number; active_leads: number; converted_leads: number; lost_leads: number;
    }>(`
      SELECT
        COUNT(1) as total_leads,
        ISNULL(SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END), 0) as new_leads,
        ISNULL(SUM(CASE WHEN status IN ('Assigned','Contacted','Interested','Follow-up','Qualified') THEN 1 ELSE 0 END), 0) as active_leads,
        ISNULL(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted_leads,
        ISNULL(SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END), 0) as lost_leads
      FROM leads WHERE deleted_at IS NULL AND created_at BETWEEN @date_from AND @date_to ${userWhere}
    `);

    // Calls stats
    const callsReq = pool.request();
    callsReq.input('date_from', sql.DateTime2, dateFrom);
    callsReq.input('date_to', sql.DateTime2, dateTo);
    if (!isAdmin) callsReq.input('user_id', sql.UniqueIdentifier, req.user.userId);

    const callsResult = await callsReq.query<{ total_calls: number; answered_calls: number; missed_calls: number }>(`
      SELECT
        COUNT(1) as total_calls,
        ISNULL(SUM(CASE WHEN status = 'answered' OR status = 'completed' THEN 1 ELSE 0 END), 0) as answered_calls,
        ISNULL(SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END), 0) as missed_calls
      FROM calls WHERE initiated_at BETWEEN @date_from AND @date_to ${!isAdmin ? 'AND assigned_to = @user_id' : ''}
    `);

    // Customers
    const customersResult = await pool.request().query<{ total: number }>(`
      SELECT COUNT(1) as total FROM customers WHERE deleted_at IS NULL AND is_active = 1
    `);

    // Follow-ups
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const fuReq = pool.request();
    fuReq.input('today_start', sql.DateTime2, todayStart);
    fuReq.input('today_end', sql.DateTime2, todayEnd);
    fuReq.input('now', sql.DateTime2, now);
    if (!isAdmin) fuReq.input('user_id', sql.UniqueIdentifier, req.user.userId);

    const fuResult = await fuReq.query<{ today_due: number; overdue: number }>(`
      SELECT
        ISNULL(SUM(CASE WHEN scheduled_at BETWEEN @today_start AND @today_end AND status IN ('Pending','In Progress') THEN 1 ELSE 0 END), 0) as today_due,
        ISNULL(SUM(CASE WHEN scheduled_at < @now AND status IN ('Pending','In Progress') THEN 1 ELSE 0 END), 0) as overdue
      FROM follow_ups WHERE 1=1 ${!isAdmin ? 'AND assigned_to = @user_id' : ''}
    `);

    // Tickets
    const ticketsReq = pool.request();
    if (!isAdmin) ticketsReq.input('user_id', sql.UniqueIdentifier, req.user.userId);
    const ticketsResult = await ticketsReq.query<{ open: number; resolved: number }>(`
      SELECT
        ISNULL(SUM(CASE WHEN status IN ('Open', 'In Progress', 'Waiting for Customer') THEN 1 ELSE 0 END), 0) as [open],
        ISNULL(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved
      FROM tickets WHERE 1=1 ${!isAdmin ? 'AND (assigned_to = @user_id OR created_by = @user_id)' : ''}
    `);

    // Lead trend (last 7 days)
    const trendResult = await pool.request().query(`
      SELECT
        CAST(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time' AS DATE) as date,
        COUNT(1) as count
      FROM leads
      WHERE created_at >= DATEADD(day, -7, GETUTCDATE()) AND deleted_at IS NULL
      GROUP BY CAST(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time' AS DATE)
      ORDER BY date ASC
    `);

    sendSuccess(res, {
      leads: leadsResult.recordset[0] ?? {},
      calls: callsResult.recordset[0] ?? {},
      customers: customersResult.recordset[0]?.total ?? 0,
      followUps: fuResult.recordset[0] ?? {},
      tickets: ticketsResult.recordset[0] ?? {},
      leadTrend: trendResult.recordset,
    });
  } catch (error) {
    sendError(res, (error as Error).message, 500);
  }
});

export default router;

