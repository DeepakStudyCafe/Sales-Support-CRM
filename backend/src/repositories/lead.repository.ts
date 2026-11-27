import { getPool, sql } from '../config/database';
import { BaseRepository } from './base.repository';
import { parseDateFrom, parseDateTo } from '../utils/date';

export interface LeadRecord {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  alt_phone?: string;
  company?: string;
  source_id?: string;
  source_name?: string;
  status: string;
  priority: string;
  pipeline_stage: string;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
  duplicate_of?: string;
  converted_at?: Date;
  converted_to_customer_id?: string;
  lost_reason?: string;
  lost_at?: Date;
  city?: string;
  state?: string;
  country?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface CreateLeadInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  alt_phone?: string;
  company?: string;
  source_id?: string;
  status?: string;
  priority?: string;
  pipeline_stage?: string;
  assigned_to?: string;
  notes?: string;
  city?: string;
  state?: string;
  country?: string;
  created_by: string;
}

export interface LeadFilterOptions {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  priority?: string;
  sourceId?: string;
  assignedTo?: string;
  batchName?: string;
  pipelineStage?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  userId?: string;      // For non-admin: only show own leads
  isAdmin?: boolean;    // Admin can see all
}

export class LeadRepository extends BaseRepository {
  protected tableName = 'leads';

