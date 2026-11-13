import { BaseRepository } from './base.repository';
import { getPool, sql } from '../config/database';
import { logger } from '../utils/logger';

export interface UserRecord {
  id: string;
  email: string;
  phone?: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name?: string;
  team_id?: string;
  team_name?: string;
  department_id?: string;
  department_name?: string;
  ivr_agent_id?: string;
  ivr_extension?: string;
  is_active: boolean;
  avatar_url?: string;
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
  last_login_at?: Date;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateUserInput {
  email: string;
  phone?: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role_id: string;
  team_id?: string;
  department_id?: string;
  ivr_agent_id?: string;
  ivr_extension?: string;
  created_by?: string;
}

export interface UpdateUserInput {
  phone?: string;
  first_name?: string;
  last_name?: string;
  role_id?: string;
  team_id?: string;
  department_id?: string;
  ivr_agent_id?: string;
  ivr_extension?: string;
  is_active?: boolean;
  avatar_url?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  timezone?: string;
  password_hash?: string;
}

export interface LoginHistoryRecord {
  id: string;
  user_id?: string;
  email: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed' | 'blocked';
  failure_reason?: string;
  created_at: Date;
}

export class UserRepository extends BaseRepository {
  protected tableName = 'users';

  async findByEmail(email: string): Promise<UserRecord | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query<UserRecord>(`
        SELECT u.*, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.email = @email AND u.deleted_at IS NULL
      `);
    return result.recordset[0] ?? null;
  }

