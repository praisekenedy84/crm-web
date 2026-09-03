# Technical Requirements Document (TRD)
## Standard CRM System

**Document Version:** 1.0
**Status:** Draft
**Prepared for:** Engineering & DevOps Teams
**Reference:** Companion document to *CRM_System_PRD.md* and *CRM_SRS.md*
**Last Updated:** August 30, 2026

---

## 1. Purpose

This TRD translates the functional/non-functional requirements in the SRS into a concrete technical architecture, technology stack, data model, API design, security implementation, and deployment plan. It is intended to guide engineering implementation decisions and provide a shared technical reference across backend, frontend, and DevOps teams.

---

## 2. System Architecture

### 2.1 Architecture Style
Multi-tenant SaaS web application, following a **modular monolith** approach for v1 (simplifying deployment and transaction integrity), structured so that modules (Contacts, Leads, Deals, Reporting, Automation) can be extracted into separate services later if scale requires it.

### 2.2 High-Level Component Diagram

```
                        ┌─────────────────────┐
                        │   Web Client (SPA)   │
                        │  React / Vue         │
                        └──────────┬───────────┘
                                   │ HTTPS/JSON
                        ┌──────────▼───────────┐
                        │   API Gateway /       │
                        │   Load Balancer       │
                        └──────────┬───────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
   ┌─────────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
   │  App Server(s)    │  │  Queue Worker(s)  │  │  Scheduler/Cron  │
   │  (Laravel/Node)   │  │  (Redis-backed)   │  │  (recurring jobs)│
   └─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
             │                     │                     │
   ┌─────────▼─────────────────────▼─────────────────────▼────────┐
   │                     PostgreSQL (Primary DB)                   │
   │              schema-per-tenant OR shared-schema+tenant_id      │
   └─────────────────────────────────────────────────────────────┘
             │
   ┌─────────▼────────┐   ┌───────────────────┐   ┌──────────────────┐
   │ Redis (cache/queue)│  │ S3-compatible      │   │ External APIs:   │
   │                    │  │ Object Storage     │   │ Gmail, Outlook,  │
   │                    │  │ (attachments)      │   │ SMS, Webhooks    │
   └────────────────────┘  └───────────────────┘   └──────────────────┘
```

### 2.3 Component Responsibilities

| Component | Responsibility |
|---|---|
| Web Client (SPA) | Renders UI, handles client-side state, calls REST API |
| API Gateway / LB | TLS termination, rate limiting, routing, request logging |
| App Server | Core business logic, REST API, authentication, RBAC enforcement |
| Queue Workers | Async jobs: email sync, notifications, automation execution, report generation |
| Scheduler | Recurring jobs: reminder notifications, scheduled reports, data cleanup |
| PostgreSQL | Primary relational data store |
| Redis | Caching, session store, queue backend |
| Object Storage | File/document attachments |
| External APIs | Email, SMS, SSO, webhook delivery |

---

## 3. Technology Stack

| Layer | Recommended Technology | Notes |
|---|---|---|
| Frontend | React (or Vue) SPA, TypeScript | Component-based, testable UI |
| Backend Framework | Laravel (PHP 8.2+) or Node.js/Express (TypeScript) | Team-dependent; Laravel recommended given existing infra familiarity |
| Database | PostgreSQL 14+ | Strong relational integrity, JSONB support for custom fields |
| Cache/Queue | Redis 6+ | Session cache, job queue backend |
| Search (optional, Phase 2+) | PostgreSQL full-text search initially; Elasticsearch/OpenSearch if scale requires | Avoid premature complexity |
| Object Storage | S3-compatible (AWS S3, DigitalOcean Spaces, MinIO) | Attachments, exports |
| Background Jobs | Laravel Queues / BullMQ (Node) | Email sync, automation, notifications |
| Deployment | Laravel Forge — native PHP-FPM/Nginx on a shared VPS, no containers | See `docs/DEPLOYMENT.md` |
| CI/CD | GitHub Actions | Automated test, build, deploy pipeline |
| Monitoring | Sentry (errors), Prometheus/Grafana or hosted APM (logs/metrics) | |
| Email Integration | Gmail API, Microsoft Graph API | OAuth2 |
| SSO | Google OAuth2, Microsoft Entra ID | OpenID Connect |

