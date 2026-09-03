# Addendum v1.1 — New Entities & Requirements
## CRM Field Operations, Contract/Service Layer, and ERP Leave/Expense Additions

**Document Version:** 1.1
**Status:** Draft
**Extends:** CRM_System_PRD.md, CRM_SRS.md, CRM_TRD.md, CRM_ERP_Platform_PRD.md
**Last Updated:** August 30, 2026

---

## 1. New Entities — Schema Definitions (extends TRD §5)

### 1.1 Territory / Area (CRM — Field Operations, Street-Level)

```sql
areas (
  id, tenant_id, name,                -- e.g., "Miembeni Street", "Sinza A", "Mikocheni"
  level ENUM('region','district','ward','street'),
  parent_area_id NULLABLE,            -- hierarchy: Region → District → Ward → Street
  is_custom BOOLEAN DEFAULT false,    -- true if added ad-hoc by a rep in the field vs. seeded
  created_by NULLABLE,                -- user who added it, if custom
  created_at, updated_at
)
```

**Hierarchy:** `Region → District → Ward → Street`. Seed data ships at **Ward level** (Sinza A, Sinza B, Sinza C, Mikocheni, Kinondoni, Ubungo, Kariakoo, Magomeni, Tandale, Msasani, Mwenge, etc., under "Dar es Salaam" region), since a complete street-level dataset for the city doesn't exist as clean reference data.

