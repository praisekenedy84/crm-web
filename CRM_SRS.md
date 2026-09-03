# Software Requirements Specification (SRS)
## Standard CRM System

**Document Version:** 1.0
**Status:** Draft
**Prepared for:** Engineering, QA, and Product Teams
**Reference:** Companion document to *CRM_System_PRD.md*
**Last Updated:** August 30, 2026
**Conforms to:** IEEE 830-1998 structure (adapted)

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the functional and non-functional requirements for the Standard CRM System at a level of detail sufficient for design, development, and QA test-case derivation. It translates the business goals in the PRD into verifiable software requirements.

### 1.2 Scope
The system is a multi-tenant, web-based Customer Relationship Management application covering lead management, contact/account management, sales pipeline (deals), activity/task tracking, reporting, user administration, and third-party integrations (email, webhooks, API).

The product will be referred to as **"the System"** or **"the CRM"** throughout this document.

### 1.3 Intended Audience
- Software engineers (backend, frontend, mobile)
- QA/Test engineers
- DevOps/Infrastructure engineers
- Product managers and technical project managers
- UI/UX designers

### 1.4 Definitions, Acronyms, Abbreviations

| Term | Definition |
|---|---|
| CRM | Customer Relationship Management |
| SRS | Software Requirements Specification |
| TRD | Technical Requirements Document |
| RBAC | Role-Based Access Control |
| API | Application Programming Interface |
| SLA | Service Level Agreement |
| Tenant | An isolated customer organization instance within the multi-tenant system |
| Deal/Opportunity | A tracked potential sale progressing through pipeline stages |
| PII | Personally Identifiable Information |

### 1.5 References
- CRM_System_PRD.md (Product Requirements Document, v1.0)

### 1.6 Overview
Section 2 gives an overall product description. Section 3 specifies detailed functional requirements by module, written as testable "shall" statements with unique IDs. Section 4 covers external interface requirements. Section 5 covers non-functional requirements. Section 6 covers data requirements. Section 7 lists constraints and assumptions.

---

## 2. Overall Description

### 2.1 Product Perspective
The CRM is a standalone, cloud-hosted, multi-tenant SaaS product. It exposes a web application (primary interface), a REST API (for integrations and future mobile clients), and outbound webhooks. It integrates with external email providers (Gmail, Outlook) and optionally with telephony/SMS gateways and payment/accounting systems.

### 2.2 Product Functions (Summary)
1. Lead capture, qualification, and conversion
2. Contact and account management
3. Sales pipeline / deal tracking (kanban + list views)
4. Activity logging and task management
5. Email synchronization and templated communication
6. Reporting and dashboards
7. User, role, and permission administration
8. Workflow automation (trigger-based)
9. Data import/export
10. API and webhook integration layer

### 2.3 User Classes and Characteristics

| User Class | Technical Proficiency | Frequency of Use |
|---|---|---|
| Sales Rep | Low–Medium | Daily, high volume |
| Sales Manager | Medium | Daily |
| Marketing User | Medium | Weekly–Daily |
| Support Agent | Low–Medium | Daily |
| Admin | Medium–High | Weekly (configuration) |
| Executive | Low | Weekly (dashboard viewing) |
| External Integration/API Consumer | High (developer) | Continuous/automated |

### 2.4 Operating Environment
- **Client:** Modern web browsers (Chrome, Firefox, Safari, Edge — latest 2 versions), responsive down to tablet width; mobile app (Phase 3) for iOS 15+/Android 10+
- **Server:** Linux-based cloud VPS or managed PaaS; containerized deployment supported
- **Database:** PostgreSQL 14+
- **Cache/Queue:** Redis 6+

### 2.5 Design and Implementation Constraints
- Must support multi-tenancy with strict data isolation between tenants
- Must expose a versioned REST API (no breaking changes without version bump)
- Must comply with applicable data protection regulations for regions of deployment
- All timestamps stored in UTC; displayed in user's local timezone

### 2.6 Assumptions and Dependencies
- Users have reliable internet access for primary use (offline mode deferred to Phase 3 mobile)
- Email integration depends on availability and quota limits of Gmail/Outlook APIs
- SMS/telephony integrations depend on third-party provider APIs and are region-dependent

---

## 3. Functional Requirements

Each requirement has a unique ID for traceability to design and test cases. Priority: **M**=Must-have (MVP), **S**=Should-have, **C**=Could-have (later phase).

