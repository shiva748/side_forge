# Side_forge — Remaining Implementation & Missing Features

This document provides a complete engineering breakdown of what is **already implemented and verified** in the `Side_forge` backend versus what is **missing, reserved for future phases, or requires external provider wiring** before full commercial launch.

---

## 1. Summary of Completed & Verified Core Modules (14 / 14)

All 14 core backend modules are implemented, integrated, and verified by **40 integration tests** (`.\mvnw.cmd test`):

1. **Academic Foundation**: Academic sessions (`PLANNED` / `ACTIVE` / `COMPLETED`), reusable classes, session-scoped sections, subjects, and class-subject mappings.
2. **Student Management**: Student profiles, admission number uniqueness, status lifecycle, guardian profiles, student-guardian relationships, and session-scoped student enrollments with capacity checks.
3. **Staff & Teacher Management**: Staff profiles, employment lifecycle, teacher profiles, class teacher assignments, and subject teacher assignments.
4. **Timetable Management**: Timetable configurations, periods, class timetables, teacher conflict detection, and timetable publishing.
5. **Attendance Management**: Daily and bulk student attendance, staff attendance, attendance correction with audit logs, and monthly/session summaries.
6. **Examination & Results**: Grading scales, examinations, subject schedules, single/bulk mark entry, result calculation, finalization/publishing, report cards, and exam documents.
7. **Fees & Finance**: Class fee structures (draft/publish/revise), student fee demand generation, concessions, waivers, late fee evaluation, manual payment recording with allocation, reversals/refunds, financial profiles, and audit logs.
8. **Dashboard & Reports**: Role-specific dashboards (`SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `ACCOUNTANT`, `STUDENT`, `PARENT`), analytical reports, school notices, and `CSV` / `EXCEL` / `PDF` report exports.
9. **Homework & Assignments**: Homework creation, publishing, attachments, student & parent submissions, teacher evaluation/grading, and submission tracking.
10. **Invitations & Role Management**: Organization onboarding approval provisioning, single-use SHA-256 hashed invitation tokens (`verify` / `accept` / `reject` / `resend` / `revoke`), system & custom organization roles, permission assignment, and membership lifecycle (`ACTIVE` / `SUSPENDED` / `LEFT`).
11. **Centralized File Service**: Tenant-isolated file storage (`FileManagementService` + `LocalFileSystemStorageProvider`), reference tracking (`stored_file_references`), automatic orphan cleanup, and path-traversal protection.
12. **Communication & Notifications**: Targeted school announcements (`ALL_SCHOOL`, `PARENTS`, `STUDENTS`, `TEACHERS`, `STAFF`, `SPECIFIC_CLASSES`, `SPECIFIC_STUDENTS`), announcement attachments, in-app notification inbox, unread counts, and per-category notification preferences.
13. **Parent Portal**: Dedicated multi-child parent portal (`/api/organizations/{organizationId}/parent-portal/**`) covering linked children across one or more schools, child dashboard, attendance, homework view & submission, published exam results & PDF/Excel/CSV report cards, fee ledger & receipt exports, timetable, announcements, and notifications.
14. **SaaS Administration**: Platform subscription plans (`STARTER`, `GROWTH`, `PROFESSIONAL`, `ENTERPRISE` + custom plans), organization subscriptions, 15-day grace period (`PAST_DUE`) and post-grace suspension, manual subscription billing & invoice receipt exports, `@RequireFeature` module entitlements with per-organization overrides, active enrolled student capacity enforcement with temporary overrides, storage usage tracking, platform dashboard, and platform/authorization audit logs.

---

## 2. Reserved / Unimplemented Domain Modules

The following domain areas have feature flags (`PlatformFeature`) or permission codes (`PermissionCode`) reserved in the catalog, but **do not yet have entities, services, or controllers**:

### 2.1. Transport Management (`PlatformFeature.TRANSPORT`)
- **Reserved Permissions**: `PermissionCode.TRANSPORT_VIEW` (`transport.view`), `PermissionCode.TRANSPORT_MANAGE` (`transport.manage`)
- **What's Left to Implement**:
  - Vehicle & fleet registry (bus number, capacity, insurance/fitness expiry, driver/attendant assignment).
  - Transport routes, stops, pickup/drop timings, and route-wise fee slabs.
  - Student & staff transport allocation per academic session and integration with `FeeManagementService` for transport fee demands.

### 2.2. Library Management (`PlatformFeature.LIBRARY`)
- **Reserved Permissions**: `PermissionCode.LIBRARY_VIEW` (`library.view`), `PermissionCode.LIBRARY_MANAGE` (`library.manage`)
- **What's Left to Implement**:
  - Book catalog, ISBN/barcode tracking, categories, and physical copy inventory.
  - Book issue, renewal, reservation, and return circulation workflows for students and staff.
  - Overdue fine calculation and lost/damaged book ledger.

### 2.3. Inventory & Asset Management (`PlatformFeature.INVENTORY`)
- **Reserved Feature Flag**: `PlatformFeature.INVENTORY`
- **What's Left to Implement**:
  - Item categories, consumable vs. fixed asset catalog, and vendor directory.
  - Purchase orders, stock-in / stock-out ledger, department/classroom asset allocation, and low-stock alerts.

### 2.4. HR & Payroll (`PlatformFeature.HR_AND_PAYROLL`)
- **Reserved Feature Flag**: `PlatformFeature.HR_AND_PAYROLL`
- **What's Left to Implement**:
  - Staff leave types, leave balances, leave application, and approval workflow.
  - Salary structure templates (basic, allowances, deductions), monthly payroll run linked to staff attendance/leave, and downloadable PDF salary slips.

### 2.5. Pre-Admission Enquiry & Applicant Pipeline
- **Reserved Permissions**: `PermissionCode.ADMISSION_VIEW` (`admission.view`), `PermissionCode.ADMISSION_MANAGE` (`admission.manage`)
- **What's Left to Implement**:
  - *Note*: Direct student creation (`StudentController`) and enrollment (`StudentEnrollmentController`) are already implemented.
  - Missing: Public/front-desk admission enquiry tracking, prospect application forms, entrance test/interview scheduling, and one-click applicant-to-student conversion.

### 2.6. School Settings & Profile Self-Service Controller
- **Reserved Permissions**: `PermissionCode.SCHOOL_VIEW` (`school.view`), `PermissionCode.SCHOOL_UPDATE` (`school.update`), `PermissionCode.SCHOOL_SETTINGS_MANAGE` (`school.settings.manage`)
- **What's Left to Implement**:
  - An organization-scoped controller (e.g., `/api/organizations/{organizationId}/settings`) allowing a `SCHOOL_ADMIN` to view and update their school's contact details, address, timezone, logo, and academic preferences directly (currently `Organization` records are created via onboarding and managed by Platform Admins).

---

## 3. External Service Integrations (SPI Implementations Needed)

The backend defines clean SPI interfaces for external services and currently uses local/logging implementations for development and integration testing:

### 3.1. Outbound Email & SMS Delivery
- **Current State**:
  - `InvitationNotificationSender` is implemented by `LoggingInvitationNotificationSender`.
  - `NotificationDeliveryGateway` is implemented by `LoggingNotificationDeliveryGateway`.
  - In-app notifications are persisted in MySQL (`in_app_notifications`), while `EMAIL`, `SMS`, and `PUSH` dispatches are logged.
- **What's Left to Implement**:
  - Production `@Component` implementations of `InvitationNotificationSender` and `NotificationDeliveryGateway` using Spring Mail (`JavaMailSender` / AWS SES / SendGrid) for emails and an SMS/WhatsApp gateway (e.g., Twilio / MSG91) activated via `@ConditionalOnProperty`.

### 3.2. Online Payment Gateway & Webhooks (Razorpay / Stripe)
- **Current State**:
  - Both student fee payments (`FeeManagementService`) and SaaS subscription payments (`PlatformSubscriptionService`) support manual/offline-verified payment recording (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`, `CARD`, `ONLINE`) with receipt/invoice generation.
- **What's Left to Implement**:
  - Payment gateway order creation endpoints (for parents paying student fees online in the Parent Portal and School Admins paying SaaS invoices online).
  - Webhook controller with HMAC signature verification, idempotency key tracking, and automatic payment reconciliation.

### 3.3. Cloud Object Storage Provider (S3 / GCS / Azure Blob)
- **Current State**:
  - `FileStorageProvider` SPI is implemented by `LocalFileSystemStorageProvider` (`forge.storage.provider=local`).
- **What's Left to Implement**:
  - An S3-compatible `FileStorageProvider` implementation (`forge.storage.provider=s3`) for multi-instance / containerized production deployments where local disk is ephemeral.

---

## 4. Authentication & Security Enhancements

1. **Self-Service Forgot Password / Password Reset Flow**:
   - Authenticated users can change their password via `POST /api/me/change-password`.
   - Missing: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` using a time-limited, single-use hashed reset token sent via email.
2. **Email & Phone Verification Flows**:
   - `Users` has `emailVerified` and `phoneVerified` columns (automatically set to `true` when accepting an email invitation).
   - Missing: Verification token/OTP generation and confirmation endpoints (`POST /api/auth/verify-email`, `POST /api/auth/verify-phone`) for users who register directly via `POST /api/auth/register`.
3. **Token Revocation / Session Versioning on Password Change**:
   - Currently JWTs are stateless (`HS512`) and valid until expiry or cookie cleared via `/api/auth/logout`.
   - Optional enhancement: Add a `tokenVersion` integer on `Users` (incremented on password change or security reset) and include it in JWT claims so existing tokens on other devices are invalidated immediately when a user changes their password.
4. **Rate Limiting**:
   - Add IP/account rate limiting (e.g., Bucket4j or reverse-proxy rate limiting) on `/api/auth/login`, `/api/auth/register`, `/api/organizations/onboarding`, and `/api/invitations/accept`.

---

## 5. Background Jobs & Production DevOps Readiness

1. **Scheduled Background Tasks (`@Scheduled`)**:
   - While subscription expiry, 15-day grace period (`PAST_DUE`), post-grace suspension (`SUSPENDED`), and invitation expiry are evaluated deterministically in real time on every request, adding `@Scheduled` cron jobs is recommended for:
     - Sending proactive subscription renewal reminder notifications 15, 7, and 1 day(s) before `expiryDate`.
     - Sending automated overdue student fee reminders to parents.
     - Periodic database status synchronization for reporting queries (persisting `EXPIRED` / `PAST_DUE` / `SUSPENDED` transitions on `organization_subscriptions` and `organization_invitations` rows that have not been accessed recently).
2. **Versioned Database Migrations (Flyway / Liquibase)**:
   - Currently the project uses `spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:update}` alongside idempotent SQL initialization in `AcademicDatabaseInitializer`.
   - Before production launch, baseline the schema into versioned Flyway (`src/main/resources/db/migration/V1__init.sql`) migrations and set `JPA_DDL_AUTO=validate` in production.
3. **Production Profile (`application-prod.properties`)**:
   - Add a dedicated `application-prod.properties` with `spring.jpa.show-sql=false`, `spring.jpa.hibernate.ddl-auto=validate`, production CORS allowed origins, and actuator health/readiness probes.
