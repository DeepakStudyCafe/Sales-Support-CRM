# Project Architecture – SalesCRM Pro

## 1. System Overview

SalesCRM Pro is a multi-tenant-ready, role-based CRM application composed of a React/Next.js frontend, a RESTful + WebSocket backend, Microsoft SQL Server for persistent data, and Redis for caching, pub/sub, and job queuing.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                      Next.js 14 (Port 3000)                         │
│          App Router · TypeScript · Tailwind CSS · Socket.IO         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTP REST / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Port 5000)                        │
│               Node.js 20 · Express · TypeScript                     │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  REST    │  │  Socket.IO   │  │  BullMQ  │  │  IVR Service   │  │
│  │  Routes  │  │  Real-time   │  │  Jobs    │  │  (HTTP Client) │  │
│  └──────────┘  └──────────────┘  └──────────┘  └────────────────┘  │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Auth / JWT / RBAC   │  │  Middleware Stack                    │ │
│  │  Permission Engine   │  │  (rate-limit, validate, error)       │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
└───────────┬────────────────────────────┬────────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────┐      ┌──────────────────────────┐
│  MS SQL Server 2022 │      │  Redis 7                 │
│  (Port 1433)        │      │  (Port 6379)             │
│                     │      │                          │
│  - sales_crm DB     │      │  - Session cache         │
│  - All entity data  │      │  - JWT denylist          │
│  - Audit logs       │      │  - Socket.IO adapter     │
│  - Call logs        │      │  - BullMQ job queues     │
└─────────────────────┘      │  - API response cache    │
                             └──────────────────────────┘
                                          │
                             ┌────────────▼─────────────┐
                             │  External: IVR Solutions  │
                             │  api.ivrsolutions.in      │
                             │  - Click-to-call          │
                             │  - DID management         │
                             │  - Call logs/recordings   │
                             └──────────────────────────┘
```

---

## 2. Technology Choices & Reasoning

| Technology | Choice | Reasoning |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | SSR/SSG flexibility, file-based routing, React Server Components, strong TypeScript support |
| Backend framework | Express.js | Lightweight, well-understood, mature ecosystem, easy to structure modularly |
| Language | TypeScript | End-to-end type safety reduces runtime bugs |
| Database | Microsoft SQL Server 2022 | Strong transactional guarantees, enterprise-grade, good JSON support, existing familiarity |
| ORM / query | `mssql` + raw parameterized SQL | Full control over queries, avoid ORM abstraction overhead for complex CRM queries |
| Cache / Queue | Redis 7 | Multi-purpose: caching, pub/sub for Socket.IO, BullMQ job store |
| Real-time | Socket.IO | Battle-tested, fallback to polling, namespace/room support for per-user events |
| Job queue | BullMQ | Built on Redis, reliable job processing with retries and scheduling |
| Auth | JWT (access + refresh tokens) | Stateless horizontal scaling; refresh token rotation for security |
| Styling | Tailwind CSS + CSS variables | Utility-first rapid development; CSS variables for themeable design system |
| Containerisation | Docker Compose | Reproducible dev environment; easy prod scaling |

---

## 3. Data Flow

### 3.1 Authenticated API Request

```
Browser → [HTTPS] → Express Router
  → JWT Middleware (verify access token, check Redis denylist)
  → Permission Middleware (check role + user-override permissions)
  → Validation Middleware (Joi schema)
  → Controller → Service → SQL Server
  → Response (JSON)
```

### 3.2 Real-time Notification

```
Backend Event (e.g., new lead assigned)
  → Socket.IO Server (emit to user room)
  → Redis Pub/Sub adapter (broadcasts across backend instances)
  → Client Socket.IO → NotificationContext → Toast / Bell badge
```

### 3.3 Background Job (Reminder)

```
User creates reminder → stored in DB
  → BullMQ schedules delayed job
  → Job processor fires at due time
    → Queries DB for reminder
    → Emits Socket.IO event to assigned user
    → (optional) sends email/SMS
```

### 3.4 IVR Click-to-Call

```
Agent clicks "Call" on lead/customer view
  → Frontend → POST /api/v1/calls/initiate
  → Backend IVR Service → POST api.ivrsolutions.in/click-to-call
  → IVR bridges agent phone ↔ customer phone
  → Webhook callback (call status events) → Backend → DB log
  → Socket.IO → Frontend call status indicator
```

---

## 4. Security Model

### Authentication
- **Access Token**: JWT, 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- **Refresh Token**: JWT, 7-day expiry, stored in HTTP-only cookie, signed with `JWT_REFRESH_SECRET`; hashed version stored in DB for rotation validation
- **Token Denylist**: On logout, access token JTI is added to Redis with TTL = remaining token lifetime

### Authorization (RBAC + User Overrides)
```
permissions table (base role permissions)
  + user_permission_overrides table (per-user grant/deny)
  = effective_permissions (computed at request time, cached in Redis 5 min)
