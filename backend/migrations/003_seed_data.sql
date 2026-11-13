-- ============================================================
-- Migration 003: Seed Data
-- Enterprise Sales & Support CRM
-- ============================================================

-- ============================================================
-- ROLES (System roles)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Super Admin')
INSERT INTO roles (name, description, is_system) VALUES ('Super Admin', 'Full system access', 1);

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Admin')
INSERT INTO roles (name, description, is_system) VALUES ('Admin', 'Administrative access, configured by Super Admin', 1);

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Sales')
INSERT INTO roles (name, description, is_system) VALUES ('Sales', 'Sales team access, configured by Super Admin', 1);

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Support')
INSERT INTO roles (name, description, is_system) VALUES ('Support', 'Support team access, configured by Super Admin', 1);

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (module, submodule, action, description)
SELECT src.module, src.submodule, src.action, src.description
FROM (VALUES
  ('dashboard', 'overview', 'view', 'View overview dashboard'),
  ('dashboard', 'sales', 'view', 'View sales dashboard'),
  ('dashboard', 'calling', 'view', 'View calling dashboard'),
  ('dashboard', 'support', 'view', 'View support dashboard'),

  ('users', 'all', 'view', 'View all users'),
  ('users', 'all', 'create', 'Create users'),
  ('users', 'all', 'edit', 'Edit users'),
  ('users', 'all', 'delete', 'Delete users'),
  ('users', 'teams', 'view', 'View teams'),
  ('users', 'teams', 'create', 'Create teams'),
  ('users', 'teams', 'edit', 'Edit teams'),
  ('users', 'permissions', 'view', 'View permissions'),
  ('users', 'permissions', 'edit', 'Edit permissions'),
  ('users', 'activity', 'view', 'View user activity'),

  ('leads', 'all', 'view', 'View all leads'),
  ('leads', 'all', 'create', 'Create leads'),
  ('leads', 'all', 'edit', 'Edit leads'),
  ('leads', 'all', 'delete', 'Delete leads'),
  ('leads', 'all', 'export', 'Export leads'),
  ('leads', 'assignment', 'assign', 'Assign leads'),
  ('leads', 'pipeline', 'view', 'View lead pipeline'),
  ('leads', 'sources', 'manage', 'Manage lead sources'),
  ('leads', 'import', 'create', 'Import leads from CSV/Excel'),

  ('customers', 'all', 'view', 'View all customers'),
  ('customers', 'all', 'create', 'Create customers'),
  ('customers', 'all', 'edit', 'Edit customers'),
  ('customers', 'all', 'delete', 'Delete customers'),
  ('customers', 'all', 'export', 'Export customers'),

  ('opportunities', 'all', 'view', 'View opportunities'),
  ('opportunities', 'all', 'create', 'Create opportunities'),
  ('opportunities', 'all', 'edit', 'Edit opportunities'),
  ('opportunities', 'all', 'delete', 'Delete opportunities'),
  ('quotations', 'all', 'view', 'View quotations'),
  ('quotations', 'all', 'create', 'Create quotations'),
  ('quotations', 'all', 'edit', 'Edit quotations'),
  ('quotations', 'all', 'approve', 'Approve quotations'),

  ('calling', 'click-to-call', 'create', 'Make click-to-call'),
  ('calling', 'history', 'view', 'View call history'),
  ('calling', 'recordings', 'view', 'View call recordings'),
  ('calling', 'campaigns', 'view', 'View campaigns'),
  ('calling', 'campaigns', 'create', 'Create campaigns'),
  ('calling', 'campaigns', 'edit', 'Edit campaigns'),
  ('calling', 'campaigns', 'delete', 'Delete campaigns'),
  ('calling', 'ivr-settings', 'view', 'View IVR settings'),
  ('calling', 'ivr-settings', 'edit', 'Edit IVR settings'),
  ('calling', 'agents', 'manage', 'Manage IVR agents'),

  ('followups', 'all', 'view', 'View follow-ups'),
  ('followups', 'all', 'create', 'Create follow-ups'),
  ('followups', 'all', 'edit', 'Edit follow-ups'),
  ('followups', 'all', 'delete', 'Delete follow-ups'),

  ('tickets', 'all', 'view', 'View all tickets'),
  ('tickets', 'all', 'create', 'Create tickets'),
  ('tickets', 'all', 'edit', 'Edit tickets'),
  ('tickets', 'all', 'delete', 'Delete tickets'),
  ('tickets', 'all', 'assign', 'Assign tickets'),
  ('tickets', 'categories', 'manage', 'Manage ticket categories'),
  ('tickets', 'sla', 'manage', 'Manage SLA configurations'),
  ('tickets', 'escalations', 'view', 'View escalations'),

  ('automation', 'workflows', 'view', 'View automation workflows'),
  ('automation', 'workflows', 'create', 'Create automation workflows'),
  ('automation', 'workflows', 'edit', 'Edit automation workflows'),
  ('automation', 'workflows', 'delete', 'Delete automation workflows'),

  ('reports', 'leads', 'view', 'View lead reports'),
  ('reports', 'leads', 'export', 'Export lead reports'),
  ('reports', 'sales', 'view', 'View sales reports'),
  ('reports', 'sales', 'export', 'Export sales reports'),
  ('reports', 'calling', 'view', 'View calling reports'),
  ('reports', 'support', 'view', 'View support reports'),
  ('reports', 'performance', 'view', 'View performance reports'),

  ('audit', 'all', 'view', 'View audit logs'),

  ('settings', 'general', 'view', 'View general settings'),
  ('settings', 'general', 'edit', 'Edit general settings'),
  ('settings', 'company', 'edit', 'Edit company settings'),
  ('settings', 'calling', 'edit', 'Edit calling settings')
) AS src(module, submodule, action, description)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  WHERE p.module = src.module AND p.submodule = src.submodule AND p.action = src.action
);

