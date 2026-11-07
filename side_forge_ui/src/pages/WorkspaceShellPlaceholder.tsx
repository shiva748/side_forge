import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Layers,
  LogOut,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { WorkspaceType } from '../types/auth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { InlineAlert } from '../components/ui/StateViews';

export interface WorkspaceShellPlaceholderProps {
  workspace: WorkspaceType;
}

export const WorkspaceShellPlaceholder: React.FC<WorkspaceShellPlaceholderProps> = ({
  workspace,
}) => {
  const {
    user,
    hasPlatformAccess,
    platformRoles,
    platformPermissions,
    activeOrganization,
    activeOrganizationId,
    activeMemberships,
    organizationRoles,
    organizationPermissions,
    subscription,
    entitlements,
    enabledFeatures,
    selectOrganization,
    switchWorkspace,
    refreshSession,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleWorkspaceToggle = (target: WorkspaceType) => {
    switchWorkspace(target);
    navigate(target === 'PLATFORM' ? '/platform' : '/app');
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

  return (
    <div className="min-h-screen bg-stone-50/50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
                <span className="font-extrabold text-sm tracking-tight">SF</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                School<span className="text-indigo-600">Forge</span>
              </span>
            </Link>

            <span className="h-4 w-px bg-slate-200 hidden sm:inline-block" />

            <Badge variant={workspace === 'PLATFORM' ? 'primary' : 'info'} dot>
              {workspace === 'PLATFORM' ? 'Platform Administration' : 'School Administration'}
            </Badge>

            {workspace === 'PLATFORM' && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link
                  to="/platform/onboarding"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Onboarding Requests
                </Link>
                <Link
                  to="/platform/context"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                >
                  Workspace Context
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasPlatformAccess && activeMemberships.length > 0 && (
              <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleWorkspaceToggle('SCHOOL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    workspace === 'SCHOOL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  School Workspace
                </button>
                <button
                  type="button"
                  onClick={() => handleWorkspaceToggle('PLATFORM')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    workspace === 'PLATFORM'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Platform Admin
                </button>
              </div>
            )}

            {workspace === 'SCHOOL' && activeMemberships.length > 1 && (
              <div className="w-48 hidden sm:block">
                <Select
                  aria-label="Select active school organization"
                  value={activeOrganizationId ?? ''}
                  onChange={(e) => selectOrganization(Number(e.target.value))}
                  className="h-9 text-xs"
                >
                  {activeMemberships.map((m) => (
                    <option key={m.organizationId} value={m.organizationId}>
                      {m.organizationName || `School #${m.organizationId}`}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refreshSession()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              <span className="hidden sm:inline">Sync</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader
          eyebrow={
            workspace === 'PLATFORM'
              ? 'SaaS Control Plane'
              : activeOrganization?.organizationName || 'School Workspace'
          }
          title={
            workspace === 'PLATFORM'
              ? 'Platform Administration Workspace'
              : activeOrganization?.organizationName || 'School Administration Workspace'
          }
          description="Authenticated Admin Web foundation is active. Sidebar navigation, header shell, and domain modules will be mounted here in the next phase."
          badge={
            workspace === 'SCHOOL' && subscription ? (
              <Badge
                variant={
                  subscription.effectiveStatus === 'ACTIVE'
                    ? 'success'
                    : subscription.effectiveStatus === 'TRIAL'
                    ? 'primary'
                    : subscription.effectiveStatus === 'PAST_DUE'
                    ? 'warning'
                    : 'danger'
                }
                dot
              >
                {subscription.planName} • {subscription.effectiveStatus}
              </Badge>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Authenticated Identity</span>
            </div>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-semibold text-slate-900">{fullName}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-mono text-slate-700">{user?.email}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">Account Status</dt>
                <dd>
                  <Badge variant="success">{user?.status}</Badge>
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-slate-500">Active Memberships</dt>
                <dd className="font-semibold text-slate-900">{activeMemberships.length}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>
                {workspace === 'PLATFORM'
                  ? 'Platform Roles & Permissions'
                  : 'Organization Roles & RBAC Permissions'}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Active Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {(workspace === 'PLATFORM'
                    ? platformRoles
                    : Array.from(organizationRoles)
                  ).map((role) => (
                    <Badge key={role} variant="primary">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">
                  Resolved Permissions (
                  {workspace === 'PLATFORM'
                    ? platformPermissions.size
                    : organizationPermissions.size}
                  )
                </p>
                <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  {Array.from(
                    workspace === 'PLATFORM' ? platformPermissions : organizationPermissions
                  ).map((perm) => (
                    <span
                      key={perm}
                      className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Subscription Feature Entitlements</span>
            </div>
            {workspace === 'PLATFORM' ? (
              <InlineAlert variant="info" title="Platform Control Plane">
                Platform administrators manage subscription plans, tenant feature overrides, and
                student capacity across all schools.
              </InlineAlert>
            ) : entitlements ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Plan Tier</span>
                  <span className="font-semibold text-slate-900">
                    {entitlements.planName || 'Unassigned'} ({entitlements.planCode || '—'})
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">
                    Enabled Modules ({enabledFeatures.size})
                  </p>
                  <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {Array.from(enabledFeatures).map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select an active school organization to view its subscription feature entitlements.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};