### 3.1 Authentication & User Management

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | The System shall allow users to log in with email and password. | M |
| FR-AUTH-02 | The System shall support optional SSO login via Google/Microsoft OAuth2. | S |
| FR-AUTH-03 | The System shall enforce password complexity rules (min. 8 chars, mixed case, number). | M |
| FR-AUTH-04 | The System shall support password reset via emailed time-limited token. | M |
| FR-AUTH-05 | The System shall lock an account after 5 consecutive failed login attempts for 15 minutes. | M |
| FR-AUTH-06 | The System shall support role-based access control with at least the roles: Admin, Manager, Rep, Support, Read-only. | M |
| FR-AUTH-07 | The System shall allow Admins to create, edit, deactivate, and delete user accounts. | M |
| FR-AUTH-08 | The System shall restrict record visibility based on team/territory rules configurable by Admins. | S |
| FR-AUTH-09 | The System shall maintain a session timeout of 30 minutes of inactivity (configurable). | S |

### 3.2 Contact & Account Management

| ID | Requirement | Priority |
|---|---|---|
| FR-CON-01 | The System shall allow users to create, view, edit, and delete Contact records. | M |
| FR-CON-02 | The System shall allow users to create, view, edit, and delete Account records. | M |
| FR-CON-03 | The System shall allow a Contact to be linked to zero or one Account, and an Account to have many Contacts. | M |
| FR-CON-04 | The System shall support custom fields on Contact and Account objects (text, number, date, dropdown, boolean). | M |
| FR-CON-05 | The System shall detect and warn of potential duplicate Contacts based on matching email or phone number at creation time. | M |
| FR-CON-06 | The System shall provide a manual merge function for duplicate Contact/Account records, preserving all associated activity history. | S |
| FR-CON-07 | The System shall display a chronological activity timeline (calls, emails, meetings, notes, deals) on each Contact/Account detail page. | M |
| FR-CON-08 | The System shall support tagging of Contacts/Accounts with one or more free-text or predefined tags. | S |
| FR-CON-09 | The System shall support bulk import of Contacts/Accounts via CSV with field-mapping UI. | M |
| FR-CON-10 | The System shall support export of filtered Contact/Account lists to CSV. | M |

### 3.3 Lead Management

| ID | Requirement | Priority |
|---|---|---|
| FR-LEAD-01 | The System shall allow creation of Lead records via manual entry, web form submission, CSV import, or API. | M |
| FR-LEAD-02 | The System shall track a Lead's status through a configurable status pipeline (default: New, Contacted, Qualified, Converted, Disqualified). | M |
| FR-LEAD-03 | The System shall capture Lead source and (optionally) campaign identifier at creation. | M |
| FR-LEAD-04 | The System shall support manual assignment of Leads to a specific Sales Rep. | M |
| FR-LEAD-05 | The System shall support rule-based automatic Lead assignment (e.g., round-robin, by territory). | S |
| FR-LEAD-06 | The System shall provide a "Convert Lead" action that creates linked Contact, Account (optional), and Deal (optional) records, preserving Lead history. | M |
| FR-LEAD-07 | The System shall prevent conversion of a Lead that is already marked Converted. | M |

### 3.4 Deal / Pipeline Management

| ID | Requirement | Priority |
|---|---|---|
| FR-DEAL-01 | The System shall allow creation of Deal records with fields: name, value, currency, expected close date, probability %, stage, owner. | M |
| FR-DEAL-02 | The System shall support configurable pipeline stages per pipeline (Admin-defined). | M |
| FR-DEAL-03 | The System shall support multiple named pipelines within a tenant. | S |
| FR-DEAL-04 | The System shall display Deals in a drag-and-drop kanban board grouped by stage. | M |
| FR-DEAL-05 | The System shall display Deals in a sortable/filterable list (table) view. | M |
| FR-DEAL-06 | The System shall record a timestamped stage-change history for each Deal. | M |
| FR-DEAL-07 | The System shall require a win/loss reason when a Deal is moved to a closed (Won/Lost) stage. | S |
| FR-DEAL-08 | The System shall calculate weighted pipeline value (deal value × stage probability) per pipeline/stage. | S |
| FR-DEAL-09 | The System shall allow attachment of documents/files to a Deal record. | M |

### 3.5 Activity & Task Management

