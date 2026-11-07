import React from 'react';
import {
  CheckCircle2,
  Layers,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel, WorkspaceType } from '../types/auth';
import { AppShell } from '../components/layout/AppShell';
import { Badge, CounterLabel, RoleTag } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { InlineAlert } from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

export interface WorkspaceShellPlaceholderProps {
  workspace: WorkspaceType;
}

export const WorkspaceShellPlaceholder: React.FC<WorkspaceShellPlaceholderProps> = ({
  workspace,
}) => {
  const {
    user,
    platformRoles,
    platformPermissions,
    activeOrganization,
    activeMemberships,
    organizationRoles,
    organizationPermissions,
    subscription,
    entitlements,
    enabledFeatures,
  } = useAuth();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

  return (
    <AppShell
      pageTitle="Workspace Overview"
      breadcrumbParent={
        workspace === 'PLATFORM'
          ? 'Platform Administration'
          : activeOrganization?.organizationName || 'School Administration'
      }
    >
      <div className="space-y-6">
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
          description="Active workspace identity, assigned roles, resolved RBAC permissions, and module feature entitlements."
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
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100 min-w-0">
                <dt className="text-slate-500 shrink-0">Name</dt>
                <dd className="font-semibold text-slate-900 min-w-0">
                  <TruncatedText text={fullName} maxWidthClass="max-w-[180px]" />
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1 border-b border-slate-100 min-w-0">
                <dt className="text-slate-500 shrink-0">Email</dt>
                <dd className="font-mono text-slate-700 min-w-0">
                  <TruncatedText text={user?.email} maxWidthClass="max-w-[190px]" />
                </dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <dt className="text-slate-500">Account Status</dt>
                <dd>
                  <Badge variant="success" dot>
                    {user?.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between items-center py-1">
                <dt className="text-slate-500">Active Memberships</dt>
                <dd>
                  <CounterLabel count={activeMemberships.length} />
                </dd>
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
                    <RoleTag key={role} label={formatRoleLabel(role)} code={role} />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs text-slate-500">Resolved Permissions</p>
                  <CounterLabel
                    count={
                      workspace === 'PLATFORM'
                        ? platformPermissions.size
                        : organizationPermissions.size
                    }
                  />
                </div>
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
      </div>
    </AppShell>
  );
};