**Flexible/ad-hoc street creation:** Streets are added incrementally by the field team, not pre-seeded:
- When adding or editing a Contact, the "Street" field is a searchable dropdown scoped to the contact's Ward — if the street isn't listed, the rep can type it and create it inline (`is_custom = true`, `parent_area_id` = the selected Ward).
- New custom streets become immediately available to the rest of the team for that Ward (shared per-tenant, not per-rep), so the list organically grows more complete over time without requiring an Admin data-load step.
- Admins can review/merge duplicate or misspelled custom entries (e.g., "Miembeni St" vs. "Miembeni Street") via a housekeeping screen — prevents fragmentation of KPI rollups.
- `contacts.area_id` (FK, nullable) references a **Street**-level area (or a Ward, if street-level detail isn't available for that contact).

**KPI rollups** aggregate correctly at any level via `parent_area_id` traversal — e.g., "visits this month" can be sliced by Street, rolled up to Ward, or rolled up to the whole Region, without separate tables per level.

### 1.2 Field Visit (specialization of existing Activity table)

```sql
-- Reuses activities table (type = 'field_visit'), with additive columns:
activities (
  ..., -- existing columns
  area_id NULLABLE,                -- which area the visit occurred in
  visit_outcome NULLABLE            -- e.g., "Met contact", "Not available", "Follow-up needed"
)
```
- No new table required — `field_visit` becomes a new `type` enum value on the existing Activity model, scoped to an `area_id`.
- KPI queries (visits per area per rep per period) run as filtered/grouped aggregates on `activities`.

### 1.3 Contact Status History (CRM — Funnel Tracking)

```sql
contacts (
  ..., -- existing columns
  status ENUM('inquiry','potential','lead','customer') DEFAULT 'inquiry'
)

contact_status_history (
  id, tenant_id, contact_id,
  from_status, to_status,
  notes,                            -- free-text note captured at each transition
  changed_by, changed_at
)
```
- Mirrors the existing `deal_stage_history` pattern.
- Status transitions are logged automatically whenever `contacts.status` changes, with a required note field enforced at the application layer.

### 1.4 Service Catalog (CRM/Finance — Subscribable Software Services)

```sql
services (
  id, tenant_id, name, description,
  price, currency,
  billing_cycle ENUM('one_time','monthly','quarterly','annual'),
  is_active,
  created_at, updated_at
)
```
- Distinct from the physical `products` table in Inventory (services aren't stocked).
- Referenced by Contracts (below).

### 1.5 Contract / Subscription (CRM ↔ Finance)

```sql
contracts (
  id, tenant_id,
  customer_party_id,                -- FK to unified party
  service_id,                       -- FK to services
  amount_paid, currency,
  start_date, end_date,             -- software validity period
  status ENUM('active','expired','cancelled','pending_renewal'),
  contract_file_url NULLABLE,       -- signed contract/PO document
  created_by, created_at, updated_at
)
```
- `end_date` drives an automated scheduled job that flags contracts as `expired` and can trigger renewal-reminder tasks/notifications ahead of expiry (e.g., 14/7/1 days before).
- Linked to Finance: `amount_paid` reconciles against an Invoice/Payment record; contract creation can auto-generate an Invoice via the existing cross-module automation pattern.

### 1.6 SMS Notification Rule (Automation — no new table, new automation config)

- Uses the existing `automation_rules` table (TRD §5.1):
  - **Trigger:** `contract.created` or `payment.confirmed`
  - **Action:** `send_sms` via the existing `MessagingProvider` interface (TRD §9), using a templated congratulations message with merge fields (`{{contact.first_name}}`, `{{service.name}}`)

### 1.7 Public Holiday Calendar (HR)

```sql
public_holidays (
  id, tenant_id NULLABLE,   -- NULL = platform-wide default calendar, tenant_id = tenant override
  name,                      -- e.g., "Nane Nane", "Union Day"
  date,
  region,                    -- e.g., "Tanzania"
  is_recurring_annually
)
```
- Seed data: Tanzania public holiday calendar as platform default; tenants can add company-specific holidays.
- Leave-day calculators exclude weekends + entries in this table when computing leave balance deductions.

### 1.8 Leave Request (HR — extends existing HR module scope)

```sql
leave_types (id, tenant_id, name, default_days_per_year, is_paid)

leave_requests (
  id, tenant_id, employee_party_id,
  leave_type_id, start_date, end_date, days_requested,
  reason,
  status ENUM('pending','approved','rejected','cancelled'),
  approved_by NULLABLE, approved_at NULLABLE,
  created_at, updated_at
)

leave_balances (
  id, tenant_id, employee_party_id, leave_type_id,
  year, allocated_days, used_days, remaining_days
)
```
- Approval workflow: request → routed to designated approver (line manager or "high management" role) → approved/rejected, mirroring the existing Purchase Order approval pattern already scoped for Inventory.
- `days_requested` calculated excluding weekends and `public_holidays` entries.

### 1.9 Expense Claims (Finance)

```sql
expense_categories (id, tenant_id, name)  -- e.g., Office Supplies, Utilities, Transport, Rent

expenses (
  id, tenant_id,
  submitted_by, expense_category_id,
  amount, currency, expensed_at,
  description, receipt_url NULLABLE,
  status ENUM('pending','approved','rejected','reimbursed'),
  approved_by NULLABLE, approved_at NULLABLE,
  ledger_entry_id NULLABLE,   -- link to posted GL entry once approved
  created_at, updated_at
)
```
- On approval, posts a balanced debit/credit entry to the Finance ledger (existing double-entry engine from TRD §5.1/§6).

### 1.10 Employee Performance Snapshot (HR — lightweight v1)

```sql
performance_snapshots (
  id, tenant_id, employee_party_id,
  period_start, period_end,
  metrics JSONB,   -- e.g., {"visits_logged": 42, "leads_created": 15, "leave_days_taken": 2}
  generated_at
)
```
- v1 scope: an auto-generated, read-only rollup pulling from `activities` (visits, leads), `leave_requests`, and `expenses` — no formal review-cycle workflow yet (deferred, per earlier discussion, until scope is confirmed).

---

## 2. New Functional Requirements (extends SRS §3)

| ID | Requirement | Priority |
|---|---|---|
| FR-AREA-01 | The System shall allow Admins to define and seed a hierarchy of Areas (Region → District → Ward → Street), with Dar es Salaam wards pre-seeded by default. | M |
| FR-AREA-02 | The System shall allow a Contact to be assigned to an Area, preferably at Street level. | M |
| FR-AREA-03 | The System shall allow logging of a Field Visit activity type, capturing area, visited contact, outcome, and timestamp. | M |
| FR-AREA-04 | The System shall provide a report of visits per Area per Rep for any selected date range, aggregatable at Street, Ward, or Region level. | M |
| FR-AREA-05 | The System shall allow a user to create a new Street-level Area inline while assigning a Contact's location, scoped under the selected Ward. | M |
| FR-AREA-06 | The System shall make a newly created custom Street immediately available for selection by all users in that tenant. | M |
| FR-AREA-07 | The System shall restrict merging or renaming duplicate/misspelled custom Street entries to users holding the Sales Manager role, without breaking historical KPI data linked to them. | S |
| FR-CON-11 | The System shall track a Contact's funnel status (Inquiry, Potential, Lead, Customer). | M |
| FR-CON-12 | The System shall require a note when a Contact's status is changed, and shall log the transition with timestamp and user. | M |
| FR-LEAD-08 | The System shall provide a report showing Leads created per Rep per Day for a selected date range. | M |
| FR-SVC-01 | The System shall allow Admins to define subscribable Services with price and billing cycle. | M |
| FR-CTR-01 | The System shall allow creation of a Contract linking a Customer, a Service, amount paid, and a validity period (start/end date). | M |
| FR-CTR-02 | The System shall automatically flag a Contract as Expired when its end date passes. | M |
| FR-CTR-03 | The System shall send renewal-reminder notifications ahead of Contract expiry (configurable interval, default 14/7/1 days). | S |
| FR-SMS-01 | The System shall automatically send an SMS to the Customer upon Contract/payment confirmation, using a configurable template. | M |
| FR-HOL-01 | The System shall maintain a Public Holiday calendar (default: Tanzania), with tenant-level customization. | M |
| FR-LV-01 | The System shall allow Employees to submit Leave Requests specifying type, date range, and reason. | M |
| FR-LV-02 | The System shall route Leave Requests to a designated approver and support Approve/Reject actions. | M |
| FR-LV-03 | The System shall calculate leave days requested excluding weekends and Public Holidays. | M |
| FR-LV-04 | The System shall track Leave Balances per Employee per Leave Type per year. | M |
| FR-EXP-01 | The System shall allow Employees to submit Expense Claims with category, amount, and receipt attachment. | M |
| FR-EXP-02 | The System shall route Expense Claims for approval and post an approved claim to the Finance ledger. | M |
| FR-PERF-01 | The System shall generate a per-Employee performance snapshot for a selected period, aggregating visits, leads, leave, and expense data. | S |

---

## 3. Cross-Module Automation Additions (extends PRD §6.6)

| Trigger | Action |
|---|---|
| Contact status changed to "Customer" | Prompt/require Contract creation |
| Contract created / payment confirmed | Send congratulations SMS to customer |
| Contract `end_date` approaching (14/7/1 days) | Notify assigned Sales Rep and customer (renewal reminder) |
| Contract `end_date` passed | Auto-set status to `expired`; notify account owner |
| Leave Request approved | Deduct from `leave_balances`; sync to Attendance calendar |
| Expense Claim approved | Post ledger entry (Finance); notify submitter |

---

## 4. Non-Functional Notes

- **Area seed data** should be maintained as a reference dataset (versioned) so new Dar es Salaam wards can be added without a schema migration — treat as data, not code.
- **Contact status history** and **leave/expense approvals** follow the same audit-logging requirement as existing NFR-COMP-02 (auditable trail sufficient for review).
- **SMS delivery** depends on the regional `MessagingProvider` integration already scoped in TRD §9 — no new infrastructure pattern, just a new provider credential per tenant/region.

---

## 5. Open Questions

- ~~Should Area hierarchy go deeper than Ward level?~~ **Resolved:** street-level, seeded at Ward and grown organically via inline creation by field reps (see §1.1).
- ~~Who should hold the "merge/rename duplicate street" housekeeping permission?~~ **Resolved:** Sales Manager role only (not Platform Admin, not individual Reps).
- Who counts as "high management" for leave approval — a fixed role, or configurable per department/tenant?
- Should Performance Snapshots (§1.10) remain a simple read-only rollup, or evolve into a formal review-cycle module with ratings/goals — worth a separate scoping discussion when you're ready.
