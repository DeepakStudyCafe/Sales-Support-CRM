-- ============================================================
-- Migration 002: Performance Indexes
-- ============================================================

CREATE INDEX IX_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IX_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IX_leads_phone ON leads(phone) WHERE deleted_at IS NULL;
CREATE INDEX IX_leads_email ON leads(email) WHERE deleted_at IS NULL;
CREATE INDEX IX_leads_created_at ON leads(created_at);
CREATE INDEX IX_leads_pipeline_stage ON leads(pipeline_stage) WHERE deleted_at IS NULL;
CREATE INDEX IX_leads_source_id ON leads(source_id);

CREATE INDEX IX_customers_assigned_to ON customers(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IX_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
CREATE INDEX IX_customers_email ON customers(email) WHERE deleted_at IS NULL;

CREATE INDEX IX_calls_assigned_to ON calls(assigned_to);
CREATE INDEX IX_calls_customer_number ON calls(customer_number);
CREATE INDEX IX_calls_lead_id ON calls(lead_id);
CREATE INDEX IX_calls_customer_id ON calls(customer_id);
CREATE INDEX IX_calls_status ON calls(status);
CREATE INDEX IX_calls_direction ON calls(direction);

CREATE INDEX IX_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IX_tickets_status ON tickets(status);
CREATE INDEX IX_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IX_tickets_priority ON tickets(priority);
CREATE INDEX IX_tickets_created_at ON tickets(created_at);

CREATE INDEX IX_follow_ups_assigned_to ON follow_ups(assigned_to);
CREATE INDEX IX_follow_ups_scheduled_at ON follow_ups(scheduled_at);
CREATE INDEX IX_follow_ups_status ON follow_ups(status);
CREATE INDEX IX_follow_ups_reminder_sent ON follow_ups(reminder_sent);

CREATE INDEX IX_notifications_user_id ON notifications(user_id);
CREATE INDEX IX_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IX_notifications_created_at ON notifications(created_at);

CREATE INDEX IX_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IX_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IX_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IX_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IX_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IX_login_history_user_id ON login_history(user_id);
CREATE INDEX IX_login_history_email ON login_history(email);
CREATE INDEX IX_login_history_created_at ON login_history(created_at);

CREATE INDEX IX_campaign_contacts_campaign_id ON campaign_contacts(campaign_id);
CREATE INDEX IX_campaign_contacts_status ON campaign_contacts(campaign_id, status);

CREATE INDEX IX_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IX_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IX_ticket_activities_ticket_id ON ticket_activities(ticket_id);
