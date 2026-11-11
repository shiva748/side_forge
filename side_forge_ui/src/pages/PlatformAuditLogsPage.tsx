import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import { platformDashboardApi } from '../services/platformDashboardApi';
import { PagedResponse } from '../types/onboarding';
import {
  AuthorizationAuditLogResponse,
  getAuditActionBadgeMeta,
  PLATFORM_AUDIT_ACTION_OPTIONS,
  PLATFORM_AUDIT_RESOURCE_TYPES,
  PlatformAuditAction,
  PlatformAuditLogItem,
} from '../types/platformDashboard';
import { AppShell } from '../components/layout/AppShell';
import { formatOnboardingDate } from '../components/platform/OnboardingRequestDetailsModal';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, InlineAlert } from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

type AuditTab = 'PLATFORM' | 'AUTHORIZATION';

const AUTH_AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'PLATFORM_ROLE_ASSIGNED', label: 'Platform Role Assigned' },
  { value: 'PLATFORM_ROLE_REVOKED', label: 'Platform Role Revoked' },
  { value: 'ORGANIZATION_ROLE_ASSIGNED', label: 'Organization Role Assigned' },
  { value: 'ORGANIZATION_ROLE_REVOKED', label: 'Organization Role Revoked' },
  { value: 'MEMBERSHIP_ACTIVATED', label: 'Membership Activated' },
  { value: 'MEMBERSHIP_SUSPENDED', label: 'Membership Suspended' },
];

