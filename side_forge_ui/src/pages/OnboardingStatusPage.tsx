import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSubmittedOnboardingRequests,
  StoredOnboardingSubmission,
} from '../services/onboardingApi';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FullScreenLoader, InlineAlert } from '../components/ui/StateViews';

export const OnboardingStatusPage: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    hasPlatformAccess,
    activeMemberships,
    refreshSession,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSubmissions, setLocalSubmissions] = useState<StoredOnboardingSubmission[]>([]);

  useEffect(() => {
    const all = getSubmittedOnboardingRequests();
    if (!user) {
      setLocalSubmissions(all);
      return;
    }
    const matching = all.filter(
      (item) =>
        item.requestedBy === user.id ||
        item.contactEmail.toLowerCase() === user.email.toLowerCase() ||
        item.schoolEmail.toLowerCase() === user.email.toLowerCase()
    );
    setLocalSubmissions(matching.length > 0 ? matching : all);
  }, [user]);

  if (isLoading) {
    return <FullScreenLoader label="Checking your account and onboarding status..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const invitedOrSuspendedMemberships = (user.organizations || []).filter(
    (m) => m.membershipStatus !== 'ACTIVE'
  );

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      toast.info(
        'Account status refreshed',
        'Checked latest organization memberships and approval state.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
            <span className="font-extrabold text-sm tracking-tight">SF</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            School<span className="text-indigo-600">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
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

      <div className="max-w-3xl w-full mx-auto my-8 space-y-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-3 py-1 text-xs font-semibold text-amber-800">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {activeMemberships.length > 0 || hasPlatformAccess
                    ? 'Workspace Access Active'
                    : 'Pending Organization Approval / Membership'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Account &amp; Onboarding Status
              </h1>
              <p className="text-sm text-slate-500">
                Signed in as <span className="font-semibold text-slate-700">{fullName}</span> (
                {user.email})
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              isLoading={isRefreshing}
              onClick={handleRefreshStatus}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Check Approval Status
            </Button>
          </div>

          {(activeMemberships.length > 0 || hasPlatformAccess) && (
            <div className="mt-6">
              <InlineAlert variant="success" title="Your workspace access is active!">
                <div className="space-y-3">
                  <p>
                    Your account has an active membership and can now access the SchoolForge
                    administration workspace.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/workspaces')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Open Workspace
                  </Button>
                </div>
              </InlineAlert>
            </div>
          )}

          {activeMemberships.length === 0 && !hasPlatformAccess && (
            <div className="mt-6 space-y-6">
              <InlineAlert
                variant="warning"
                title="No active school workspace membership yet"
              >
                Registering a user account or submitting an onboarding application does not
                automatically grant <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
                privileges. A Platform Administrator must review and approve your school onboarding
                request—or an existing School Administrator must invite your account—before your
                workspace is activated.
              </InlineAlert>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">Account Holder</span>
                    <span className="font-semibold text-slate-900">{fullName}</span>
                    <div className="mt-1">
                      <Badge variant="success">{user.status}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">Registered Email</span>
                    <span className="font-semibold text-slate-900 break-all">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block">Phone Number</span>
                    <span className="font-semibold text-slate-900">{user.phoneNumber}</span>
                  </div>
                </div>
              </div>

              {invitedOrSuspendedMemberships.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Non-Active Organization Memberships
                  </h2>
                  <div className="space-y-2.5">
                    {invitedOrSuspendedMemberships.map((m) => (
                      <div
                        key={m.organizationId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {m.organizationName || `Organization #${m.organizationId}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              Roles: {m.roles.length > 0 ? m.roles.join(', ') : 'Pending assignment'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={m.membershipStatus === 'INVITED' ? 'warning' : 'danger'}
                          dot
                        >
                          {m.membershipStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localSubmissions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Submitted School Onboarding Applications
                    </h2>
                    <span className="text-[11px] text-slate-400">Saved on this browser</span>
                  </div>
                  <div className="space-y-2.5">
                    {localSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {sub.schoolName}
                              </span>
                              <span className="font-mono text-xs text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                                #ONB-{sub.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Board: {sub.boardAffiliation} • Contact: {sub.contactEmail}
                            </p>
                          </div>
                        </div>
                        <Badge variant="warning" dot>
                          {sub.status || 'PENDING APPROVAL'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>What happens next?</span>
                </h2>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    <span className="font-semibold text-slate-800">
                      Registering a new school?
                    </span>{' '}
                    Submit an official School Onboarding Application below while signed in. Your
                    account (<span className="font-mono">{user.email}</span>) will be recorded as
                    the applicant (<span className="font-mono">requestedBy</span>).
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Platform review:</span> A
                    Platform Administrator reviews the application. Upon approval, the school
                    organization, default subscription plan, and initial{' '}
                    <span className="font-mono">SCHOOL_ADMIN</span> membership are provisioned.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Joining an existing school?</span>{' '}
                    Ask your school&apos;s administrator to send an invitation to{' '}
                    <span className="font-mono">{user.email}</span> and accept the invitation link.
                  </li>
                </ol>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/register?mode=school')}
                    leftIcon={<Building2 className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Submit School Onboarding Application
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={isRefreshing}
                    onClick={handleRefreshStatus}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        <span>SchoolForge Multi-Tenant SaaS Platform • Role &amp; Tenant Isolation Enforced</span>
      </div>
    </div>
  );
};
