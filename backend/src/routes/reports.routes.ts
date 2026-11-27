import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';
import { parseDateFrom, parseDateTo } from '../utils/date';

const router = Router();

// Reports - Lead reports
router.get('/leads', requirePermission('reports', 'leads', 'view'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const pool = getPool();
  const dateFrom = parseDateFrom(req.query.dateFrom, 30);
  const dateTo = parseDateTo(req.query.dateTo);

  const request = pool.request();
  request.input('date_from', sql.DateTime2, dateFrom);
  request.input('date_to', sql.DateTime2, dateTo);

  // By status
  const statusReport = await request.query(`
    SELECT status, COUNT(1) as count
    FROM leads WHERE deleted_at IS NULL AND created_at BETWEEN @date_from AND @date_to
    GROUP BY status ORDER BY count DESC
  `);

  // By source
  const sourceReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT ls.name as source, COUNT(l.id) as count
      FROM leads l LEFT JOIN lead_sources ls ON l.source_id = ls.id
      WHERE l.deleted_at IS NULL AND l.created_at BETWEEN @date_from AND @date_to
      GROUP BY ls.name ORDER BY count DESC
    `);

  // By assigned user
  const userReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT CONCAT(u.first_name, ' ', u.last_name) as agent,
        COUNT(l.id) as total,
        SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN l.status = 'Lost' THEN 1 ELSE 0 END) as lost
      FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.deleted_at IS NULL AND l.created_at BETWEEN @date_from AND @date_to
      GROUP BY u.first_name, u.last_name ORDER BY total DESC
    `);

  sendSuccess(res, {
    byStatus: statusReport.recordset,
    bySource: sourceReport.recordset,
    byAgent: userReport.recordset,
  });
});

