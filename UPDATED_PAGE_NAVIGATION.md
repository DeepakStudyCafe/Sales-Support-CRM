# Enterprise CRM – Updated Page Navigation & Consolidated Hubs

## Overview

To simplify daily workflows and eliminate navigation clutter, the Enterprise Sales & Customer Support CRM has consolidated dozens of individual pages into **7 Unified Tabbed Hubs**, while preserving 100% backward compatibility for all existing direct URL routes.

---

## 1. Consolidated Hubs & Sub-Route Mapping

### 1. Leads Hub (`/leads`)
- **Main View (`/leads`):** Complete leads data table with search, priority/status filters, Excel Import, Excel Export, and Bulk Action Toolbar.
- **Integrated Tabs & Accessible Sub-routes:**
  - `All Leads` (`/leads`)
  - `Pipeline Board` (`/leads/pipeline`): Interactive Kanban stage visualizer.
  - `Lead Assignment` (`/leads/assignment`): Round-robin and manual agent distribution.
  - `Lead Sources` (`/leads/sources`): Lead generation channel metrics.
  - `Lost Leads` (`/leads/lost`): Lost lead reasons and winback outreach.
  - `Lead Details 360` (`/leads/[id]`): Full lead profile, activity log, call records, and customer conversion.
  - `Add Lead Form` (`/leads/add`): Comprehensive new prospect entry form.

### 2. Calling & Telephony Hub (`/calling`)
- **Main View (`/calling`):** Interactive telephony command center with softphone keypad, quick click-to-call, live call stats, and audio player.
- **Integrated Tabs & Accessible Sub-routes:**
  - `Live Dialer` (`/calling` & `/calling/click-to-call`): Outbound calling keypad and agent extension connect.
  - `Call History Logs` (`/calling/history`): Filterable log of all completed, in-progress, and failed calls.
  - `Inbound Calls` (`/calling/inbound`): Inbound caller routing and disposition tagging.
  - `Missed Calls` (`/calling/missed`): Abandoned calls queue with one-click callback.
  - `Call Recordings` (`/calling/recordings`): Audio recordings library with inline playback.
  - `Calling Campaigns` (`/calling/campaigns` & `/calling/dialer`): Preview, Progressive, and Predictive dialer campaigns.
  - `IVR Agents` (`/calling/agents`): Agent extensions and DID mapping.
  - `IVR Settings` (`/calling/ivr-settings`): Gateway API credentials and webhook synchronization endpoint.

### 3. Tasks & Follow-ups Hub (`/follow-ups`)
- **Main View (`/follow-ups`):** Task management dashboard with inline creation modal, agent assignment, and status toggles.
- **Integrated Tabs & Accessible Sub-routes:**
  - `All Tasks` (`/follow-ups`)
  - `Today's Due` (`/follow-ups/today`): Priority queue for tasks scheduled today.
  - `Upcoming` (`/follow-ups/upcoming`): Future scheduled callbacks and demos.
  - `Overdue` (`/follow-ups/overdue`): Past-due items requiring immediate action.
  - `Completed` (`/follow-ups/completed`): Historical archive of finished tasks.

### 4. Support Tickets Hub (`/tickets`)
- **Main View (`/tickets`):** Customer support ticket management with SLA countdowns and bulk escalation.
- **Integrated Tabs & Accessible Sub-routes:**
  - `All Tickets` (`/tickets`)
  - `My Tickets` (`/tickets/my`): Tickets assigned specifically to the logged-in agent.
  - `Assigned Queue` (`/tickets/assigned`): Team ticket allocations.
  - `SLA & Escalations` (`/tickets/sla` & `/tickets/escalations`): First-response and resolution SLA monitoring.
  - `Categories` (`/tickets/categories`): Technical, billing, and access ticket categories.
  - `Resolved & Closed` (`/tickets/resolved`): Completed customer support resolutions.
  - `Ticket 360 & Conversation` (`/tickets/[id]`): Multi-party conversation thread, internal engineer notes, and customer CSAT feedback.
  - `Create Ticket` (`/tickets/create`): New ticket submission form.

### 5. User Management Hub (`/users`)
- **Main View (`/users`):** Employee directory with role badges, IVR extensions, and password resets.
- **Integrated Tabs & Accessible Sub-routes:**
  - `All Employees` (`/users`)
  - `Create User` (`/users/create-admin`, `/users/create-sales`, `/users/create-support`): Dedicated creation forms for Super Admin, Admin, Sales, and Support roles.
  - `Teams & Departments` (`/users/teams`): Organizational hierarchy management.
  - `Roles & Permissions` (`/users/roles-permissions`): Action-level RBAC permission matrix.
  - `Login & Activity History` (`/activity-logs/login-history`): Security audit log of user logins, IP addresses, and session timestamps.

### 6. Reports & Analytics Hub (`/reports`)
- **Main View (`/reports`):** Executive overview charts for pipeline velocity, revenue, and conversion ratios.
- **Integrated Tabs & Accessible Sub-routes:**
  - `Executive Overview` (`/reports`)
  - `Sales & Revenue` (`/reports/sales`): Deal values, revenue won, and agent pipelines.
  - `Leads & Conversion` (`/reports/leads`): Funnel stages and source attribution.
  - `Telephony Metrics` (`/reports/calling` & `/reports/campaigns`): Call volumes, duration, and disposition breakdown.
  - `Follow-up Reports` (`/reports/follow-ups`): Task completion velocity.
  - `Support & SLA Reports` (`/reports/support`): First response time and resolution compliance.
  - `Agent Performance Leaderboard` (`/reports/performance`): Sales and support agent KPIs.

### 7. System Settings Hub (`/settings`)
- **Main View (`/settings`):** Global application preferences.
- **Integrated Tabs & Accessible Sub-routes:**
  - `General & System` (`/settings` & `/settings/general`): Application branding, timezone, currency, and date formats.
  - `Company Profile` (`/settings/company`): Corporate entity details, addresses, and registration numbers.
  - `Working Hours & SLA` (`/settings/working-hours`): Business hours, shift timings, and holiday calendars.
  - `Notification Preferences` (`/settings/notifications`): In-app and email alert triggers.
  - `Email & SMTP` (`/settings/email`): SMTP mail relay credentials.
  - `Telephony & IVR Gateway` (`/settings/calling`): Telephony bridge parameters.
  - `Theme & Appearance` (`/settings/theme`): Enterprise light/dark theme toggles.

---

## 2. Updated Sidebar Structure

The main sidebar has been streamlined from over 40 individual items into 10 clean, focused navigation groups:

1. **Dashboard** (`/dashboard`)
2. **Sales & Leads** (`/leads`)
3. **Customers** (`/customers`)
4. **Opportunities & Quotes** (`/opportunities`, `/quotations`)
5. **Calling & Telephony** (`/calling`)
6. **Tasks & Follow-ups** (`/follow-ups`)
7. **Support Tickets** (`/tickets`)
8. **User Management** (`/users`)
9. **Reports & Analytics** (`/reports`)
10. **System Settings** (`/settings`)

