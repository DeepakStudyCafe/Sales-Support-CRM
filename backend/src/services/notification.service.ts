import { getPool, sql } from '../config/database';
import { logger } from '../utils/logger';
import { getSocketServer } from '../events/socket.server';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    url?: string;
    [key: string]: unknown;
  };
}

export class NotificationService {
  async create(notification: NotificationData): Promise<void> {
    const pool = getPool();
    try {
      const result = await pool
        .request()
        .input('user_id', sql.UniqueIdentifier, notification.userId)
        .input('type', sql.NVarChar, notification.type)
        .input('title', sql.NVarChar, notification.title)
        .input('body', sql.NVarChar, notification.body ?? null)
        .input('data', sql.NVarChar, notification.data ? JSON.stringify(notification.data) : null)
        .query<{ id: string; created_at: Date }>(`
          INSERT INTO notifications (user_id, type, title, body, data)
          OUTPUT INSERTED.id, INSERTED.created_at
          VALUES (@user_id, @type, @title, @body, @data)
        `);

      const inserted = result.recordset[0];

      // Emit real-time notification via Socket.IO
      try {
        const io = getSocketServer();
        io.to(`user:${notification.userId}`).emit('notification:new', {
          id: inserted.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          isRead: false,
          createdAt: inserted.created_at,
        });
      } catch (socketErr) {
        logger.warn('Could not emit socket notification', { error: (socketErr as Error).message });
      }
    } catch (error) {
      logger.error('Failed to create notification', { error: (error as Error).message, notification });
    }
  }

  async createForMultipleUsers(userIds: string[], notification: Omit<NotificationData, 'userId'>): Promise<void> {
    for (const userId of userIds) {
      await this.create({ ...notification, userId });
    }
  }

  async getNotifications(userId: string, options: {
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<{ data: unknown[]; total: number; unreadCount: number }> {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;
    const request = pool.request().input('user_id', sql.UniqueIdentifier, userId);
    let where = 'WHERE user_id = @user_id';
    if (options.unreadOnly) where += ' AND is_read = 0';

    const countResult = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query<{ total: number; unread: number }>(`
        SELECT COUNT(1) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
        FROM notifications ${where.replace('AND is_read = 0', '')}
      `);

    request.input('limit', sql.Int, options.limit);
    request.input('offset', sql.Int, offset);

    const dataResult = await request.query(`
      SELECT * FROM notifications ${where}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
      unreadCount: countResult.recordset[0]?.unread ?? 0,
    };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const pool = getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE notifications SET is_read = 1, read_at = GETUTCDATE()
        WHERE id = @id AND user_id = @user_id
      `);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const pool = getPool();
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE notifications SET is_read = 1, read_at = GETUTCDATE()
        WHERE user_id = @user_id AND is_read = 0
      `);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query<{ cnt: number }>('SELECT COUNT(1) as cnt FROM notifications WHERE user_id = @user_id AND is_read = 0');
    return result.recordset[0]?.cnt ?? 0;
  }
}

export const notificationService = new NotificationService();

