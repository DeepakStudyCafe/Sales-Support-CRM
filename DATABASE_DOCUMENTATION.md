# Enterprise Sales & Customer Support CRM – Database Documentation

## 1. Overview and Architecture

The database layer is architected on **Microsoft SQL Server** (2019/2022 compatibility) using ACID compliance, relational integrity, non-clustered performance indexing, and strict audit logging.

- **Primary Database Engine**: Microsoft SQL Server
- **Collation**: `SQL_Latin1_General_CP1_CI_AS`
- **Internal Time Standard**: UTC (`GETUTCDATE()`), rendered application-wide in `Asia/Kolkata` (IST +05:30).
- **Primary Keys**: 128-bit Universally Unique Identifiers (`UNIQUEIDENTIFIER DEFAULT NEWID()`) ensuring distributed scalability and collision prevention.
- **Deletes**: Soft deletion pattern (`deleted_at DATETIME2 NULL`) across core business entities (`leads`, `customers`, `users`).

---

## 2. Entity-Relationship Summary

```text
       [departments] ──< [teams] ──< [users]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
     [leads]                      [customers]                      [calls]
        │                              │                              │
        ├──< [lead_notes]              ├──< [customer_notes]          ├──< [call_notes]
        ├──< [lead_activities]         ├──< [customer_activities]     │
        │                              │                              │
        ▼                              ▼                              │
  [opportunities]                [tickets] <──────────────────────────┘
        │                              │
        └──< [quotations]              ├──< [ticket_messages]
               │                       └──< [ticket_activities]
               └──< [quotation_items]
```

---

## 3. Data Dictionary & Table Definitions

### 3.1 Security, Roles & Permissions

#### `roles`
Stores the four primary application roles.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `name` | NVARCHAR(50) | NO | - | Unique role: 'Super Admin', 'Admin', 'Sales', 'Support' |
| `description` | NVARCHAR(255) | YES | NULL | Role description |
| `created_at` | DATETIME2 | NO | `GETUTCDATE()` | Timestamp |

#### `permissions`
Master catalog of granular application permissions.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `module` | NVARCHAR(50) | NO | - | Module name (e.g., `leads`, `tickets`, `calling`) |
| `submodule` | NVARCHAR(50) | NO | - | Submodule name (e.g., `pipeline`, `sla`, `history`) |
| `action` | NVARCHAR(50) | NO | - | Action type (`view`, `create`, `edit`, `delete`, `export`, `assign`) |
| `name` | NVARCHAR(100) | NO | - | Human readable permission label |
| `description` | NVARCHAR(255) | YES | NULL | Scope details |

#### `role_permissions`
Join table assigning granular permissions to system roles.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `role_id` | UNIQUEIDENTIFIER | NO | - | Foreign Key -> `roles(id)` ON DELETE CASCADE |
| `permission_id` | UNIQUEIDENTIFIER | NO | - | Foreign Key -> `permissions(id)` ON DELETE CASCADE |
| `created_at` | DATETIME2 | NO | `GETUTCDATE()` | Timestamp |

#### `user_permission_overrides`
User-level permission grants or revocations taking precedence over role permissions.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `user_id` | UNIQUEIDENTIFIER | NO | - | Foreign Key -> `users(id)` ON DELETE CASCADE |
| `permission_id` | UNIQUEIDENTIFIER | NO | - | Foreign Key -> `permissions(id)` ON DELETE CASCADE |
| `granted` | BIT | NO | - | 1 = explicitly granted, 0 = explicitly revoked |
| `reason` | NVARCHAR(255) | YES | NULL | Justification for audit log |

---

### 3.2 Organization & Users

#### `departments`
Top-level corporate departmental groupings (Sales, Customer Support, Operations).
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `name` | NVARCHAR(100) | NO | - | Department name |
| `description` | NVARCHAR(500) | YES | NULL | Description |

