import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Calendar,
  CreditCard,
  HardDrive,
  Lock,
  LogOut,
  Mail,
  PauseCircle,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/authApi';
import {
  formatRoleLabel,
  SchoolSubscriptionBillingSummaryResponse,
  SchoolSubscriptionUsageResponse,
} from '../../types/auth';
import {
  formatStorageBytes,
  getSubscriptionStatusBadgeMeta,
} from '../../types/platformDashboard';
import { formatCurrencyINR } from '../../types/platformSubscription';
import { formatOnboardingDate } from '../platform/OnboardingRequestDetailsModal';
import { Badge, IdLabel, RoleTag } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Top-of-workspace warning banner shown when a school organization is SUSPENDED
 * by a Platform Administrator.
 */
export const OrganizationSuspendedBanner: React.FC = () => {
  const {
    activeOrganization,
    activeOrganizationRestriction,
    isOrganizationSuspended,
    hasMultipleWorkspaces,
    subscription,
    revalidateOrganizationStatus,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);

  if (!isOrganizationSuspended || !activeOrganization) {
    return null;
  }

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const nextStatus = await revalidateOrganizationStatus();
      if (nextStatus === 'ACTIVE') {
        toast.success(
          'Organization reactivated',
          `${activeOrganization.organizationName || 'Your school'} is now active. Normal operations have been restored.`
        );
      } else if (nextStatus === 'DEACTIVATED') {
        toast.warning(
          'Organization deactivated',
          'This organization has been deactivated by a Platform Administrator.'
        );
      } else {
        toast.info(
          'Still suspended',
          'This school organization remains suspended by a Platform Administrator.'
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Organization suspension notice"
      className="border-b border-amber-200/90 bg-amber-50/85 text-amber-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <PauseCircle className="w-5 h-5" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Organization Suspended by Platform Administrator
                </span>
                <Badge variant="warning" dot>
                  Suspended
                </Badge>
                {subscription && (
                  <span className="text-[11px] text-amber-800/90">
                    • Plan: <strong className="font-semibold">{subscription.planName}</strong> (
                    {subscription.effectiveStatus})
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-amber-900/95 leading-relaxed">
                Your school organization is currently suspended. Access to normal school
                operations has been temporarily restricted. Please contact Side_forge support
                for assistance.
              </p>

              {(activeOrganizationRestriction?.reason ||
                activeOrganizationRestriction?.changedAt) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-amber-900">
                  {activeOrganizationRestriction.reason && (
                    <span>
                      <strong className="font-semibold">Suspension Reason:</strong>{' '}
                      {activeOrganizationRestriction.reason}
                    </span>
                  )}
                  {activeOrganizationRestriction.changedAt && (
                    <span>
                      <strong className="font-semibold">Suspended On:</strong>{' '}
                      {formatOnboardingDate(activeOrganizationRestriction.changedAt)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-800/90 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>Platform Support: support@sideforge.edu</span>
                </span>
                <span>
                  • Preserved access: Subscription, usage &amp; billing records remain viewable.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {location.pathname !== '/app' && location.pathname !== '/app/dashboard' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app')}
                className="bg-white/90 border-amber-300 text-amber-900 hover:bg-white"
              >
                Subscription &amp; Status Overview
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              isLoading={isChecking}
              onClick={() => void handleCheckStatus()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="bg-white/90 border-amber-300 text-amber-900 hover:bg-white"
            >
              Check Status
            </Button>

            {hasMultipleWorkspaces && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/workspaces?stay=1')}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                className="bg-white/90 border-amber-300 text-amber-900 hover:bg-white"
              >
                Switch Workspace
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Distinct banner shown when the Organization itself is ACTIVE,
 * but its SaaS Subscription has expired, been cancelled, or entered post-grace suspension.
 */
export const SubscriptionSuspendedBanner: React.FC = () => {
  const {
    activeWorkspace,
    activeOrganizationStatus,
    subscription,
    revalidateOrganizationStatus,
  } = useAuth();
  const toast = useToast();
  const [isChecking, setIsChecking] = useState(false);

  if (
    activeWorkspace !== 'SCHOOL' ||
    activeOrganizationStatus !== 'ACTIVE' ||
    !subscription
  ) {
    return null;
  }

  const effStatus = subscription.effectiveStatus;
  const isSubRestricted =
    effStatus === 'SUSPENDED' ||
    effStatus === 'EXPIRED' ||
    effStatus === 'CANCELLED';

  if (!isSubRestricted) {
    return null;
  }

  const statusMeta = getSubscriptionStatusBadgeMeta(effStatus);

  const handleRefreshSubscription = async () => {
    setIsChecking(true);
    try {
      await revalidateOrganizationStatus();
      toast.info(
        'Subscription status refreshed',
        'Checked the latest subscription and entitlement status for this school.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Subscription status notice"
      className="border-b border-rose-200/80 bg-rose-50/75 text-rose-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300/80 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  SaaS Subscription {statusMeta.label}
                </span>
                <Badge variant={statusMeta.variant} dot>
                  Plan: {subscription.planName} ({statusMeta.label})
                </Badge>
                <Badge variant="success">Organization Active</Badge>
              </div>
              <p className="text-xs text-rose-900/90">
                Your school organization is active, but its SaaS subscription (
                <strong className="font-semibold">{subscription.planName}</strong>) is currently{' '}
                <strong className="font-semibold">{effStatus}</strong> (expiry:{' '}
                {subscription.expiryDate || '—'}). Feature modules require an active or grace-period
                subscription.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            isLoading={isChecking}
            onClick={() => void handleRefreshSubscription()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-white/90 border-rose-300 text-rose-900 hover:bg-white shrink-0"
          >
            Refresh Subscription
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Full restricted-access page shown inside the School Workspace when the currently
 * selected organization is DEACTIVATED by a Platform Administrator.
 */
export const OrganizationDeactivatedScreen: React.FC = () => {
  const {
    activeOrganization,
    activeOrganizationRestriction,
    availableWorkspaces,
    hasMultipleWorkspaces,
    organizationRoles,
    revalidateOrganizationStatus,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  const orgName =
    activeOrganization?.organizationName ||
    (activeOrganization?.organizationId
      ? `Organization #${activeOrganization.organizationId}`
      : 'School Organization');

  const rolesList = Array.from(organizationRoles);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const nextStatus = await revalidateOrganizationStatus();
      if (nextStatus === 'ACTIVE') {
        toast.success(
          'Organization reactivated',
          `${orgName} is now active. Normal workspace access has been restored.`
        );
      } else if (nextStatus === 'SUSPENDED') {
        toast.warning(
          'Organization status updated',
          `${orgName} is now in SUSPENDED status.`
        );
      } else {
        toast.info(
          'Still deactivated',
          `${orgName} remains deactivated by a Platform Administrator.`
        );
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6">
      <div className="rounded-3xl border border-rose-200/90 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-rose-200/80 bg-rose-50/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-rose-950">
          <div className="flex items-center gap-2.5">
            <PowerOff className="w-4 h-4 text-rose-700 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Restricted Workspace Access
            </span>
          </div>
          <Badge variant="danger" dot>
            Deactivated
          </Badge>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 flex items-center justify-center shrink-0">
              <PowerOff className="w-6 h-6" />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Organization Deactivated
                </h1>
                {activeOrganization?.organizationId && (
                  <IdLabel>ORG #{activeOrganization.organizationId}</IdLabel>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                This school organization has been deactivated by the Side_forge platform
                administrator. Access to school operations is currently unavailable.
              </p>
            </div>
          </div>

          {/* Deactivation Details Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">Organization Name</span>
                <span className="font-semibold text-slate-900 text-sm">{orgName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Operational Status</span>
                <span className="font-semibold text-rose-700 text-sm">
                  Deactivated (All Tenant Modules Locked)
                </span>
              </div>
              {activeOrganizationRestriction?.reason && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Deactivation Reason</span>
                  <span className="font-medium text-slate-900">
                    {activeOrganizationRestriction.reason}
                  </span>
                </div>
              )}
              {activeOrganizationRestriction?.changedAt && (
                <div>
                  <span className="text-slate-500 block">Deactivated On</span>
                  <span className="font-medium text-slate-800">
                    {formatOnboardingDate(activeOrganizationRestriction.changedAt)}
                  </span>
                </div>
              )}
              {rolesList.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Your Assigned Membership Role(s)</span>
                  <div className="flex flex-wrap gap-1">
                    {rolesList.map((r) => (
                      <RoleTag key={r} label={formatRoleLabel(r)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* What This Means & Support Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Restricted Operations</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Backend authorization blocks all requests to{' '}
                <code className="font-mono text-[11px] text-slate-700">
                  /api/organizations/{activeOrganization?.organizationId}/**
                </code>{' '}
                while the organization is in <strong className="font-semibold">DEACTIVATED</strong>{' '}
                status. Historical school data remains stored safely.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Need Assistance or Reactivation?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Please contact your Side_forge Platform Administrator or email{' '}
                <a
                  href="mailto:support@sideforge.edu"
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  support@sideforge.edu
                </a>{' '}
                referencing Organization ID{' '}
                <strong className="font-semibold">
                  #{activeOrganization?.organizationId}
                </strong>
                .
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/workspaces?stay=1')}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              >
                Return to Workspace Selection
              </Button>

              <Button
                variant="outline"
                size="sm"
                isLoading={isChecking}
                onClick={() => void handleCheckStatus()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Check Status / Revalidate
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard view shown when an organization is SUSPENDED by a Platform Administrator.
 * Preserves read access to `/api/organizations/{orgId}/subscription`, `/usage`, and `/billing`
 * (which are explicitly permitted during suspension by `OrganizationSubscriptionAccessController`)
 * while clearly explaining why daily school operational modules are restricted.
 */
export const SuspendedOrganizationWorkspaceView: React.FC = () => {
  const {
    activeOrganizationId,
    activeOrganization,
    activeOrganizationRestriction,
    subscription,
    entitlements,
    revalidateOrganizationStatus,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [usage, setUsage] = useState<SchoolSubscriptionUsageResponse | null>(null);
  const [billing, setBilling] =
    useState<SchoolSubscriptionBillingSummaryResponse | null>(null);
  const [isLoadingPreserved, setIsLoadingPreserved] = useState(false);

  useEffect(() => {
    if (!activeOrganizationId) return;
    let mounted = true;
    setIsLoadingPreserved(true);
    Promise.allSettled([
      authApi.getOrganizationUsage(activeOrganizationId),
      authApi.getOrganizationBillingSummary(activeOrganizationId),
    ])
      .then(([usageRes, billingRes]) => {
        if (!mounted) return;
        setUsage(usageRes.status === 'fulfilled' ? usageRes.value : null);
        setBilling(billingRes.status === 'fulfilled' ? billingRes.value : null);
      })
      .finally(() => {
        if (mounted) setIsLoadingPreserved(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeOrganizationId]);

  const subMeta = subscription
    ? getSubscriptionStatusBadgeMeta(subscription.effectiveStatus)
    : null;

  const restrictedModules = [
    {
      name: 'Academic Management',
      description: 'Academic sessions, school classes, subjects, and curriculum assignments.',
    },
    {
      name: 'Student & Staff Operations',
      description: 'Student directory, enrollments, guardians, teachers, and staff profiles.',
    },
    {
      name: 'Daily Attendance & Timetable',
      description: 'Daily student/staff roll call, class schedules, and teacher timetables.',
    },
    {
      name: 'Examinations, Fees & Announcements',
      description: 'Exam scheduling, mark entry, fee collections, and school announcements.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Restricted Operational Modules Explanation */}
      <div className="rounded-2xl border border-amber-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">
                  School Operational Modules Temporarily Restricted
                </h2>
                <Badge variant="warning" dot>
                  Organization Suspended
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Because{' '}
                <strong className="font-semibold text-slate-800">
                  {activeOrganization?.organizationName || 'this school organization'}
                </strong>{' '}
                is currently suspended by a Platform Administrator, daily operational endpoints are
                locked by backend security until the organization is reactivated.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/context')}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Workspace &amp; RBAC Context
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoadingPreserved}
              onClick={async () => {
                const status = await revalidateOrganizationStatus();
                if (status === 'ACTIVE') {
                  toast.success(
                    'Organization reactivated',
                    'Normal school operations have been restored.'
                  );
                } else {
                  toast.info(
                    'Status checked',
                    `Current organization status: ${status}.`
                  );
                }
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Revalidate Status
            </Button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {restrictedModules.map((mod) => (
            <div
              key={mod.name}
              className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex flex-col justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    {mod.name}
                  </span>
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                <span>Paused during organization suspension</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Preserved Access: Subscription, Usage & Billing Summary */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Preserved Access: SaaS Subscription, Usage &amp; Billing Summary
              </h2>
              <p className="text-[11px] text-slate-500">
                Read access to{' '}
                <code className="font-mono">
                  /api/organizations/{activeOrganizationId}/subscription/**
                </code>{' '}
                remains available during organization suspension.
              </p>
            </div>
          </div>

          {subMeta && subscription && (
            <Badge variant={subMeta.variant} dot>
              Subscription: {subscription.planName} ({subMeta.label})
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Current Plan</span>
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p className="text-base font-bold text-slate-900">
                {subscription?.planName || entitlements?.planName || 'No Active Plan'}
              </p>
              <p className="text-[11px] text-slate-500">
                {subscription
                  ? `${subscription.billingInterval} • Expiry: ${subscription.expiryDate || '—'}`
                  : 'Subscription record'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Student Capacity Usage</span>
                <Users className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-base font-bold text-slate-900 tabular-nums">
                {usage
                  ? `${usage.enrolledStudentsCount} / ${usage.effectiveStudentLimit ?? '∞'}`
                  : subscription
                  ? `Limit: ${subscription.effectiveStudentLimit}`
                  : '—'}
              </p>
              <p className="text-[11px] text-slate-500">
                {usage
                  ? `${usage.remainingStudentCapacity} remaining (${usage.utilizationPercentage.toFixed(1)}% used)`
                  : 'Enrolled students in active sessions'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Storage Usage</span>
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-slate-900 tabular-nums">
                {usage?.storageUsage
                  ? formatStorageBytes(usage.storageUsage.totalStorageBytes)
                  : '0 B'}
              </p>
              <p className="text-[11px] text-slate-500">
                {usage?.storageUsage
                  ? `${usage.storageUsage.totalFilesCount} stored file(s)`
                  : 'Tenant file storage'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Billing Outstanding</span>
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-base font-bold text-slate-900 tabular-nums">
                {billing
                  ? formatCurrencyINR(billing.currentPeriodOutstandingAmount)
                  : subscription
                  ? formatCurrencyINR(subscription.outstandingAmount)
                  : '₹0'}
              </p>
              <p className="text-[11px] text-slate-500">
                {billing
                  ? `Total Paid: ${formatCurrencyINR(billing.totalPaidAmount)}`
                  : 'Current period balance'}
              </p>
            </div>
          </div>

          {/* Note Distinguishing Organization Suspension vs Subscription Status */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900">
                Why is my workspace suspended if our subscription is{' '}
                {subscription?.effectiveStatus || 'active'}?
              </p>
              <p className="text-slate-600">
                Organization suspension (<code className="font-mono">OrganizationStatus.SUSPENDED</code>)
                is an administrative action applied at the platform level and is separate from your
                SaaS subscription billing cycle.
                {activeOrganizationRestriction?.reason
                  ? ` Reason recorded: "${activeOrganizationRestriction.reason}".`
                  : ' Please contact Side_forge support (support@sideforge.edu) to request reactivation.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};