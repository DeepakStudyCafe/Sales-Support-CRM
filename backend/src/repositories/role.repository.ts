import { getPool, sql } from '../config/database';

export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: Date;
}

export interface PermissionRecord {
  id: string;
  module: string;
  submodule?: string;
  action: string;
  description?: string;
}

export interface RolePermissionMatrix {
  role_id: string;
  permission_id: string;
  granted: boolean;
}

export class RoleRepository {
  async findAll(): Promise<RoleRecord[]> {
    const pool = getPool();
    const result = await pool.request().query<RoleRecord>(`
      SELECT * FROM roles ORDER BY name
    `);
    return result.recordset;
  }

  async findById(id: string): Promise<RoleRecord | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query<RoleRecord>('SELECT * FROM roles WHERE id = @id');
    return result.recordset[0] ?? null;
  }

  async findByName(name: string): Promise<RoleRecord | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .query<RoleRecord>('SELECT * FROM roles WHERE name = @name');
    return result.recordset[0] ?? null;
  }

  async getAllPermissions(): Promise<PermissionRecord[]> {
    const pool = getPool();
    const result = await pool.request().query<PermissionRecord>(`
      SELECT * FROM permissions ORDER BY module, submodule, action
    `);
    return result.recordset;
  }

  async getRolePermissions(roleId: string): Promise<RolePermissionMatrix[]> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('role_id', sql.UniqueIdentifier, roleId)
      .query<RolePermissionMatrix>(`
        SELECT role_id, permission_id, granted
        FROM role_permissions
        WHERE role_id = @role_id
      `);
    return result.recordset;
  }

  async setRolePermissions(
    roleId: string,
    permissions: Array<{ permissionId: string; granted: boolean }>
  ): Promise<void> {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Delete existing
      await new sql.Request(transaction)
        .input('role_id', sql.UniqueIdentifier, roleId)
        .query('DELETE FROM role_permissions WHERE role_id = @role_id');

      // Insert new
      for (const perm of permissions) {
        await new sql.Request(transaction)
          .input('role_id', sql.UniqueIdentifier, roleId)
          .input('permission_id', sql.UniqueIdentifier, perm.permissionId)
          .input('granted', sql.Bit, perm.granted ? 1 : 0)
          .query(`
            INSERT INTO role_permissions (role_id, permission_id, granted)
            VALUES (@role_id, @permission_id, @granted)
          `);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getUserPermissionOverrides(userId: string): Promise<Array<{
    permission_id: string;
    granted: boolean;
    overridden_by: string;
    override_reason?: string;
  }>> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT permission_id, granted, overridden_by, override_reason
        FROM user_permissions WHERE user_id = @user_id
      `);
    return result.recordset;
  }

  async setUserPermissionOverride(
    userId: string,
    permissionId: string,
    granted: boolean,
    overriddenBy: string,
    reason?: string
  ): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('permission_id', sql.UniqueIdentifier, permissionId)
      .input('granted', sql.Bit, granted ? 1 : 0)
      .input('overridden_by', sql.UniqueIdentifier, overriddenBy)
      .input('override_reason', sql.NVarChar, reason ?? null)
      .query(`
        MERGE user_permissions AS target
        USING (SELECT @user_id as user_id, @permission_id as permission_id) AS source
        ON target.user_id = source.user_id AND target.permission_id = source.permission_id
        WHEN MATCHED THEN
          UPDATE SET granted = @granted, overridden_by = @overridden_by, override_reason = @override_reason
        WHEN NOT MATCHED THEN
          INSERT (user_id, permission_id, granted, overridden_by, override_reason)
          VALUES (@user_id, @permission_id, @granted, @overridden_by, @override_reason);
      `);
  }

  async removeUserPermissionOverride(userId: string, permissionId: string): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('permission_id', sql.UniqueIdentifier, permissionId)
      .query('DELETE FROM user_permissions WHERE user_id = @user_id AND permission_id = @permission_id');
  }

  async getFullPermissionMatrix(): Promise<{
    permissions: PermissionRecord[];
    rolePermissions: Record<string, Record<string, boolean>>;
  }> {
    const pool = getPool();
    const perms = await pool.request().query<PermissionRecord>('SELECT * FROM permissions ORDER BY module, submodule, action');
    const rolePerm = await pool.request().query<{ role_id: string; permission_id: string; granted: boolean }>(`
      SELECT role_id, permission_id, granted FROM role_permissions
    `);

    const rolePermissions: Record<string, Record<string, boolean>> = {};
    for (const rp of rolePerm.recordset) {
      if (!rolePermissions[rp.role_id]) {
        rolePermissions[rp.role_id] = {};
      }
      rolePermissions[rp.role_id][rp.permission_id] = rp.granted;
    }

    return {
      permissions: perms.recordset,
      rolePermissions,
    };
  }
}

export const roleRepository = new RoleRepository();

