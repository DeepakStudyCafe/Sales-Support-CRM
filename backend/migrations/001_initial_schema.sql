-- ============================================================
-- Migration 001: Initial Schema
-- Enterprise Sales & Support CRM
-- ============================================================

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE departments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE teams (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500),
  department_id UNIQUEIDENTIFIER REFERENCES departments(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE roles (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(50) NOT NULL UNIQUE,
  description NVARCHAR(500),
  is_system BIT DEFAULT 0,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE permissions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  module NVARCHAR(50) NOT NULL,
  submodule NVARCHAR(50),
  action NVARCHAR(50) NOT NULL,
  description NVARCHAR(500),
  UNIQUE(module, submodule, action)
);

CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email NVARCHAR(255) NOT NULL UNIQUE,
  phone NVARCHAR(20),
  password_hash NVARCHAR(255) NOT NULL,
  first_name NVARCHAR(100) NOT NULL,
  last_name NVARCHAR(100) NOT NULL,
  role_id UNIQUEIDENTIFIER NOT NULL REFERENCES roles(id),
  team_id UNIQUEIDENTIFIER REFERENCES teams(id),
  department_id UNIQUEIDENTIFIER REFERENCES departments(id),
  ivr_agent_id NVARCHAR(100),
  ivr_extension NVARCHAR(20),
  is_active BIT DEFAULT 1,
  avatar_url NVARCHAR(500),
  working_hours_start NVARCHAR(10) DEFAULT '09:00',
  working_hours_end NVARCHAR(10) DEFAULT '18:00',
  timezone NVARCHAR(50) DEFAULT 'Asia/Kolkata',
  last_login_at DATETIME2,
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  deleted_at DATETIME2
);

