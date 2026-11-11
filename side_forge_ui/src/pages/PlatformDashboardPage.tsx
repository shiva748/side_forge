import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Eye,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import { platformOnboardingApi } from '../services/onboardingApi';
import { platformDashboardApi } from '../services/platformDashboardApi';
import {
  BOARD_AFFILIATION_LABELS,
  OnboardingRequestResponse,
} from '../types/onboarding';
import {
  getAuditActionBadgeMeta,
  getOrganizationStatusBadgeMeta,
  getSubscriptionStatusBadgeMeta,
  OrganizationAdminListItemResponse,
  PlatformAuditLogItem,
  PlatformDashboardResponse,
} from '../types/platformDashboard';
import { AppShell } from '../components/layout/AppShell';
import {
  formatOnboardingDate,
  getOnboardingStatusBadgeMeta,
} from '../components/platform/OnboardingRequestDetailsModal';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
} from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

export function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export const PlatformDashboardPage: React.FC = () => {
  const { activeWorkspace, platformPermissions } = useAuth();
  const navigate = useNavigate();

  // Strictly check platform-scoped permissions
  const canViewDashboard = platformPermissions.has('platform.dashboard.view');
  const canViewOrganizations = platformPermissions.has('platform.organization.view');
  const canViewAuditLogs = platformPermissions.has('platform.audit.view');

  const [metrics, setMetrics] = useState<PlatformDashboardResponse | null>(null);
  const [recentOnboarding, setRecentOnboarding] = useState<OnboardingRequestResponse[]>([]);
  const [recentOrganizations, setRecentOrganizations] = useState<
    OrganizationAdminListItemResponse[]
  >([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<PlatformAuditLogItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [orgSectionError, setOrgSectionError] = useState<string | null>(null);
  const [auditSectionError, setAuditSectionError] = useState<string | null>(null);

  const loadDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (activeWorkspace !== 'PLATFORM') return;

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setDashboardError(null);
      setOrgSectionError(null);
      setAuditSectionError(null);

      try {
        const tasks: Promise<void>[] = [];

        if (canViewDashboard) {
          tasks.push(
            platformDashboardApi
              .getDashboardMetrics()
              .then((res) => {
                setMetrics(res);
              })
              .catch((err) => {
                const msg =
                  err instanceof ApiError
                    ? err.isForbidden
                      ? 'You do not have permission (platform.dashboard.view) to view platform dashboard metrics.'
                      : err.message
                    : 'Unable to load platform dashboard summary metrics.';
                setDashboardError(msg);
              })
          );
        }

        if (canViewOrganizations) {
          tasks.push(
            Promise.all([
              platformOnboardingApi.listRequests({ page: 0, size: 5 }),
              platformDashboardApi.listOrganizations({ page: 0, size: 5 }),
            ])
              .then(([onbPage, orgPage]) => {
                setRecentOnboarding(onbPage?.content || []);
                setRecentOrganizations(orgPage?.content || []);
              })
              .catch((err) => {
                const msg =
                  err instanceof ApiError
                    ? err.message
                    : 'Unable to load recent onboarding and organization records.';
                setOrgSectionError(msg);
              })
          );
        }

        if (canViewAuditLogs) {
          tasks.push(
            platformDashboardApi
              .listAuditLogs({ page: 0, size: 6 })
              .then((auditPage) => {
                setRecentAuditLogs(auditPage?.content || []);
              })
              .catch((err) => {
                const msg =
                  err instanceof ApiError
                    ? err.message
                    : 'Unable to load recent platform activity logs.';
                setAuditSectionError(msg);
              })
          );
        }

        await Promise.all(tasks);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeWorkspace, canViewAuditLogs, canViewDashboard, canViewOrganizations]
  );

  useEffect(() => {
    void loadDashboardData(false);
  }, [loadDashboardData]);

  return (
    <AppShell pageTitle="Platform Dashboard" breadcrumbParent="Platform Administration">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Platform Control Plane"
          title="Platform Administrator Dashboard"
          description="Overview of registered school organizations, incoming onboarding applications, SaaS subscriptions, and recent platform operations."
          actions={
            <Button
              variant="outline"
              size="sm"
              isLoading={isLoading || isRefreshing}
              onClick={() => void loadDashboardData(true)}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          }
        />

        {isLoading && !metrics ? (
          <LoadingState label="Loading platform dashboard..." />
        ) : (
          <>
            {/* 1. Dashboard Overview — 4 Focused KPI Cards */}
            {dashboardError ? (
              <ErrorState
                title="Unable to load platform summary metrics"
                message={dashboardError}
                onRetry={() => void loadDashboardData(true)}
              />
            ) : !canViewDashboard ? (
              <InlineAlert variant="warning" title="Dashboard Metrics Restricted">
                Your platform role does not include{' '}
                <span className="font-mono">platform.dashboard.view</span>.
              </InlineAlert>
            ) : metrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Registered Organizations */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Total Organizations
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900">
                      {metrics.totalOrganizations.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {metrics.suspendedOrganizations > 0 ||
                      metrics.deactivatedOrganizations > 0
                        ? `${metrics.suspendedOrganizations} suspended • ${metrics.deactivatedOrganizations} deactivated`
                        : 'All registered school tenants'}
                    </p>
                  </div>
                </div>

                {/* Active Organizations */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Active Organizations
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-emerald-700">
                      {metrics.activeOrganizations.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Currently operational school workspaces
                    </p>
                  </div>
                </div>

                {/* Pending Onboarding Requests */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Pending Onboarding
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-amber-700">
                      {metrics.pendingOnboardingRequests.toLocaleString('en-IN')}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Awaiting platform review
                      </span>
                      {canViewOrganizations && (
                        <Link
                          to="/platform/onboarding?status=PENDING"
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Subscriptions */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Active Subscriptions
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-indigo-700">
                      {metrics.activeSubscriptions.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {metrics.trialSubscriptions > 0
                        ? `+ ${metrics.trialSubscriptions.toLocaleString('en-IN')} active trial subscription(s)`
                        : 'Paid SaaS tenant subscriptions'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 2. Quick Actions Bar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quick Actions
                </h2>
                <p className="text-xs text-slate-500">
                  Direct shortcuts to active platform workflows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canViewOrganizations && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/platform/onboarding')}
                    leftIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Review Onboarding Requests
                    {metrics && metrics.pendingOnboardingRequests > 0
                      ? ` (${metrics.pendingOnboardingRequests})`
                      : ''}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/platform/context')}
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  Workspace &amp; RBAC Context
                </Button>

                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 select-none"
                  title="Organization Management module will be enabled when implemented"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Organizations (Upcoming)</span>
                </span>

                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 select-none"
                  title="Subscription Management module will be enabled when implemented"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Subscriptions (Upcoming)</span>
                </span>
              </div>
            </div>

            {/* 3 & 4. Recent Onboarding Requests & Organization Overview */}
            {orgSectionError ? (
              <ErrorState
                title="Unable to load recent onboarding and organization records"
                message={orgSectionError}
                onRetry={() => void loadDashboardData(true)}
              />
            ) : canViewOrganizations ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3. Recent Onboarding Requests */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent Onboarding Requests
                      </h2>
                    </div>
                    <Link
                      to="/platform/onboarding"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex-1 divide-y divide-slate-100">
                    {recentOnboarding.length === 0 ? (
                      <EmptyState
                        title="No onboarding requests yet"
                        description="Submitted school onboarding applications will appear here."
                        className="py-10"
                      />
                    ) : (
                      recentOnboarding.map((req) => {
                        const statusMeta = getOnboardingStatusBadgeMeta(req.status);
                        return (
                          <div
                            key={req.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <TruncatedText
                                  text={req.schoolName}
                                  maxWidthClass="max-w-[220px]"
                                  className="text-sm font-semibold text-slate-900"
                                />
                                <IdLabel>#ONB-{req.id}</IdLabel>
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                Applicant:{' '}
                                <span className="font-medium text-slate-700">
                                  {req.contactPersonName}
                                </span>{' '}
                                • {formatOnboardingDate(req.createdAt)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={statusMeta.variant} dot>
                                {statusMeta.label}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/platform/onboarding?requestId=${req.id}`)
                                }
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. Organization Overview */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recently Registered Organizations
                      </h2>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Organization Management (Upcoming)
                    </span>
                  </div>

                  <div className="flex-1 divide-y divide-slate-100">
                    {recentOrganizations.length === 0 ? (
                      <EmptyState
                        title="No registered organizations yet"
                        description="Organizations provisioned upon onboarding approval will be listed here."
                        className="py-10"
                      />
                    ) : (
                      recentOrganizations.map((org) => {
                        const orgStatusMeta = getOrganizationStatusBadgeMeta(org.status);
                        const subStatusMeta = getSubscriptionStatusBadgeMeta(
                          org.subscriptionStatus
                        );
                        return (
                          <div
                            key={org.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <TruncatedText
                                  text={org.name}
                                  maxWidthClass="max-w-[220px]"
                                  className="text-sm font-semibold text-slate-900"
                                />
                                <span className="text-[11px] text-slate-500">
                                  {BOARD_AFFILIATION_LABELS[org.boardAffiliation] ||
                                    org.boardAffiliation}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {org.city}, {org.state} • Registered{' '}
                                {formatShortDate(org.createdAt)}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                              <Badge variant={orgStatusMeta.variant} dot>
                                {orgStatusMeta.label}
                              </Badge>
                              <Badge variant={subStatusMeta.variant}>
                                {org.planName ? `${org.planName}: ` : ''}
                                {subStatusMeta.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* 5. Subscription Overview (Side_forge SaaS Subscriptions) */}
            {metrics && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        SaaS Subscription Overview
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Side_forge platform tenant subscriptions (distinct from school student fee
                        collections).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Subscription Management (Upcoming)
                  </span>
                </div>

                {/* Compact Subscription Status Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50 border-b border-slate-100">
                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500">Active &amp; Trial</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {metrics.activeSubscriptions.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-indigo-600 font-medium">
                        + {metrics.trialSubscriptions.toLocaleString('en-IN')} Trial
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500">
                      In Grace Period (Past Due)
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-amber-700">
                        {metrics.pastDueSubscriptions.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-slate-500">15-day window</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500">Expired Subscriptions</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-rose-700">
                        {metrics.expiredSubscriptions.toLocaleString('en-IN')}
                      </span>
                      {metrics.suspendedSubscriptions > 0 && (
                        <span className="text-[11px] text-rose-600">
                          ({metrics.suspendedSubscriptions} suspended)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Expiring Within 30 Days
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {(metrics.expiringSubscriptionsWithin30Days || []).length}
                      </span>
                      <span className="text-[11px] text-slate-500">upcoming renewals</span>
                    </div>
                  </div>
                </div>

                {/* Upcoming Expirations & Grace Period Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  {/* Upcoming Expirations (Within 30 Days) */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Upcoming Subscription Expirations (30 Days)</span>
                      </span>
                      <CounterLabel
                        count={(metrics.expiringSubscriptionsWithin30Days || []).length}
                      />
                    </div>

                    {(metrics.expiringSubscriptionsWithin30Days || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">
                        No active or trial subscriptions are scheduled to expire within the next 30
                        days.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {metrics.expiringSubscriptionsWithin30Days.slice(0, 5).map((item) => {
                          const subMeta = getSubscriptionStatusBadgeMeta(item.subscriptionStatus);
                          return (
                            <div
                              key={item.id}
                              className="py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <TruncatedText
                                  text={item.name}
                                  maxWidthClass="max-w-[220px]"
                                  as="p"
                                  className="font-semibold text-slate-900"
                                />
                                <p className="text-slate-500">
                                  {item.planName || 'Standard Plan'} • Expires{' '}
                                  {formatShortDate(item.expiryDate)}
                                </p>
                              </div>
                              <Badge variant={subMeta.variant} dot>
                                {subMeta.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Organizations in Grace Period / Overdue */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Grace Period &amp; Overdue Subscriptions</span>
                      </span>
                      <CounterLabel count={(metrics.overdueSubscriptions || []).length} />
                    </div>

                    {(metrics.overdueSubscriptions || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">
                        No organizations are currently in a post-expiry grace period or overdue.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {metrics.overdueSubscriptions.slice(0, 5).map((item) => {
                          const subMeta = getSubscriptionStatusBadgeMeta(item.subscriptionStatus);
                          return (
                            <div
                              key={item.id}
                              className="py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <TruncatedText
                                  text={item.name}
                                  maxWidthClass="max-w-[220px]"
                                  as="p"
                                  className="font-semibold text-slate-900"
                                />
                                <p className="text-slate-500">
                                  {item.planName || 'Plan'} • Expiry:{' '}
                                  {formatShortDate(item.expiryDate)}
                                </p>
                              </div>
                              <Badge variant={subMeta.variant} dot>
                                {subMeta.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Recent Platform Activity */}
            {auditSectionError ? (
              <ErrorState
                title="Unable to load recent platform activity"
                message={auditSectionError}
                onRetry={() => void loadDashboardData(true)}
              />
            ) : canViewAuditLogs ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Recent Platform Activity
                    </h2>
                  </div>
                  <Link
                    to="/platform/audit-logs"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <span>View All Audit Logs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentAuditLogs.length === 0 ? (
                  <EmptyState
                    title="No platform activity recorded yet"
                    description="Platform administrative actions such as onboarding approvals, rejections, and subscription updates will appear here."
                    className="py-10"
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentAuditLogs.map((entry) => {
                      const actionMeta = getAuditActionBadgeMeta(entry.action);
                      return (
                        <div
                          key={entry.id}
                          className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <Badge variant={actionMeta.variant}>{actionMeta.label}</Badge>
                              {entry.organizationName && (
                                <TruncatedText
                                  text={entry.organizationName}
                                  maxWidthClass="max-w-[240px]"
                                  className="font-semibold text-slate-800"
                                />
                              )}
                              {entry.resourceType === 'ONBOARDING_REQUEST' &&
                                entry.resourceId && <IdLabel>#ONB-{entry.resourceId}</IdLabel>}
                            </div>
                            <p className="text-slate-700">
                              {entry.summary || `${entry.action} on ${entry.resourceType}`}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Actor: {entry.actorEmail || `User #${entry.actorUserId ?? '—'}`}
                              {entry.details ? ` • ${entry.details}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatOnboardingDate(entry.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
};
