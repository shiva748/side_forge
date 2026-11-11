import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { platformDashboardApi } from '../services/platformDashboardApi';
import {
  getPlatformRoleMeta,
  PLATFORM_ROLE_DEFINITIONS,
  PlatformAdminUserResponse,
  PlatformRoleBadge,
  PlatformRoleCode,
} from '../types/platformDashboard';
import { AppShell } from '../components/layout/AppShell';
import { formatOnboardingDate } from '../components/platform/OnboardingRequestDetailsModal';
import { Badge, CounterLabel, IdLabel, RoleTag } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { FormField, Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
} from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

export const PlatformAdminsPage: React.FC = () => {
  const { user: currentUser, platformPermissions, refreshSession } = useAuth();
  const toast = useToast();

  const canManagePlatformRoles = platformPermissions.has('platform.role.manage');

  const [admins, setAdmins] = useState<PlatformAdminUserResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<PlatformRoleCode | ''>('');

  // User Detail Modal state
  const [selectedAdmin, setSelectedAdmin] =
    useState<PlatformAdminUserResponse | null>(null);

  // Assign Role Dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState<boolean>(false);
  const [assignUserIdInput, setAssignUserIdInput] = useState<string>('');
  const [assignTargetAdmin, setAssignTargetAdmin] =
    useState<PlatformAdminUserResponse | null>(null);
  const [assignRoleCode, setAssignRoleCode] =
    useState<PlatformRoleCode>('PLATFORM_SUPPORT');
  const [confirmAssignStep, setConfirmAssignStep] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Revoke Role Confirmation Dialog state
  const [revokeTarget, setRevokeTarget] = useState<{
    admin: PlatformAdminUserResponse;
    role: PlatformRoleBadge;
  } | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Reference Matrix toggle
  const [showRoleMatrix, setShowRoleMatrix] = useState<boolean>(false);

  const loadPlatformAdmins = useCallback(async () => {
    if (!canManagePlatformRoles) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await platformDashboardApi.listPlatformAdmins();
      const safeList = Array.isArray(list) ? list : [];
      setAdmins(safeList);
      setSelectedAdmin((prev) =>
        prev
          ? safeList.find((u) => u.userId === prev.userId) || null
          : null
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load platform administrators.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [canManagePlatformRoles]);

  useEffect(() => {
    void loadPlatformAdmins();
  }, [loadPlatformAdmins]);

  // Count how many distinct users hold SYSTEM_ADMIN
  const systemAdminUsersCount = useMemo(() => {
    return admins.filter((a) =>
      (a.roles || []).some((r) => r.roleCode === 'SYSTEM_ADMIN')
    ).length;
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return admins.filter((admin) => {
      if (roleFilter) {
        const hasRole = (admin.roles || []).some(
          (r) => r.roleCode === roleFilter
        );
        if (!hasRole) return false;
      }
      if (!q) return true;
      const matchesName = (admin.fullName || '').toLowerCase().includes(q);
      const matchesEmail = (admin.email || '').toLowerCase().includes(q);
      const matchesId =
        String(admin.userId).includes(q) || `#${admin.userId}`.includes(q);
      const matchesRole = (admin.roles || []).some(
        (r) =>
          r.roleCode.toLowerCase().includes(q) ||
          (r.roleName || '').toLowerCase().includes(q)
      );
      return matchesName || matchesEmail || matchesId || matchesRole;
    });
  }, [admins, roleFilter, searchQuery]);

  const handleOpenAssignModal = useCallback(
    (targetAdmin?: PlatformAdminUserResponse | null) => {
      setAssignTargetAdmin(targetAdmin || null);
      setAssignUserIdInput(targetAdmin ? String(targetAdmin.userId) : '');
      const existingRoleCodes = new Set(
        (targetAdmin?.roles || []).map((r) => r.roleCode)
      );
      const firstUnassigned =
        PLATFORM_ROLE_DEFINITIONS.find((d) => !existingRoleCodes.has(d.code))
          ?.code || 'PLATFORM_SUPPORT';
      setAssignRoleCode(firstUnassigned);
      setConfirmAssignStep(false);
      setAssignError(null);
      setIsAssignDialogOpen(true);
    },
    []
  );

  const handleValidateBeforeAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    const parsedUserId = Number(assignUserIdInput.trim());
    if (
      !assignUserIdInput.trim() ||
      Number.isNaN(parsedUserId) ||
      !Number.isInteger(parsedUserId) ||
      parsedUserId <= 0
    ) {
      setAssignError('Please enter a valid positive numeric User ID.');
      return;
    }

    const matchedAdmin = admins.find((a) => a.userId === parsedUserId);
    if (
      matchedAdmin &&
      (matchedAdmin.roles || []).some((r) => r.roleCode === assignRoleCode)
    ) {
      setAssignError(
        `${matchedAdmin.fullName || matchedAdmin.email} already holds the ${assignRoleCode} role.`
      );
      return;
    }

    setConfirmAssignStep(true);
  };

  const handleConfirmAssignRole = async () => {
    if (isAssigning) return;
    setAssignError(null);
    setIsAssigning(true);
    try {
      const parsedUserId = Number(assignUserIdInput.trim());
      const updatedUser = await platformDashboardApi.assignPlatformAdminRole({
        userId: parsedUserId,
        roleCode: assignRoleCode,
      });

      setIsAssignDialogOpen(false);
      setConfirmAssignStep(false);
      toast.success(
        'Platform role assigned',
        `Assigned ${assignRoleCode} to ${
          updatedUser.fullName || updatedUser.email || `User #${parsedUserId}`
        }.`
      );
      await loadPlatformAdmins();
      if (currentUser?.id === parsedUserId) {
        await refreshSession();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to assign platform administrator role.';
      setAssignError(msg);
      toast.error('Role assignment failed', msg);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleConfirmRevokeRole = async () => {
    if (!revokeTarget || isRevoking) return;
    setRevokeError(null);

    if (
      revokeTarget.role.roleCode === 'SYSTEM_ADMIN' &&
      systemAdminUsersCount <= 1
    ) {
      setRevokeError(
        'Cannot revoke the last SYSTEM_ADMIN role. At least one active System Administrator must remain on the platform.'
      );
      return;
    }

    setIsRevoking(true);
    try {
      await platformDashboardApi.revokePlatformAdminRole(
        revokeTarget.admin.userId,
        revokeTarget.role.roleCode
      );
      const revokedUserId = revokeTarget.admin.userId;
      const revokedRoleCode = revokeTarget.role.roleCode;
      const targetName =
        revokeTarget.admin.fullName ||
        revokeTarget.admin.email ||
        `User #${revokedUserId}`;

      setRevokeTarget(null);
      toast.info(
        'Platform role revoked',
        `Revoked ${revokedRoleCode} from ${targetName}.`
      );
      await loadPlatformAdmins();
      if (currentUser?.id === revokedUserId) {
        await refreshSession();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to revoke platform administrator role.';
      setRevokeError(msg);
      toast.error('Role revocation failed', msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const columns: DataTableColumn<PlatformAdminUserResponse>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'Platform User',
        render: (row) => {
          const isSelf = currentUser?.id === row.userId;
          return (
            <div className="space-y-0.5 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedAdmin(row)}
                  className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                >
                  <TruncatedText
                    text={row.fullName || 'Unnamed User'}
                    maxWidthClass="max-w-[180px]"
                  />
                </button>
                <IdLabel>User #{row.userId}</IdLabel>
                {isSelf && <Badge variant="info">You</Badge>}
              </div>
              <p className="text-xs font-mono text-slate-500">{row.email}</p>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Account Status',
        render: (row) => (
          <Badge
            variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}
            dot
          >
            {row.status || 'ACTIVE'}
          </Badge>
        ),
      },
      {
        key: 'roles',
        header: 'Assigned Platform Roles',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5 min-w-[240px]">
            {(row.roles || []).map((r) => {
              const meta = getPlatformRoleMeta(r.roleCode);
              const isLastSysAdmin =
                r.roleCode === 'SYSTEM_ADMIN' && systemAdminUsersCount <= 1;
              return (
                <div
                  key={r.roleCode}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-xs"
                >
                  <Badge variant={meta.variant}>{r.roleCode}</Badge>
                  {canManagePlatformRoles && (
                    <button
                      type="button"
                      disabled={isLastSysAdmin}
                      onClick={() => {
                        setRevokeError(null);
                        setRevokeTarget({ admin: row, role: r });
                      }}
                      title={
                        isLastSysAdmin
                          ? 'Cannot revoke the last SYSTEM_ADMIN role'
                          : `Revoke ${r.roleCode} from ${row.fullName || row.email}`
                      }
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed p-0.5 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAdmin(row)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Details
            </Button>
            {canManagePlatformRoles && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAssignModal(row)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Assign Role
              </Button>
            )}
          </div>
        ),
      },
    ],
    [
      canManagePlatformRoles,
      currentUser?.id,
      handleOpenAssignModal,
      systemAdminUsersCount,
    ]
  );

  const platformAdminCount = useMemo(
    () =>
      admins.filter((a) =>
        (a.roles || []).some((r) => r.roleCode === 'PLATFORM_ADMIN')
      ).length,
    [admins]
  );

  const supportAndFinanceCount = useMemo(
    () =>
      admins.filter((a) =>
        (a.roles || []).some(
          (r) =>
            r.roleCode === 'PLATFORM_SUPPORT' ||
            r.roleCode === 'PLATFORM_FINANCE'
        )
      ).length,
    [admins]
  );

  return (
    <AppShell
      pageTitle="Platform Administrators"
      breadcrumbParent="Platform Administration"
    >
      <div className="space-y-6">
        <PageHeader
          badge={
            <Badge variant="primary" dot>
              Platform Access &amp; RBAC Governance
            </Badge>
          }
          title="Platform Administrator Management"
          description="Manage platform-scoped administrators and their assigned SYSTEM_ADMIN, PLATFORM_ADMIN, PLATFORM_FINANCE, and PLATFORM_SUPPORT roles."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRoleMatrix((prev) => !prev)}
                leftIcon={<Shield className="w-3.5 h-3.5" />}
              >
                {showRoleMatrix ? 'Hide Role Matrix' : 'Role Permission Matrix'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                isLoading={isLoading}
                onClick={() => void loadPlatformAdmins()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
              {canManagePlatformRoles && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAssignModal(null)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Assign Platform Role
                </Button>
              )}
            </div>
          }
        />

        {!canManagePlatformRoles ? (
          <InlineAlert variant="warning" title="Permission Required">
            Viewing and managing platform administrators requires the{' '}
            <span className="font-mono font-semibold">platform.role.manage</span>{' '}
            permission (held by <span className="font-mono">SYSTEM_ADMIN</span> and{' '}
            <span className="font-mono">PLATFORM_ADMIN</span>).
          </InlineAlert>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Total Platform Users
                </span>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {admins.length}
                </div>
                <p className="text-[11px] text-slate-500">
                  Users holding at least one platform-scoped role
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-4 shadow-2xs space-y-1">
                <span className="text-xs font-medium text-rose-800">
                  System Administrators (SYSTEM_ADMIN)
                </span>
                <div className="text-2xl font-bold text-rose-700 tabular-nums">
                  {systemAdminUsersCount}
                </div>
                <p className="text-[11px] text-rose-700">
                  Minimum 1 active SYSTEM_ADMIN enforced by backend
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/30 p-4 shadow-2xs space-y-1">
                <span className="text-xs font-medium text-indigo-800">
                  Platform Administrators (PLATFORM_ADMIN)
                </span>
                <div className="text-2xl font-bold text-indigo-700 tabular-nums">
                  {platformAdminCount}
                </div>
                <p className="text-[11px] text-indigo-700">
                  Full SaaS operational &amp; onboarding authority
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Finance &amp; Support Staff
                </span>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {supportAndFinanceCount}
                </div>
                <p className="text-[11px] text-slate-500">
                  PLATFORM_FINANCE &amp; PLATFORM_SUPPORT roles
                </p>
              </div>
            </div>

            {/* Optional Role Permission Reference Matrix */}
            {showRoleMatrix && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Platform Role Definitions &amp; Seeded Permissions</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Exclusively platform-scoped (isolated from school tenant roles)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {PLATFORM_ROLE_DEFINITIONS.map((def) => (
                    <div
                      key={def.code}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {def.label}
                        </span>
                        <Badge variant={def.variant}>{def.code}</Badge>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {def.description}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {def.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="w-full sm:w-72">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, user ID, or role..."
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
                <div className="w-full sm:w-56">
                  <Select
                    value={roleFilter}
                    onChange={(e) =>
                      setRoleFilter(e.target.value as PlatformRoleCode | '')
                    }
                    aria-label="Filter by platform role"
                  >
                    <option value="">All Platform Roles</option>
                    {PLATFORM_ROLE_DEFINITIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} ({r.label})
                      </option>
                    ))}
                  </Select>
                </div>
                {(searchQuery || roleFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('');
                    }}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <CounterLabel
                count={filteredAdmins.length}
                label={filteredAdmins.length === 1 ? 'admin' : 'admins'}
              />
            </div>

            {/* Directory Table */}
            {error ? (
              <ErrorState
                title="Unable to load platform administrators"
                message={error}
                onRetry={() => void loadPlatformAdmins()}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredAdmins}
                rowKey={(row) => row.userId}
                isLoading={isLoading}
                emptyTitle={
                  searchQuery || roleFilter
                    ? 'No matching platform administrators'
                    : 'No platform administrators found'
                }
                emptyDescription={
                  searchQuery || roleFilter
                    ? 'Try clearing your search or role filter.'
                    : 'Assign a platform role to a user to grant platform administrative access.'
                }
              />
            )}
          </>
        )}
      </div>

      {/* 1. Platform Administrator User Details Modal */}
      <Dialog
        open={Boolean(selectedAdmin)}
        onClose={() => setSelectedAdmin(null)}
        title={
          selectedAdmin
            ? `Platform Administrator: ${selectedAdmin.fullName || selectedAdmin.email}`
            : 'Platform Administrator Details'
        }
        description={
          selectedAdmin
            ? `User ID #${selectedAdmin.userId} • ${selectedAdmin.email}`
            : ''
        }
        maxWidthClass="max-w-2xl"
        footer={
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Platform-scoped role assignments are audited automatically.
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelectedAdmin(null)}>
                Close
              </Button>
              {canManagePlatformRoles && selectedAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAssignModal(selectedAdmin)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Assign Additional Role
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedAdmin && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block">Full Name</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedAdmin.fullName || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address</span>
                <span className="font-mono font-medium text-slate-800 mt-0.5 block break-all">
                  {selectedAdmin.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">User ID</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  #{selectedAdmin.userId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Account Status</span>
                <div className="mt-0.5">
                  <Badge
                    variant={
                      selectedAdmin.status === 'ACTIVE' ? 'success' : 'neutral'
                    }
                    dot
                  >
                    {selectedAdmin.status || 'ACTIVE'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Assigned Platform Roles ({(selectedAdmin.roles || []).length})
              </h3>
              {(selectedAdmin.roles || []).map((role) => {
                const meta = getPlatformRoleMeta(role.roleCode);
                const isLastSysAdmin =
                  role.roleCode === 'SYSTEM_ADMIN' &&
                  systemAdminUsersCount <= 1;
                return (
                  <div
                    key={role.roleCode}
                    className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex flex-wrap items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={meta.variant}>{role.roleCode}</Badge>
                        <span className="font-semibold text-slate-900">
                          {role.roleName || meta.label}
                        </span>
                        <IdLabel>Role #{role.roleId}</IdLabel>
                      </div>
                      <p className="text-slate-600">{meta.description}</p>
                      <p className="text-[11px] text-slate-500">
                        Assigned: {formatOnboardingDate(role.assignedAt)}
                        {role.assignedBy
                          ? ` • Assigned by User #${role.assignedBy}`
                          : ''}
                      </p>
                    </div>
                    {canManagePlatformRoles && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLastSysAdmin}
                        onClick={() => {
                          setRevokeError(null);
                          setRevokeTarget({ admin: selectedAdmin, role });
                        }}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        {isLastSysAdmin ? 'Protected' : 'Revoke Role'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Dialog>

      {/* 2. Assign Platform Role Dialog */}
      <Dialog
        open={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false);
          setConfirmAssignStep(false);
          setAssignError(null);
        }}
        title="Assign Platform Administrator Role"
        description={
          assignTargetAdmin
            ? `Assign a platform-scoped role to ${
                assignTargetAdmin.fullName || assignTargetAdmin.email
              } (User #${assignTargetAdmin.userId}).`
            : 'Grant a platform-scoped administrative role (SYSTEM_ADMIN, PLATFORM_ADMIN, PLATFORM_FINANCE, or PLATFORM_SUPPORT) to a registered user account.'
        }
        maxWidthClass="max-w-lg"
        footer={
          confirmAssignStep ? (
            <div className="w-full flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isAssigning}
                onClick={() => setConfirmAssignStep(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isAssigning}
                onClick={() => void handleConfirmAssignRole()}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm &amp; Assign Role
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="assign-platform-role-form"
                variant="primary"
              >
                Review Assignment
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4 text-xs">
          {assignError && (
            <InlineAlert variant="error" title="Role Assignment Error">
              {assignError}
            </InlineAlert>
          )}

          {confirmAssignStep ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-950">
                    Confirm Platform Role Assignment
                  </h3>
                  <p className="text-amber-900 leading-relaxed">
                    You are about to grant{' '}
                    <span className="font-mono font-bold">{assignRoleCode}</span>{' '}
                    ({getPlatformRoleMeta(assignRoleCode).label}) to{' '}
                    <strong>
                      {assignTargetAdmin
                        ? `${assignTargetAdmin.fullName || assignTargetAdmin.email} (User #${assignTargetAdmin.userId})`
                        : `User ID #${assignUserIdInput.trim()}`}
                    </strong>
                    . This immediately grants platform-level permissions and records a platform &amp; authorization audit entry.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              id="assign-platform-role-form"
              onSubmit={handleValidateBeforeAssign}
              noValidate
              className="space-y-3.5"
            >
              {admins.length > 0 && !assignTargetAdmin && (
                <FormField
                  label="Quick-Select Existing Platform User (Optional)"
                  htmlFor="assign-quick-user"
                  hint="Or enter any registered Side_forge User ID below."
                >
                  <Select
                    id="assign-quick-user"
                    value={assignUserIdInput}
                    onChange={(e) => setAssignUserIdInput(e.target.value)}
                  >
                    <option value="">-- Enter User ID manually below --</option>
                    {admins.map((a) => (
                      <option key={a.userId} value={String(a.userId)}>
                        User #{a.userId} — {a.fullName || a.email} ({a.email})
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField
                label="Target User ID"
                htmlFor="assign-user-id"
                hint="Numeric ID of the registered Side_forge user account."
                required
              >
                <Input
                  id="assign-user-id"
                  type="number"
                  min={1}
                  step={1}
                  value={assignUserIdInput}
                  onChange={(e) => setAssignUserIdInput(e.target.value)}
                  disabled={Boolean(assignTargetAdmin)}
                  placeholder="e.g., 1"
                  required
                />
              </FormField>

              <FormField
                label="Platform Role to Assign"
                htmlFor="assign-role-code"
                required
              >
                <Select
                  id="assign-role-code"
                  value={assignRoleCode}
                  onChange={(e) =>
                    setAssignRoleCode(e.target.value as PlatformRoleCode)
                  }
                >
                  {PLATFORM_ROLE_DEFINITIONS.map((def) => (
                    <option key={def.code} value={def.code}>
                      {def.code} — {def.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {getPlatformRoleMeta(assignRoleCode).label}
                  </span>
                  <Badge variant={getPlatformRoleMeta(assignRoleCode).variant}>
                    {assignRoleCode}
                  </Badge>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {getPlatformRoleMeta(assignRoleCode).description}
                </p>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      {/* 3. Revoke Platform Role Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTarget)}
        onClose={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
        title="Revoke Platform Administrator Role"
        description={
          revokeTarget
            ? `Revoke ${revokeTarget.role.roleCode} from ${
                revokeTarget.admin.fullName || revokeTarget.admin.email
              } (User #${revokeTarget.admin.userId}).`
            : ''
        }
        maxWidthClass="max-w-md"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isRevoking}
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isRevoking}
              onClick={() => void handleConfirmRevokeRole()}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Revoke Role
            </Button>
          </div>
        }
      >
        {revokeTarget && (
          <div className="space-y-3.5 text-xs">
            {revokeError && (
              <InlineAlert variant="error" title="Role Revocation Blocked">
                {revokeError}
              </InlineAlert>
            )}

            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-950">
                    Confirm Revoking {revokeTarget.role.roleCode}
                  </h3>
                  <p className="text-rose-900 leading-relaxed">
                    Removing{' '}
                    <span className="font-mono font-bold">
                      {revokeTarget.role.roleCode}
                    </span>{' '}
                    from{' '}
                    <strong>
                      {revokeTarget.admin.fullName || revokeTarget.admin.email}
                    </strong>{' '}
                    immediately revokes the permissions granted by this role. If the user holds no other platform roles, their Platform Administration workspace access will be removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
};