#### `teams`
Sub-units within departments (e.g., Inbound Sales, Tier 2 Support).
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `name` | NVARCHAR(100) | NO | - | Team name |
| `description` | NVARCHAR(500) | YES | NULL | Description |
| `department_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `departments(id)` |

#### `users`
Employee and administrator accounts.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `email` | NVARCHAR(255) | NO | - | Unique login email address |
| `password_hash` | NVARCHAR(255) | NO | - | Argon2 / bcrypt password hash |
| `first_name` | NVARCHAR(100) | NO | - | First name |
| `last_name` | NVARCHAR(100) | NO | - | Last name |
| `phone` | NVARCHAR(20) | YES | NULL | Direct contact number |
| `role_id` | UNIQUEIDENTIFIER | NO | - | Foreign Key -> `roles(id)` |
| `department_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `departments(id)` |
| `team_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `teams(id)` |
| `ivr_agent_id` | NVARCHAR(50) | YES | NULL | IVR Solutions agent identifier |
| `ivr_extension` | NVARCHAR(20) | YES | NULL | Telephony extension number |
| `is_active` | BIT | NO | 1 | 1 = active, 0 = deactivated |
| `last_login_at` | DATETIME2 | YES | NULL | Most recent successful login |
| `deleted_at` | DATETIME2 | YES | NULL | Soft delete flag |

#### `login_history`
Security audit trail of all authentication events.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `user_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `users(id)` |
| `email` | NVARCHAR(255) | YES | NULL | Login attempt email |
| `ip_address` | NVARCHAR(45) | YES | NULL | IPv4 / IPv6 client address |
| `user_agent` | NVARCHAR(500) | YES | NULL | Browser / OS user agent |
| `status` | NVARCHAR(20) | NO | - | 'success', 'failed', 'blocked' |
| `created_at` | DATETIME2 | NO | `GETUTCDATE()` | Event timestamp |

---

### 3.3 Sales, Leads & Opportunities

#### `leads`
Prospective customers and inquiries.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `lead_number` | NVARCHAR(50) | NO | - | Unique sequence (e.g., LEAD-000001) |
| `first_name` | NVARCHAR(100) | NO | - | Contact first name |
| `last_name` | NVARCHAR(100) | NO | - | Contact last name |
| `email` | NVARCHAR(255) | YES | NULL | Email address |
| `phone` | NVARCHAR(20) | NO | - | Phone number |
| `company` | NVARCHAR(200) | YES | NULL | Organization / Company name |
| `status` | NVARCHAR(50) | NO | 'New' | New, Contacted, Qualified, Proposal Sent, Negotiating, Converted, Lost |
| `priority` | NVARCHAR(20) | NO | 'Medium' | Low, Medium, High, Urgent, Critical |
| `source_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `lead_sources(id)` |
| `assigned_to` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `users(id)` |
| `converted_customer_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `customers(id)` |
| `deleted_at` | DATETIME2 | YES | NULL | Soft delete flag |

#### `opportunities`
Qualified pipeline deals with financial values and probability.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `lead_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `leads(id)` |
| `customer_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `customers(id)` |
| `title` | NVARCHAR(200) | NO | - | Deal title |
| `value` | DECIMAL(15,2) | NO | 0.00 | Monetary deal value (INR) |
| `stage` | NVARCHAR(50) | NO | 'Discovery' | Discovery, Proposal, Negotiation, Closed Won, Closed Lost |
| `probability` | INT | NO | 10 | Confidence percentage (0-100) |
| `expected_close_date` | DATETIME2 | YES | NULL | Target closing date |
| `assigned_to` | UNIQUEIDENTIFIER | YES | NULL | Sales owner |

---

### 3.4 Telephony & Calling (`calls`)