  async findByIdWithRole(id: string): Promise<UserRecord | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query<UserRecord>(`
        SELECT u.*, r.name as role_name,
               t.name as team_name, d.name as department_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN teams t ON u.team_id = t.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = @id AND u.deleted_at IS NULL
      `);
    return result.recordset[0] ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, input.email.toLowerCase().trim())
      .input('phone', sql.NVarChar, input.phone ?? null)
      .input('password_hash', sql.NVarChar, input.password_hash)
      .input('first_name', sql.NVarChar, input.first_name)
      .input('last_name', sql.NVarChar, input.last_name)
      .input('role_id', sql.UniqueIdentifier, input.role_id)
      .input('team_id', sql.UniqueIdentifier, input.team_id ?? null)
      .input('department_id', sql.UniqueIdentifier, input.department_id ?? null)
      .input('ivr_agent_id', sql.NVarChar, input.ivr_agent_id ?? null)
      .input('ivr_extension', sql.NVarChar, input.ivr_extension ?? null)
      .input('created_by', sql.UniqueIdentifier, input.created_by ?? null)
      .query<UserRecord>(`
        INSERT INTO users (email, phone, password_hash, first_name, last_name, role_id, team_id, department_id, ivr_agent_id, ivr_extension, created_by)
        OUTPUT INSERTED.*
        VALUES (@email, @phone, @password_hash, @first_name, @last_name, @role_id, @team_id, @department_id, @ivr_agent_id, @ivr_extension, @created_by)
      `);
    return result.recordset[0];
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserRecord | null> {
    const pool = getPool();
    const setClauses: string[] = ['updated_at = GETUTCDATE()'];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (input.phone !== undefined) {
      setClauses.push('phone = @phone');
      request.input('phone', sql.NVarChar, input.phone ?? null);
    }
    if (input.first_name !== undefined) {
      setClauses.push('first_name = @first_name');
      request.input('first_name', sql.NVarChar, input.first_name);
    }
    if (input.last_name !== undefined) {
      setClauses.push('last_name = @last_name');
      request.input('last_name', sql.NVarChar, input.last_name);
    }
    if (input.role_id !== undefined) {
      setClauses.push('role_id = @role_id');
      request.input('role_id', sql.UniqueIdentifier, input.role_id);
    }
    if (input.team_id !== undefined) {
      setClauses.push('team_id = @team_id');
      request.input('team_id', sql.UniqueIdentifier, input.team_id ?? null);
    }
    if (input.department_id !== undefined) {
      setClauses.push('department_id = @department_id');
      request.input('department_id', sql.UniqueIdentifier, input.department_id ?? null);
    }
    if (input.ivr_agent_id !== undefined) {
      setClauses.push('ivr_agent_id = @ivr_agent_id');
      request.input('ivr_agent_id', sql.NVarChar, input.ivr_agent_id ?? null);
    }
    if (input.ivr_extension !== undefined) {
      setClauses.push('ivr_extension = @ivr_extension');
      request.input('ivr_extension', sql.NVarChar, input.ivr_extension ?? null);
    }
    if (input.is_active !== undefined) {
      setClauses.push('is_active = @is_active');
      request.input('is_active', sql.Bit, input.is_active ? 1 : 0);
    }
    if (input.avatar_url !== undefined) {
      setClauses.push('avatar_url = @avatar_url');
      request.input('avatar_url', sql.NVarChar, input.avatar_url ?? null);
    }
    if (input.working_hours_start !== undefined) {
      setClauses.push('working_hours_start = @working_hours_start');
      request.input('working_hours_start', sql.NVarChar, input.working_hours_start);
    }
    if (input.working_hours_end !== undefined) {
      setClauses.push('working_hours_end = @working_hours_end');
      request.input('working_hours_end', sql.NVarChar, input.working_hours_end);
    }
    if (input.timezone !== undefined) {
      setClauses.push('timezone = @timezone');
      request.input('timezone', sql.NVarChar, input.timezone);
    }
    if (input.password_hash !== undefined) {
      setClauses.push('password_hash = @password_hash');
      request.input('password_hash', sql.NVarChar, input.password_hash);
    }

    const result = await request.query<UserRecord>(`
      UPDATE users SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id AND deleted_at IS NULL
    `);
    return result.recordset[0] ?? null;
  }

  async updateLastLogin(id: string): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE users SET last_login_at = GETUTCDATE() WHERE id = @id');
  }

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
    teamId?: string;
    departmentId?: string;
  }): Promise<{ data: UserRecord[]; total: number }> {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;
    const request = pool.request();
    const where: string[] = ['u.deleted_at IS NULL'];

    if (options.search) {
      where.push(`(u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search OR u.phone LIKE @search)`);
      request.input('search', sql.NVarChar, `%${options.search}%`);
    }
    if (options.roleId) {
      where.push('u.role_id = @role_id');
      request.input('role_id', sql.UniqueIdentifier, options.roleId);
    }
    if (options.isActive !== undefined) {
      where.push('u.is_active = @is_active');
      request.input('is_active', sql.Bit, options.isActive ? 1 : 0);
    }
    if (options.teamId) {
      where.push('u.team_id = @team_id');
      request.input('team_id', sql.UniqueIdentifier, options.teamId);
    }
    if (options.departmentId) {
      where.push('u.department_id = @department_id');
      request.input('department_id', sql.UniqueIdentifier, options.departmentId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    request.input('limit', sql.Int, options.limit);
    request.input('offset', sql.Int, offset);

    const countResult = await pool.request().query<{ total: number }>(
      `SELECT COUNT(1) as total FROM users u ${whereClause}`
    );

    const dataResult = await request.query<UserRecord>(`
      SELECT u.*, r.name as role_name, t.name as team_name, d.name as department_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN departments d ON u.department_id = d.id
      ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }

  async createLoginHistory(data: Omit<LoginHistoryRecord, 'id' | 'created_at'>): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, data.user_id ?? null)
      .input('email', sql.NVarChar, data.email)
      .input('ip_address', sql.NVarChar, data.ip_address ?? null)
      .input('user_agent', sql.NVarChar, data.user_agent ?? null)
      .input('status', sql.NVarChar, data.status)
      .input('failure_reason', sql.NVarChar, data.failure_reason ?? null)
      .query(`
        INSERT INTO login_history (user_id, email, ip_address, user_agent, status, failure_reason)
        VALUES (@user_id, @email, @ip_address, @user_agent, @status, @failure_reason)
      `);
  }

  async getLoginHistory(
    userId: string,
    options: { page: number; limit: number }
  ): Promise<{ data: LoginHistoryRecord[]; total: number }> {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;

    const countResult = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query<{ total: number }>('SELECT COUNT(1) as total FROM login_history WHERE user_id = @user_id');

    const dataResult = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('limit', sql.Int, options.limit)
      .input('offset', sql.Int, offset)
      .query<LoginHistoryRecord>(`
        SELECT * FROM login_history WHERE user_id = @user_id
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }

  async getFailedLoginCount(email: string, sinceMinutes: number): Promise<number> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .input('since', sql.DateTime2, new Date(Date.now() - sinceMinutes * 60 * 1000))
      .query<{ cnt: number }>(`
        SELECT COUNT(1) as cnt FROM login_history
        WHERE email = @email AND status = 'failed' AND created_at > @since
      `);
    return result.recordset[0]?.cnt ?? 0;
  }

  async getUserPermissions(userId: string): Promise<Array<{ module: string; submodule: string | null; action: string; granted: boolean }>> {
    const pool = getPool();
    const result = await pool.request().input('userId', sql.UniqueIdentifier, userId).query<{
      module: string;
      submodule: string | null;
      action: string;
      granted: boolean;
    }>(`
      SELECT p.module, p.submodule, p.action,
        CASE
          WHEN up.granted IS NOT NULL THEN up.granted   -- User override takes priority
          WHEN rp.granted IS NOT NULL THEN rp.granted   -- Role permission
          ELSE 0
        END as granted
      FROM permissions p
      LEFT JOIN role_permissions rp ON rp.permission_id = p.id
        AND rp.role_id = (SELECT role_id FROM users WHERE id = @userId)
      LEFT JOIN user_permissions up ON up.permission_id = p.id
        AND up.user_id = @userId
      WHERE rp.permission_id IS NOT NULL OR up.permission_id IS NOT NULL
    `);
    return result.recordset;
  }

  async createSession(data: {
    userId: string;
    refreshTokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<string> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, data.userId)
      .input('refresh_token_hash', sql.NVarChar, data.refreshTokenHash)
      .input('ip_address', sql.NVarChar, data.ipAddress ?? null)
      .input('user_agent', sql.NVarChar, data.userAgent ?? null)
      .input('expires_at', sql.DateTime2, data.expiresAt)
      .query<{ id: string }>(`
        INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
        OUTPUT INSERTED.id
        VALUES (@user_id, @refresh_token_hash, @ip_address, @user_agent, @expires_at)
      `);
    return result.recordset[0].id;
  }

  async findSession(refreshTokenHash: string): Promise<{ userId: string; expiresAt: Date } | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('token_hash', sql.NVarChar, refreshTokenHash)
      .query<{ user_id: string; expires_at: Date }>(`
        SELECT user_id, expires_at FROM user_sessions
        WHERE refresh_token_hash = @token_hash AND expires_at > GETUTCDATE()
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return { userId: row.user_id, expiresAt: row.expires_at };
  }

  async deleteSession(refreshTokenHash: string): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('token_hash', sql.NVarChar, refreshTokenHash)
      .query('DELETE FROM user_sessions WHERE refresh_token_hash = @token_hash');
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query('DELETE FROM user_sessions WHERE user_id = @user_id');
  }
}

export const userRepository = new UserRepository();

