import {
  BillingInterval,
  OrganizationEntitlementsResponse,
  OrganizationSubscriptionResponse,
  PLATFORM_ROLE_PERMISSIONS,
  PlatformAdminUserResponse,
  PlatformFeature,
  PlatformRoleBadge,
  SubscriptionStatus,
} from './auth';
import { BoardAffiliation } from './onboarding';
import { BadgeVariant } from '../components/ui/Badge';

export type { PlatformAdminUserResponse, PlatformRoleBadge, PlatformFeature };

export type PlatformRoleCode =
  | 'SYSTEM_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'PLATFORM_SUPPORT'
  | 'PLATFORM_FINANCE';

export const PLATFORM_ROLE_DEFINITIONS: {
  code: PlatformRoleCode;
  label: string;
  variant: BadgeVariant;
  description: string;
  permissions: string[];
}[] = [
  {
    code: 'SYSTEM_ADMIN',
    label: 'System Administrator',
    variant: 'danger',
    description:
      'Highest platform authority with full control over organizations, plans, billing, entitlements, audit logs, and platform role assignments. At least one active SYSTEM_ADMIN must remain at all times.',
    permissions: PLATFORM_ROLE_PERMISSIONS.SYSTEM_ADMIN || [],
  },
  {
    code: 'PLATFORM_ADMIN',
    label: 'Platform Administrator',
    variant: 'primary',
    description:
      'Full operational platform administration across onboarding, organizations, plans, subscriptions, billing, entitlements, roles, and audit logs.',
    permissions: PLATFORM_ROLE_PERMISSIONS.PLATFORM_ADMIN || [],
  },
  {
    code: 'PLATFORM_FINANCE',
    label: 'Platform Finance',
    variant: 'success',
    description:
      'Manages organization subscriptions, manual payment recording, billing summaries, and receipt generation, with read access to dashboard, organizations, and plans.',
    permissions: PLATFORM_ROLE_PERMISSIONS.PLATFORM_FINANCE || [],
  },
  {
    code: 'PLATFORM_SUPPORT',
    label: 'Platform Support',
    variant: 'info',
    description:
      'Read-only diagnostic and support access to the platform dashboard, organizations, plans, subscriptions, billing summaries, and audit logs.',
    permissions: PLATFORM_ROLE_PERMISSIONS.PLATFORM_SUPPORT || [],
  },
];

export function getPlatformRoleMeta(roleCode: string): {
  code: string;
  label: string;
  variant: BadgeVariant;
  description: string;
  permissions: string[];
} {
  const normalized = roleCode.trim().toUpperCase();
  const match = PLATFORM_ROLE_DEFINITIONS.find((r) => r.code === normalized);
  if (match) return match;
  return {
    code: normalized,
    label: normalized.replace(/_/g, ' '),
    variant: 'neutral',
    description: 'Platform-scoped role.',
    permissions: PLATFORM_ROLE_PERMISSIONS[normalized] || [],
  };
}

export type OrganizationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'DEACTIVATED';

export type ManageableOrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type PlatformAuditAction =
  | 'ONBOARDING_APPROVED'
  | 'ONBOARDING_REJECTED'
  | 'ORGANIZATION_SUSPENDED'
  | 'ORGANIZATION_REACTIVATED'
  | 'ORGANIZATION_DEACTIVATED'
  | 'PLAN_CREATED'
  | 'PLAN_UPDATED'
  | 'PLAN_DEACTIVATED'
  | 'PLAN_ACTIVATED'
  | 'SUBSCRIPTION_ASSIGNED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_UPGRADED'
  | 'SUBSCRIPTION_DOWNGRADED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_STATUS_CHANGED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_PAYMENT_RECORDED'
  | 'FEATURE_ENTITLEMENT_UPDATED'
  | 'FEATURE_ENTITLEMENT_REMOVED'
  | 'USAGE_LIMIT_OVERRIDDEN'
  | 'USAGE_LIMIT_OVERRIDE_CLEARED'
  | 'PLATFORM_ROLE_ASSIGNED'
  | 'PLATFORM_ROLE_REVOKED';

export interface OrganizationAdminListItemResponse {
  id: number;
  name: string;
  boardAffiliation: BoardAffiliation;
  status: OrganizationStatus;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  postalCode: string;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingInterval: BillingInterval | null;
  expiryDate: string | null;
  activeEnrolledStudents: number;
  effectiveStudentLimit: number | null;
  studentLimitReached: boolean;
  totalStorageBytes: number;
  createdAt: string;
}

