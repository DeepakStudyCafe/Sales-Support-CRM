# SalesCRM Pro – Enterprise Sales & Customer Support CRM

A full-stack CRM solution built with Next.js 14, Node.js/Express, Microsoft SQL Server, Redis, and Socket.IO — featuring IVR integration, auto-calling campaigns, role-based permissions, and real-time notifications.

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac/Linux)
- Node.js 20+ (for local development without Docker)
- Git

### Development Setup

1. **Clone and configure:**
   ```bash
   git clone <repo-url>
   cd sales-support-crm
   cp .env.example .env
   # Edit .env with your values (only needed for production overrides)
   ```

2. **Start all services with Docker:**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations (first time only):**
   ```bash
   docker-compose exec backend npm run migrate
   ```

4. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **API Docs (Swagger)**: http://localhost:5000/api-docs

5. **Default Super Admin credentials:**
   - Email: `admin@crm.com`
   - Password: `Admin@123`
   - ⚠️ **Change immediately after first login!**

---

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your SQL Server and Redis connection details
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Configure .env.local
npm run dev
```

---

## 🏗️ Architecture

| Component   | Technology                              | Port |
|-------------|----------------------------------------|------|
| Frontend    | Next.js 14 (App Router) + TypeScript   | 3000 |
| Backend API | Node.js + Express + TypeScript         | 5000 |
| Database    | Microsoft SQL Server 2022              | 1433 |
| Cache/Queue | Redis 7                                | 6379 |
| Real-time   | Socket.IO                              | (via backend) |

For detailed architecture documentation see [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md).

---

## 👥 User Roles & Permissions

| Role        | Description                                              |
|-------------|----------------------------------------------------------|
| Super Admin | Full system access — manage users, roles, all settings   |
| Admin       | Configured by Super Admin; broad operational access      |
| Sales       | Lead & customer management, pipeline, calling campaigns  |
| Support     | Ticket management, customer communication, notes         |

Permissions can be customized per user on top of their base role.

---

## 🔑 IVR Integration Setup

1. Log into your [IVR Solutions](https://ivrsolutions.in) dashboard
2. Navigate to **Settings → API**
3. Copy your **API token** and **subdomain**
4. Set the following in `backend/.env`:
   ```
   IVR_API_TOKEN=your-token-here
   IVR_SUBDOMAIN=your-subdomain
   ```
5. Configure DID numbers in **Settings → Calling Settings** inside the CRM

---

## 📁 Project Structure

```
sales-support-crm/
├── frontend/                    # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                 # App Router pages & layouts
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth, Socket, Notification)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # API client, utilities
│   │   └── types/               # TypeScript type definitions
│   ├── public/                  # Static assets
│   ├── Dockerfile.dev           # Development Dockerfile
│   └── Dockerfile               # Production Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── config/              # App configuration, DB, Redis
│   │   ├── middleware/          # Auth, permissions, validation, rate-limit
│   │   ├── modules/             # Feature modules (auth, leads, customers…)
│   │   │   └── <module>/
│   │   │       ├── routes.ts
│   │   │       ├── controller.ts
│   │   │       ├── service.ts
│   │   │       └── validation.ts
│   │   ├── jobs/                # BullMQ background jobs
│   │   ├── services/            # Shared services (IVR, mailer, SMS)
│   │   ├── socket/              # Socket.IO event handlers
│   │   └── utils/               # Helpers, logger
│   ├── migrations/              # SQL migration files
│   ├── Dockerfile.dev
│   └── Dockerfile
│
├── docker-compose.yml           # Development Docker Compose
├── docker-compose.prod.yml      # Production overrides
├── .env.example                 # Root environment template
├── README.md
├── PROJECT_PROGRESS.md
├── PROJECT_ARCHITECTURE.md
├── DATABASE_DOCUMENTATION.md
└── API_DOCUMENTATION.md
```

---

## 🧪 Running Tests

```bash
# Backend unit & integration tests
cd backend && npm test

# Backend test with coverage
cd backend && npm run test:coverage

# Frontend component & page tests
cd frontend && npm test

# Frontend E2E (Playwright)
cd frontend && npm run test:e2e
```

---

## 🚢 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production setup instructions including:
- Environment variable hardening
- Reverse proxy (Nginx) setup
- SSL/TLS configuration
- Database backup strategy
- PM2 / container orchestration

**Production startup:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📖 Documentation

| Document | Description |
|---|---|
| [API Documentation](./API_DOCUMENTATION.md) | All REST endpoints with request/response examples |
| [Database Documentation](./DATABASE_DOCUMENTATION.md) | Schema, tables, indexes, relationships |
| [Architecture](./PROJECT_ARCHITECTURE.md) | System design, data flow, security model |
| [Progress Tracking](./PROJECT_PROGRESS.md) | Phase-by-phase build progress |

---

## 🛠️ Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a single service
docker-compose restart backend

# Open a shell in the backend container
docker-compose exec backend sh

# Reset database (DESTRUCTIVE)
docker-compose down -v
docker-compose up -d

# Run a specific migration
docker-compose exec backend npm run migrate:up
```

---

## 📄 License

Proprietary — All rights reserved.
