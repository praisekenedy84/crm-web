# Product Requirements Document (PRD)
## Unified Business Platform: CRM + ERP (Finance, Inventory, HR, Projects)

**Document Version:** 1.0
**Status:** Draft
**Author:** Product/Engineering Team
**Last Updated:** August 30, 2026
**Relationship to prior docs:** Extends *CRM_System_PRD.md*. The CRM becomes one module within this larger platform rather than a standalone product.

---

## 1. Overview

### 1.1 Purpose
This document defines requirements for expanding the Standard CRM into a **unified Business Platform** that combines CRM with core ERP capabilities: Finance & Accounting, Inventory & Procurement, HR & Payroll, and Project/Resource Management — all running on a single shared tenant, authentication, and permission system.

### 1.2 Problem Statement
Businesses running CRM and ERP as separate disconnected systems face:
- Duplicate customer/vendor data entry across sales and finance teams
- No visibility from "deal won" to "invoice paid" to "stock delivered" without manual handoffs
- Fragmented reporting — sales dashboards and financial dashboards live in different tools
- Separate logins, separate permission systems, separate support burdens
- Delayed operational visibility for management (e.g., a won deal doesn't automatically reflect in revenue forecasts, inventory commitments, or resourcing)

### 1.3 Goals
- Provide one platform, one login, one source of truth for customer/vendor master data
- Enable a deal to flow automatically into a sales order, invoice, stock movement, and revenue recognition without re-entry
- Give leadership a single cross-functional view: pipeline, revenue, cash, stock, headcount cost, project delivery
- Preserve the CRM's existing usability for sales teams while adding ERP depth for finance/ops/HR teams
- Support modular adoption — a tenant can enable CRM only, or CRM + selected ERP modules

### 1.4 Non-Goals (v1)
- Manufacturing/production planning (BOM, shop floor scheduling)
- Multi-entity/multi-currency consolidated group accounting (single-entity accounting only in v1)
- Advanced workforce management (shift scheduling, union rules)
- Native e-commerce storefront

---

## 2. Platform Architecture Principles

1. **Single Tenant, Multiple Modules** — one `tenant` record governs CRM + all enabled ERP modules; no separate sign-up/login per module.
2. **Unified Party Model** — CRM Accounts, ERP Customers, Vendors, and Employees are variations of a shared `party` entity, not duplicated records.
3. **Module Toggling** — Admins enable/disable modules per tenant (billing/licensing tier controls this).
4. **Cross-Module Automation** — key business events (e.g., Deal Won) can trigger actions in other modules (e.g., create Sales Order) via an internal event bus, without manual re-entry.
5. **Unified RBAC** — one role/permission engine spans all modules; a role can be scoped to specific modules (e.g., "Finance Manager" has no CRM pipeline visibility by default).
6. **Independent Data Integrity per Domain** — Finance ledger entries remain immutable/double-entry even though they live on the same platform as CRM's more mutable records.

---

## 3. Modules in Scope (v1)

| Module | Core Purpose |
|---|---|
| **CRM** *(existing)* | Leads, Contacts, Accounts, Deals/Pipeline, Activities |
| **Finance & Accounting** | Chart of accounts, ledger, invoicing (AR), bills (AP), tax/VAT, payments, basic financial statements |
| **Inventory & Procurement** | Product/SKU catalog, stock levels, warehouses, purchase orders, supplier management, goods receipt |
| **HR & Payroll** | Employee records, attendance, leave, payroll runs, payslips |
| **Project/Resource Management** | Projects, tasks, budgets, resource/time allocation, project profitability |

---

## 4. Target Users & Personas (New/Extended)

| Persona | Module(s) | Key Needs |
|---|---|---|
| Sales Rep | CRM | (unchanged from CRM PRD) |
| Sales Manager | CRM, Finance (read) | Revenue visibility tied to closed deals |
| **Accountant/Bookkeeper** | Finance | Manage ledger, invoices, bills, reconcile payments, generate statements |
| **Finance Manager** | Finance, Projects | Approve expenses/POs, view P&L, cash flow, budget vs. actual |
| **Warehouse/Procurement Officer** | Inventory | Manage stock levels, create/receive POs, track suppliers |
| **HR Officer** | HR | Manage employee records, attendance, leave requests |
| **Payroll Admin** | HR | Run payroll, generate payslips, manage deductions/statutory contributions |
| **Project Manager** | Projects, CRM (read) | Track project delivery, budget burn, resource allocation, link project to originating deal/client |
| **Executive/Owner** | All (read) | Unified dashboard: pipeline, revenue, cash position, stock value, headcount cost, project margins |
| **Platform Admin** | All | Module enablement, RBAC configuration, cross-module automation rules |

---

## 5. Key Cross-Module User Stories

- As a **Sales Manager**, when I mark a Deal as Won, I want a Sales Order and draft Invoice automatically created in Finance, so my team doesn't re-enter data.
- As an **Accountant**, I want every Invoice linked back to its originating Deal/Account, so I can trace revenue to its source.
- As a **Warehouse Officer**, I want stock to be automatically reserved/deducted when a Sales Order is confirmed, so inventory stays accurate.
- As a **Project Manager**, I want to convert a Won Deal into a Project with a budget derived from the deal value, so delivery work is tracked against what was sold.
- As an **HR Officer**, I want Employee records to be separate from CRM Contacts but share the same underlying party/user infrastructure, so an employee who is also a system user doesn't have duplicate identities.
- As an **Executive**, I want one dashboard showing pipeline value, recognized revenue, outstanding receivables, stock value, and payroll cost for the current month.
- As a **Platform Admin**, I want to enable only CRM + Finance for one client tenant, and CRM + all ERP modules for another, so the platform serves customers at different maturity levels.

---

## 6. Functional Requirements by Module

### 6.1 Shared Platform Layer
- Single sign-on across all modules; one user directory per tenant
- Unified `Party` model: Customer, Vendor, Employee, and CRM Contact/Account are typed views over a shared party record where applicable
- Module enablement toggle per tenant (Admin-controlled, tied to subscription plan)
- Cross-module role assignment (a user can hold a CRM role and a Finance role simultaneously)
- Central notification center aggregating alerts from all modules
- Unified global search across parties, deals, invoices, products, employees, projects

### 6.2 Finance & Accounting Module
- Chart of accounts (configurable, with sensible default template)
- Double-entry general ledger; every transaction posts balanced debit/credit entries
- Accounts Receivable: generate invoices (manually or auto from Won Deals), track payment status, send reminders
- Accounts Payable: record bills from vendors, track due dates, approval workflow before payment
- Payment recording (bank transfer, mobile money, card) and reconciliation
- Tax/VAT handling: configurable tax rates, tax reporting summary (region-aware, e.g., TRA VAT considerations)
- Financial statements: Profit & Loss, Balance Sheet, Cash Flow (basic, single-entity)
- Multi-currency transaction support (single reporting currency in v1)
- Fiscalization/VFD integration hooks for markets requiring it (relevant for East African compliance contexts)

### 6.3 Inventory & Procurement Module
- Product/SKU catalog shared with CRM (so Deals can quote real products)
- Stock level tracking per warehouse/location
- Purchase Order creation, approval workflow, and goods receipt
- Supplier/vendor management (as a `party` type)
- Stock movement audit trail (in, out, transfer, adjustment)
- Low-stock alerts and reorder point configuration
- Link between Sales Order (from Won Deal) and stock reservation/deduction

### 6.4 HR & Payroll Module
- Employee records: personal info, role, department, employment status, documents
- Attendance tracking (manual entry, or integration with biometric systems where available)
- Leave management: request, approval workflow, balance tracking
- Payroll run: gross pay, deductions (tax, statutory contributions), net pay calculation
- Payslip generation (PDF) and distribution
- Employee self-service portal (view payslips, request leave) — Phase 2

### 6.5 Project/Resource Management Module
- Project creation, optionally linked to a Won Deal/Account
- Task breakdown within a project, assignable to employees
- Budget tracking: planned vs. actual cost, linked to Finance ledger for actual spend
- Time tracking / resource allocation per project
- Project profitability report (revenue from linked Deal/Invoices minus tracked costs)

### 6.6 Cross-Module Automation Examples
| Trigger | Action |
|---|---|
| Deal marked "Won" in CRM | Create Sales Order + draft Invoice in Finance; optionally create Project |
| Sales Order confirmed | Reserve/deduct stock in Inventory |
| Invoice marked "Paid" | Post payment entry to ledger; update Deal/Account financial summary |
| Purchase Order approved | Notify vendor; create expected goods-receipt task |
| Payroll run completed | Post payroll expense entries to ledger |
| Project budget threshold reached (e.g., 80%) | Notify Project Manager and Finance Manager |

---

## 7. Non-Functional Requirements (Platform-Level, Additive to CRM PRD)

| Category | Requirement |
|---|---|
| **Data Integrity** | Finance ledger entries must be immutable once posted (corrections via reversal entries, not edits/deletes) |
| **Transactional Consistency** | Cross-module workflows (Deal→Order→Invoice→Stock) must use reliable transaction/event patterns to avoid partial-failure inconsistency |
| **Permission Isolation** | A user without Finance module access must not be able to view financial data via any cross-module report |
| **Auditability** | All financial and payroll transactions require a full, tamper-evident audit trail |
| **Performance** | Cross-module dashboard aggregating CRM+Finance+Inventory+HR data must load in < 3s for a tenant with up to 100,000 combined records |
| **Compliance** | Payroll and tax calculations must be configurable per jurisdiction; system must support regional statutory requirements |
| **Modularity** | Disabling a module for a tenant must not break core CRM or other enabled modules |

---

## 8. Data Model — Cross-Module Relationships (High Level)

```
Party (Customer | Vendor | Employee)
 ├── CRM: Account/Contact view → Leads, Deals, Activities
 ├── Finance: Customer view → Invoices, Payments, AR balance
 ├── Finance: Vendor view → Bills, Payments, AP balance
 └── HR: Employee view → Attendance, Payroll, Leave

Deal (Won)
 └── Sales Order
      ├── Invoice (Finance)
      ├── Stock Reservation/Deduction (Inventory)
      └── Project (optional, Project Management)

Purchase Order (Inventory/Procurement)
 └── Bill (Finance, AP)
 └── Goods Receipt → Stock Update

Project
 ├── Tasks (assigned to Employees)
 ├── Budget (linked to Ledger actuals)
 └── Linked Deal/Account (originating sale)
```

---

## 9. Adoption / Licensing Model Considerations
- Tenants can subscribe to **CRM only**, **CRM + Finance**, or **Full Suite** — module access gated by subscription tier
- Pricing likely scales by: modules enabled + user seats + (for HR) employee count
- Onboarding flow must let a Platform Admin enable additional modules later without data migration (modules read/write to the same underlying party/tenant data from day one, even if hidden/disabled)

---

## 10. Success Metrics (Platform-Level)

| Metric | Target |
|---|---|
| Deals auto-converted to Sales Orders without manual re-entry | ≥ 90% of Won deals |
| Time from Deal Won → Invoice issued | < 1 business day (automated) |
| Cross-module data discrepancies (e.g., stock mismatch vs. ledger) | 0 tolerance; monitored via reconciliation job |
| Tenant adoption of 2+ modules within 6 months of CRM-only signup | ≥ 30% |
| Finance close time (monthly) for tenants using the platform | Reduced vs. baseline (measured post-launch) |

---

## 11. Release Plan / Phasing

**Phase 1 — Foundation**
- Unified Party model refactor (migrate existing CRM Accounts/Contacts to shared party schema)
- Module enablement framework + cross-module RBAC
- Finance module MVP: chart of accounts, ledger, AR invoicing, basic P&L
- Deal → Sales Order → Invoice automation

**Phase 2 — Inventory & Procurement**
- Product catalog shared with CRM
- Stock tracking, Purchase Orders, supplier management
- Stock deduction on Sales Order confirmation

**Phase 3 — HR & Payroll**
- Employee records, attendance, leave
- Payroll run and payslip generation
- Payroll → ledger posting integration

**Phase 4 — Projects & Unified Reporting**
- Project/task/budget management
- Deal → Project conversion
- Cross-module executive dashboard (pipeline + revenue + cash + stock + headcount cost + project margins)

---

## 12. Risks & Open Questions

| Risk/Question | Notes |
|---|---|
| Party model migration | Migrating existing CRM Accounts/Contacts into a shared party schema without breaking existing tenants is a significant technical undertaking — needs a careful migration plan |
| Ledger correctness | Double-entry accounting logic must be rigorously tested; errors here have direct financial/legal consequences |
| Module boundary creep | Risk of cross-module coupling becoming too tight, undermining the "modular, toggleable" goal — needs strict internal API boundaries even within one codebase |
| Regional compliance variance | Tax, payroll statutory rules, and fiscalization requirements vary significantly by country/region and need per-market configuration, not hardcoding |
| Performance at scale | Cross-module dashboards aggregating large datasets may need a dedicated read-optimized reporting store as data grows |
| Permission complexity | Module-scoped RBAC significantly increases the permission matrix; needs careful UX so Admins can configure it without confusion |

---

## 13. Appendix: Glossary (New Terms)

- **Party:** The unified underlying entity representing any person or organization the platform interacts with — can be typed as Customer, Vendor, or Employee (or combinations).
- **Sales Order:** The ERP-side record created when a CRM Deal is won, representing a confirmed sale to be fulfilled and invoiced.
- **Module:** A toggleable functional area of the platform (CRM, Finance, Inventory, HR, Projects) sharing the same tenant/auth foundation.
- **Cross-Module Automation:** Event-driven actions where a change in one module triggers a corresponding action in another (e.g., Deal Won → Invoice created).