#### `calls`
Telephony records integrated with IVR Solutions (`api.ivrsolutions.in`).
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `call_uuid` | NVARCHAR(100) | YES | NULL | IVR Solutions unique call ID |
| `direction` | NVARCHAR(20) | NO | 'outbound' | 'inbound' or 'outbound' |
| `from_number` | NVARCHAR(20) | NO | - | Caller telephone |
| `to_number` | NVARCHAR(20) | NO | - | Callee telephone |
| `duration` | INT | NO | 0 | Call talk duration in seconds |
| `status` | NVARCHAR(30) | NO | 'initiated' | initiated, ringing, answered, completed, missed, busy, failed |
| `outcome` | NVARCHAR(50) | YES | NULL | Disposition tag (Interested, Callback, Not Interested) |
| `recording_url` | NVARCHAR(1000) | YES | NULL | Direct MP3 playback URL |
| `lead_id` | UNIQUEIDENTIFIER | YES | NULL | Linked Lead |
| `customer_id` | UNIQUEIDENTIFIER | YES | NULL | Linked Customer |
| `assigned_to` | UNIQUEIDENTIFIER | YES | NULL | Agent handling call |
| `initiated_at` | DATETIME2 | NO | `GETUTCDATE()` | Call start timestamp |

---

### 3.5 Support Tickets & SLA

#### `sla_configurations`
Resolution and response time targets per priority.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `name` | NVARCHAR(100) | NO | - | Policy name |
| `priority` | NVARCHAR(20) | NO | - | 'Low', 'Medium', 'High', 'Urgent', 'Critical' |
| `first_response_hours` | DECIMAL(5,2) | NO | - | First response target in hours |
| `resolution_hours` | DECIMAL(5,2) | NO | - | Resolution target in hours |
| `working_hours_only` | BIT | NO | 1 | 1 = 9:30-18:30 IST only, 0 = 24x7 |

#### `tickets`
Customer service cases with real-time SLA trackers.
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UNIQUEIDENTIFIER | NO | `NEWID()` | Primary Key |
| `ticket_number` | NVARCHAR(50) | NO | - | Unique sequence (e.g., TKT-000001) |
| `title` | NVARCHAR(200) | NO | - | Issue summary |
| `description` | NVARCHAR(MAX) | YES | NULL | In-depth issue description |
| `status` | NVARCHAR(50) | NO | 'Open' | Open, In Progress, Waiting for Customer, Resolved, Closed |
| `priority` | NVARCHAR(20) | NO | 'Medium' | Low, Medium, High, Urgent, Critical |
| `category_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `ticket_categories(id)` |
| `customer_id` | UNIQUEIDENTIFIER | YES | NULL | Foreign Key -> `customers(id)` |
| `assigned_to` | UNIQUEIDENTIFIER | YES | NULL | Support agent |
| `first_response_due_at` | DATETIME2 | YES | NULL | First response SLA deadline |
| `first_responded_at` | DATETIME2 | YES | NULL | Timestamp of initial agent message |
| `resolution_due_at` | DATETIME2 | YES | NULL | SLA resolution deadline |
| `resolved_at` | DATETIME2 | YES | NULL | Timestamp of ticket resolution |

---

## 4. Performance Indexes

The following non-clustered indexes are provisioned to maintain low latency on high-volume queries:

1. **`users`**:
   - `idx_users_email` ON `users(email)`
   - `idx_users_role_id` ON `users(role_id)`
2. **`leads`**:
   - `idx_leads_status` ON `leads(status)` WHERE `deleted_at IS NULL`
   - `idx_leads_assigned_to` ON `leads(assigned_to)`
   - `idx_leads_created_at` ON `leads(created_at DESC)`
   - `idx_leads_phone` ON `leads(phone)`
3. **`calls`**:
   - `idx_calls_initiated_at` ON `calls(initiated_at DESC)`
   - `idx_calls_lead_id` ON `calls(lead_id)`
   - `idx_calls_assigned_to` ON `calls(assigned_to)`
   - `idx_calls_status` ON `calls(status)`
4. **`tickets`**:
   - `idx_tickets_status_priority` ON `tickets(status, priority)`
   - `idx_tickets_assigned_to` ON `tickets(assigned_to)`
   - `idx_tickets_resolution_due` ON `tickets(resolution_due_at)` WHERE `status NOT IN ('Resolved', 'Closed')`
5. **`follow_ups`**:
   - `idx_followups_scheduled` ON `follow_ups(scheduled_at, status)` WHERE `status = 'Pending'`

