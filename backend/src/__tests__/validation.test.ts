import { z } from 'zod';

// Reusable schemas matching CRM endpoints
const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  first_name: z.string().min(1, 'First name required').max(100),
  last_name: z.string().min(1, 'Last name required').max(100),
  roleName: z.enum(['Admin', 'Sales', 'Support']),
  team_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  ivr_agent_id: z.string().optional(),
  ivr_extension: z.string().optional(),
  password: z.string().min(8).optional(),
});

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(7),
  company: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent', 'Critical']).default('Medium'),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiating', 'Converted', 'Lost']).default('New'),
});

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent', 'Critical']).default('Medium'),
  customerId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

describe('Input Validation & Security Schemas', () => {
  describe('User Creation Schema', () => {
    it('should validate a valid employee creation payload', () => {
      const valid = {
        email: 'priya.nair@company.com',
        first_name: 'Priya',
        last_name: 'Nair',
        roleName: 'Support',
        phone: '+91 98765 43210',
        password: 'SecurePassword@123',
      };
      const result = createUserSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role names (Super Admin cannot be created via standard endpoint)', () => {
      const invalid = {
        email: 'hacker@company.com',
        first_name: 'Super',
        last_name: 'User',
        roleName: 'Super Admin',
      };
      const result = createUserSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const invalid = {
        email: 'test@company.com',
        first_name: 'Test',
        last_name: 'User',
        roleName: 'Sales',
        password: 'short',
      };
      const result = createUserSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Lead Creation Schema', () => {
    it('should accept a valid lead input', () => {
      const valid = {
        firstName: 'Rahul',
        lastName: 'Verma',
        phone: '9876543210',
        email: 'rahul.verma@example.com',
        company: 'Verma Enterprises',
        priority: 'High',
      };
      const result = createLeadSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('New');
      }
    });

    it('should reject leads without a phone number', () => {
      const invalid = {
        firstName: 'No',
        lastName: 'Phone',
      };
      const result = createLeadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Ticket Creation Schema', () => {
    it('should validate support ticket input', () => {
      const valid = {
        title: 'Unable to access quotation portal',
        description: 'Customer gets a 403 error when trying to view quotation PDF.',
        priority: 'Urgent',
      };
      const result = createTicketSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty ticket title', () => {
      const invalid = {
        title: '',
        priority: 'Low',
      };
      const result = createTicketSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