| ID | Requirement | Priority |
|---|---|---|
| FR-ACT-01 | The System shall allow logging of Activities (Call, Email, Meeting, Note) against Contact, Account, or Deal records. | M |
| FR-ACT-02 | The System shall allow creation of Tasks with assignee, due date, priority, and status (Open/Completed). | M |
| FR-ACT-03 | The System shall send in-app and email notifications for tasks due within a configurable reminder window (default 24h). | M |
| FR-ACT-04 | The System shall provide a calendar view of scheduled Activities and Tasks per user. | S |
| FR-ACT-05 | The System shall support reusable Activity/Task templates for common workflows. | C |

### 3.6 Communication Integration

| ID | Requirement | Priority |
|---|---|---|
| FR-COMM-01 | The System shall support two-way email synchronization with Gmail and Outlook via OAuth2. | S |
| FR-COMM-02 | The System shall automatically log synced emails to the matching Contact record by email address. | S |
| FR-COMM-03 | The System shall provide email template creation with merge-field support (e.g., {{contact.first_name}}). | S |
| FR-COMM-04 | The System shall allow manual logging of SMS/WhatsApp communications against a Contact record. | C |

### 3.7 Reporting & Analytics

| ID | Requirement | Priority |
|---|---|---|
| FR-REP-01 | The System shall provide a pre-built dashboard showing pipeline value by stage. | M |
| FR-REP-02 | The System shall provide a pre-built dashboard showing lead conversion rate by source. | M |
| FR-REP-03 | The System shall provide a sales rep performance leaderboard (deals won, revenue, activity count). | S |
| FR-REP-04 | The System shall provide a custom report builder allowing users to filter, group, and chart data by any standard or custom field. | S |
| FR-REP-05 | The System shall support scheduled report exports delivered via email in PDF or Excel format. | C |
| FR-REP-06 | The System shall provide weighted sales forecasting based on stage probabilities and expected close dates. | C |

### 3.8 Automation & Configuration

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTO-01 | The System shall allow Admins to define trigger-based workflow rules (event → condition → action). | S |
| FR-AUTO-02 | Supported trigger events shall include: record created, field updated, stage changed. | S |
| FR-AUTO-03 | Supported actions shall include: create task, send email, update field, send webhook. | S |
| FR-AUTO-04 | The System shall log execution history of automation rules for audit/debugging. | S |

### 3.9 API & Integrations

| ID | Requirement | Priority |
|---|---|---|
| FR-API-01 | The System shall expose a versioned REST API covering CRUD operations for all core objects (Contact, Account, Lead, Deal, Activity, Task). | M |
| FR-API-02 | The System shall authenticate API requests via API key or OAuth2 bearer token. | M |
| FR-API-03 | The System shall enforce per-tenant API rate limiting. | M |
| FR-API-04 | The System shall emit outbound webhooks for key events (lead created, deal won, deal lost). | S |
| FR-API-05 | The System shall provide API documentation (OpenAPI/Swagger spec). | M |

### 3.10 Audit & Data Governance

| ID | Requirement | Priority |
|---|---|---|
| FR-AUD-01 | The System shall log create, update, and delete operations on all core records, capturing user, timestamp, and changed fields. | M |
| FR-AUD-02 | The System shall allow Admins to view the audit log filtered by user, object, or date range. | S |
| FR-AUD-03 | The System shall support soft-delete (recoverable trash) for core records for a minimum of 30 days. | S |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Responsive web application (desktop-first, tablet-compatible)
- Kanban board, table/list views, and detail record pages
- Global search bar (searches across Contacts, Accounts, Leads, Deals)
- Dashboard/home screen configurable per role

### 4.2 Hardware Interfaces
- None beyond standard client devices (desktop, laptop, tablet, smartphone) with network connectivity.

### 4.3 Software Interfaces
- **Email providers:** Gmail API, Microsoft Graph API (Outlook)
- **SSO providers:** Google OAuth2, Microsoft Entra ID (Azure AD)
- **Payment/mobile money gateways:** integration via REST API (region-specific, Phase 3+)
- **SMS/WhatsApp gateways:** integration via REST API (region-specific, Phase 3+)
- **Webhook consumers:** any HTTPS endpoint configured by tenant Admin

### 4.4 Communications Interfaces
- All client-server communication over HTTPS (TLS 1.2+)
- REST/JSON for API; WebSocket (optional) for real-time notifications

---

