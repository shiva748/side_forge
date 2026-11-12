import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { accountAndInvitationApi } from '../services/accountAndInvitationApi';
import type { InvitationResponse, InvitationStatus } from '../types/accountAndInvitations';
import { formatRoleLabel } from '../types/auth';
import { getInvitationTargetTypeLabel } from '../types/staffManagement';
import { AppShell } from '../components/layout/AppShell';
import { Badge, CounterLabel, RoleTag } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, FullScreenLoader, InlineAlert } from '../components/ui/StateViews';

type InboxSection = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getStatusBadgeVariant(status: InvitationStatus) {
  switch (status) {
    case 'PENDING':
      return 'warning' as const;
    case 'ACCEPTED':
      return 'success' as const;
    case 'REJECTED':
      return 'danger' as const;
    case 'EXPIRED':
    case 'REVOKED':
    default:
      return 'neutral' as const;
  }
}

export const InvitationAcceptPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    activeWorkspace,
    activeOrganization,
    refreshSession,
    refreshPendingInvitations,
    selectOrganization,
  } = useAuth();

  const [section, setSection] = useState<InboxSection>('PENDING');
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acceptedNotice, setAcceptedNotice] = useState<{
    organizationId: number;
    organizationName: string;
    roleCode: string;
  } | null>(null);

  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationResponse | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    'accept' | 'reject' | null
  >(null);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const loadInvitations = useCallback(
    async (silent = false) => {
      if (!isAuthenticated) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);
      try {
        const list = await accountAndInvitationApi.getMyInvitations();
        setInvitations(list);
        await refreshPendingInvitations();
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('Unable to load your invitations right now.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, refreshPendingInvitations]
  );

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      void loadInvitations(false);
    }
  }, [isAuthenticated, isAuthLoading, loadInvitations]);

  const counts = useMemo(() => {
    return {
      PENDING: invitations.filter((i) => i.status === 'PENDING').length,
      ACCEPTED: invitations.filter((i) => i.status === 'ACCEPTED').length,
      REJECTED: invitations.filter((i) => i.status === 'REJECTED').length,
      EXPIRED: invitations.filter(
        (i) => i.status === 'EXPIRED' || i.status === 'REVOKED'
      ).length,
    };
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    if (section === 'EXPIRED') {
      return invitations.filter(
        (i) => i.status === 'EXPIRED' || i.status === 'REVOKED'
      );
    }
    return invitations.filter((i) => i.status === section);
  }, [invitations, section]);

  if (isAuthLoading) {
    return <FullScreenLoader label="Loading your invitation inbox..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenDetails = (inv: InvitationResponse) => {
    setConfirmingReject(false);
    setSelectedInvitation(inv);
  };

  const handleCloseDetails = () => {
    if (processingAction) return;
    setConfirmingReject(false);
    setSelectedInvitation(null);
  };

  const handleAcceptInvitation = async () => {
    if (!selectedInvitation || processingAction) return;
    setProcessingAction('accept');
    setErrorMsg(null);
    setAcceptedNotice(null);
    try {
      const accepted = await accountAndInvitationApi.acceptMyInvitationById(
        selectedInvitation.id
      );
      const orgName =
        selectedInvitation.organizationName || 'School Organization';
      setSelectedInvitation(null);
      setConfirmingReject(false);
      queryClient.clear();
      await refreshSession();
      await loadInvitations(true);
      setAcceptedNotice({
        organizationId: accepted.organizationId,
        organizationName: orgName,
        roleCode: accepted.roleCode,
      });
      toast.success(
        'Invitation accepted',
        `Your ${formatRoleLabel(accepted.roleCode)} membership at ${orgName} is now active.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to accept invitation right now.');
      }
      setSelectedInvitation(null);
      await loadInvitations(true);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectInvitation = async () => {
    if (!selectedInvitation || processingAction) return;
    setProcessingAction('reject');
    setErrorMsg(null);
    try {
      await accountAndInvitationApi.rejectMyInvitationById(
        selectedInvitation.id
      );
      const orgName =
        selectedInvitation.organizationName || 'School Organization';
      setSelectedInvitation(null);
      setConfirmingReject(false);
      await loadInvitations(true);
      toast.info(
        'Invitation declined',
        `You have declined the invitation from ${orgName}.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to decline invitation right now.');
      }
      setSelectedInvitation(null);
      await loadInvitations(true);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSwitchToOrganization = async (organizationId: number) => {
    setSwitchingWorkspace(true);
    try {
      await selectOrganization(organizationId);
      navigate('/app', { replace: true });
    } finally {
      setSwitchingWorkspace(false);
    }
  };

  const tabs: { key: InboxSection; label: string; count: number }[] = [
    { key: 'PENDING', label: 'Pending', count: counts.PENDING },
    { key: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED },
    { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
    { key: 'EXPIRED', label: 'Expired', count: counts.EXPIRED },
  ];
  const inboxContent = (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Mail className="w-3.5 h-3.5" />
            <span>In-App Invitation Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            My School Invitations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Invitations sent to{' '}
            <span className="font-mono font-medium text-slate-700">
              {user.email}
            </span>{' '}
            appear directly here. Review school and role details to accept or
            reject.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            isLoading={refreshing}
            onClick={() => void loadInvitations(true)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Inbox
          </Button>
        </div>
      </div>

      {errorMsg && (
        <InlineAlert variant="error" title="Invitation Action Error">
          {errorMsg}
        </InlineAlert>
      )}

      {acceptedNotice && (
        <InlineAlert variant="success" title="Membership Activated">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>
              Your{' '}
              <strong>{formatRoleLabel(acceptedNotice.roleCode)}</strong>{' '}
              membership in <strong>{acceptedNotice.organizationName}</strong>{' '}
              is now active and available in your Workspace Switcher.
            </span>
            <Button
              size="sm"
              variant="primary"
              isLoading={switchingWorkspace}
              onClick={() =>
                void handleSwitchToOrganization(acceptedNotice.organizationId)
              }
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Switch to {acceptedNotice.organizationName}
            </Button>
          </div>
        </InlineAlert>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map((t) => {
          const isActive = section === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSection(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? 'bg-indigo-500 text-white'
                    : t.key === 'PENDING' && t.count > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading your invitations...
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <EmptyState
            icon={<Inbox className="w-6 h-6" />}
            title={
              section === 'PENDING'
                ? 'No Pending Invitations'
                : `No ${section.charAt(0) + section.slice(1).toLowerCase()} Invitations`
            }
            description={
              section === 'PENDING'
                ? `There are currently no pending school invitations for ${user.email}.`
                : `You have no ${section.toLowerCase()} invitations in your inbox.`
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredInvitations.map((inv) => (
            <div
              key={inv.id}
              onClick={() => handleOpenDetails(inv)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDetails(inv);
                }
              }}
              className={`rounded-2xl border bg-white p-5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                inv.status === 'PENDING'
                  ? 'border-indigo-200/90 hover:border-indigo-400 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-base font-bold text-slate-900">
                    {inv.organizationName || 'School Organization'}
                  </span>
                  <Badge variant={getStatusBadgeVariant(inv.status)} dot>
                    {inv.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 pt-0.5">
                  <span>Offered Role:</span>
                  <RoleTag
                    label={formatRoleLabel(inv.roleCode)}
                    code={inv.roleCode}
                  />
                  <span>•</span>
                  <span>
                    Membership:{' '}
                    <strong className="text-slate-800">
                      {getInvitationTargetTypeLabel(inv.targetType)}
                    </strong>
                  </span>
                  {inv.invitedByName && (
                    <>
                      <span>•</span>
                      <span>
                        Invited by{' '}
                        <strong className="text-slate-800">
                          {inv.invitedByName}
                        </strong>
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Sent {formatDateTime(inv.createdAt)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {inv.status === 'ACCEPTED'
                        ? `Accepted ${formatDateTime(inv.acceptedAt)}`
                        : inv.status === 'REJECTED'
                        ? `Declined ${formatDateTime(inv.revokedAt)}`
                        : `Expires ${formatDateTime(inv.expiresAt)}`}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={inv.status === 'PENDING' ? 'primary' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetails(inv);
                  }}
                >
                  {inv.status === 'PENDING' ? 'Review & Respond' : 'View Details'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={Boolean(selectedInvitation)}
        onClose={handleCloseDetails}
        title={selectedInvitation?.organizationName || 'Invitation Details'}
        description="Review the inviting school and offered role details below."
      >
        {selectedInvitation && (
          <div className="space-y-5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Invitation Status</span>
                <Badge variant={getStatusBadgeVariant(selectedInvitation.status)} dot>
                  {selectedInvitation.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Inviting School</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedInvitation.organizationName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Offered Role</span>
                <RoleTag
                  label={formatRoleLabel(selectedInvitation.roleCode)}
                  code={selectedInvitation.roleCode}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Membership Type</span>
                <span className="font-semibold text-slate-800">
                  {getInvitationTargetTypeLabel(selectedInvitation.targetType)}
                </span>
              </div>

              {selectedInvitation.invitedByName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Invited By</span>
                  <span className="font-medium text-slate-800">
                    {selectedInvitation.invitedByName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Recipient Account</span>
                <span className="font-mono text-slate-800">
                  {selectedInvitation.email}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Invitation Date</span>
                <span className="text-slate-700">
                  {formatDateTime(selectedInvitation.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">
                  {selectedInvitation.status === 'ACCEPTED'
                    ? 'Accepted Date'
                    : selectedInvitation.status === 'REJECTED'
                    ? 'Declined Date'
                    : 'Expiration Date'}
                </span>
                <span className="text-slate-700">
                  {selectedInvitation.status === 'ACCEPTED'
                    ? formatDateTime(selectedInvitation.acceptedAt)
                    : selectedInvitation.status === 'REJECTED'
                    ? formatDateTime(selectedInvitation.revokedAt)
                    : formatDateTime(selectedInvitation.expiresAt)}
                </span>
              </div>
            </div>

            {selectedInvitation.status === 'PENDING' && (
              <>
                <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Accepting this invitation activates your{' '}
                    <strong>{formatRoleLabel(selectedInvitation.roleCode)}</strong>{' '}
                    membership in{' '}
                    <strong>{selectedInvitation.organizationName}</strong> and makes
                    it available in your Workspace Switcher while preserving all of
                    your existing school memberships.
                  </p>
                </div>

                {confirmingReject ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                    <p className="font-semibold text-rose-900">
                      Are you sure you want to reject the invitation from{' '}
                      {selectedInvitation.organizationName}?
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(processingAction)}
                        onClick={() => setConfirmingReject(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={processingAction === 'reject'}
                        disabled={Boolean(processingAction)}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        onClick={() => void handleRejectInvitation()}
                      >
                        Confirm Reject Invitation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      disabled={Boolean(processingAction)}
                      className="text-rose-600 hover:bg-rose-50"
                      leftIcon={<XCircle className="w-4 h-4" />}
                      onClick={() => setConfirmingReject(true)}
                    >
                      Reject Invitation
                    </Button>
                    <Button
                      variant="primary"
                      isLoading={processingAction === 'accept'}
                      disabled={Boolean(processingAction)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => void handleAcceptInvitation()}
                    >
                      Accept Invitation
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );

  const hasShellContext =
    activeWorkspace === 'PLATFORM' ||
    (activeWorkspace === 'SCHOOL' && Boolean(activeOrganization));

  if (hasShellContext) {
    return (
      <AppShell pageTitle="My Invitations" breadcrumbParent="Account">
        {inboxContent}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <span className="font-extrabold text-sm tracking-tight">SF</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            School<span className="text-indigo-600">Forge</span>
          </span>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/workspaces')}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Back to Workspaces
        </Button>
      </div>

      <div className="max-w-5xl w-full mx-auto my-8 flex-1">{inboxContent}</div>

      <div className="text-center text-xs text-slate-400">
        <span>SchoolForge Multi-Tenant SaaS Platform • Authenticated Invitation Inbox</span>
      </div>
    </div>
  );
};