// Sales reports
router.get('/sales', requirePermission('reports', 'sales', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const dateFrom = parseDateFrom(req.query.dateFrom, 30);
  const dateTo = parseDateTo(req.query.dateTo);

  const request = pool.request();
  request.input('date_from', sql.DateTime2, dateFrom);
  request.input('date_to', sql.DateTime2, dateTo);

  const pipelineReport = await request.query(`
    SELECT stage, COUNT(1) as count, SUM(value) as total_value
    FROM opportunities
    WHERE created_at BETWEEN @date_from AND @date_to
    GROUP BY stage ORDER BY count DESC
  `);

  const agentReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT CONCAT(u.first_name, ' ', u.last_name) as agent,
        COUNT(o.id) as opportunities,
        SUM(CASE WHEN o.stage = 'Closed Won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN o.stage = 'Closed Lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN o.stage = 'Closed Won' THEN o.value ELSE 0 END) as won_value
      FROM opportunities o LEFT JOIN users u ON o.assigned_to = u.id
      WHERE o.created_at BETWEEN @date_from AND @date_to
      GROUP BY u.first_name, u.last_name ORDER BY won_value DESC
    `);

  sendSuccess(res, { pipeline: pipelineReport.recordset, byAgent: agentReport.recordset });
});

// Calling reports
router.get('/calling', requirePermission('reports', 'calling', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const dateFrom = parseDateFrom(req.query.dateFrom, 30);
  const dateTo = parseDateTo(req.query.dateTo);

  const request = pool.request();
  request.input('date_from', sql.DateTime2, dateFrom);
  request.input('date_to', sql.DateTime2, dateTo);

  const summaryReport = await request.query<{
    total: number; answered: number; missed: number; avg_duration: number;
  }>(`
    SELECT
      COUNT(1) as total,
      SUM(CASE WHEN status IN ('answered','completed') THEN 1 ELSE 0 END) as answered,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
      AVG(CAST(duration as FLOAT)) as avg_duration
    FROM calls WHERE initiated_at BETWEEN @date_from AND @date_to
  `);

  const agentReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT CONCAT(u.first_name, ' ', u.last_name) as agent,
        COUNT(c.id) as total_calls,
        SUM(CASE WHEN c.status IN ('answered','completed') THEN 1 ELSE 0 END) as answered,
        SUM(CASE WHEN c.status = 'missed' THEN 1 ELSE 0 END) as missed,
        AVG(CAST(c.duration as FLOAT)) as avg_duration
      FROM calls c LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.initiated_at BETWEEN @date_from AND @date_to
      GROUP BY u.first_name, u.last_name ORDER BY total_calls DESC
    `);

  const outcomeReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT outcome, COUNT(1) as count FROM calls
      WHERE outcome IS NOT NULL AND initiated_at BETWEEN @date_from AND @date_to
      GROUP BY outcome ORDER BY count DESC
    `);

  sendSuccess(res, {
    summary: summaryReport.recordset[0] ?? {},
    byAgent: agentReport.recordset,
    byOutcome: outcomeReport.recordset,
  });
});

// Support reports
router.get('/support', requirePermission('reports', 'support', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const dateFrom = parseDateFrom(req.query.dateFrom, 30);
  const dateTo = parseDateTo(req.query.dateTo);

  const request = pool.request();
  request.input('date_from', sql.DateTime2, dateFrom);
  request.input('date_to', sql.DateTime2, dateTo);

  const summaryReport = await request.query(`
    SELECT
      COUNT(1) as total,
      SUM(CASE WHEN status IN ('Open','In Progress','Waiting for Customer') THEN 1 ELSE 0 END) as [open],
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
      AVG(DATEDIFF(HOUR, created_at, ISNULL(resolved_at, GETUTCDATE()))) as avg_resolution_hours
    FROM tickets WHERE created_at BETWEEN @date_from AND @date_to
  `);

  const agentReport = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT CONCAT(u.first_name, ' ', u.last_name) as agent,
        COUNT(t.id) as assigned,
        SUM(CASE WHEN t.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        AVG(DATEDIFF(HOUR, t.created_at, ISNULL(t.resolved_at, GETUTCDATE()))) as avg_resolution_hours
      FROM tickets t LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.created_at BETWEEN @date_from AND @date_to
      GROUP BY u.first_name, u.last_name ORDER BY assigned DESC
    `);

  sendSuccess(res, { summary: summaryReport.recordset[0] ?? {}, byAgent: agentReport.recordset });
});

// Employee performance
router.get('/performance', requirePermission('reports', 'performance', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const dateFrom = parseDateFrom(req.query.dateFrom, 30);
  const dateTo = parseDateTo(req.query.dateTo);

  const result = await pool.request()
    .input('date_from', sql.DateTime2, dateFrom)
    .input('date_to', sql.DateTime2, dateTo)
    .query(`
      SELECT
        CONCAT(u.first_name, ' ', u.last_name) as employee_name,
        r.name as role,
        (SELECT COUNT(1) FROM leads WHERE assigned_to = u.id AND created_at BETWEEN @date_from AND @date_to AND deleted_at IS NULL) as leads_assigned,
        (SELECT COUNT(1) FROM leads WHERE assigned_to = u.id AND status = 'Converted' AND created_at BETWEEN @date_from AND @date_to AND deleted_at IS NULL) as leads_converted,
        (SELECT COUNT(1) FROM calls WHERE assigned_to = u.id AND initiated_at BETWEEN @date_from AND @date_to) as calls_made,
        (SELECT COUNT(1) FROM tickets WHERE assigned_to = u.id AND status = 'Resolved' AND created_at BETWEEN @date_from AND @date_to) as tickets_resolved,
        (SELECT COUNT(1) FROM follow_ups WHERE assigned_to = u.id AND status = 'Completed' AND created_at BETWEEN @date_from AND @date_to) as tasks_completed
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1 AND u.deleted_at IS NULL AND r.name != 'Super Admin'
      ORDER BY employee_name ASC
    `);

  sendSuccess(res, result.recordset);
});

export default router;

