# Enterprise Sales & Customer Support CRM – API Documentation

All API routes are prefixed with `/api/v1` and served over HTTP/HTTPS by the Node.js Express application running on port `5000`.

---

## 1. Authentication & Security

- **Scheme**: Bearer Token Authentication using JSON Web Tokens (JWT).
- **Header**: `Authorization: Bearer <accessToken>`
- **Access Token Expiration**: 15 minutes.
- **Refresh Token Expiration**: 7 days (managed via `httpOnly` cookie or refresh payload).
- **Rate Limiting**:
  - Global APIs: 100 requests per minute per IP.
  - Authentication APIs (`/auth/login`): 5 attempts per 15 minutes per IP.
  - Telephony Click-to-Call: 20 calls per minute per user.

---

## 2. Standard Response Format

### Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Paginated Response Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 128,
    "totalPages": 13
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email address format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

---

## 3. Endpoints Reference

### 3.1 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticate with email and password | No |
| `POST` | `/auth/refresh` | Refresh access token using refresh token | No |
| `POST` | `/auth/logout` | Revoke session and invalidate tokens | Yes |
| `GET` | `/auth/me` | Fetch currently logged in user profile & permissions | Yes |
| `POST` | `/auth/forgot-password`| Request password reset email | No |
| `POST` | `/auth/reset-password` | Set new password via reset token | No |

---

### 3.2 User Management (`/api/v1/users`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/users` | List users with pagination and search | `users:all:view` |
| `GET` | `/users/:id` | Get user details by ID | `users:all:view` |
| `POST` | `/users` | Create Admin, Sales, or Support user | `users:all:create` |
| `PUT` | `/users/:id` | Update employee information | `users:all:edit` |
| `PATCH` | `/users/:id/activate` | Activate employee account | `users:all:edit` |
| `PATCH` | `/users/:id/deactivate`| Deactivate employee account | `users:all:edit` |
| `POST` | `/users/:id/reset-password` | Generate new temporary password | `users:all:edit` |
| `GET` | `/users/:id/login-history` | View employee login audit log | `users:activity:view` |
| `GET` | `/users/my/login-history` | View own login audit log | Authenticated |

---

### 3.3 Roles & Permissions (`/api/v1/roles`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/roles` | List all system roles | Authenticated |
| `GET` | `/roles/permissions` | Get catalog of all available permissions | `users:permissions:view` |
| `GET` | `/roles/matrix` | Full matrix of permissions across roles | `users:permissions:view` |
| `GET` | `/roles/:roleId/permissions` | Permissions granted to specific role | `users:permissions:view` |
| `PUT` | `/roles/:roleId/permissions` | Update role permissions (Super Admin) | `users:permissions:edit` |
| `GET` | `/roles/users/:userId/overrides` | View user-level permission overrides | `users:permissions:view` |
| `POST` | `/roles/users/:userId/overrides`| Set user permission override | `users:permissions:edit` |

---

### 3.4 Teams & Departments (`/api/v1/teams`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/teams` | List teams with member counts | `users:teams:view` |
| `POST` | `/teams` | Create new team | `users:teams:create` |
| `PUT` | `/teams/:id` | Update team | `users:teams:edit` |
| `GET` | `/teams/departments/all` | List all departments | `users:teams:view` |
| `POST` | `/teams/departments` | Create new department | `users:teams:create` |

---

### 3.5 Leads & Sales Pipeline (`/api/v1/leads`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/leads` | List leads (paginated, filters: status, priority, source, search) | `leads:all:view` |
| `GET` | `/leads/:id` | Full Lead 360 record (notes, timeline, calls) | `leads:all:view` |
| `POST` | `/leads` | Create new lead | `leads:all:create` |
| `PUT` | `/leads/:id` | Update lead record | `leads:all:edit` |
| `DELETE`| `/leads/:id` | Soft delete lead record | `leads:all:delete` |
| `PATCH` | `/leads/:id/assign` | Assign or reassign lead to agent | `leads:assignment:assign` |
| `POST` | `/leads/:id/convert`| Convert lead into customer & opportunity | `leads:all:edit` |
| `POST` | `/leads/:id/notes` | Add note to lead timeline | `leads:all:edit` |
| `GET` | `/leads/:id/timeline` | Fetch full chronological audit timeline | `leads:all:view` |
| `GET` | `/leads/sources/all` | List lead sources | `leads:sources:view` |
| `POST` | `/leads/sources` | Create lead source | `leads:sources:create` |

---