export interface PlatformDashboardResponse {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  deactivatedOrganizations: number;
  pendingOnboardingRequests: number;
  trialSubscriptions: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  totalPlatformUsers: number;
  totalActiveEnrolledStudents: number;
  totalActiveStudentProfiles: number;
  totalStoredFiles: number;
  totalStorageBytes: number;
  totalSubscriptionRevenue: number;
  totalOutstandingSubscriptionAmount: number;
  expiringSubscriptionsWithin30Days: OrganizationAdminListItemResponse[];
  overdueSubscriptions: OrganizationAdminListItemResponse[];
}

export interface PlatformAuditLogItem {
  id: number;
  actorUserId: number | null;
  actorEmail: string | null;
  action: PlatformAuditAction | string;
  resourceType: string;
  resourceId: number | null;
  organizationId: number | null;
  organizationName: string | null;
  summary: string | null;
  details: string | null;
  createdAt: string;
}

export interface CategoryStorageUsageItem {
  category: string;
  filesCount: number;
  totalBytes: number;
}

export interface OrganizationStorageUsageResponse {
  organizationId: number;
  organizationName: string;
  totalFilesCount: number;
  totalStorageBytes: number;
  byCategory: CategoryStorageUsageItem[];
}

export interface OrganizationUsageResponse {
  organizationId: number;
  organizationName: string;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  enrolledStudentsCount: number;
  activeStudentProfilesCount: number;
  planStudentLimit: number | null;
  overrideStudentLimit: number | null;
  effectiveStudentLimit: number | null;
  remainingStudentCapacity: number;
  limitReached: boolean;
  utilizationPercentage: number;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  storageUsage: OrganizationStorageUsageResponse | null;
}

export interface OrganizationStatusHistoryItem {
  id: number;
  organizationId: number;
  previousStatus: OrganizationStatus | null;
  newStatus: OrganizationStatus;
  reason: string;
  changedBy: number | null;
  createdAt: string;
}

export interface OrganizationSubscriptionHistoryItem {
  id: number;
  organizationId: number;
  subscriptionId: number;
  eventType: string;
  previousPlanId: number | null;
  previousPlanCode: string | null;
  newPlanId: number | null;
  newPlanCode: string | null;
  previousStatus: SubscriptionStatus | null;
  newStatus: SubscriptionStatus | null;
  billingInterval: BillingInterval | null;
  contractedAmount: number | null;
  studentLimit: number | null;
  effectiveDate: string | null;
  remarks: string | null;
  actorUserId: number | null;
  createdAt: string;
}

export interface OrganizationAdminDetailResponse {
  id: number;
  name: string;
  boardAffiliation: BoardAffiliation;
  status: OrganizationStatus;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  totalMembers: number;
  currentSubscription: OrganizationSubscriptionResponse | null;
  usage: OrganizationUsageResponse | null;
  entitlements: OrganizationEntitlementsResponse | null;
  statusHistory: OrganizationStatusHistoryItem[];
  subscriptionHistory: OrganizationSubscriptionHistoryItem[];
}

export interface ChangeOrganizationStatusRequest {
  status: ManageableOrganizationStatus;
  reason: string;
}

export interface UpdateFeatureEntitlementOverrideRequest {
  enabled: boolean;
  reason: string;
  expiresAt?: string | null;
}

export interface UpdateStudentLimitOverrideRequest {
  overrideStudentLimit: number;
  reason: string;
  expiresAt?: string | null;
}

export interface AssignPlatformAdminRoleRequest {
  userId: number;
  roleCode: PlatformRoleCode | string;
}

