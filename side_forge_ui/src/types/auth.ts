/**
 * Authentication, RBAC Permissions & Subscription Entitlement Types
 * Aligned with Spring Boot DTOs (`UserResponse`, `PermissionCode`, `PlatformFeature`, `SaaSDtos`).
 */

export type UserAccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT';
export type WorkspaceType = 'PLATFORM' | 'SCHOOL';

export interface UserOrganizationSummary {
  organizationId: number;
  organizationName: string | null;
  membershipStatus: MembershipStatus;
  roles: string[];
}

export interface WorkspaceContextOption {
  key: string;
  workspaceType: WorkspaceType;
  organizationId: number | null;
  displayName: string;
  roles: string[];
  membershipStatus: MembershipStatus;
}

export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Administrator',
  PLATFORM_ADMIN: 'Platform Administrator',
  PLATFORM_SUPPORT: 'Platform Support',
  PLATFORM_FINANCE: 'Platform Finance',
  PLATFORM_USER: 'Platform Staff',
  SCHOOL_ADMIN: 'School Administrator',
  PRINCIPAL: 'Principal',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Receptionist',
  SCHOOL_STAFF: 'School Staff',
  PARENT: 'Parent',
  STUDENT: 'Student',
};

export function formatRoleLabel(roleCode: string): string {
  if (!roleCode) return 'Member';
  if (ROLE_DISPLAY_LABELS[roleCode]) {
    return ROLE_DISPLAY_LABELS[roleCode];
  }
  return roleCode
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phoneNumber: string;
  status: UserAccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  profilePhotoFileId: number | null;
  profilePhotoUrl: string | null;
  organizations: UserOrganizationSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface RegisterUserRequest {
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export type PlatformFeature =
  | 'ACADEMIC_MANAGEMENT'
  | 'STUDENT_MANAGEMENT'
  | 'STAFF_MANAGEMENT'
  | 'TIMETABLE'
  | 'ATTENDANCE'
  | 'EXAMINATION_AND_RESULTS'
  | 'FEES_AND_FINANCE'
  | 'HOMEWORK_AND_ASSIGNMENTS'
  | 'DASHBOARD_AND_REPORTS'
  | 'REPORT_EXPORTS'
  | 'COMMUNICATION_AND_NOTIFICATIONS'
  | 'PARENT_PORTAL'
  | 'FILE_STORAGE'
  | 'TRANSPORT'
  | 'LIBRARY'
  | 'INVENTORY'
  | 'HR_AND_PAYROLL';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type BillingInterval = 'TRIAL' | 'MONTHLY' | 'YEARLY';

export interface FeatureEntitlementItem {
  feature: PlatformFeature;
  displayName: string;
  enabled: boolean;
  includedInPlan: boolean;
  overridden: boolean;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
}

export interface OrganizationEntitlementsResponse {
  organizationId: number;
  organizationName: string;
  planId: number | null;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  effectiveSubscriptionStatus: SubscriptionStatus | null;
  entitlements: FeatureEntitlementItem[];
  enabledFeatures: PlatformFeature[];
}

export interface OrganizationSubscriptionResponse {
  id: number;
  organizationId: number;
  organizationName: string;
  planId: number;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  billingInterval: BillingInterval;
  contractedAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  planStudentLimit: number;
  overrideStudentLimit: number | null;
  effectiveStudentLimit: number;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalDate: string | null;
  expiryDate: string;
  trial: boolean;
  currentSubscription: boolean;
  effectiveDate: string;
}

export interface OrganizationRoleDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  organizationId: number | null;
  systemDefined: boolean;
  permissions: string[];
}

export interface PlatformRoleBadge {
  roleId: number;
  roleCode: string;
  roleName: string;
  assignedAt: string;
  assignedBy: number | null;
}

export interface PlatformAdminUserResponse {
  userId: number;
  fullName: string;
  email: string;
  status: string;
  roles: PlatformRoleBadge[];
}

export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  SCHOOL_ADMIN: [
    'school.view', 'school.update', 'school.settings.manage',
    'academic_session.view', 'academic_session.manage',
    'class.view', 'class.manage', 'section.view', 'section.manage',
    'subject.view', 'subject.manage', 'class_subject.view', 'class_subject.manage',
    'student.view', 'student.create', 'student.update', 'student.delete',
    'student.enrollment.manage', 'student.guardian.manage',
    'teacher.view', 'teacher.manage', 'staff.view', 'staff.manage',
    'timetable.view', 'timetable.manage', 'timetable.publish',
    'attendance.view', 'attendance.mark', 'attendance.update',
    'staff.attendance.view', 'staff.attendance.manage',
    'exam.view', 'exam.manage', 'exam.enter_marks', 'exam.publish_results',
    'fees.view', 'fees.manage', 'fees.collect', 'fees.refund', 'fees.report.view',
    'admission.view', 'admission.manage', 'communication.view', 'communication.manage',
    'dashboard.view', 'report.view', 'report.export',
    'homework.view', 'homework.manage', 'homework.evaluate',
    'parent.child.view', 'parent.child.communication',
  ],
  PRINCIPAL: [
    'school.view', 'academic_session.view', 'academic_session.manage',
    'class.view', 'class.manage', 'section.view', 'section.manage',
    'subject.view', 'subject.manage', 'class_subject.view', 'class_subject.manage',
    'student.view', 'student.create', 'student.update',
    'student.enrollment.manage', 'student.guardian.manage',
    'teacher.view', 'teacher.manage', 'staff.view', 'staff.manage',
    'timetable.view', 'timetable.manage', 'timetable.publish',
    'attendance.view', 'attendance.mark', 'attendance.update',
    'staff.attendance.view', 'staff.attendance.manage',
    'exam.view', 'exam.manage', 'exam.enter_marks', 'exam.publish_results',
    'fees.view', 'fees.report.view', 'communication.view', 'communication.manage',
    'dashboard.view', 'report.view', 'report.export',
    'homework.view', 'homework.manage', 'homework.evaluate',
  ],
  TEACHER: [
    'academic_session.view', 'class.view', 'section.view', 'subject.view', 'class_subject.view',
    'student.view', 'teacher.view', 'timetable.view',
    'attendance.view', 'attendance.mark', 'exam.view', 'exam.enter_marks',
    'communication.view', 'dashboard.view', 'report.view',
    'homework.view', 'homework.manage', 'homework.evaluate',
  ],
  ACCOUNTANT: [
    'academic_session.view', 'class.view', 'section.view', 'student.view',
    'staff.view', 'teacher.view', 'staff.attendance.view',
    'fees.view', 'fees.collect', 'fees.refund', 'fees.report.view',
    'communication.view', 'dashboard.view', 'report.view', 'report.export',
  ],
  RECEPTIONIST: [
    'academic_session.view', 'class.view', 'section.view', 'subject.view', 'class_subject.view',
    'student.view', 'student.create', 'student.update', 'student.guardian.manage',
    'staff.view', 'teacher.view', 'timetable.view', 'attendance.view',
    'communication.view', 'dashboard.view',
  ],
  SCHOOL_STAFF: [
    'academic_session.view', 'class.view', 'section.view', 'subject.view', 'class_subject.view',
    'student.view', 'staff.view', 'teacher.view', 'timetable.view',
    'communication.view', 'dashboard.view',
  ],
  PARENT: [
    'parent.child.view', 'parent.child.communication',
    'academic_session.view', 'class.view', 'subject.view', 'timetable.view',
    'attendance.view', 'exam.view', 'fees.view', 'communication.view',
    'dashboard.view', 'homework.view', 'homework.submit',
  ],
  STUDENT: [
    'academic_session.view', 'class.view', 'section.view', 'subject.view',
    'timetable.view', 'attendance.view', 'exam.view', 'communication.view',
    'dashboard.view', 'homework.view', 'homework.submit',
  ],
};