### 3.6 Customers (`/api/v1/customers`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/customers` | List customers with search and filters | `customers:all:view` |
| `GET` | `/customers/:id` | Full Customer 360 view (deals, tickets, calls) | `customers:all:view` |
| `POST` | `/customers` | Create new customer record | `customers:all:create` |
| `PUT` | `/customers/:id` | Update customer details | `customers:all:edit` |
| `POST` | `/customers/:id/notes` | Add note to customer timeline | `customers:all:edit` |

---

### 3.7 Calling & Telephony (`/api/v1/calls`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `POST` | `/calls/click-to-call` | Initiate Click-to-Call via IVR Solutions | `calling:click-to-call:create` |
| `POST` | `/calls/:callId/disposition` | Save call outcome disposition & follow-up | `calling:click-to-call:create` |
| `GET` | `/calls/history` | Telephony call records with audio playback | `calling:history:view` |
| `POST` | `/calls/webhook` | Inbound call webhook from IVR Solutions | Public (IVR Signature) |
| `GET` | `/calls/health` | Test connection to IVR Solutions gateway | `calling:ivr-settings:view` |

---

### 3.8 Support Tickets (`/api/v1/tickets`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/tickets` | List tickets with SLA status and filters | `tickets:all:view` |
| `GET` | `/tickets/:id` | Ticket 360 with messages, notes, activities | `tickets:all:view` |
| `POST` | `/tickets` | Create support ticket with SLA deadlines | `tickets:all:create` |
| `POST` | `/tickets/:id/messages` | Post public reply or private internal note | `tickets:all:edit` |
| `PATCH` | `/tickets/:id/status` | Update ticket status (Open/Resolved/Closed) | `tickets:all:edit` |
| `PATCH` | `/tickets/:id/assign` | Assign ticket to support representative | `tickets:all:assign` |
| `GET` | `/tickets/categories/all` | List ticket categories | Authenticated |
| `POST` | `/tickets/categories` | Create ticket category | `tickets:categories:manage` |
| `GET` | `/tickets/sla/all` | List SLA tier configurations | `tickets:sla:manage` |
| `PUT` | `/tickets/sla/:id` | Update SLA response & resolution hours | `tickets:sla:manage` |
| `GET` | `/tickets/stats/support` | Ticket overview statistics | Authenticated |

---

### 3.9 Notifications (`/api/v1/notifications`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/notifications` | List user notifications (with `unreadOnly` param) | Yes |
| `GET` | `/notifications/unread-count` | Quick counter of pending unread alerts | Yes |
| `PATCH` | `/notifications/:id/read` | Mark specific notification as read | Yes |
| `PATCH` | `/notifications/mark-all-read` | Mark all user notifications as read | Yes |

---

### 3.10 Automation (`/api/v1/automation`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/automation` | List workflow trigger rules | `automation:workflows:view` |
| `POST` | `/automation` | Create workflow automation rule | `automation:workflows:create` |
| `PATCH` | `/automation/:id/toggle` | Toggle workflow rule active/inactive | `automation:workflows:edit` |
| `DELETE`| `/automation/:id` | Delete workflow rule | `automation:workflows:delete` |
| `GET` | `/automation/:id/executions` | Execution history of a workflow rule | `automation:workflows:view` |

---

### 3.11 Reports & Dashboards (`/api/v1/reports`, `/api/v1/dashboard`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/reports/leads` | Lead pipeline and conversion analytics | `reports:leads:view` |
| `GET` | `/reports/sales` | Opportunity pipeline and deal velocity | `reports:sales:view` |
| `GET` | `/reports/calling` | Call volume, connect rate, talk times | `reports:calling:view` |
| `GET` | `/reports/support` | Ticket volume, SLA adherence, resolution | `reports:support:view` |
| `GET` | `/reports/performance` | Employee cross-functional leaderboard | `reports:performance:view` |
| `GET` | `/dashboard/overview` | Super Admin master KPI dashboard | `dashboard:overview:view` |
| `GET` | `/dashboard/sales` | Sales executive pipeline dashboard | `dashboard:sales:view` |
| `GET` | `/dashboard/calling` | Telephony and dialer dashboard | `dashboard:calling:view` |
| `GET` | `/dashboard/support` | Support queue and SLA dashboard | `dashboard:support:view` |

---

### 3.12 Activity & Audit Logs (`/api/v1/audit`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/audit` | Query immutable database mutation logs | `audit:all:view` |
| `GET` | `/audit/login-history` | Review system-wide authentication events | `audit:all:view` |
| `GET` | `/audit/employee-activities` | Chronological stream of employee activity | `audit:all:view` |

---

### 3.13 Settings (`/api/v1/settings`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/settings` | Get system configuration by category | `settings:general:view` |
| `PUT` | `/settings/:category` | Upsert system configuration keys | `settings:general:edit` |