export const PlatformAuditLogsPage: React.FC = () => {
  const { platformPermissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewAuditLogs = platformPermissions.has('platform.audit.view');

  const initialTab: AuditTab =
    searchParams.get('tab') === 'authorization' ? 'AUTHORIZATION' : 'PLATFORM';
  const [activeTab, setActiveTab] = useState<AuditTab>(initialTab);

  // =========================================================================
  // Tab 1: General Platform Audit Logs (`GET /api/platform/audit-logs`)
  // =========================================================================
  const [platOrgIdInput, setPlatOrgIdInput] = useState<string>(
    searchParams.get('organizationId') || ''
  );
  const [platActorIdInput, setPlatActorIdInput] = useState<string>('');
  const [platActionFilter, setPlatActionFilter] = useState<
    PlatformAuditAction | ''
  >('');
  const [platResourceTypeFilter, setPlatResourceTypeFilter] = useState<string>(
    searchParams.get('resourceType') || ''
  );
  const [platPage, setPlatPage] = useState<number>(0);
  const [platSize, setPlatSize] = useState<number>(20);

  const [appliedPlatOrgId, setAppliedPlatOrgId] = useState<number | undefined>(
    () => {
      const raw = Number(searchParams.get('organizationId'));
      return raw > 0 && !Number.isNaN(raw) ? raw : undefined;
    }
  );
  const [appliedPlatActorId, setAppliedPlatActorId] = useState<
    number | undefined
  >(undefined);

  const [platLogsPage, setPlatLogsPage] =
    useState<PagedResponse<PlatformAuditLogItem> | null>(null);
  const [isLoadingPlat, setIsLoadingPlat] = useState<boolean>(true);
  const [platError, setPlatError] = useState<string | null>(null);
  const [selectedPlatLog, setSelectedPlatLog] =
    useState<PlatformAuditLogItem | null>(null);

  // =========================================================================
  // Tab 2: Authorization Audit Logs (`GET /api/platform/authorization-audit-logs`)
  // =========================================================================
  const [authOrgIdInput, setAuthOrgIdInput] = useState<string>('');
  const [authActorIdInput, setAuthActorIdInput] = useState<string>('');
  const [authTargetIdInput, setAuthTargetIdInput] = useState<string>('');
  const [authActionFilter, setAuthActionFilter] = useState<string>('');
  const [authPage, setAuthPage] = useState<number>(0);
  const [authSize, setAuthSize] = useState<number>(20);

  const [appliedAuthOrgId, setAppliedAuthOrgId] = useState<number | undefined>(
    undefined
  );
  const [appliedAuthActorId, setAppliedAuthActorId] = useState<
    number | undefined
  >(undefined);

  const [authLogsPage, setAuthLogsPage] =
    useState<PagedResponse<AuthorizationAuditLogResponse> | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedAuthLog, setSelectedAuthLog] =
    useState<AuthorizationAuditLogResponse | null>(null);

  // Debounce numeric ID inputs for General Platform Audit Logs
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsedOrg = Number(platOrgIdInput.trim());
      const nextOrg =
        platOrgIdInput.trim() && !Number.isNaN(parsedOrg) && parsedOrg > 0
          ? parsedOrg
          : undefined;
      const parsedActor = Number(platActorIdInput.trim());
      const nextActor =
        platActorIdInput.trim() && !Number.isNaN(parsedActor) && parsedActor > 0
          ? parsedActor
          : undefined;
      setAppliedPlatOrgId(nextOrg);
      setAppliedPlatActorId(nextActor);
      setPlatPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [platActorIdInput, platOrgIdInput]);

  // Debounce numeric ID inputs for Authorization Audit Logs
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsedOrg = Number(authOrgIdInput.trim());
      const nextOrg =
        authOrgIdInput.trim() && !Number.isNaN(parsedOrg) && parsedOrg > 0
          ? parsedOrg
          : undefined;
      const parsedActor = Number(authActorIdInput.trim());
      const nextActor =
        authActorIdInput.trim() && !Number.isNaN(parsedActor) && parsedActor > 0
          ? parsedActor
          : undefined;
      setAppliedAuthOrgId(nextOrg);
      setAppliedAuthActorId(nextActor);
      setAuthPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [authActorIdInput, authOrgIdInput]);

  const fetchPlatformAuditLogs = useCallback(async () => {
    if (!canViewAuditLogs) {
      setIsLoadingPlat(false);
      return;
    }
    setIsLoadingPlat(true);
    setPlatError(null);
    try {
      const res = await platformDashboardApi.listAuditLogs({
        targetOrganizationId: appliedPlatOrgId,
        actorUserId: appliedPlatActorId,
        action: platActionFilter || undefined,
        resourceType: platResourceTypeFilter || undefined,
        page: platPage,
        size: platSize,
      });
      setPlatLogsPage(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load platform audit logs.';
      setPlatError(msg);
    } finally {
      setIsLoadingPlat(false);
    }
  }, [
    appliedPlatActorId,
    appliedPlatOrgId,
    canViewAuditLogs,
    platActionFilter,
    platPage,
    platResourceTypeFilter,
    platSize,
  ]);

  const fetchAuthorizationAuditLogs = useCallback(async () => {
    if (!canViewAuditLogs) {
      setIsLoadingAuth(false);
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await platformDashboardApi.listAuthorizationAuditLogs({
        organizationId: appliedAuthOrgId,
        actorUserId: appliedAuthActorId,
        action: authActionFilter || undefined,
        page: authPage,
        size: authSize,
      });
      setAuthLogsPage(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load authorization audit logs.';
      setAuthError(msg);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [
    appliedAuthActorId,
    appliedAuthOrgId,
    authActionFilter,
    authPage,
    authSize,
    canViewAuditLogs,
  ]);

  useEffect(() => {
    if (activeTab === 'PLATFORM') {
      void fetchPlatformAuditLogs();
    } else {
      void fetchAuthorizationAuditLogs();
    }
  }, [activeTab, fetchAuthorizationAuditLogs, fetchPlatformAuditLogs]);

  const handleSwitchTab = (next: AuditTab) => {
    setActiveTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'AUTHORIZATION') {
      nextParams.set('tab', 'authorization');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const displayedAuthLogs = useMemo(() => {
    const items = authLogsPage?.content || [];
    const trimmedTarget = authTargetIdInput.trim();
    if (!trimmedTarget) return items;
    const parsedTarget = Number(trimmedTarget);
    if (Number.isNaN(parsedTarget)) return items;
    return items.filter((item) => item.targetUserId === parsedTarget);
  }, [authLogsPage, authTargetIdInput]);

  const platColumns: DataTableColumn<PlatformAuditLogItem>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        render: (row) => (
          <div className="space-y-0.5 text-xs whitespace-nowrap">
            <div className="font-medium text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatOnboardingDate(row.createdAt)}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Log #{row.id}
            </div>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Action & Resource',
        render: (row) => {
          const meta = getAuditActionBadgeMeta(row.action);
          return (
            <div className="space-y-1 min-w-[180px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {row.resourceType}
                {row.resourceId !== null ? ` #${row.resourceId}` : ''}
              </div>
            </div>
          );
        },
      },
      {
        key: 'organization',
        header: 'Organization',
        render: (row) =>
          row.organizationId ? (
            <div className="space-y-0.5 text-xs min-w-[150px]">
              <TruncatedText
                text={row.organizationName || `Organization #${row.organizationId}`}
                maxWidthClass="max-w-[180px]"
                className="font-semibold text-slate-900"
              />
              <div>
                <IdLabel>Org #{row.organizationId}</IdLabel>
              </div>
            </div>
          ) : (
            <Badge variant="neutral">Platform-Wide</Badge>
          ),
      },
      {
        key: 'actor',
        header: 'Actor',
        render: (row) => (
          <div className="space-y-0.5 text-xs min-w-[150px]">
            <div className="font-mono text-slate-800">
              {row.actorEmail || (row.actorUserId ? `User #${row.actorUserId}` : 'System')}
            </div>
            {row.actorUserId && (
              <div className="text-[11px] text-slate-400 font-mono">
                Actor ID #{row.actorUserId}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'summary',
        header: 'Summary & Details',
        render: (row) => (
          <div className="space-y-0.5 text-xs max-w-md">
            <p className="font-medium text-slate-800 line-clamp-2">
              {row.summary || `${row.action} on ${row.resourceType}`}
            </p>
            {row.details && (
              <p className="text-[11px] font-mono text-slate-500 truncate max-w-[340px]">
                {row.details}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'inspect',
        header: 'Inspect',
        align: 'right',
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPlatLog(row)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  const authColumns: DataTableColumn<AuthorizationAuditLogResponse>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        render: (row) => (
          <div className="space-y-0.5 text-xs whitespace-nowrap">
            <div className="font-medium text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatOnboardingDate(row.createdAt)}</span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Auth Log #{row.id}
            </div>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Authorization Action',
        render: (row) => {
          const meta = getAuditActionBadgeMeta(row.action);
          return <Badge variant={meta.variant}>{meta.label}</Badge>;
        },
      },
      {
        key: 'actor',
        header: 'Actor User',
        render: (row) =>
          row.actorUserId ? (
            <IdLabel>User #{row.actorUserId}</IdLabel>
          ) : (
            <span className="text-xs text-slate-400">System</span>
          ),
      },
      {
        key: 'target',
        header: 'Target User',
        render: (row) =>
          row.targetUserId ? (
            <IdLabel>User #{row.targetUserId}</IdLabel>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        key: 'scope',
        header: 'Scope / Organization',
        render: (row) =>
          row.organizationId ? (
            <IdLabel>Org #{row.organizationId}</IdLabel>
          ) : (
            <Badge variant="primary">Platform Scope</Badge>
          ),
      },
      {
        key: 'details',
        header: 'Role / Resource Details',
        render: (row) => (
          <span className="font-mono text-xs text-slate-800">
            {row.details || '—'}
          </span>
        ),
      },
      {
        key: 'inspect',
        header: 'Inspect',
        align: 'right',
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedAuthLog(row)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  const platTotalElements = platLogsPage?.totalElements ?? 0;
  const platTotalPages = platLogsPage?.totalPages ?? 0;
  const platFrom = platTotalElements === 0 ? 0 : platPage * platSize + 1;
  const platTo = Math.min(platTotalElements, (platPage + 1) * platSize);

  const authTotalElements = authLogsPage?.totalElements ?? 0;
  const authTotalPages = authLogsPage?.totalPages ?? 0;
  const authFrom = authTotalElements === 0 ? 0 : authPage * authSize + 1;
  const authTo = Math.min(authTotalElements, (authPage + 1) * authSize);

  return (
    <AppShell
      pageTitle="Audit Logs"
      breadcrumbParent="Platform Administration"
    >
      <div className="space-y-6">
        <PageHeader
          badge={
            <Badge variant="primary" dot>
              Immutable Read-Only Audit Trail
            </Badge>
          }
          title="Platform &amp; Authorization Audit Logs"
          description="Search and inspect platform-wide operational events, subscription changes, entitlement overrides, and role/membership authorization events."
          actions={
            <Button
              variant="outline"
              size="sm"
              isLoading={
                activeTab === 'PLATFORM' ? isLoadingPlat : isLoadingAuth
              }
              onClick={() => {
                if (activeTab === 'PLATFORM') {
                  void fetchPlatformAuditLogs();
                } else {
                  void fetchAuthorizationAuditLogs();
                }
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Logs
            </Button>
          }
        />

        {!canViewAuditLogs ? (
          <InlineAlert variant="warning" title="Permission Required">
            Viewing platform and authorization audit logs requires the{' '}
            <span className="font-mono font-semibold">platform.audit.view</span>{' '}
            permission.
          </InlineAlert>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('PLATFORM')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'PLATFORM'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>General Platform Audit Logs</span>
                  {platLogsPage && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        activeTab === 'PLATFORM'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {platTotalElements}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('AUTHORIZATION')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'AUTHORIZATION'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Authorization Audit Logs</span>
                  {authLogsPage && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        activeTab === 'AUTHORIZATION'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {authTotalElements}
                    </span>
                  )}
                </button>
              </div>

              <div className="px-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Read-only immutable records</span>
              </div>
            </div>

            {/* TAB 1: GENERAL PLATFORM AUDIT LOGS */}
            {activeTab === 'PLATFORM' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Organization ID
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={platOrgIdInput}
                        onChange={(e) => setPlatOrgIdInput(e.target.value)}
                        placeholder="e.g., 1"
                        leftIcon={<Building2 className="w-3.5 h-3.5" />}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Action Type
                      </label>
                      <Select
                        value={platActionFilter}
                        onChange={(e) => {
                          setPlatActionFilter(
                            e.target.value as PlatformAuditAction | ''
                          );
                          setPlatPage(0);
                        }}
                      >
                        <option value="">All Platform Actions</option>
                        {PLATFORM_AUDIT_ACTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Resource Type
                      </label>
                      <Select
                        value={platResourceTypeFilter}
                        onChange={(e) => {
                          setPlatResourceTypeFilter(e.target.value);
                          setPlatPage(0);
                        }}
                      >
                        <option value="">All Resource Types</option>
                        {PLATFORM_AUDIT_RESOURCE_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Actor User ID
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={platActorIdInput}
                        onChange={(e) => setPlatActorIdInput(e.target.value)}
                        placeholder="e.g., 1"
                        leftIcon={<User className="w-3.5 h-3.5" />}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Rows Per Page
                      </label>
                      <Select
                        value={String(platSize)}
                        onChange={(e) => {
                          setPlatSize(Number(e.target.value));
                          setPlatPage(0);
                        }}
                      >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                      </Select>
                    </div>
                  </div>

                  {(platOrgIdInput ||
                    platActorIdInput ||
                    platActionFilter ||
                    platResourceTypeFilter) && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Active server-side filters applied
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPlatOrgIdInput('');
                          setPlatActorIdInput('');
                          setPlatActionFilter('');
                          setPlatResourceTypeFilter('');
                          setPlatPage(0);
                        }}
                        leftIcon={<X className="w-3.5 h-3.5" />}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>

                {platError ? (
                  <ErrorState
                    title="Unable to load platform audit logs"
                    message={platError}
                    onRetry={() => void fetchPlatformAuditLogs()}
                  />
                ) : (
                  <DataTable
                    columns={platColumns}
                    data={platLogsPage?.content || []}
                    rowKey={(row) => row.id}
                    isLoading={isLoadingPlat}
                    emptyTitle="No matching platform audit logs found"
                    emptyDescription="Try adjusting your organization, action, or resource type filters."
                  />
                )}

                {platTotalElements > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
                    <div>
                      Showing{' '}
                      <span className="font-semibold text-slate-900">
                        {platFrom}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-slate-900">
                        {platTo}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-slate-900">
                        {platTotalElements}
                      </span>{' '}
                      platform audit log entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={platPage <= 0 || isLoadingPlat}
                        onClick={() => setPlatPage((p) => Math.max(0, p - 1))}
                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                      >
                        Previous
                      </Button>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-700">
                        Page {platPage + 1} of {Math.max(1, platTotalPages)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          platPage >= platTotalPages - 1 || isLoadingPlat
                        }
                        onClick={() => setPlatPage((p) => p + 1)}
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AUTHORIZATION AUDIT LOGS */}
            {activeTab === 'AUTHORIZATION' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Organization ID
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={authOrgIdInput}
                        onChange={(e) => setAuthOrgIdInput(e.target.value)}
                        placeholder="e.g., 1"
                        leftIcon={<Building2 className="w-3.5 h-3.5" />}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Actor User ID
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={authActorIdInput}
                        onChange={(e) => setAuthActorIdInput(e.target.value)}
                        placeholder="e.g., 1"
                        leftIcon={<User className="w-3.5 h-3.5" />}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Target User ID (Page Filter)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={authTargetIdInput}
                        onChange={(e) => setAuthTargetIdInput(e.target.value)}
                        placeholder="e.g., 2"
                        leftIcon={<User className="w-3.5 h-3.5" />}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Authorization Action
                      </label>
                      <Select
                        value={authActionFilter}
                        onChange={(e) => {
                          setAuthActionFilter(e.target.value);
                          setAuthPage(0);
                        }}
                      >
                        <option value="">All Authorization Actions</option>
                        {AUTH_AUDIT_ACTIONS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Rows Per Page
                      </label>
                      <Select
                        value={String(authSize)}
                        onChange={(e) => {
                          setAuthSize(Number(e.target.value));
                          setAuthPage(0);
                        }}
                      >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                      </Select>
                    </div>
                  </div>

                  {(authOrgIdInput ||
                    authActorIdInput ||
                    authTargetIdInput ||
                    authActionFilter) && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Active authorization filters applied
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAuthOrgIdInput('');
                          setAuthActorIdInput('');
                          setAuthTargetIdInput('');
                          setAuthActionFilter('');
                          setAuthPage(0);
                        }}
                        leftIcon={<X className="w-3.5 h-3.5" />}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>

                {authError ? (
                  <ErrorState
                    title="Unable to load authorization audit logs"
                    message={authError}
                    onRetry={() => void fetchAuthorizationAuditLogs()}
                  />
                ) : (
                  <DataTable
                    columns={authColumns}
                    data={displayedAuthLogs}
                    rowKey={(row) => row.id}
                    isLoading={isLoadingAuth}
                    emptyTitle="No matching authorization audit logs found"
                    emptyDescription="Try adjusting your organization, actor user, target user, or action filters."
                  />
                )}

                {authTotalElements > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
                    <div>
                      Showing{' '}
                      <span className="font-semibold text-slate-900">
                        {authFrom}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-slate-900">
                        {authTo}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-slate-900">
                        {authTotalElements}
                      </span>{' '}
                      authorization audit log entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={authPage <= 0 || isLoadingAuth}
                        onClick={() => setAuthPage((p) => Math.max(0, p - 1))}
                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                      >
                        Previous
                      </Button>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-700">
                        Page {authPage + 1} of {Math.max(1, authTotalPages)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          authPage >= authTotalPages - 1 || isLoadingAuth
                        }
                        onClick={() => setAuthPage((p) => p + 1)}
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 1. Read-Only Platform Audit Log Entry Detail Modal */}
      <Dialog
        open={Boolean(selectedPlatLog)}
        onClose={() => setSelectedPlatLog(null)}
        title={
          selectedPlatLog
            ? `Platform Audit Entry #${selectedPlatLog.id}`
            : 'Platform Audit Entry'
        }
        description={
          selectedPlatLog
            ? `Recorded on ${formatOnboardingDate(selectedPlatLog.createdAt)}`
            : ''
        }
        maxWidthClass="max-w-xl"
        footer={
          <Button variant="outline" onClick={() => setSelectedPlatLog(null)}>
            Close
          </Button>
        }
      >
        {selectedPlatLog && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">Action</span>
                <div className="mt-1">
                  <Badge
                    variant={
                      getAuditActionBadgeMeta(selectedPlatLog.action).variant
                    }
                  >
                    {selectedPlatLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Resource</span>
                <span className="font-mono font-semibold text-slate-900 mt-1 block">
                  {selectedPlatLog.resourceType}
                  {selectedPlatLog.resourceId !== null
                    ? ` #${selectedPlatLog.resourceId}`
                    : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Actor</span>
                <span className="font-mono text-slate-900 mt-0.5 block">
                  {selectedPlatLog.actorEmail || 'System'} (ID #
                  {selectedPlatLog.actorUserId ?? '—'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Organization</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedPlatLog.organizationName
                    ? `${selectedPlatLog.organizationName} (#${selectedPlatLog.organizationId})`
                    : selectedPlatLog.organizationId
                    ? `Organization #${selectedPlatLog.organizationId}`
                    : 'Platform-Wide'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
              <div>
                <span className="text-slate-500 font-semibold block">
                  Event Summary
                </span>
                <p className="text-slate-900 font-medium mt-0.5 leading-relaxed">
                  {selectedPlatLog.summary || '—'}
                </p>
              </div>
              {selectedPlatLog.details && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-semibold block">
                    Technical Details / Attributes
                  </span>
                  <pre className="mt-1 rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 font-mono text-[11px] text-slate-800 whitespace-pre-wrap break-words">
                    {selectedPlatLog.details}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* 2. Read-Only Authorization Audit Log Entry Detail Modal */}
      <Dialog
        open={Boolean(selectedAuthLog)}
        onClose={() => setSelectedAuthLog(null)}
        title={
          selectedAuthLog
            ? `Authorization Audit Entry #${selectedAuthLog.id}`
            : 'Authorization Audit Entry'
        }
        description={
          selectedAuthLog
            ? `Recorded on ${formatOnboardingDate(selectedAuthLog.createdAt)}`
            : ''
        }
        maxWidthClass="max-w-lg"
        footer={
          <Button variant="outline" onClick={() => setSelectedAuthLog(null)}>
            Close
          </Button>
        }
      >
        {selectedAuthLog && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">Action</span>
                <div className="mt-1">
                  <Badge
                    variant={
                      getAuditActionBadgeMeta(selectedAuthLog.action).variant
                    }
                  >
                    {selectedAuthLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Scope</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {selectedAuthLog.organizationId
                    ? `Organization #${selectedAuthLog.organizationId}`
                    : 'Platform Scope'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Actor User ID</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                  {selectedAuthLog.actorUserId
                    ? `#${selectedAuthLog.actorUserId}`
                    : 'System'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Target User ID</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                  {selectedAuthLog.targetUserId
                    ? `#${selectedAuthLog.targetUserId}`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="text-slate-500 font-semibold block">
                Role / Resource Details
              </span>
              <pre className="mt-1 rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 font-mono text-[11px] text-slate-800 whitespace-pre-wrap break-words">
                {selectedAuthLog.details || '—'}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
};