  async findAll(options: LeadFilterOptions): Promise<{ data: LeadRecord[]; total: number }> {
    const pool = getPool();
    const offset = (options.page - 1) * options.limit;
    const request = pool.request();
    const countRequest = pool.request();
    const where: string[] = ['l.deleted_at IS NULL'];

    if (options.search) {
      where.push(`(l.first_name LIKE @search OR l.last_name LIKE @search OR l.email LIKE @search OR l.phone LIKE @search OR l.company LIKE @search)`);
      request.input('search', sql.NVarChar, `%${options.search}%`);
      countRequest.input('search', sql.NVarChar, `%${options.search}%`);
    }
    if (options.status) {
      where.push('l.status = @status');
      request.input('status', sql.NVarChar, options.status);
      countRequest.input('status', sql.NVarChar, options.status);
    }
    if (options.priority) {
      where.push('l.priority = @priority');
      request.input('priority', sql.NVarChar, options.priority);
      countRequest.input('priority', sql.NVarChar, options.priority);
    }
    if (options.sourceId) {
      where.push('l.source_id = @source_id');
      request.input('source_id', sql.UniqueIdentifier, options.sourceId);
      countRequest.input('source_id', sql.UniqueIdentifier, options.sourceId);
    }
    if (options.assignedTo) {
      where.push('l.assigned_to = @assigned_to');
      request.input('assigned_to', sql.UniqueIdentifier, options.assignedTo);
      countRequest.input('assigned_to', sql.UniqueIdentifier, options.assignedTo);
    }
    if (options.batchName) {
      if (options.batchName === 'General Direct Leads') {
        where.push('(l.batch_name IS NULL OR l.batch_name = \'\' OR l.batch_name = @batch_name)');
      } else {
        where.push('l.batch_name = @batch_name');
      }
      request.input('batch_name', sql.NVarChar, options.batchName);
      countRequest.input('batch_name', sql.NVarChar, options.batchName);
    }
    if (options.pipelineStage) {
      where.push('l.pipeline_stage = @pipeline_stage');
      request.input('pipeline_stage', sql.NVarChar, options.pipelineStage);
      countRequest.input('pipeline_stage', sql.NVarChar, options.pipelineStage);
    }
    if (options.dateFrom) {
      where.push('l.created_at >= @date_from');
      request.input('date_from', sql.DateTime2, parseDateFrom(options.dateFrom));
      countRequest.input('date_from', sql.DateTime2, parseDateFrom(options.dateFrom));
    }
    if (options.dateTo) {
      where.push('l.created_at <= @date_to');
      request.input('date_to', sql.DateTime2, parseDateTo(options.dateTo));
      countRequest.input('date_to', sql.DateTime2, parseDateTo(options.dateTo));
    }
    if (!options.isAdmin && options.userId) {
      where.push('l.assigned_to = @user_id');
      request.input('user_id', sql.UniqueIdentifier, options.userId);
      countRequest.input('user_id', sql.UniqueIdentifier, options.userId);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const allowedSortCols: Record<string, string> = {
      created_at: 'l.created_at', first_name: 'l.first_name',
      status: 'l.status', priority: 'l.priority', phone: 'l.phone',
    };
    const sortCol = allowedSortCols[options.sortBy ?? 'created_at'] ?? 'l.created_at';
    const sortDir = options.sortOrder ?? 'DESC';

    request.input('limit', sql.Int, options.limit);
    request.input('offset', sql.Int, offset);

    const countResult = await countRequest.query<{ total: number }>(
      `SELECT COUNT(1) as total FROM leads l ${whereClause}`
    );

    const dataResult = await request.query<LeadRecord>(`
      SELECT l.*,
        ls.name as source_name,
        CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
        CONCAT(cu.first_name, ' ', cu.last_name) as created_by_name
      FROM leads l
      LEFT JOIN lead_sources ls ON l.source_id = ls.id
      LEFT JOIN users au ON l.assigned_to = au.id
      LEFT JOIN users cu ON l.created_by = cu.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }

  async findById<T = LeadRecord>(id: string): Promise<T | null> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query<LeadRecord>(`
        SELECT l.*,
          ls.name as source_name,
          CONCAT(au.first_name, ' ', au.last_name) as assigned_to_name,
          CONCAT(cu.first_name, ' ', cu.last_name) as created_by_name
        FROM leads l
        LEFT JOIN lead_sources ls ON l.source_id = ls.id
        LEFT JOIN users au ON l.assigned_to = au.id
        LEFT JOIN users cu ON l.created_by = cu.id
        WHERE l.id = @id AND l.deleted_at IS NULL
      `);
    return (result.recordset[0] ?? null) as T | null;
  }

  async checkDuplicate(phone: string, email?: string, excludeId?: string): Promise<LeadRecord | null> {
    const pool = getPool();
    const request = pool.request().input('phone', sql.NVarChar, phone);
    let query = 'SELECT TOP 1 * FROM leads WHERE deleted_at IS NULL AND phone = @phone';
    if (email) {
      query += ' OR email = @email';
      request.input('email', sql.NVarChar, email);
    }
    if (excludeId) {
      query += ' AND id != @excludeId';
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }
    const result = await request.query<LeadRecord>(query);
    return result.recordset[0] ?? null;
  }

  async create(input: CreateLeadInput): Promise<LeadRecord> {
    const pool = getPool();
    const result = await pool
      .request()
      .input('first_name', sql.NVarChar, input.first_name)
      .input('last_name', sql.NVarChar, input.last_name ?? null)
      .input('email', sql.NVarChar, input.email ?? null)
      .input('phone', sql.NVarChar, input.phone)
      .input('alt_phone', sql.NVarChar, input.alt_phone ?? null)
      .input('company', sql.NVarChar, input.company ?? null)
      .input('source_id', sql.UniqueIdentifier, input.source_id ?? null)
      .input('status', sql.NVarChar, input.status ?? 'New')
      .input('priority', sql.NVarChar, input.priority ?? 'Medium')
      .input('pipeline_stage', sql.NVarChar, input.pipeline_stage ?? 'New')
      .input('assigned_to', sql.UniqueIdentifier, input.assigned_to ?? null)
      .input('notes', sql.NVarChar, input.notes ?? null)
      .input('city', sql.NVarChar, input.city ?? null)
      .input('state', sql.NVarChar, input.state ?? null)
      .input('country', sql.NVarChar, input.country ?? 'India')
      .input('created_by', sql.UniqueIdentifier, input.created_by)
      .query<LeadRecord>(`
        INSERT INTO leads (first_name, last_name, email, phone, alt_phone, company, source_id, status, priority, pipeline_stage, assigned_to, notes, city, state, country, created_by)
        OUTPUT INSERTED.*
        VALUES (@first_name, @last_name, @email, @phone, @alt_phone, @company, @source_id, @status, @priority, @pipeline_stage, @assigned_to, @notes, @city, @state, @country, @created_by)
      `);
    return result.recordset[0];
  }

  async update(id: string, input: Partial<CreateLeadInput> & {
    status?: string; pipeline_stage?: string; lost_reason?: string; lost_at?: Date;
    converted_at?: Date; converted_to_customer_id?: string; duplicate_of?: string;
  }): Promise<LeadRecord | null> {
    const pool = getPool();
    const setClauses: string[] = ['updated_at = GETUTCDATE()'];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const fields: Array<[string, any, unknown]> = [
      ['first_name', sql.NVarChar, input.first_name],
      ['last_name', sql.NVarChar, input.last_name],
      ['email', sql.NVarChar, input.email],
      ['phone', sql.NVarChar, input.phone],
      ['alt_phone', sql.NVarChar, input.alt_phone],
      ['company', sql.NVarChar, input.company],
      ['source_id', sql.UniqueIdentifier, input.source_id],
      ['status', sql.NVarChar, input.status],
      ['priority', sql.NVarChar, input.priority],
      ['pipeline_stage', sql.NVarChar, input.pipeline_stage],
      ['assigned_to', sql.UniqueIdentifier, input.assigned_to],
      ['notes', sql.NVarChar, input.notes],
      ['city', sql.NVarChar, input.city],
      ['state', sql.NVarChar, input.state],
      ['country', sql.NVarChar, input.country],
      ['lost_reason', sql.NVarChar, input.lost_reason],
      ['lost_at', sql.DateTime2, input.lost_at],
      ['converted_at', sql.DateTime2, input.converted_at],
      ['converted_to_customer_id', sql.UniqueIdentifier, input.converted_to_customer_id],
      ['duplicate_of', sql.UniqueIdentifier, input.duplicate_of],
    ];

    for (const [key, type, value] of fields) {
      if (value !== undefined) {
        setClauses.push(`${key} = @${key}`);
        request.input(key, type, value ?? null);
      }
    }

    const result = await request.query<LeadRecord>(`
      UPDATE leads SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id AND deleted_at IS NULL
    `);
    return result.recordset[0] ?? null;
  }

  async addActivity(data: {
    leadId: string;
    activityType: string;
    description: string;
    performedBy: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('lead_id', sql.UniqueIdentifier, data.leadId)
      .input('activity_type', sql.NVarChar, data.activityType)
      .input('description', sql.NVarChar, data.description)
      .input('performed_by', sql.UniqueIdentifier, data.performedBy)
      .input('metadata', sql.NVarChar, data.metadata ? JSON.stringify(data.metadata) : null)
      .query(`
        INSERT INTO lead_activities (lead_id, activity_type, description, performed_by, metadata)
        VALUES (@lead_id, @activity_type, @description, @performed_by, @metadata)
      `);
  }

  async getActivities(leadId: string): Promise<Array<{ id: string; activity_type: string; description: string; performed_by_name: string; created_at: Date }>> {
    const pool = getPool();
    const result = await pool.request().input('lead_id', sql.UniqueIdentifier, leadId).query(`
      SELECT la.*, CONCAT(u.first_name, ' ', u.last_name) as performed_by_name
      FROM lead_activities la
      LEFT JOIN users u ON la.performed_by = u.id
      WHERE la.lead_id = @lead_id
      ORDER BY la.created_at DESC
    `);
    return result.recordset;
  }

  async recordAssignment(data: {
    leadId: string;
    assignedFrom?: string;
    assignedTo: string;
    assignedBy: string;
    reason?: string;
  }): Promise<void> {
    const pool = getPool();
    await pool
      .request()
      .input('lead_id', sql.UniqueIdentifier, data.leadId)
      .input('assigned_from', sql.UniqueIdentifier, data.assignedFrom ?? null)
      .input('assigned_to', sql.UniqueIdentifier, data.assignedTo)
      .input('assigned_by', sql.UniqueIdentifier, data.assignedBy)
      .input('reason', sql.NVarChar, data.reason ?? null)
      .query(`
        INSERT INTO lead_assignments (lead_id, assigned_from, assigned_to, assigned_by, reason)
        VALUES (@lead_id, @assigned_from, @assigned_to, @assigned_by, @reason)
      `);
  }

  async getDashboardStats(options: { userId?: string; isAdmin: boolean; dateFrom?: Date; dateTo?: Date }): Promise<{
    total: number; new: number; active: number; qualified: number; converted: number; lost: number;
  }> {
    const pool = getPool();
    const request = pool.request();
    let where = 'deleted_at IS NULL';
    if (!options.isAdmin && options.userId) {
      where += ' AND assigned_to = @userId';
      request.input('userId', sql.UniqueIdentifier, options.userId);
    }
    if (options.dateFrom) { where += ' AND created_at >= @dateFrom'; request.input('dateFrom', sql.DateTime2, options.dateFrom); }
    if (options.dateTo) { where += ' AND created_at <= @dateTo'; request.input('dateTo', sql.DateTime2, options.dateTo); }

    const result = await request.query<{
      total: number; new_count: number; active_count: number; qualified_count: number; converted_count: number; lost_count: number;
    }>(`
      SELECT
        COUNT(1) as total,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status IN ('Assigned', 'Contacted', 'Interested', 'Follow-up') THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as qualified_count,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_count,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost_count
      FROM leads WHERE ${where}
    `);

    const row = result.recordset[0];
    return {
      total: row?.total ?? 0,
      new: row?.new_count ?? 0,
      active: row?.active_count ?? 0,
      qualified: row?.qualified_count ?? 0,
      converted: row?.converted_count ?? 0,
      lost: row?.lost_count ?? 0,
    };
  }

  async getAllSources(): Promise<Array<{ id: string; name: string; is_active: boolean }>> {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM lead_sources WHERE is_active = 1 ORDER BY name');
    return result.recordset;
  }

  async getLeadBatches(options: { assignedTo?: string; userId?: string; isAdmin?: boolean }): Promise<any[]> {
    const pool = getPool();
    const request = pool.request();
    const where: string[] = ['l.deleted_at IS NULL'];

    if (!options.isAdmin && options.userId) {
      where.push('l.assigned_to = @user_id');
      request.input('user_id', sql.UniqueIdentifier, options.userId);
    } else if (options.assignedTo && options.assignedTo !== 'all') {
      where.push('l.assigned_to = @assigned_to');
      request.input('assigned_to', sql.UniqueIdentifier, options.assignedTo);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await request.query(`
      SELECT 
        ISNULL(l.batch_name, 'General Direct Leads') as batch_name,
        l.assigned_to,
        ISNULL(CONCAT(u.first_name, ' ', u.last_name), 'Unassigned') as assigned_to_name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status = 'New' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN l.status IN ('Contacted', 'Follow-up') THEN 1 ELSE 0 END) as contacted_count,
        SUM(CASE WHEN l.status IN ('Interested', 'Qualified', 'Proposal') THEN 1 ELSE 0 END) as interested_count,
        SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) as converted_count,
        SUM(CASE WHEN l.status = 'Lost' THEN 1 ELSE 0 END) as lost_count,
        MIN(l.created_at) as first_created_at,
        MAX(l.created_at) as last_created_at
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${whereClause}
      GROUP BY l.batch_name, l.assigned_to, u.first_name, u.last_name
      ORDER BY MAX(l.created_at) DESC
    `);

    return result.recordset;
  }

  async updateRemarks(leadId: string, notes: string, status?: string, userId?: string): Promise<any> {
    const pool = getPool();
    const request = pool.request()
      .input('id', sql.UniqueIdentifier, leadId)
      .input('notes', sql.NVarChar, notes);

    let query = 'UPDATE leads SET notes = @notes, updated_at = GETUTCDATE()';
    if (status) {
      request.input('status', sql.NVarChar, status);
      query += ', status = @status';
    }
    query += ' WHERE id = @id';

    await request.query(query);

    if (userId) {
      try {
        await this.addActivity({
          leadId,
          activityType: 'NOTE',
          description: `Remarks updated: ${notes.slice(0, 80)}${notes.length > 80 ? '...' : ''}`,
          performedBy: userId,
        });
      } catch {}
    }

    return this.findById(leadId);
  }
}

export const leadRepository = new LeadRepository();

