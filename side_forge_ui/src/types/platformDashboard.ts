import { BillingInterval, SubscriptionStatus } from './auth';
import { BoardAffiliation } from './onboarding';
import { BadgeVariant } from '../components/ui/Badge';

export type OrganizationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'DEACTIVATED';

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
