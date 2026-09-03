# CRM System

Multi-tenant Customer Relationship Management platform — all four phases implemented.

## Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 12, Sanctum, Queue jobs |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS (PWA-ready) |
| Database | SQLite (dev) / PostgreSQL (production) |
| Cache/Queue | Redis |

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

## Quick Start

```bash
# Backend
cd backend
composer install
php artisan migrate:fresh --seed
php artisan serve --host=127.0.0.1 --port=8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

| Email | Password | Role |
|---|---|---|
| admin@demo.com | Password1 | Admin |
| rep@demo.com | Password1 | Sales Rep |

## Docker

```bash
docker compose up -d postgres redis
# Configure backend/.env for PostgreSQL, then migrate
```

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
- `docs/openapi.yaml` — API specification