## 5. Non-Functional Requirements

### 5.1 Performance
- NFR-PERF-01: 95th percentile page load time shall be < 2 seconds for record lists up to 50,000 rows (with pagination/server-side filtering).
- NFR-PERF-02: API response time shall be < 500ms for 95th percentile of standard CRUD calls.

### 5.2 Scalability
- NFR-SCALE-01: The System shall support horizontal scaling of application servers.
- NFR-SCALE-02: The System shall support at least 10,000 concurrent tenant users at MVP scale, architected to scale further.

### 5.3 Availability & Reliability
- NFR-AVAIL-01: The System shall target 99.5% monthly uptime.
- NFR-AVAIL-02: The System shall perform automated daily backups with point-in-time recovery capability of at least 7 days.

### 5.4 Security
- NFR-SEC-01: All data in transit shall be encrypted via TLS 1.2 or higher.
- NFR-SEC-02: All sensitive data at rest (passwords, tokens, PII) shall be encrypted.
- NFR-SEC-03: Passwords shall be stored using a strong one-way hash (e.g., bcrypt/argon2).
- NFR-SEC-04: The System shall enforce RBAC at both API and UI layers.
- NFR-SEC-05: The System shall be tested against OWASP Top 10 vulnerabilities prior to release.

### 5.5 Usability
- NFR-USE-01: A new Sales Rep shall be able to create a Lead and log an Activity without training, within 5 minutes of first login (measured via usability testing).
- NFR-USE-02: The System UI shall meet WCAG 2.1 AA accessibility guidelines for core workflows.

### 5.6 Maintainability
- NFR-MAINT-01: The System shall follow a modular architecture separating core CRM modules (Contacts, Deals, Leads, Reporting) to allow independent iteration.
- NFR-MAINT-02: The System shall maintain automated test coverage of at least 70% for backend business logic.

### 5.7 Localization
- NFR-LOC-01: The System shall support multi-currency display and storage.
- NFR-LOC-02: The System shall support multi-timezone display (store UTC, render local).
- NFR-LOC-03: The System UI text shall be externalized to support future translation (i18n-ready).

### 5.8 Compliance
- NFR-COMP-01: The System shall support data export and deletion requests in compliance with applicable data protection regulations.
- NFR-COMP-02: The System shall maintain an audit trail sufficient to demonstrate compliance during an audit.

---

## 6. Data Requirements

### 6.1 Core Entities
See PRD Section 6 (Information Architecture) for the entity-relationship overview: Account → Contact → Lead/Deal → Activity/Task/Document.

### 6.2 Data Retention
- Soft-deleted records retained for 30 days before permanent purge (configurable).
- Audit logs retained for a minimum of 1 year.

### 6.3 Data Migration
- The System shall provide an import wizard supporting CSV mapping for initial data migration from spreadsheets or competitor CRM exports.

---

## 7. Constraints, Assumptions, and Dependencies

- The System shall be built as multi-tenant SaaS; single-tenant on-premise deployment is out of scope for v1.
- Third-party API dependencies (Gmail, Outlook, SMS gateways) are subject to their own rate limits and availability, which may affect FR-COMM requirements.
- Regulatory requirements vary by deployment region and must be validated per market prior to launch in that market.

---

## 8. Requirements Traceability Summary

| Module | Requirement IDs | PRD Section Reference |
|---|---|---|
| Auth & Users | FR-AUTH-01 to FR-AUTH-09 | PRD §4.7 |
| Contacts & Accounts | FR-CON-01 to FR-CON-10 | PRD §4.1 |
| Leads | FR-LEAD-01 to FR-LEAD-07 | PRD §4.2 |
| Deals/Pipeline | FR-DEAL-01 to FR-DEAL-09 | PRD §4.3 |
| Activities/Tasks | FR-ACT-01 to FR-ACT-05 | PRD §4.4 |
| Communication | FR-COMM-01 to FR-COMM-04 | PRD §4.5 |
| Reporting | FR-REP-01 to FR-REP-06 | PRD §4.6 |
| Automation | FR-AUTO-01 to FR-AUTO-04 | PRD §4.8 |
| API/Integrations | FR-API-01 to FR-API-05 | PRD §4.9 |
| Audit | FR-AUD-01 to FR-AUD-03 | PRD §5 (NFR) |

*(Full bidirectional traceability to test cases to be maintained in the QA test management tool.)*
