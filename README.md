# CRM System

Multi-tenant Customer Relationship Management platform — all four phases implemented.

## Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 12, Sanctum, Queue jobs |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS (PWA-ready) |
| Database | PostgreSQL 14+ (local and production) |
| Cache/Queue | Redis |
| Hosting | Laravel Forge — native PHP-FPM/Nginx, no containers |

## Feature Coverage

### Phase 1 — Core CRM ✅
- Multi-tenant architecture with `tenant_id` scoping
- Auth (login, lockout, password reset API)
- RBAC with role middleware (Admin, Manager, Rep, Support, Read-only)
- User admin API (admin-only)
- Contacts, Accounts, Leads, Deals, Pipeline Kanban
- Activities & Tasks
- Reporting dashboards
- CSV import/export (API + UI)
- Attachments API
- Audit logging
- API key authentication
- Rate limiting (120 req/min)
- OpenAPI spec at `/api/v1/docs/openapi`

### Phase 2 — Communication & Automation ✅
- Email account connection (Gmail/Outlook stub + sync job)
- Email templates with merge fields (`{{contact.first_name}}`)
- Workflow automation engine (trigger → conditions → actions)
- Automation execution logs
- Outbound webhooks with HMAC signing and retry
- Custom report builder (filter, group, run)

### Phase 3 — Mobile & Integrations ✅
- PWA manifest for mobile browser install
- Delta sync API (`/sync/delta?since=...`) for mobile clients
- SMS/WhatsApp manual logging API
- Advanced sales forecasting by month and rep
- Public API + webhooks ecosystem

### Phase 4 — Scale & Intelligence ✅
- SSO endpoints (Google/Microsoft OAuth flow)
- Lead scoring rules engine with recalculation
- Territory management with user assignment
- Multi-pipeline selector in UI
- Advanced analytics (velocity, revenue, audit trail)

## Local Development Setup

Local development mirrors production: everything runs natively on your machine, the same way
it runs on the server. There is no Docker in this project — install the services directly
(Homebrew or Laravel Herd/Valet on macOS, the distro packages on Linux, XAMPP/native
installers or WSL on Windows).

### Prerequisites

| Tool | Version |
|---|---|
| PHP with `pdo_pgsql` | 8.2+ |
| Composer | 2.x |
| PostgreSQL | 14+ |
| Redis | 6+ |
| Node.js + npm | 20+ |

### 1. Database

Create a database and role that match what you will put in `.env`:

```sql
CREATE ROLE crm WITH LOGIN PASSWORD 'crm';
CREATE DATABASE crm OWNER crm;
```

> **Port: 5432 vs 5433.** A stock local PostgreSQL install listens on **5432**, and locally
> that is fine because nothing else competes for it. **Production uses 5433**, because the
> shared VPS moved its PostgreSQL instance off the default port. The committed
> `backend/.env.example` carries the production value `DB_PORT=5433`, so if your local
> PostgreSQL is on the default port, change `DB_PORT` to `5432` in your own `.env`. Getting
> these two mixed up is the most likely cause of a connection-refused error on either side.

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Then edit `backend/.env` for local use — `.env.example` ships with production defaults:

```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
DB_PORT=5432          # or 5433 if that is how your local PostgreSQL is configured
DB_DATABASE=crm
DB_USERNAME=crm
DB_PASSWORD=crm
```

Run the migrations and seed the demo data:

```bash
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Laravel Herd or Valet works equally well instead of `artisan serve`; point it at
`backend/public` and use the hostname it assigns.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**.

`VITE_API_URL` in `frontend/.env` controls where API calls go. Leaving it empty is the
recommended default: Vite's dev proxy forwards `/api` to `http://127.0.0.1:8000` (configured
in `vite.config.ts`), which avoids CORS entirely. Set it to `http://localhost:8000` only if
you want to bypass the proxy and hit the backend directly.

### Demo credentials

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Password1 | Admin |
| rep@demo.com | Password1 | Sales Rep |

### Production

The Vite dev server is a local-only tool. In production the frontend is built to a static
`dist/` folder and served by Nginx. Deployment is documented separately in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Key API Routes

```
POST   /api/v1/auth/login
POST   /api/v1/auth/forgot-password
GET    /api/v1/docs/openapi

# Core CRM
/api/v1/contacts, accounts, leads, deals, tasks, activities

# Phase 2
/api/v1/automation-rules, webhooks, email/templates, custom-reports

# Phase 3
/api/v1/forecast, sync/delta, sms-logs

# Phase 4
/api/v1/territories, lead-score-rules, analytics/overview

# Admin
/api/v1/users, api-keys  (admin role required)
```

## Documentation

- `CRM_System_PRD.md` — Product requirements
- `CRM_SRS.md` — Software requirements (FR-xxx IDs)
- `CRM_TRD.md` — Technical architecture
- `docs/DEPLOYMENT.md` — Production deployment on Laravel Forge
- `docs/openapi.yaml` — API specification