---

## 4. Multi-Tenancy Design

### 4.1 Approach
**Recommended: Shared database, shared schema, with `tenant_id` scoping** for v1 — simpler operationally at moderate scale, with a clear upgrade path to schema-per-tenant for large enterprise customers requiring stronger isolation.

| Approach | Pros | Cons |
|---|---|---|
| Shared schema + tenant_id | Simple migrations, easy cross-tenant admin tooling, lower infra cost | Requires strict query scoping discipline; risk of data leakage bugs if not enforced at ORM layer |
| Schema-per-tenant | Strong isolation, easier per-tenant backup/restore | Migration complexity multiplies with tenant count; higher operational overhead |

### 4.2 Enforcement
- All queries must be automatically scoped by `tenant_id` at the ORM/query-builder level (e.g., global scope in Laravel Eloquent, middleware-injected tenant context).
- Every core table includes a `tenant_id` column, indexed, with a foreign key constraint.
- API authentication resolves tenant context from the authenticated user/API key before any query executes.
- Automated tests must include cross-tenant isolation tests (Tenant A cannot read/write Tenant B's data).

---

## 5. Data Model (Core Schema)

### 5.1 Key Tables (Simplified)

```sql
tenants (id, name, plan, created_at, ...)

users (id, tenant_id, name, email, password_hash, role, status,
       last_login_at, created_at, updated_at)

accounts (id, tenant_id, name, industry, website, owner_id,
          custom_fields JSONB, created_at, updated_at, deleted_at)

contacts (id, tenant_id, account_id NULLABLE, first_name, last_name,
          email, phone, owner_id, custom_fields JSONB,
          created_at, updated_at, deleted_at)

leads (id, tenant_id, first_name, last_name, email, phone, company,
       source, campaign, status, owner_id, converted_at,
       converted_contact_id NULLABLE, converted_account_id NULLABLE,
       converted_deal_id NULLABLE, created_at, updated_at)

pipelines (id, tenant_id, name, is_default)

pipeline_stages (id, pipeline_id, name, sort_order, probability, is_closed, is_won)

deals (id, tenant_id, pipeline_id, stage_id, name, account_id, contact_id,
       value, currency, owner_id, expected_close_date, probability,
       status, win_loss_reason, created_at, updated_at, closed_at)

deal_stage_history (id, deal_id, from_stage_id, to_stage_id, changed_by, changed_at)

activities (id, tenant_id, type ENUM[call,email,meeting,note], subject, body,
            related_type, related_id, owner_id, occurred_at, created_at)

tasks (id, tenant_id, title, description, due_date, priority, status,
       assignee_id, related_type, related_id, created_at, updated_at, completed_at)

attachments (id, tenant_id, related_type, related_id, file_url, file_name,
             file_size, uploaded_by, created_at)

audit_logs (id, tenant_id, user_id, action, object_type, object_id,
            changes JSONB, created_at)

automation_rules (id, tenant_id, name, trigger_event, conditions JSONB,
                   actions JSONB, is_active, created_at)

webhooks (id, tenant_id, url, events JSONB, secret, is_active)
```

### 5.2 Custom Fields Strategy
Custom fields stored in a `custom_fields JSONB` column per object, with a separate `custom_field_definitions` table per tenant defining field name, type, and validation rules. This avoids costly schema migrations per tenant while retaining queryability via PostgreSQL's JSONB indexing (GIN indexes).

```sql
custom_field_definitions (id, tenant_id, object_type, field_key, label,
                           field_type, options JSONB, is_required, sort_order)
```

### 5.3 Indexing Strategy
- Index `tenant_id` on every core table (composite index with primary lookup columns, e.g., `(tenant_id, email)` on contacts).
- GIN index on `custom_fields` JSONB columns for filterable custom-field queries.
- Index `owner_id`, `stage_id`, `status` columns used heavily in list/filter views.
- Composite index on `deal_stage_history (deal_id, changed_at)` for pipeline analytics.

---

## 6. API Design

### 6.1 API Style
RESTful JSON API, versioned via URL path (`/api/v1/...`). OpenAPI 3.0 specification maintained and published for integrators.

### 6.2 Authentication
- **Web app:** Session-based auth (HTTP-only secure cookies) or JWT bearer tokens.
- **API integrations:** API key (scoped per tenant) or OAuth2 client-credentials flow.
- All endpoints require tenant context resolution before processing.

### 6.3 Example Endpoints

```
GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/{id}
PATCH  /api/v1/contacts/{id}
DELETE /api/v1/contacts/{id}

GET    /api/v1/leads
POST   /api/v1/leads
POST   /api/v1/leads/{id}/convert

GET    /api/v1/deals
POST   /api/v1/deals
PATCH  /api/v1/deals/{id}/stage

GET    /api/v1/reports/pipeline-summary
GET    /api/v1/reports/conversion-rate

POST   /api/v1/webhooks
GET    /api/v1/webhooks
```

### 6.4 Rate Limiting
- Default: 120 requests/minute per API key (configurable per plan tier).
- Rate-limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 6.5 Error Handling
Standardized error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The email field is required.",
    "details": [{"field": "email", "issue": "required"}]
  }
}
```

### 6.6 Webhooks
- Outbound webhook payloads signed with an HMAC-SHA256 signature (tenant-specific secret) in the `X-Webhook-Signature` header.
- Retry policy: exponential backoff, up to 5 attempts over 24 hours, then mark as failed and surface in Admin UI.

---

## 7. Security Implementation

| Area | Implementation Detail |
|---|---|
| Transport Security | TLS 1.2+ enforced at load balancer; HSTS enabled |
| Password Storage | bcrypt (cost factor ≥ 12) or Argon2id |
| Session Management | HTTP-only, Secure, SameSite=Lax cookies; 30-min idle timeout |
| API Auth | OAuth2 / API keys hashed at rest, never logged in plaintext |
| RBAC Enforcement | Middleware-level policy checks on every controller action, not just UI hiding |
| Input Validation | Server-side validation on all inputs; parameterized queries (ORM) to prevent SQL injection |
| File Uploads | Type/size validation; virus scanning (e.g., ClamAV) on upload for Phase 2+; stored outside web root, served via signed URLs |
| Secrets Management | Environment variables / secrets manager (never committed to source control) |
| Audit Logging | All mutating operations logged with user, timestamp, before/after diff |
| Vulnerability Testing | OWASP Top 10 checklist review + automated dependency scanning (e.g., Dependabot) before each release |
| Data Encryption at Rest | Full-disk encryption on DB volumes; sensitive fields (e.g., OAuth tokens) additionally encrypted at column level |

---

## 8. Infrastructure & Deployment

### 8.1 Environments
- **Local** — Natively installed PHP, PostgreSQL, Redis and Node, mirroring production (see `README.md`)
- **Staging** — Mirrors production, used for QA/UAT
- **Production** — Multi-AZ if using cloud provider; horizontally scaled app tier

### 8.2 Deployment Pipeline (CI/CD)
1. Developer pushes to feature branch → PR opened
2. CI runs: lint, unit tests, integration tests, security scan
3. On merge to `main`: Forge pulls the commit and runs `deploy.sh` (Composer install, migrations, config/route/view cache, frontend build)
4. Auto-deploy to staging → run smoke tests
5. Manual promotion (or scheduled) to production via blue-green or rolling deployment
6. Post-deploy health checks; automatic rollback on failure threshold

### 8.3 Scaling Strategy
- Stateless app servers behind a load balancer → scale horizontally
- Database: vertical scaling initially; read replicas for reporting queries as load grows
- Queue workers scaled independently based on job backlog depth
- Redis used for both cache and session store to keep app servers stateless

### 8.4 Backup & Disaster Recovery
- Automated nightly full DB backups + continuous WAL archiving for point-in-time recovery (target RPO ≤ 15 min, RTO ≤ 4 hours)
- Backups encrypted and stored in a separate region/provider from primary DB
- Quarterly restore drills to validate backup integrity

### 8.5 Monitoring & Observability
- Application error tracking (e.g., Sentry)
- Infrastructure metrics (CPU, memory, DB connections, queue depth) via Prometheus/Grafana or hosted APM
- Uptime monitoring with alerting (e.g., on-call paging for downtime > 2 min)
- Centralized structured logging (JSON logs) with correlation IDs per request

---

## 9. Third-Party Integrations — Technical Notes

| Integration | Protocol | Notes |
|---|---|---|
| Gmail | Gmail API + OAuth2 | Watch/push notifications via Pub/Sub for near-real-time sync; fallback polling every 5 min |
| Outlook | Microsoft Graph API + OAuth2 | Subscription-based webhooks with renewal handling (subscriptions expire) |
| SSO | OpenID Connect (Google, Microsoft Entra ID) | Standard authorization code flow |
| SMS/WhatsApp | Provider-specific REST API (region-dependent) | Abstract behind an internal `MessagingProvider` interface to swap providers per region |
| Payment/Mobile Money | Provider-specific REST API | Abstracted behind internal `PaymentProvider` interface; webhook listener for async payment confirmation |

---

## 10. Testing Strategy (Technical)

| Test Type | Tooling (illustrative) | Coverage Target |
|---|---|---|
| Unit tests | PHPUnit / Jest | ≥ 70% backend business logic |
| Integration tests | PHPUnit + test DB / Supertest | All API endpoints, happy + error paths |
| E2E tests | Playwright / Cypress | Core user flows: lead→convert→deal→won |
| Load testing | k6 / Locust | Validate NFR-PERF targets before major releases |
| Security testing | OWASP ZAP, dependency scanning | Pre-release checklist |
| Multi-tenancy isolation tests | Custom test suite | Verify no cross-tenant data leakage |

---

## 11. Migration & Rollout Plan (Technical)

1. **Phase 1 (MVP):** Core schema (tenants, users, contacts, accounts, leads, deals, activities, tasks), REST API v1, basic RBAC, CSV import/export.
2. **Phase 2:** Email sync workers, automation engine, custom report builder, webhook delivery system.
3. **Phase 3:** Mobile API optimizations (pagination, delta sync), SMS/telephony provider integrations, offline-sync support.
4. **Phase 4:** Read replicas for reporting, optional schema-per-tenant migration path for enterprise tenants, SSO hardening, advanced analytics pipeline (possible move to a dedicated OLAP store, e.g., ClickHouse, if reporting load grows significantly).

---

## 12. Open Technical Decisions

| Decision | Options | Recommendation |
|---|---|---|
| Backend framework | Laravel vs Node/Express | Laravel, if team has existing Forge/Laravel operational expertise; otherwise Node for a unified JS stack with React frontend |
| Multi-tenancy model | Shared-schema vs schema-per-tenant | Start shared-schema; document a migration path for large enterprise tenants |
| Real-time updates | Polling vs WebSockets | Defer WebSockets to Phase 2+ unless real-time collaboration is a launch requirement |
| Search | PostgreSQL FTS vs Elasticsearch | Start with PostgreSQL FTS; revisit at scale |
| Mobile app | Native (Swift/Kotlin) vs cross-platform (React Native/Flutter) | React Native recommended for code reuse with web team's React skillset |
