import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  LogOut,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatRoleLabel, WorkspaceContextOption } from '../types/auth';
import { Badge, CounterLabel, IdLabel, RoleTag } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FullScreenLoader, InlineAlert } from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

interface WorkspaceSelectorLocationState {
  from?: { pathname?: string };
  reason?: string;
  message?: string;
}

export const WorkspaceSelectorPage: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isOrgContextLoading,
    activeWorkspaceOption,
    availableWorkspaces,
    inactiveMemberships,
    activatePlatformWorkspace,
    selectOrganization,
    revalidateAllOrganizationsStatuses,
    refreshSession,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const locState = (location.state as WorkspaceSelectorLocationState) || {};
  const stayOnSelector = searchParams.get('stay') === '1';
  const hasRevalidatedMountRef = useRef(false);
  const hasAutoActivatedSingleRef = useRef(false);

  // When explicitly navigating to the workspace selector (?stay=1), refresh statuses once on mount
  useEffect(() => {
    if (!isLoading && isAuthenticated && stayOnSelector && !hasRevalidatedMountRef.current) {
      hasRevalidatedMountRef.current = true;
      void revalidateAllOrganizationsStatuses();
    }
  }, [isAuthenticated, isLoading, revalidateAllOrganizationsStatuses, stayOnSelector]);

  // Automatically activate when only a single valid workspace context exists
  useEffect(() => {
    if (isLoading || isOrgContextLoading || !isAuthenticated) return;
    if (availableWorkspaces.length === 1 && !stayOnSelector && !hasAutoActivatedSingleRef.current) {
      hasAutoActivatedSingleRef.current = true;
      const only = availableWorkspaces[0];
      if (only.workspaceType === 'PLATFORM') {
        activatePlatformWorkspace();
        navigate('/platform', { replace: true });
      } else if (only.organizationId) {
        navigate('/app', { replace: true });
        void selectOrganization(only.organizationId);
      }
    }
  }, [
    activatePlatformWorkspace,
    availableWorkspaces,
    isAuthenticated,
    isLoading,
    isOrgContextLoading,
    navigate,
    selectOrganization,
    stayOnSelector,
  ]);

  if (isLoading || isOrgContextLoading) {
    return <FullScreenLoader label="Loading your available workspaces and roles..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (availableWorkspaces.length === 0) {
    return <Navigate to="/onboarding-status" replace />;
  }

  const handleSelectWorkspace = async (option: WorkspaceContextOption) => {
    if (option.workspaceType === 'PLATFORM') {
      activatePlatformWorkspace();
      toast.info(
        'Workspace activated',
        `Switched to Platform Administration (${option.roles.map(formatRoleLabel).join(', ')}).`
      );
      const fromPath = locState.from?.pathname;
      const target =
        fromPath && fromPath.startsWith('/platform') ? fromPath : '/platform';
      navigate(target, { replace: true });
      return;
    }

    if (option.workspaceType === 'SCHOOL' && option.organizationId) {
      const fromPath = locState.from?.pathname;
      const target =
        option.organizationStatus === 'DEACTIVATED'
          ? '/app'
          : fromPath && fromPath.startsWith('/app')
          ? fromPath
          : '/app';
      navigate(target, { replace: true });
      await selectOrganization(option.organizationId);
      toast.info(
        'Workspace activated',
        `Switched to ${option.displayName} (${option.roles.map(formatRoleLabel).join(', ')}).`
      );
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      toast.info('Workspaces refreshed', 'Updated your latest roles and organization memberships.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  const platformOptions = availableWorkspaces.filter((w) => w.workspaceType === 'PLATFORM');
  const schoolOptions = availableWorkspaces.filter((w) => w.workspaceType === 'SCHOOL');

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
            <span className="font-extrabold text-sm tracking-tight">SF</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            School<span className="text-indigo-600">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs min-w-0">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <TruncatedText
              text={fullName}
              maxWidthClass="max-w-[140px]"
              className="font-medium text-slate-900"
            />
            <span className="text-slate-300 shrink-0">•</span>
            <TruncatedText
              text={user.email}
              maxWidthClass="max-w-[180px]"
              className="font-mono text-slate-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            isLoading={isRefreshing}
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Selector Container */}
      <div className="max-w-3xl w-full mx-auto my-8 space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Workspace Context Selection</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Select a workspace to continue
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Signed in as <span className="font-medium text-slate-700">{fullName}</span>. Choose
                the platform or school organization context you want to work in.
              </p>
            </div>
            <div className="shrink-0 self-start">
              <CounterLabel
                count={availableWorkspaces.length}
                label={availableWorkspaces.length === 1 ? 'Workspace' : 'Workspaces'}
              />
            </div>
          </div>

          {locState.message && (
            <InlineAlert variant="info" title="Workspace Selection Required">
              {locState.message}
            </InlineAlert>
          )}

          {/* Platform Administration Section */}
          {platformOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Platform Administration
                </h2>
                <span className="text-[11px] text-slate-400">Global SaaS Control Plane</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {platformOptions.map((option) => {
                  const isCurrent = activeWorkspaceOption?.key === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSelectWorkspace(option)}
                      className={`group w-full text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30'
                          : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <TruncatedText
                              text={option.displayName}
                              maxWidthClass="max-w-[220px] sm:max-w-[320px]"
                              className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                            />
                            <Badge variant="primary">Platform</Badge>
                            {isCurrent && (
                              <Badge variant="success" dot>
                                Active Context
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-slate-500 mr-1">Assigned Role(s):</span>
                            {option.roles.map((role) => (
                              <RoleTag
                                key={role}
                                label={formatRoleLabel(role)}
                                code={role}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          <span>{isCurrent ? 'Continue' : 'Open Workspace'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* School Organizations Section */}
          {schoolOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  School Organizations ({schoolOptions.length})
                </h2>
                <span className="text-[11px] text-slate-400">Tenant Workspaces</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {schoolOptions.map((option) => {
                  const isCurrent = activeWorkspaceOption?.key === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSelectWorkspace(option)}
                      className={`group w-full text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30'
                          : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl text-white transition-colors flex items-center justify-center shrink-0 shadow-xs ${
                            option.organizationStatus === 'SUSPENDED'
                              ? 'bg-amber-600'
                              : option.organizationStatus === 'DEACTIVATED'
                              ? 'bg-rose-700'
                              : 'bg-slate-900 group-hover:bg-indigo-600'
                          }`}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <TruncatedText
                              text={option.displayName}
                              maxWidthClass="max-w-[220px] sm:max-w-[320px]"
                              className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                            />
                            <Badge variant="info">School</Badge>
                            {option.organizationId && (
                              <IdLabel>Org #{option.organizationId}</IdLabel>
                            )}
                            {option.organizationStatus === 'SUSPENDED' ? (
                              <Badge variant="warning" dot>
                                Suspended
                              </Badge>
                            ) : option.organizationStatus === 'DEACTIVATED' ? (
                              <Badge variant="danger" dot>
                                Deactivated
                              </Badge>
                            ) : (
                              <Badge variant="success" dot>
                                Active
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="primary">Current Context</Badge>
                            )}
                          </div>
                          {option.statusReason &&
                            (option.organizationStatus === 'SUSPENDED' ||
                              option.organizationStatus === 'DEACTIVATED') && (
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold">
                                  {option.organizationStatus === 'SUSPENDED'
                                    ? 'Suspension Reason:'
                                    : 'Deactivation Reason:'}
                                </span>{' '}
                                {option.statusReason}
                              </p>
                            )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-slate-500 mr-1">
                              {option.roles.length > 1 ? 'Assigned Roles:' : 'Assigned Role:'}
                            </span>
                            {option.roles.length > 0 ? (
                              option.roles.map((role) => (
                                <RoleTag
                                  key={role}
                                  label={formatRoleLabel(role)}
                                  code={role}
                                />
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">Member</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:shrink-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          <span>{isCurrent ? 'Continue' : 'Open School'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive / Pending Memberships Notice */}
          {inactiveMemberships.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Inactive or Pending Organization Memberships</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {inactiveMemberships.map((m) => (
                  <div
                    key={m.organizationId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <TruncatedText
                        text={m.organizationName || `Organization #${m.organizationId}`}
                        maxWidthClass="max-w-[220px] sm:max-w-[320px]"
                        className="font-semibold text-slate-800"
                      />
                      {m.roles.length > 0 && (
                        <span className="text-slate-500">
                          ({m.roles.map(formatRoleLabel).join(', ')})
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={
                        m.membershipStatus === 'INVITED'
                          ? 'warning'
                          : m.membershipStatus === 'SUSPENDED'
                          ? 'danger'
                          : 'neutral'
                      }
                      dot
                    >
                      {m.membershipStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400">
        <span>
          SchoolForge Multi-Tenant SaaS Platform • Context-Isolated Role &amp; Permission
          Enforcement
        </span>
      </div>
    </div>
  );
};