```
- Every API endpoint declares required permission(s)
- Permission middleware resolves effective permissions and returns 403 if not met

### Additional Hardening
- **Rate limiting**: per-IP via `express-rate-limit` + Redis store; stricter limits on auth endpoints
- **Input validation**: Joi schemas on all mutation endpoints
- **SQL injection**: parameterized queries only via `mssql` package
- **CORS**: whitelist `FRONTEND_URL` only
- **Helmet**: HTTP security headers
- **BCRYPT_ROUNDS**: 12 (configurable)
- **Audit log**: every create/update/delete recorded in `audit_logs` table

---

## 5. Caching Strategy

| Cache Key Pattern | TTL | Purpose |
|---|---|---|
| `user:permissions:{userId}` | 5 min | Effective permissions (invalidated on role/override change) |
| `user:profile:{userId}` | 10 min | User profile data |
| `leads:list:{hash}` | 2 min | Paginated lead list (invalidated on lead change) |
| `customers:list:{hash}` | 2 min | Paginated customer list |
| `dashboard:metrics:{userId}` | 5 min | Dashboard KPIs |
| `ivr:did-numbers` | 30 min | Available DID numbers from IVR API |
| `jwt:denylist:{jti}` | TTL = token remaining life | Revoked tokens |

Cache invalidation is handled via targeted `DEL` on write operations, not TTL expiry alone.

---

## 6. Real-time Events Architecture

### Socket.IO Namespaces
- `/` — Main namespace for all authenticated users

### Rooms
- `user:{userId}` — Private user room (notifications, call events)
- `team:{teamId}` — Team-wide broadcasts (new lead assigned to team)
- `admin` — Super Admin / Admin broadcasts

### Key Events (Server → Client)
| Event | Payload | Description |
|---|---|---|
| `notification:new` | `{id, type, message, link}` | New in-app notification |
| `lead:assigned` | `{leadId, leadName}` | Lead assigned to agent |
| `call:incoming` | `{callId, callerNumber, leadId?}` | Incoming call from IVR |
| `call:status` | `{callId, status}` | Call status update |
| `ticket:updated` | `{ticketId, status}` | Support ticket status change |
| `reminder:due` | `{reminderId, message}` | Reminder is due |

### Key Events (Client → Server)
| Event | Description |
|---|---|
| `agent:available` | Agent marks themselves as available for calls |
| `agent:busy` | Agent marks themselves as busy |
| `typing:start` | Typing indicator in ticket chat |
| `typing:stop` | Typing indicator stop |

---

## 7. Background Jobs Architecture

BullMQ queues running in the backend process:

| Queue | Job | Schedule | Description |
|---|---|---|---|
| `reminders` | `processReminder` | Delayed (at due time) | Fires reminder notification |
| `emails` | `sendEmail` | Immediate | Transactional email dispatch |
| `reports` | `generateReport` | Scheduled / on-demand | Heavy report generation |
| `ivr-callbacks` | `processCallWebhook` | Immediate | Process IVR webhook payloads |
| `campaigns` | `dialNextLead` | Immediate + throttled | Auto-dialer campaign jobs |

All queues use:
- **Retry**: up to 3 attempts with exponential backoff
- **Dead Letter**: failed jobs moved to `{queue}:failed` for inspection
- **Concurrency**: configurable per queue; default 5 workers

---

## 8. IVR Integration Architecture

```
CRM Backend (IVR Service)
  │
  ├── GET  /did-numbers           → fetch available DID numbers
  ├── POST /click-to-call         → initiate outbound call
  ├── GET  /call-logs             → fetch call history
  ├── GET  /call-recordings/{id}  → get recording URL
  └── POST /campaigns/dial        → auto-dialer trigger
  
IVR Solutions (api.ivrsolutions.in)
  │
  └── Webhook callbacks → POST /api/v1/ivr/webhook (CRM)
        ├── call.initiated
        ├── call.answered
        ├── call.ended
        └── call.failed
```

The IVR Service module in the backend:
1. Wraps all IVR Solutions HTTP calls with retry logic
2. Normalises IVR responses into CRM's internal format
3. Persists call_logs to SQL Server
4. Emits real-time events to agents via Socket.IO on webhook receipt
5. Handles HMAC signature verification on incoming webhooks

---

## 9. Module Structure (Backend)

```
src/modules/
├── auth/           Login, logout, refresh, password reset, profile
├── users/          CRUD, role assignment, permission overrides
├── leads/          Lead CRUD, assignment, status transitions, import
├── customers/      Customer CRUD, contacts, communication history
├── pipeline/       Deal stages, pipeline CRUD, Kanban data
├── activities/     Notes, calls, emails, meetings logged to entities
├── tasks/          Task CRUD, reminders, assignments
├── calls/          Click-to-call, call logs, recordings
├── campaigns/      Auto-call campaign management
├── tickets/        Support ticket lifecycle
├── notifications/  In-app notification store
├── reports/        Pre-built and custom report generation
└── settings/       System config, role permissions, DID numbers
```

---

## 10. Deployment Architecture (Production)

```
Internet
  │
  ▼
Nginx (reverse proxy + SSL termination)
  ├── / → frontend container (Next.js :3000)
  └── /api → backend container (Express :5000)
              │
              ├── MS SQL Server (internal network only)
              └── Redis (internal network only)
```

Recommended production setup:
- Run `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
- Use Docker secrets or a vault (e.g., HashiCorp Vault, AWS Secrets Manager) for credentials
- Mount `./backend/logs` to a persistent volume with log rotation
- Schedule daily `sqlcmd` database backups to cloud storage