export const PLATFORM_ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMIN: [
    'platform.dashboard.view', 'platform.user.manage',
    'platform.organization.view', 'platform.organization.manage',
    'platform.role.manage', 'platform.audit.view',
    'platform.plan.view', 'platform.plan.manage',
    'platform.subscription.view', 'platform.subscription.manage',
    'platform.billing.view', 'platform.billing.manage',
    'platform.entitlement.manage',
  ],
  PLATFORM_ADMIN: [
    'platform.dashboard.view', 'platform.user.manage',
    'platform.organization.view', 'platform.organization.manage',
    'platform.role.manage', 'platform.audit.view',
    'platform.plan.view', 'platform.plan.manage',
    'platform.subscription.view', 'platform.subscription.manage',
    'platform.billing.view', 'platform.billing.manage',
    'platform.entitlement.manage',
  ],
  PLATFORM_SUPPORT: [
    'platform.dashboard.view', 'platform.organization.view',
    'platform.plan.view', 'platform.subscription.view',
    'platform.billing.view', 'platform.audit.view',
  ],
  PLATFORM_FINANCE: [
    'platform.dashboard.view', 'platform.organization.view',
    'platform.plan.view', 'platform.subscription.view',
    'platform.subscription.manage', 'platform.billing.view',
    'platform.billing.manage',
  ],
};

