import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { auditService } from '../services/audit.service';
import { sendPaginated, sendError } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { getPaginationParams } from '../utils/pagination';

const router = Router();

router.get('/login-history', requirePermission('audit', 'all', 'view'), async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  try {
    const countResult = await pool.request().query<{ total: number }>('SELECT COUNT(1) as total FROM login_history');
    const dataResult = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT lh.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM login_history lh
        LEFT JOIN users u ON lh.user_id = u.id
        ORDER BY lh.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    sendPaginated(res, dataResult.recordset, {
      page,
      limit,
      total: countResult.recordset[0]?.total ?? 0,
      totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit),
    });
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

router.get('/employee-activities', requirePermission('audit', 'all', 'view'), async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query);
  const offset = (page - 1) * limit;
  const pool = getPool();
  try {
    const request = pool.request();
    const countRequest = pool.request();
    const where: string[] = ['al.user_id IS NOT NULL'];

    if (req.query.userId) {
      where.push('al.user_id = @user_id');
      request.input('user_id', sql.UniqueIdentifier, req.query.userId as string);
      countRequest.input('user_id', sql.UniqueIdentifier, req.query.userId as string);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const countResult = await countRequest.query<{ total: number }>(`SELECT COUNT(1) as total FROM audit_logs al ${whereClause}`);
    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);

    const dataResult = await request.query(`
      SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, r.name as role_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY al.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    sendPaginated(res, dataResult.recordset, {
      page,
      limit,
      total: countResult.recordset[0]?.total ?? 0,
      totalPages: Math.ceil((countResult.recordset[0]?.total ?? 0) / limit),
    });
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

router.get('/', requirePermission('audit', 'all', 'view'), async (req: Request, res: Response) => {
  const { page, limit } = getPaginationParams(req.query);
  try {
    const result = await auditService.getLogs({
      page,
      limit,
      userId: req.query.userId as string,
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });
    sendPaginated(res, result.data, {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

export default router;