CREATE TABLE role_permissions (
  role_id UNIQUEIDENTIFIER NOT NULL REFERENCES roles(id),
  permission_id UNIQUEIDENTIFIER NOT NULL REFERENCES permissions(id),
  granted BIT DEFAULT 1,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_permissions (
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  permission_id UNIQUEIDENTIFIER NOT NULL REFERENCES permissions(id),
  granted BIT DEFAULT 1,
  overridden_by UNIQUEIDENTIFIER REFERENCES users(id),
  override_reason NVARCHAR(500),
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE user_sessions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  refresh_token_hash NVARCHAR(255) NOT NULL,
  ip_address NVARCHAR(45),
  user_agent NVARCHAR(500),
  expires_at DATETIME2 NOT NULL,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE login_history (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER REFERENCES users(id),
  email NVARCHAR(255),
  ip_address NVARCHAR(45),
  user_agent NVARCHAR(500),
  status NVARCHAR(20) NOT NULL, -- success, failed, blocked
  failure_reason NVARCHAR(200),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- LEAD & SALES
-- ============================================================

CREATE TABLE lead_sources (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(500),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE leads (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  first_name NVARCHAR(100) NOT NULL,
  last_name NVARCHAR(100),
  email NVARCHAR(255),
  phone NVARCHAR(20) NOT NULL,
  alt_phone NVARCHAR(20),
  company NVARCHAR(200),
  source_id UNIQUEIDENTIFIER REFERENCES lead_sources(id),
  status NVARCHAR(50) NOT NULL DEFAULT 'New',
  priority NVARCHAR(20) DEFAULT 'Medium',
  pipeline_stage NVARCHAR(50) DEFAULT 'New',
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  notes NVARCHAR(MAX),
  duplicate_of UNIQUEIDENTIFIER REFERENCES leads(id),
  converted_at DATETIME2,
  converted_to_customer_id UNIQUEIDENTIFIER,
  lost_reason NVARCHAR(500),
  lost_at DATETIME2,
  city NVARCHAR(100),
  state NVARCHAR(100),
  country NVARCHAR(100) DEFAULT 'India',
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  deleted_at DATETIME2
);

CREATE TABLE lead_activities (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  lead_id UNIQUEIDENTIFIER NOT NULL REFERENCES leads(id),
  activity_type NVARCHAR(50) NOT NULL,
  description NVARCHAR(MAX),
  performed_by UNIQUEIDENTIFIER REFERENCES users(id),
  metadata NVARCHAR(MAX), -- JSON
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE lead_assignments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  lead_id UNIQUEIDENTIFIER NOT NULL REFERENCES leads(id),
  assigned_from UNIQUEIDENTIFIER REFERENCES users(id),
  assigned_to UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  assigned_by UNIQUEIDENTIFIER REFERENCES users(id),
  reason NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE lead_attachments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  lead_id UNIQUEIDENTIFIER NOT NULL REFERENCES leads(id),
  file_name NVARCHAR(255) NOT NULL,
  file_path NVARCHAR(500) NOT NULL,
  file_size INT,
  mime_type NVARCHAR(100),
  uploaded_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  first_name NVARCHAR(100) NOT NULL,
  last_name NVARCHAR(100),
  email NVARCHAR(255),
  phone NVARCHAR(20) NOT NULL,
  alt_phone NVARCHAR(20),
  company NVARCHAR(200),
  address NVARCHAR(500),
  city NVARCHAR(100),
  state NVARCHAR(100),
  country NVARCHAR(100) DEFAULT 'India',
  pincode NVARCHAR(20),
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  notes NVARCHAR(MAX),
  is_active BIT DEFAULT 1,
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  deleted_at DATETIME2
);

-- ============================================================
-- OPPORTUNITIES & QUOTATIONS
-- ============================================================

CREATE TABLE opportunities (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  title NVARCHAR(200) NOT NULL,
  value DECIMAL(18,2),
  currency NVARCHAR(10) DEFAULT 'INR',
  stage NVARCHAR(50) NOT NULL DEFAULT 'Prospecting',
  expected_close_date DATE,
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  description NVARCHAR(MAX),
  won_lost_reason NVARCHAR(500),
  closed_at DATETIME2,
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE quotations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  opportunity_id UNIQUEIDENTIFIER REFERENCES opportunities(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  quote_number NVARCHAR(50) NOT NULL UNIQUE,
  items NVARCHAR(MAX), -- JSON array
  subtotal DECIMAL(18,2),
  tax_amount DECIMAL(18,2),
  total_value DECIMAL(18,2),
  status NVARCHAR(50) DEFAULT 'Draft',
  valid_until DATE,
  notes NVARCHAR(MAX),
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- IVR & CALLS
-- ============================================================

CREATE TABLE ivr_configurations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  provider NVARCHAR(100) DEFAULT 'IVRSolutions',
  api_base_url NVARCHAR(500),
  api_token NVARCHAR(500),
  did_number NVARCHAR(20),
  subdomain NVARCHAR(100),
  is_active BIT DEFAULT 1,
  webhook_secret NVARCHAR(255),
  settings NVARCHAR(MAX), -- JSON
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE ivr_agents (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  agent_id NVARCHAR(100),
  extension NVARCHAR(20),
  did_number NVARCHAR(20),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE calls (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ivr_call_id NVARCHAR(200),
  caller_number NVARCHAR(20),
  customer_number NVARCHAR(20),
  direction NVARCHAR(20) NOT NULL, -- inbound, outbound
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  ticket_id UNIQUEIDENTIFIER,
  status NVARCHAR(50), -- initiated, ringing, answered, completed, failed, missed
  duration INT, -- seconds
  outcome NVARCHAR(50),
  notes NVARCHAR(MAX),
  recording_url NVARCHAR(1000),
  initiated_at DATETIME2,
  answered_at DATETIME2,
  ended_at DATETIME2,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE call_dispositions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  call_id UNIQUEIDENTIFIER NOT NULL REFERENCES calls(id),
  disposition NVARCHAR(50) NOT NULL,
  notes NVARCHAR(MAX),
  follow_up_required BIT DEFAULT 0,
  follow_up_datetime DATETIME2,
  follow_up_assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE call_campaigns (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(200) NOT NULL,
  type NVARCHAR(50),
  dialer_mode NVARCHAR(50),
  ivr_dialer_id NVARCHAR(200),
  status NVARCHAR(50) DEFAULT 'Draft',
  purpose NVARCHAR(500),
  start_time DATETIME2,
  end_time DATETIME2,
  calling_window_start NVARCHAR(10) DEFAULT '09:00',
  calling_window_end NVARCHAR(10) DEFAULT '18:00',
  max_concurrent_calls INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  retry_interval_minutes INT DEFAULT 60,
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE campaign_contacts (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  campaign_id UNIQUEIDENTIFIER NOT NULL REFERENCES call_campaigns(id),
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  phone NVARCHAR(20) NOT NULL,
  status NVARCHAR(50) DEFAULT 'Pending',
  attempts INT DEFAULT 0,
  last_attempt_at DATETIME2,
  last_outcome NVARCHAR(100),
  skip_reason NVARCHAR(500),
  opted_out BIT DEFAULT 0,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- FOLLOW-UPS & TASKS
-- ============================================================

CREATE TABLE follow_ups (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  type NVARCHAR(50) DEFAULT 'Task',
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  ticket_id UNIQUEIDENTIFIER,
  call_id UNIQUEIDENTIFIER REFERENCES calls(id),
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX),
  scheduled_at DATETIME2 NOT NULL,
  assigned_to UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  priority NVARCHAR(20) DEFAULT 'Medium',
  status NVARCHAR(50) DEFAULT 'Pending',
  completed_at DATETIME2,
  completed_by UNIQUEIDENTIFIER REFERENCES users(id),
  reminder_sent BIT DEFAULT 0,
  reminder_sent_at DATETIME2,
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE ticket_categories (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(500),
  default_priority NVARCHAR(20) DEFAULT 'Medium',
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE sla_configurations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(100) NOT NULL,
  priority NVARCHAR(20) NOT NULL,
  first_response_hours DECIMAL(5,2) NOT NULL,
  resolution_hours DECIMAL(5,2) NOT NULL,
  working_hours_only BIT DEFAULT 1,
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE tickets (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ticket_number NVARCHAR(20) NOT NULL UNIQUE,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX),
  category_id UNIQUEIDENTIFIER REFERENCES ticket_categories(id),
  priority NVARCHAR(20) DEFAULT 'Medium',
  status NVARCHAR(50) DEFAULT 'Open',
  assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
  team_id UNIQUEIDENTIFIER REFERENCES teams(id),
  customer_id UNIQUEIDENTIFIER REFERENCES customers(id),
  lead_id UNIQUEIDENTIFIER REFERENCES leads(id),
  call_id UNIQUEIDENTIFIER REFERENCES calls(id),
  sla_id UNIQUEIDENTIFIER REFERENCES sla_configurations(id),
  first_response_due_at DATETIME2,
  resolution_due_at DATETIME2,
  first_responded_at DATETIME2,
  resolved_at DATETIME2,
  closed_at DATETIME2,
  reopen_count INT DEFAULT 0,
  csat_score INT,
  csat_feedback NVARCHAR(500),
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE ticket_messages (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ticket_id UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id),
  message NVARCHAR(MAX) NOT NULL,
  is_internal BIT DEFAULT 0,
  sent_by UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE ticket_attachments (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ticket_id UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id),
  message_id UNIQUEIDENTIFIER REFERENCES ticket_messages(id),
  file_name NVARCHAR(255) NOT NULL,
  file_path NVARCHAR(500) NOT NULL,
  file_size INT,
  mime_type NVARCHAR(100),
  uploaded_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE ticket_activities (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  ticket_id UNIQUEIDENTIFIER NOT NULL REFERENCES tickets(id),
  activity_type NVARCHAR(50) NOT NULL,
  description NVARCHAR(MAX),
  performed_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  type NVARCHAR(100) NOT NULL,
  title NVARCHAR(200) NOT NULL,
  body NVARCHAR(1000),
  data NVARCHAR(MAX), -- JSON: entity_type, entity_id, action
  is_read BIT DEFAULT 0,
  read_at DATETIME2,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE notification_preferences (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  notification_type NVARCHAR(100) NOT NULL,
  in_app BIT DEFAULT 1,
  email BIT DEFAULT 0,
  is_enabled BIT DEFAULT 1,
  UNIQUE(user_id, notification_type)
);

-- ============================================================
-- AUTOMATION
-- ============================================================

CREATE TABLE automation_rules (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(200) NOT NULL,
  trigger_event NVARCHAR(100) NOT NULL,
  conditions NVARCHAR(MAX), -- JSON
  actions NVARCHAR(MAX) NOT NULL, -- JSON
  is_active BIT DEFAULT 1,
  execution_count INT DEFAULT 0,
  last_executed_at DATETIME2,
  created_by UNIQUEIDENTIFIER REFERENCES users(id),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE automation_executions (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  rule_id UNIQUEIDENTIFIER NOT NULL REFERENCES automation_rules(id),
  trigger_data NVARCHAR(MAX), -- JSON
  status NVARCHAR(20) NOT NULL,
  result NVARCHAR(MAX), -- JSON
  error NVARCHAR(MAX),
  executed_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  user_id UNIQUEIDENTIFIER REFERENCES users(id),
  action NVARCHAR(100) NOT NULL,
  entity_type NVARCHAR(50),
  entity_id NVARCHAR(100),
  old_values NVARCHAR(MAX), -- JSON
  new_values NVARCHAR(MAX), -- JSON
  ip_address NVARCHAR(45),
  user_agent NVARCHAR(500),
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- SETTINGS
-- ============================================================

CREATE TABLE settings (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  category NVARCHAR(50) NOT NULL,
  [key] NVARCHAR(100) NOT NULL,
  value NVARCHAR(MAX),
  data_type NVARCHAR(20) DEFAULT 'string',
  description NVARCHAR(500),
  updated_by UNIQUEIDENTIFIER REFERENCES users(id),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  UNIQUE(category, [key])
);