-- ============================================================
-- SLA CONFIGURATIONS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sla_configurations WHERE priority = 'Low')
INSERT INTO sla_configurations (name, priority, first_response_hours, resolution_hours, working_hours_only) VALUES ('Low Priority SLA', 'Low', 24, 72, 1);
IF NOT EXISTS (SELECT 1 FROM sla_configurations WHERE priority = 'Medium')
INSERT INTO sla_configurations (name, priority, first_response_hours, resolution_hours, working_hours_only) VALUES ('Medium Priority SLA', 'Medium', 8, 24, 1);
IF NOT EXISTS (SELECT 1 FROM sla_configurations WHERE priority = 'High')
INSERT INTO sla_configurations (name, priority, first_response_hours, resolution_hours, working_hours_only) VALUES ('High Priority SLA', 'High', 2, 8, 1);
IF NOT EXISTS (SELECT 1 FROM sla_configurations WHERE priority = 'Urgent')
INSERT INTO sla_configurations (name, priority, first_response_hours, resolution_hours, working_hours_only) VALUES ('Urgent Priority SLA', 'Urgent', 1, 4, 0);
IF NOT EXISTS (SELECT 1 FROM sla_configurations WHERE priority = 'Critical')
INSERT INTO sla_configurations (name, priority, first_response_hours, resolution_hours, working_hours_only) VALUES ('Critical Priority SLA', 'Critical', 0.5, 2, 0);

-- ============================================================
-- TICKET CATEGORIES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM ticket_categories WHERE name = 'Technical Issue')
INSERT INTO ticket_categories (name, description, default_priority) VALUES ('Technical Issue', 'Technical problems and bugs', 'High');
IF NOT EXISTS (SELECT 1 FROM ticket_categories WHERE name = 'Billing')
INSERT INTO ticket_categories (name, description, default_priority) VALUES ('Billing', 'Billing and payment issues', 'High');
IF NOT EXISTS (SELECT 1 FROM ticket_categories WHERE name = 'General Enquiry')
INSERT INTO ticket_categories (name, description, default_priority) VALUES ('General Enquiry', 'General questions and information', 'Low');
IF NOT EXISTS (SELECT 1 FROM ticket_categories WHERE name = 'Sales Support')
INSERT INTO ticket_categories (name, description, default_priority) VALUES ('Sales Support', 'Sales related support', 'Medium');
IF NOT EXISTS (SELECT 1 FROM ticket_categories WHERE name = 'Complaint')
INSERT INTO ticket_categories (name, description, default_priority) VALUES ('Complaint', 'Customer complaints', 'High');

-- ============================================================
-- LEAD SOURCES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Website')
INSERT INTO lead_sources (name, description) VALUES ('Website', 'Leads from website enquiry form');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Phone Enquiry')
INSERT INTO lead_sources (name, description) VALUES ('Phone Enquiry', 'Leads from inbound phone calls');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Email')
INSERT INTO lead_sources (name, description) VALUES ('Email', 'Leads from email campaigns');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Referral')
INSERT INTO lead_sources (name, description) VALUES ('Referral', 'Leads referred by existing customers');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Social Media')
INSERT INTO lead_sources (name, description) VALUES ('Social Media', 'Leads from social media platforms');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Walk-in')
INSERT INTO lead_sources (name, description) VALUES ('Walk-in', 'Walk-in customers');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Import')
INSERT INTO lead_sources (name, description) VALUES ('Import', 'Leads imported from external data');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Trade Show')
INSERT INTO lead_sources (name, description) VALUES ('Trade Show', 'Leads from trade shows and exhibitions');
IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = 'Advertisement')
INSERT INTO lead_sources (name, description) VALUES ('Advertisement', 'Leads from paid advertisements');

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM settings WHERE category = 'company' AND [key] = 'name')
INSERT INTO settings (category, [key], value, data_type, description) VALUES ('company', 'name', 'Your Company Name', 'string', 'Company name');
IF NOT EXISTS (SELECT 1 FROM settings WHERE category = 'company' AND [key] = 'timezone')
INSERT INTO settings (category, [key], value, data_type, description) VALUES ('company', 'timezone', 'Asia/Kolkata', 'string', 'Default timezone');
IF NOT EXISTS (SELECT 1 FROM settings WHERE category = 'company' AND [key] = 'currency')
INSERT INTO settings (category, [key], value, data_type, description) VALUES ('company', 'currency', 'INR', 'string', 'Default currency');
IF NOT EXISTS (SELECT 1 FROM settings WHERE category = 'leads' AND [key] = 'auto_assign')
INSERT INTO settings (category, [key], value, data_type, description) VALUES ('leads', 'auto_assign', 'false', 'boolean', 'Enable automatic lead assignment');
IF NOT EXISTS (SELECT 1 FROM settings WHERE category = 'notifications' AND [key] = 'followup_reminder_minutes')
INSERT INTO settings (category, [key], value, data_type, description) VALUES ('notifications', 'followup_reminder_minutes', '15', 'number', 'Minutes before follow-up to send reminder');