export interface AuthorizationAuditLogResponse {
  id: number;
  actorUserId: number | null;
  targetUserId: number | null;
  organizationId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export const PLATFORM_AUDIT_ACTION_OPTIONS: {
  value: PlatformAuditAction;
  label: string;
}[] = [
  { value: 'ONBOARDING_APPROVED', label: 'Onboarding Approved' },
  { value: 'ONBOARDING_REJECTED', label: 'Onboarding Rejected' },
  { value: 'ORGANIZATION_SUSPENDED', label: 'Organization Suspended' },
  { value: 'ORGANIZATION_REACTIVATED', label: 'Organization Reactivated' },
  { value: 'ORGANIZATION_DEACTIVATED', label: 'Organization Deactivated' },
  { value: 'PLAN_CREATED', label: 'Plan Created' },
  { value: 'PLAN_UPDATED', label: 'Plan Updated' },
  { value: 'PLAN_ACTIVATED', label: 'Plan Activated' },
  { value: 'PLAN_DEACTIVATED', label: 'Plan Deactivated' },
  { value: 'SUBSCRIPTION_ASSIGNED', label: 'Subscription Assigned' },
  { value: 'SUBSCRIPTION_ACTIVATED', label: 'Subscription Activated' },
  { value: 'SUBSCRIPTION_UPGRADED', label: 'Subscription Upgraded' },
  { value: 'SUBSCRIPTION_DOWNGRADED', label: 'Subscription Downgraded' },
  { value: 'SUBSCRIPTION_RENEWED', label: 'Subscription Renewed' },
  { value: 'SUBSCRIPTION_STATUS_CHANGED', label: 'Subscription Status Changed' },
  { value: 'SUBSCRIPTION_CANCELLED', label: 'Subscription Cancelled' },
  { value: 'SUBSCRIPTION_EXPIRED', label: 'Subscription Expired' },
  { value: 'SUBSCRIPTION_PAYMENT_RECORDED', label: 'Subscription Payment Recorded' },
  { value: 'FEATURE_ENTITLEMENT_UPDATED', label: 'Feature Entitlement Updated' },
  { value: 'FEATURE_ENTITLEMENT_REMOVED', label: 'Feature Entitlement Removed' },
  { value: 'USAGE_LIMIT_OVERRIDDEN', label: 'Student Limit Overridden' },
  { value: 'USAGE_LIMIT_OVERRIDE_CLEARED', label: 'Student Limit Override Cleared' },
  { value: 'PLATFORM_ROLE_ASSIGNED', label: 'Platform Role Assigned' },
  { value: 'PLATFORM_ROLE_REVOKED', label: 'Platform Role Revoked' },
];

export const PLATFORM_AUDIT_RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: 'ONBOARDING_REQUEST', label: 'Onboarding Request (ONBOARDING_REQUEST)' },
  { value: 'ORGANIZATION', label: 'Organization (ORGANIZATION)' },
  { value: 'SUBSCRIPTION_PLAN', label: 'Subscription Plan (SUBSCRIPTION_PLAN)' },
  {
    value: 'ORGANIZATION_SUBSCRIPTION',
    label: 'Organization Subscription (ORGANIZATION_SUBSCRIPTION)',
  },
  { value: 'SUBSCRIPTION_PAYMENT', label: 'Subscription Payment (SUBSCRIPTION_PAYMENT)' },
  { value: 'FEATURE_ENTITLEMENT', label: 'Feature Entitlement (FEATURE_ENTITLEMENT)' },
  { value: 'USAGE_LIMIT', label: 'Usage Limit (USAGE_LIMIT)' },
  { value: 'PLATFORM_USER_ROLE', label: 'Platform User Role (PLATFORM_USER_ROLE)' },
];

export function formatStorageBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getOrganizationStatusBadgeMeta(status: OrganizationStatus): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' };
    case 'PENDING':
      return { label: 'Pending', variant: 'warning' };
    case 'SUSPENDED':
      return { label: 'Suspended', variant: 'danger' };
    case 'DEACTIVATED':
      return { label: 'Deactivated', variant: 'neutral' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function getSubscriptionStatusBadgeMeta(
  status?: SubscriptionStatus | null
): {
  label: string;
  variant: BadgeVariant;
} {
  if (!status) {
    return { label: 'Unassigned', variant: 'neutral' };
  }
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' };
    case 'TRIAL':
      return { label: 'Trial', variant: 'primary' };
    case 'PAST_DUE':
      return { label: 'Grace Period (Past Due)', variant: 'warning' };
    case 'SUSPENDED':
      return { label: 'Suspended', variant: 'danger' };
    case 'EXPIRED':
      return { label: 'Expired', variant: 'danger' };
    case 'CANCELLED':
      return { label: 'Cancelled', variant: 'neutral' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function getAuditActionBadgeMeta(action: string): {
  label: string;
  variant: BadgeVariant;
} {
  const formatted = action
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (
    action.includes('APPROVED') ||
    action.includes('REACTIVATED') ||
    action.includes('ACTIVATED') ||
    action.includes('PAYMENT_RECORDED')
  ) {
    return { label: formatted, variant: 'success' };
  }
  if (
    action.includes('REJECTED') ||
    action.includes('SUSPENDED') ||
    action.includes('DEACTIVATED') ||
    action.includes('CANCELLED') ||
    action.includes('EXPIRED') ||
    action.includes('REVOKED')
  ) {
    return { label: formatted, variant: 'danger' };
  }
  if (action.includes('OVERRIDDEN') || action.includes('CHANGED')) {
    return { label: formatted, variant: 'warning' };
  }
  return { label: formatted, variant: 'primary' };
}
