import { Request, Response } from 'express';
import { z } from 'zod';
import { leadService } from '../services/lead.service';
import { leadRepository } from '../repositories/lead.repository';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPaginationParams } from '../utils/pagination';
import { getPool, sql } from '../config/database';

const createLeadSchema = z.object({
  first_name: z.string().min(1, 'First name required').max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number required').max(20),
  alt_phone: z.string().optional(),
  company: z.string().max(200).optional(),
  source_id: z.string().uuid().optional(),
  status: z.enum(['New', 'Assigned', 'Contacted', 'Interested', 'Follow-up', 'Qualified', 'Converted', 'Lost']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  pipeline_stage: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  skipDuplicateCheck: z.boolean().optional(),
});

const assignLeadSchema = z.object({
  assignedTo: z.string().uuid('Valid user ID required'),
  reason: z.string().optional(),
});

const bulkAssignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(100),
  assignedTo: z.string().uuid(),
});

const convertLeadSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

const lostLeadSchema = z.object({
  lostReason: z.string().min(1, 'Please provide a reason'),
});

export class LeadsController {
  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const { page, limit } = getPaginationParams(req.query);
    const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);

    const result = await leadService.listLeads({
      page, limit,
      search: req.query.search as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      sourceId: req.query.sourceId as string,
      assignedTo: req.query.assignedTo as string,
      batchName: req.query.batchName as string,
      pipelineStage: req.query.pipelineStage as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') ?? 'DESC',
      userId: req.user.userId,
      isAdmin,
    });

    sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
  }

  async getBatches(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
      const batches = await leadRepository.getLeadBatches({
        assignedTo: req.query.assignedTo as string,
        userId: req.user.userId,
        isAdmin,
      });
      sendSuccess(res, batches);
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  }

  async updateRemarks(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      const { id } = req.params;
      const { notes, status, followUpAt } = req.body;
      const updated = await leadRepository.updateRemarks(id, notes || '', status, req.user.userId);

      // If scheduled follow-up was provided, schedule it in follow_ups
      if (followUpAt) {
        try {
          const pool = getPool();
          await pool.request()
            .input('title', sql.NVarChar, `Follow-up: ${updated?.first_name || 'Lead'}`)
            .input('desc', sql.NVarChar, notes || 'Scheduled follow-up callback')
            .input('sched', sql.DateTime2, new Date(followUpAt))
            .input('assigned', sql.UniqueIdentifier, updated?.assigned_to || req.user.userId)
            .input('lead_id', sql.UniqueIdentifier, id)
            .query(`
              INSERT INTO follow_ups (id, title, description, scheduled_at, assigned_to, lead_id, type, priority, status, created_at, updated_at)
              VALUES (NEWID(), @title, @desc, @sched, @assigned, @lead_id, 'Callback', 'Medium', 'Pending', GETUTCDATE(), GETUTCDATE())
            `);
        } catch {}
      }

      sendSuccess(res, updated, 'Lead remarks & follow-up updated successfully');
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const lead = await leadService.getLeadById(req.params.id);
      sendSuccess(res, lead);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      const { skipDuplicateCheck, ...leadData } = parsed.data;
      const result = await leadService.createLead({
        ...leadData,
        email: leadData.email || undefined,
        created_by: req.user.userId,
        checkDuplicate: !skipDuplicateCheck,
      });

      if (result.duplicate) {
        sendSuccess(res, { duplicate: true, existingLead: result.existingLead }, 'Duplicate lead detected', 409);
        return;
      }

      sendSuccess(res, result.lead, 'Lead created successfully', 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = createLeadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      const { skipDuplicateCheck, ...updateData } = parsed.data;
      const lead = await leadService.updateLead(req.params.id, updateData, req.user.userId);
      sendSuccess(res, lead, 'Lead updated successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      await leadService.deleteLead(req.params.id, req.user.userId);
      sendSuccess(res, null, 'Lead deleted successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  }

  async assign(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = assignLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      const lead = await leadService.assignLead(req.params.id, parsed.data.assignedTo, req.user.userId, parsed.data.reason);
      sendSuccess(res, lead, 'Lead assigned successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async bulkAssign(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = bulkAssignSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const results = await leadService.bulkAssign(parsed.data.leadIds, parsed.data.assignedTo, req.user.userId);
    sendSuccess(res, { results }, `Bulk assignment processed`);
  }

  async convert(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = convertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      const result = await leadService.convertToCustomer(req.params.id, req.user.userId, parsed.data);
      sendSuccess(res, result, 'Lead converted to customer successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async markLost(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = lostLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      const lead = await leadService.updateLead(req.params.id, {
        status: 'Lost',
        lost_reason: parsed.data.lostReason,
        lost_at: new Date(),
      } as Parameters<typeof leadService.updateLead>[1], req.user.userId);
      sendSuccess(res, lead, 'Lead marked as lost');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async getSources(req: Request, res: Response): Promise<void> {
    const sources = await leadService.getLeadSources();
    sendSuccess(res, sources);
  }

  async getDashboardStats(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const isAdmin = ['Super Admin', 'Admin'].includes(req.user.roleName);
    const stats = await leadService.getDashboardStats({
      userId: req.user.userId,
      isAdmin,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    });
    sendSuccess(res, stats);
  }

  async getActivities(req: Request, res: Response): Promise<void> {
    const activities = await leadRepository.getActivities(req.params.id);
    sendSuccess(res, activities);
  }
}

export const leadsController = new LeadsController();

