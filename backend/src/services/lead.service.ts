import { leadRepository, CreateLeadInput } from '../repositories/lead.repository';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { userRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

export class LeadService {
  async createLead(input: CreateLeadInput & { checkDuplicate?: boolean }) {
    // Duplicate detection
    if (input.checkDuplicate !== false) {
      const duplicate = await leadRepository.checkDuplicate(input.phone, input.email);
      if (duplicate) {
        return { duplicate: true, existingLead: duplicate };
      }
    }

    const lead = await leadRepository.create(input);

    // Log activity
    await leadRepository.addActivity({
      leadId: lead.id,
      activityType: 'CREATED',
      description: 'Lead created',
      performedBy: input.created_by,
    });

    // Record assignment if assigned
    if (input.assigned_to) {
      await leadRepository.recordAssignment({
        leadId: lead.id,
        assignedTo: input.assigned_to,
        assignedBy: input.created_by,
      });

      // Notify assigned user
      await notificationService.create({
        userId: input.assigned_to,
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        body: `A new lead "${lead.first_name} ${lead.last_name ?? ''}" has been assigned to you`,
        data: { entityType: 'lead', entityId: lead.id, url: `/leads/${lead.id}` },
      });
    }

    await auditService.log({
      userId: input.created_by,
      action: 'CREATE_LEAD',
      entityType: 'lead',
      entityId: lead.id,
      newValues: { name: `${input.first_name} ${input.last_name}`, phone: input.phone },
    });

    logger.info('Lead created', { leadId: lead.id });
    return { duplicate: false, lead };
  }

  async updateLead(id: string, input: Partial<CreateLeadInput>, performedBy: string) {
    const existing = await leadRepository.findById(id);
    if (!existing) throw new Error('Lead not found');

    const updated = await leadRepository.update(id, input);

    // Track assignment change
    if (input.assigned_to && input.assigned_to !== existing.assigned_to) {
      await leadRepository.recordAssignment({
        leadId: id,
        assignedFrom: existing.assigned_to ?? undefined,
        assignedTo: input.assigned_to,
        assignedBy: performedBy,
      });

      await notificationService.create({
        userId: input.assigned_to,
        type: 'lead_reassigned',
        title: 'Lead Assigned to You',
        body: `Lead "${existing.first_name} ${existing.last_name ?? ''}" has been assigned to you`,
        data: { entityType: 'lead', entityId: id, url: `/leads/${id}` },
      });
    }

    await leadRepository.addActivity({
      leadId: id,
      activityType: 'UPDATED',
      description: `Lead updated`,
      performedBy,
      metadata: { changedFields: Object.keys(input) },
    });

    await auditService.log({
      userId: performedBy,
      action: 'UPDATE_LEAD',
      entityType: 'lead',
      entityId: id,
      oldValues: { status: existing.status, assigned_to: existing.assigned_to },
      newValues: { status: input.status, assigned_to: input.assigned_to },
    });

    return updated;
  }

  async deleteLead(id: string, performedBy: string) {
    const existing = await leadRepository.findById(id);
    if (!existing) throw new Error('Lead not found');

    await leadRepository.softDelete(id);

    await auditService.log({
      userId: performedBy,
      action: 'DELETE_LEAD',
      entityType: 'lead',
      entityId: id,
    });
  }

  async assignLead(leadId: string, assignedTo: string, assignedBy: string, reason?: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const assignee = await userRepository.findByIdWithRole(assignedTo);
    if (!assignee || !assignee.is_active) throw new Error('Assignee not found or inactive');

    const prevAssignee = lead.assigned_to;

    await leadRepository.update(leadId, {
      assigned_to: assignedTo,
      status: lead.status === 'New' ? 'Assigned' : lead.status,
    });

    await leadRepository.recordAssignment({
      leadId,
      assignedFrom: prevAssignee ?? undefined,
      assignedTo,
      assignedBy,
      reason,
    });

    await leadRepository.addActivity({
      leadId,
      activityType: 'ASSIGNED',
      description: `Lead assigned to ${assignee.first_name} ${assignee.last_name}`,
      performedBy: assignedBy,
      metadata: { assignedFrom: prevAssignee, assignedTo },
    });

    await notificationService.create({
      userId: assignedTo,
      type: 'lead_assigned',
      title: 'Lead Assigned to You',
      body: `Lead "${lead.first_name} ${lead.last_name ?? ''}" has been assigned to you`,
      data: { entityType: 'lead', entityId: leadId, url: `/leads/${leadId}` },
    });

    return leadRepository.findById(leadId);
  }

  async convertToCustomer(leadId: string, performedBy: string, additionalData?: {
    address?: string; city?: string; state?: string; country?: string; pincode?: string;
  }) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new Error('Lead not found');
    if (lead.converted_to_customer_id) throw new Error('Lead already converted to customer');
    if (!lead.phone) throw new Error('Phone number is required to convert lead to customer');

    // Create customer from lead
    const pool = (await import('../config/database')).getPool();
    const { sql } = await import('../config/database');
    const customerResult = await pool.request()
      .input('lead_id', sql.UniqueIdentifier, leadId)
      .input('first_name', sql.NVarChar, lead.first_name)
      .input('last_name', sql.NVarChar, lead.last_name ?? null)
      .input('email', sql.NVarChar, lead.email ?? null)
      .input('phone', sql.NVarChar, lead.phone)
      .input('alt_phone', sql.NVarChar, lead.alt_phone ?? null)
      .input('company', sql.NVarChar, lead.company ?? null)
      .input('city', sql.NVarChar, additionalData?.city ?? lead.city ?? null)
      .input('state', sql.NVarChar, additionalData?.state ?? lead.state ?? null)
      .input('country', sql.NVarChar, additionalData?.country ?? lead.country ?? 'India')
      .input('assigned_to', sql.UniqueIdentifier, lead.assigned_to ?? null)
      .input('created_by', sql.UniqueIdentifier, performedBy)
      .query<{ id: string }>(`
        INSERT INTO customers (lead_id, first_name, last_name, email, phone, alt_phone, company, city, state, country, assigned_to, created_by)
        OUTPUT INSERTED.id
        VALUES (@lead_id, @first_name, @last_name, @email, @phone, @alt_phone, @company, @city, @state, @country, @assigned_to, @created_by)
      `);

    const customerId = customerResult.recordset[0].id;

    // Update lead as converted
    await leadRepository.update(leadId, {
      status: 'Converted',
      converted_at: new Date(),
      converted_to_customer_id: customerId,
    });

    await leadRepository.addActivity({
      leadId,
      activityType: 'CONVERTED',
      description: 'Lead converted to customer',
      performedBy,
      metadata: { customerId },
    });

    await auditService.log({
      userId: performedBy,
      action: 'CONVERT_LEAD',
      entityType: 'lead',
      entityId: leadId,
      newValues: { customerId, convertedAt: new Date() },
    });

    return { lead: await leadRepository.findById(leadId), customerId };
  }

  async listLeads(options: Parameters<typeof leadRepository.findAll>[0]) {
    return leadRepository.findAll(options);
  }

  async getLeadById(id: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) throw new Error('Lead not found');
    const activities = await leadRepository.getActivities(id);
    return { ...lead, activities };
  }

  async getDashboardStats(options: { userId?: string; isAdmin: boolean; dateFrom?: Date; dateTo?: Date }) {
    return leadRepository.getDashboardStats(options);
  }

  async getLeadSources() {
    return leadRepository.getAllSources();
  }

  async bulkAssign(leadIds: string[], assignedTo: string, assignedBy: string) {
    const results = [];
    for (const leadId of leadIds) {
      try {
        const result = await this.assignLead(leadId, assignedTo, assignedBy);
        results.push({ leadId, success: true });
      } catch (err) {
        results.push({ leadId, success: false, error: (err as Error).message });
      }
    }
    return results;
  }
}

export const leadService = new LeadService();

