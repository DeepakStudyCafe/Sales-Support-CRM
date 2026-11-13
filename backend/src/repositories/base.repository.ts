import { getPool, sql } from '../config/database';
import { logger } from '../utils/logger';

export interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository {
  protected abstract tableName: string;

  protected async executeQuery<T>(
    query: string,
    inputs?: Record<string, { value: unknown; type: sql.ISqlType | (() => sql.ISqlType) }>
  ): Promise<T[]> {
    const pool = getPool();
    const request = pool.request();

    if (inputs) {
      for (const [name, { value, type }] of Object.entries(inputs)) {
        if (value === null || value === undefined) {
          request.input(name, sql.NVarChar, null);
        } else {
          request.input(name, type as sql.ISqlType, value);
        }
      }
    }

    const result = await request.query<T>(query);
    return result.recordset;
  }

  protected async executeScalar<T>(
    query: string,
    inputs?: Record<string, { value: unknown; type: sql.ISqlType | (() => sql.ISqlType) }>
  ): Promise<T | null> {
    const rows = await this.executeQuery<Record<string, T>>(query, inputs);
    if (rows.length === 0) return null;
    const firstRow = rows[0];
    return Object.values(firstRow)[0] ?? null;
  }

  protected async executeNonQuery(
    query: string,
    inputs?: Record<string, { value: unknown; type: sql.ISqlType | (() => sql.ISqlType) }>
  ): Promise<number> {
    const pool = getPool();
    const request = pool.request();

    if (inputs) {
      for (const [name, { value, type }] of Object.entries(inputs)) {
        if (value === null || value === undefined) {
          request.input(name, sql.NVarChar, null);
        } else {
          request.input(name, type as sql.ISqlType, value);
        }
      }
    }

    const result = await request.query(query);
    return result.rowsAffected[0] ?? 0;
  }

  async findById<T>(id: string): Promise<T | null> {
    const rows = await this.executeQuery<T>(
      `SELECT * FROM ${this.tableName} WHERE id = @id AND deleted_at IS NULL`,
      { id: { value: id, type: sql.UniqueIdentifier } }
    );
    return rows[0] ?? null;
  }

  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const rows = await this.executeNonQuery(
      `UPDATE ${this.tableName} SET deleted_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE id = @id AND deleted_at IS NULL`,
      { id: { value: id, type: sql.UniqueIdentifier } }
    );
    return rows > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.executeScalar<number>(
      `SELECT COUNT(1) as cnt FROM ${this.tableName} WHERE id = @id AND deleted_at IS NULL`,
      { id: { value: id, type: sql.UniqueIdentifier } }
    );
    return (count ?? 0) > 0;
  }
}

