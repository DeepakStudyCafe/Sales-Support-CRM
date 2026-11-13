import { getPool, sql } from '../config/database';
import { logger } from '../utils/logger';

interface AuditLogInput {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(input: AuditLogInput): Promise<void> {
    try {
      const pool = getPool();
      await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, input.userId ?? null)
        .input('action', sql.NVarChar, input.action)
        .input('entity_type', sql.NVarChar, input.entityType ?? null)
        .input('entity_id', sql.NVarChar, input.entityId ?? null)
        .input('old_values', sql.NVarChar, input.oldValues ? JSON.stringify(input.oldValues) : null)
        .input('new_values', sql.NVarChar, input.newValues ? JSON.stringify(input.newValues) : null)
        .input('ip_address', sql.NVarChar, input.ipAddress ?? null)
        .input('user_agent', sql.NVarChar, input.userAgent ?? null)
        .query(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
          VALUES (@user_id, @action, @entity_type, @entity_id, @old_values, @new_values, @ip_address, @user_agent)
        `);
    } catch (error) {
      // Audit logging should never break the main flow
      logger.error('Failed to write audit log', { error: (error as Error).message, input });
    }
  }

  async getLogs(options: {
    page: number;
    limit: number;
    userId?: string;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: unknown[]; total: number }> {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;
    const request = pool.request();
    const countRequest = pool.request();
    const where: string[] = [];

    if (options.userId) {
      where.push('al.user_id = @user_id');
      request.input('user_id', sql.UniqueIdentifier, options.userId);
      countRequest.input('user_id', sql.UniqueIdentifier, options.userId);
    }
    if (options.entityType) {
      where.push('al.entity_type = @entity_type');
      request.input('entity_type', sql.NVarChar, options.entityType);
      countRequest.input('entity_type', sql.NVarChar, options.entityType);
    }
    if (options.action) {
      where.push('al.action = @action');
      request.input('action', sql.NVarChar, options.action);
      countRequest.input('action', sql.NVarChar, options.action);
    }
    if (options.dateFrom) {
      where.push('al.created_at >= @date_from');
      request.input('date_from', sql.DateTime2, new Date(options.dateFrom));
      countRequest.input('date_from', sql.DateTime2, new Date(options.dateFrom));
    }
    if (options.dateTo) {
      where.push('al.created_at <= @date_to');
      request.input('date_to', sql.DateTime2, new Date(options.dateTo + 'T23:59:59Z'));
      countRequest.input('date_to', sql.DateTime2, new Date(options.dateTo + 'T23:59:59Z'));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    request.input('limit', sql.Int, options.limit);
    request.input('offset', sql.Int, offset);

    const countResult = await countRequest.query<{ total: number }>(
      `SELECT COUNT(1) as total FROM audit_logs al ${whereClause}`
    );

    const dataResult = await request.query(`
      SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }
}

export const auditService = new AuditService();

