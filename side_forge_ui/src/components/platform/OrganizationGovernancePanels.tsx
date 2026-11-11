import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  KeyRound,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../lib/api-client';
import { platformDashboardApi } from '../../services/platformDashboardApi';
import {
  normalizeInvitationLinkForFrontend,
  rememberInvitationTokenInSession,
} from '../../types/accountAndInvitations';
import {
  FeatureEntitlementItem,
  OrganizationEntitlementsResponse,
  PlatformFeature,
} from '../../types/auth';
import {
  OrganizationAdminDetailResponse,
  OrganizationUsageResponse,
} from '../../types/platformDashboard';
import { ALL_PLATFORM_FEATURES } from '../../types/platformSubscription';
import {
  getInvitationStatusBadge,
  getInvitationTargetTypeLabel,
  InvitationDispatchResponse,
  InvitationResponse,
} from '../../types/staffManagement';
import { formatOnboardingDate } from './OnboardingRequestDetailsModal';
import { Badge, CounterLabel, IdLabel, RoleTag } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FormField, Input, Textarea } from '../ui/FormControls';
import { EmptyState, InlineAlert, LoadingState } from '../ui/StateViews';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

function splitContactName(fullName?: string | null): {
  firstName: string;
  lastName: string;
} {
  if (!fullName || !fullName.trim()) {
    return { firstName: '', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

// ============================================================================
// 1. Platform-Level School Administrator Invitations Panel
// ============================================================================

export interface OrganizationInvitationsPanelProps {
  organization: OrganizationAdminDetailResponse;
  applicantContactName?: string | null;
  canManageOrganization: boolean;
  onOrganizationUpdated?: () => void;
}

export const OrganizationInvitationsPanel: React.FC<
  OrganizationInvitationsPanelProps
> = ({
  organization,
  applicantContactName,
  canManageOrganization,
  onOrganizationUpdated,
}) => {
  const toast = useToast();
  const isOrgActive = organization.status === 'ACTIVE';

  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [expiryHours, setExpiryHours] = useState('168');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [latestDispatch, setLatestDispatch] =
    useState<InvitationDispatchResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'link' | 'token' | null>(null);

  const [resendingId, setResendingId] = useState<number | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!canManageOrganization || !isOrgActive) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await platformDashboardApi.listOrganizationInvitations(
        organization.id
      );
      setInvitations(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load organization invitations.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [canManageOrganization, isOrgActive, organization.id]);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handlePrefillOfficialContact = () => {
    const { firstName: fn, lastName: ln } = splitContactName(applicantContactName);
    setEmail(organization.contactEmail || '');
    setFirstName(fn || 'School');
    setLastName(ln || 'Administrator');
    setPhoneNumber(organization.contactPhone || '');
    setFormError(null);
  };

  const handleCopyText = async (text: string, field: 'link' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(
        field === 'link' ? 'Invitation link copied' : 'Invitation token copied',
        'Copied to your clipboard.'
      );
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Copy failed', 'Please select and copy the text manually.');
    }
  };

  const handleDispatchInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInvite) return;
    setFormError(null);
    setActionError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setFormError('Please enter a valid recipient email address.');
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !INDIAN_PHONE_REGEX.test(trimmedPhone)) {
      setFormError(
        'Phone number must be a valid 10-digit Indian mobile number (optional +91 prefix).'
      );
      return;
    }

    const parsedHours = expiryHours.trim() ? Number(expiryHours) : 168;
    if (Number.isNaN(parsedHours) || parsedHours < 1 || parsedHours > 720) {
      setFormError('Expiry hours must be between 1 and 720 hours (up to 30 days).');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const dispatched = await platformDashboardApi.createSchoolAdminInvitation(
        organization.id,
        {
          email: trimmedEmail,
          roleCode: 'SCHOOL_ADMIN',
          targetType: 'SCHOOL_ADMIN',
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phoneNumber: trimmedPhone || null,
          expiryHours: parsedHours,
        }
      );

      if (dispatched.invitationToken) {
        rememberInvitationTokenInSession(
          dispatched.invitationToken,
          dispatched.invitation?.id
        );
      }
      setLatestDispatch(dispatched);
      setShowInviteForm(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      toast.success(
        'School Admin invitation dispatched',
        `Invitation sent to ${dispatched.invitation.email}.`
      );
      await fetchInvitations();
      onOrganizationUpdated?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to dispatch School Administrator invitation.';
      setFormError(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResend = async (inv: InvitationResponse) => {
    if (resendingId !== null) return;
    setActionError(null);
    setResendingId(inv.id);
    try {
      const dispatched = await platformDashboardApi.resendOrganizationInvitation(
        organization.id,
        inv.id
      );
      if (dispatched.invitationToken) {
        rememberInvitationTokenInSession(
          dispatched.invitationToken,
          dispatched.invitation?.id
        );
      }
      setLatestDispatch(dispatched);
      toast.success(
        'Invitation resent',
        `A fresh invitation token was generated for ${inv.email}.`
      );
      await fetchInvitations();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to resend invitation.';
      setActionError(msg);
      toast.error('Resend failed', msg);
    } finally {
      setResendingId(null);
    }
  };

  const handleConfirmRevoke = async (inv: InvitationResponse) => {
    if (revokingId !== null) return;
    setActionError(null);
    setRevokingId(inv.id);
    try {
      await platformDashboardApi.revokeOrganizationInvitation(
        organization.id,
        inv.id
      );
      setConfirmRevokeId(null);
      if (latestDispatch?.invitation?.id === inv.id) {
        setLatestDispatch(null);
      }
      toast.info(
        'Invitation revoked',
        `Revoked pending invitation for ${inv.email}.`
      );
      await fetchInvitations();
      onOrganizationUpdated?.();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to revoke invitation.';
      setActionError(msg);
      toast.error('Revoke failed', msg);
    } finally {
      setRevokingId(null);
    }
  };

  if (!canManageOrganization) {
    return (
      <InlineAlert variant="warning" title="Permission Required">
        Viewing and dispatching platform-level School Administrator invitations requires the{' '}
        <span className="font-mono font-semibold">platform.organization.manage</span> permission.
      </InlineAlert>
    );
  }

  if (!isOrgActive) {
    return (
      <InlineAlert variant="warning" title="Active Organization Required">
        This organization is currently <strong>{organization.status}</strong>. The backend requires an organization to be{' '}
        <strong>ACTIVE</strong> before platform-level School Administrator invitations can be viewed, dispatched, resent, or revoked.
      </InlineAlert>
    );
  }

  const normalizedDispatchUrl = latestDispatch
    ? normalizeInvitationLinkForFrontend(latestDispatch.invitationLink)
    : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900">
              Platform-Level School Administrator Invitations
            </h3>
            <CounterLabel count={invitations.length} />
          </div>
          <p className="text-xs text-slate-500">
            Invite initial or additional <span className="font-mono font-medium">SCHOOL_ADMIN</span> users for {organization.name}. Accounts are provisioned or linked only when the recipient accepts the invitation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isLoading}
            onClick={() => void fetchInvitations()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant={showInviteForm ? 'outline' : 'primary'}
            size="sm"
            onClick={() => {
              setFormError(null);
              setShowInviteForm((prev) => !prev);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {showInviteForm ? 'Cancel' : 'Invite School Admin'}
          </Button>
        </div>
      </div>

      {actionError && (
        <InlineAlert variant="error" title="Invitation Action Failed">
          {actionError}
        </InlineAlert>
      )}

      {latestDispatch && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-950 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Invitation Ready for {latestDispatch.invitation.email} (
                {latestDispatch.invitation.roleCode})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLatestDispatch(null)}
              className="text-emerald-700 hover:text-emerald-900 text-[11px] font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-emerald-800 leading-relaxed">
            Share the single-use acceptance link below with the school administrator. Single-use tokens are hashed at rest and shown only at dispatch/resend time.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={normalizedDispatchUrl}
                readOnly
                className="font-mono text-xs bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleCopyText(normalizedDispatchUrl, 'link')}
                leftIcon={
                  copiedField === 'link' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
              >
                {copiedField === 'link' ? 'Copied' : 'Copy Link'}
              </Button>
              <a
                href={normalizedDispatchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shrink-0"
              >
                <span>Open</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {latestDispatch.invitationToken && (
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-emerald-800">
                <span className="font-mono truncate">
                  Token: {latestDispatch.invitationToken}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyText(latestDispatch.invitationToken, 'token')
                  }
                  className="font-semibold underline hover:text-emerald-950 shrink-0 cursor-pointer"
                >
                  {copiedField === 'token' ? 'Token Copied' : 'Copy Raw Token'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showInviteForm && (
        <form
          onSubmit={handleDispatchInvitation}
          noValidate
          className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-4 space-y-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>Dispatch School Administrator Invitation</span>
            </div>
            {organization.contactEmail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrefillOfficialContact}
              >
                Pre-fill Official School Contact ({organization.contactEmail})
              </Button>
            )}
          </div>

          {formError && (
            <InlineAlert variant="error" title="Validation Error">
              {formError}
            </InlineAlert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Recipient Email Address" htmlFor="plat-inv-email" required>
              <Input
                id="plat-inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@school.edu.in"
                required
              />
            </FormField>

            <FormField
              label="Assigned Organization Role"
              htmlFor="plat-inv-role"
              hint="Platform onboarding invitations exclusively provision SCHOOL_ADMIN."
            >
              <Input
                id="plat-inv-role"
                value="SCHOOL_ADMIN (School Administrator)"
                disabled
                readOnly
              />
            </FormField>

            <FormField label="Recipient First Name" htmlFor="plat-inv-fname">
              <Input
                id="plat-inv-fname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name (optional)"
                maxLength={100}
              />
            </FormField>

            <FormField label="Recipient Last Name" htmlFor="plat-inv-lname">
              <Input
                id="plat-inv-lname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name (optional)"
                maxLength={100}
              />
            </FormField>

            <FormField
              label="Mobile Number (10-digit Indian)"
              htmlFor="plat-inv-phone"
              hint="Optional 10-digit mobile number starting with 6–9"
            >
              <Input
                id="plat-inv-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                maxLength={13}
              />
            </FormField>

            <FormField
              label="Token Validity (Hours)"
              htmlFor="plat-inv-expiry"
              hint="Default: 168 hours (7 days). Range: 1–720 hours."
            >
              <Input
                id="plat-inv-expiry"
                type="number"
                min={1}
                max={720}
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmittingInvite}
              onClick={() => setShowInviteForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingInvite}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send School Admin Invitation
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <LoadingState label="Loading organization invitations..." />
      ) : loadError ? (
        <InlineAlert variant="error" title="Unable to load invitations">
          {loadError}
        </InlineAlert>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-6 h-6" />}
          title="No invitations recorded for this organization"
          description="Use 'Invite School Admin' above to dispatch an initial or additional SCHOOL_ADMIN invitation."
        />
      ) : (
        <div className="space-y-2.5">
          {invitations.map((inv) => {
            const statusMeta = getInvitationStatusBadge(inv.status);
            const recipientName = [inv.recipientFirstName, inv.recipientLastName]
              .filter(Boolean)
              .join(' ');
            const canResend =
              inv.status === 'PENDING' ||
              inv.status === 'EXPIRED' ||
              inv.status === 'REJECTED';
            const canRevoke = inv.status === 'PENDING';
            const isConfirmingRevoke = confirmRevokeId === inv.id;

            return (
              <div
                key={inv.id}
                className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 text-xs shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-slate-900">
                        {inv.email}
                      </span>
                      <RoleTag label="School Admin" code={inv.roleCode} />
                      <Badge variant={statusMeta.variant} dot>
                        {statusMeta.label}
                      </Badge>
                      <IdLabel>#INV-{inv.id}</IdLabel>
                    </div>
                    <div className="text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {recipientName && (
                        <span>
                          Recipient: <strong className="text-slate-800">{recipientName}</strong>
                        </span>
                      )}
                      {inv.recipientPhone && (
                        <span>
                          Phone: <strong className="text-slate-800">{inv.recipientPhone}</strong>
                        </span>
                      )}
                      <span>
                        Target:{' '}
                        <strong className="text-slate-800">
                          {getInvitationTargetTypeLabel(inv.targetType)}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      <span>Sent: {formatOnboardingDate(inv.lastSentAt || inv.createdAt)}</span>
                      <span>•</span>
                      <span>Expires: {formatOnboardingDate(inv.expiresAt)}</span>
                      {inv.resendCount > 0 && (
                        <>
                          <span>•</span>
                          <span>Resent {inv.resendCount}x</span>
                        </>
                      )}
                      {inv.acceptedAt && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">
                            Accepted {formatOnboardingDate(inv.acceptedAt)} (User #
                            {inv.acceptedByUserId})
                          </span>
                        </>
                      )}
                      {inv.revokedAt && (
                        <>
                          <span>•</span>
                          <span className="text-rose-700 font-medium">
                            Revoked {formatOnboardingDate(inv.revokedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isConfirmingRevoke ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                        <span className="text-[11px] font-semibold text-rose-800">
                          Revoke invite?
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={revokingId === inv.id}
                          onClick={() => setConfirmRevokeId(null)}
                        >
                          No
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          isLoading={revokingId === inv.id}
                          onClick={() => void handleConfirmRevoke(inv)}
                        >
                          Yes, Revoke
                        </Button>
                      </div>
                    ) : (
                      <>
                        {canResend && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            isLoading={resendingId === inv.id}
                            disabled={revokingId === inv.id}
                            onClick={() => void handleResend(inv)}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Resend
                          </Button>
                        )}
                        {canRevoke && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={resendingId === inv.id}
                            onClick={() => setConfirmRevokeId(inv.id)}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Revoke
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. Per-Organization Feature Entitlement Overrides Panel
// ============================================================================

export interface OrganizationEntitlementsPanelProps {
  organization: OrganizationAdminDetailResponse;
  canManageEntitlements: boolean;
  onOrganizationUpdated?: () => void;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  ACADEMIC_MANAGEMENT: 'Academic sessions, classes, sections and subjects',
  STUDENT_MANAGEMENT: 'Core student profiles, guardians and academic session enrollments',
  STAFF_MANAGEMENT: 'Teaching and non-teaching staff profiles and class/subject assignments',
  TIMETABLE: 'Class timetable configuration, periods, slots and publishing',
  ATTENDANCE: 'Daily student and staff attendance tracking and audit logs',
  EXAMINATION_AND_RESULTS: 'Exam scheduling, marks entry, result calculation and report cards',
  FEES_AND_FINANCE: 'Fee structures, student demands, concessions, fee collection and receipts',
  HOMEWORK_AND_ASSIGNMENTS: 'Teacher homework assignments, student submissions and evaluations',
  DASHBOARD_AND_REPORTS: 'Role-based school dashboards, analytical reports and exports',
  REPORT_EXPORTS: 'CSV, Excel and PDF analytical report exports',
  COMMUNICATION_AND_NOTIFICATIONS: 'Targeted school announcements, circulars and notifications',
  PARENT_PORTAL: 'Dedicated parent portal for multi-child monitoring and homework submission',
  FILE_STORAGE: 'Tenant-isolated organization file storage and attachments',
  TRANSPORT: 'School bus routes, vehicle tracking and student transport allocation',
  LIBRARY: 'Library catalog, book circulation and fine management',
  INVENTORY: 'School assets, supplies and inventory tracking',
  HR_AND_PAYROLL: 'Staff payroll processing, leave management and salary slips',
};

export const OrganizationEntitlementsPanel: React.FC<
  OrganizationEntitlementsPanelProps
> = ({ organization, canManageEntitlements, onOrganizationUpdated }) => {
  const toast = useToast();

  const [entitlementsData, setEntitlementsData] =
    useState<OrganizationEntitlementsResponse | null>(
      organization.entitlements || null
    );
  const [isLoading, setIsLoading] = useState(!organization.entitlements);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<FeatureEntitlementItem | null>(
    null
  );
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(true);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState<string>('');
  const [confirmSaveOverride, setConfirmSaveOverride] = useState<boolean>(false);
  const [isSavingOverride, setIsSavingOverride] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const [confirmRemoveFeature, setConfirmRemoveFeature] =
    useState<PlatformFeature | null>(null);
  const [removingFeature, setRemovingFeature] =
    useState<PlatformFeature | null>(null);

  const fetchEntitlements = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await platformDashboardApi.getOrganizationEntitlements(
        organization.id
      );
      setEntitlementsData(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load organization feature entitlements.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    if (organization.entitlements) {
      setEntitlementsData(organization.entitlements);
    }
    void fetchEntitlements();
  }, [fetchEntitlements, organization.entitlements]);

  const handleStartEditOverride = (item: FeatureEntitlementItem) => {
    setEditingItem(item);
    setOverrideEnabled(item.overridden ? item.enabled : !item.includedInPlan);
    setOverrideReason(item.overrideReason || '');
    setOverrideExpiresAt(item.overrideExpiresAt || '');
    setConfirmSaveOverride(false);
    setOverrideError(null);
  };

  const handleValidateBeforeConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideError(null);
    const trimmedReason = overrideReason.trim();
    if (!trimmedReason) {
      setOverrideError('Please provide an administrative reason for this override.');
      return;
    }
    if (trimmedReason.length > 500) {
      setOverrideError('Reason must be 500 characters or fewer.');
      return;
    }
    setConfirmSaveOverride(true);
  };

  const handleConfirmSaveOverride = async () => {
    if (!editingItem || isSavingOverride) return;
    setOverrideError(null);
    setIsSavingOverride(true);
    try {
      const updated = await platformDashboardApi.setFeatureEntitlementOverride(
        organization.id,
        editingItem.feature,
        {
          enabled: overrideEnabled,
          reason: overrideReason.trim(),
          expiresAt: overrideExpiresAt.trim() || null,
        }
      );
      setEntitlementsData(updated);
      setEditingItem(null);
      setConfirmSaveOverride(false);
      toast.success(
        'Feature override saved',
        `${editingItem.displayName} is now ${
          overrideEnabled ? 'enabled' : 'disabled'
        } via organization override.`
      );
      onOrganizationUpdated?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to save feature entitlement override.';
      setOverrideError(msg);
      toast.error('Override failed', msg);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleConfirmRemoveOverride = async (feature: PlatformFeature) => {
    if (removingFeature !== null) return;
    setOverrideError(null);
    setRemovingFeature(feature);
    try {
      const updated =
        await platformDashboardApi.removeFeatureEntitlementOverride(
          organization.id,
          feature
        );
      setEntitlementsData(updated);
      setConfirmRemoveFeature(null);
      if (editingItem?.feature === feature) {
        setEditingItem(null);
      }
      toast.info(
        'Override removed',
        `Reverted ${feature} to the subscription plan default.`
      );
      onOrganizationUpdated?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to remove feature entitlement override.';
      setOverrideError(msg);
      toast.error('Remove override failed', msg);
    } finally {
      setRemovingFeature(null);
    }
  };

  const items: FeatureEntitlementItem[] =
    entitlementsData?.entitlements ||
    ALL_PLATFORM_FEATURES.map((f) => ({
      feature: f.code,
      displayName: f.label,
      enabled: false,
      includedInPlan: false,
      overridden: false,
      overrideReason: null,
      overrideExpiresAt: null,
    }));

  const enabledCount = items.filter((i) => i.enabled).length;
  const planIncludedCount = items.filter((i) => i.includedInPlan).length;
  const overriddenCount = items.filter((i) => i.overridden).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900">
              Per-Organization Feature Entitlements &amp; Overrides
            </h3>
            <Badge variant="primary">
              Plan: {entitlementsData?.planName || 'Unassigned'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Effective Enabled: <strong>{enabledCount}</strong> / {items.length} modules • Included in Plan: <strong>{planIncludedCount}</strong> • Active Overrides: <strong>{overriddenCount}</strong>
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isLoading}
          onClick={() => void fetchEntitlements()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      <InlineAlert variant="info" title="Entitlement & Authorization Enforcement">
        Enabling a feature override grants module access on top of the school&apos;s subscription plan while the organization is <strong>ACTIVE</strong> and its subscription is operational (<strong>TRIAL</strong>, <strong>ACTIVE</strong>, or <strong>PAST_DUE</strong>). It does not bypass school-level role permissions or organization suspension.
      </InlineAlert>

      {!canManageEntitlements && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Read-only view — <span className="font-mono font-semibold">platform.entitlement.manage</span> permission is required to modify organization feature overrides.
          </span>
        </div>
      )}

      {overrideError && (
        <InlineAlert variant="error" title="Feature Override Error">
          {overrideError}
        </InlineAlert>
      )}

      {editingItem && canManageEntitlements && (
        <form
          onSubmit={handleValidateBeforeConfirm}
          noValidate
          className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>
                Configure Override: {editingItem.displayName} (
                <span className="font-mono">{editingItem.feature}</span>)
              </span>
            </div>
            <Badge variant={editingItem.includedInPlan ? 'success' : 'neutral'}>
              {editingItem.includedInPlan ? 'Included in Plan' : 'Not in Plan'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField
              label="Override Action"
              htmlFor="feat-ov-enabled"
              required
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideEnabled(true);
                    setConfirmSaveOverride(false);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    overrideEnabled
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Enable Feature
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOverrideEnabled(false);
                    setConfirmSaveOverride(false);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    !overrideEnabled
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Disable Feature
                </button>
              </div>
            </FormField>

            <FormField
              label="Optional Expiry Date"
              htmlFor="feat-ov-expiry"
              hint="Leave blank for an indefinite override."
            >
              <Input
                id="feat-ov-expiry"
                type="date"
                value={overrideExpiresAt}
                onChange={(e) => {
                  setOverrideExpiresAt(e.target.value);
                  setConfirmSaveOverride(false);
                }}
              />
            </FormField>
          </div>

          <FormField
            label="Reason for Override"
            htmlFor="feat-ov-reason"
            hint="Recorded in the platform audit log (e.g., promotional access, pilot evaluation, compliance restriction)."
            required
          >
            <Textarea
              id="feat-ov-reason"
              rows={2}
              maxLength={500}
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setConfirmSaveOverride(false);
              }}
              placeholder="Explain why this feature is being overridden for this organization..."
              required
            />
          </FormField>

          {confirmSaveOverride ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-950 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Confirm saving override to{' '}
                  <strong>{overrideEnabled ? 'ENABLE' : 'DISABLE'}</strong>{' '}
                  {editingItem.displayName}
                  {overrideExpiresAt ? ` until ${overrideExpiresAt}` : ' (no expiry)'}?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSavingOverride}
                  onClick={() => setConfirmSaveOverride(false)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isLoading={isSavingOverride}
                  onClick={() => void handleConfirmSaveOverride()}
                >
                  Confirm &amp; Save Override
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Review &amp; Save Override
              </Button>
            </div>
          )}
        </form>
      )}

      {isLoading && !entitlementsData ? (
        <LoadingState label="Loading organization feature entitlements..." />
      ) : loadError && !entitlementsData ? (
        <InlineAlert variant="error" title="Unable to load entitlements">
          {loadError}
        </InlineAlert>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {items.map((item) => {
            const isConfirmingRemove = confirmRemoveFeature === item.feature;
            const description =
              FEATURE_DESCRIPTIONS[item.feature] || item.displayName;

            return (
              <div
                key={item.feature}
                className={`rounded-xl border p-3.5 text-xs transition-colors ${
                  item.overridden
                    ? 'border-indigo-200/90 bg-indigo-50/20'
                    : 'border-slate-200/80 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">
                        {item.displayName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {item.feature}
                      </span>
                      <Badge variant={item.enabled ? 'success' : 'neutral'} dot>
                        {item.enabled ? 'Effective: Enabled' : 'Effective: Disabled'}
                      </Badge>
                      <Badge variant={item.includedInPlan ? 'info' : 'neutral'}>
                        {item.includedInPlan ? 'In Plan' : 'Not in Plan'}
                      </Badge>
                      {item.overridden && (
                        <Badge variant="warning">
                          Overridden ({item.enabled ? 'Enabled' : 'Disabled'})
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600">{description}</p>
                    {item.overridden && (
                      <div className="mt-1.5 rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-950 space-y-0.5">
                        <p>
                          <strong>Override Reason:</strong>{' '}
                          {item.overrideReason || '—'}
                        </p>
                        <p className="text-amber-800">
                          <strong>Expiry:</strong>{' '}
                          {item.overrideExpiresAt
                            ? item.overrideExpiresAt
                            : 'No expiry (Active until removed)'}
                        </p>
                      </div>
                    )}
                  </div>

                  {canManageEntitlements && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConfirmingRemove ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                          <span className="text-[11px] font-semibold text-rose-800">
                            Revert to plan default?
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={removingFeature === item.feature}
                            onClick={() => setConfirmRemoveFeature(null)}
                          >
                            No
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            isLoading={removingFeature === item.feature}
                            onClick={() =>
                              void handleConfirmRemoveOverride(item.feature)
                            }
                          >
                            Revert
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEditOverride(item)}
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                          >
                            {item.overridden ? 'Edit Override' : 'Override'}
                          </Button>
                          {item.overridden && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setConfirmRemoveFeature(item.feature)
                              }
                              className="text-rose-600 hover:bg-rose-50 border-rose-200"
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            >
                              Revert
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. Student Capacity Limit Overrides Panel
// ============================================================================

export interface OrganizationStudentCapacityPanelProps {
  organizationId: number;
  organizationName: string;
  initialUsage?: OrganizationUsageResponse | null;
  hasActiveSubscription: boolean;
  canManageEntitlements: boolean;
  onUpdated?: (updatedUsage: OrganizationUsageResponse) => void;
}

export const OrganizationStudentCapacityPanel: React.FC<
  OrganizationStudentCapacityPanelProps
> = ({
  organizationId,
  organizationName,
  initialUsage = null,
  hasActiveSubscription,
  canManageEntitlements,
  onUpdated,
}) => {
  const toast = useToast();

  const [usage, setUsage] = useState<OrganizationUsageResponse | null>(
    initialUsage
  );
  const [isLoading, setIsLoading] = useState(!initialUsage);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [overrideLimitInput, setOverrideLimitInput] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearReason, setClearReason] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await platformDashboardApi.getOrganizationUsage(
        organizationId
      );
      setUsage(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to load organization student capacity usage.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (initialUsage) {
      setUsage(initialUsage);
    }
    void fetchUsage();
  }, [fetchUsage, initialUsage]);

  const handleOpenEditForm = () => {
    const currentPlanLimit = usage?.planStudentLimit ?? 250;
    const defaultTarget =
      usage?.overrideStudentLimit ?? currentPlanLimit + 100;
    setOverrideLimitInput(String(defaultTarget));
    setOverrideExpiresAt(usage?.overrideExpiresAt || '');
    setOverrideReason(usage?.overrideReason || '');
    setConfirmSave(false);
    setFormError(null);
    setShowForm(true);
  };

  const handleValidateBeforeConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedLimit = Number(overrideLimitInput);
    if (
      !overrideLimitInput.trim() ||
      Number.isNaN(parsedLimit) ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0
    ) {
      setFormError('Override student limit must be a positive whole number.');
      return;
    }

    const trimmedReason = overrideReason.trim();
    if (!trimmedReason) {
      setFormError('Please provide an administrative reason for the student limit override.');
      return;
    }
    if (trimmedReason.length > 500) {
      setFormError('Reason must be 500 characters or fewer.');
      return;
    }

    setConfirmSave(true);
  };

  const handleConfirmSaveOverride = async () => {
    if (isSaving) return;
    setFormError(null);
    setIsSaving(true);
    try {
      const parsedLimit = Number(overrideLimitInput);
      const updated = await platformDashboardApi.setStudentLimitOverride(
        organizationId,
        {
          overrideStudentLimit: parsedLimit,
          reason: overrideReason.trim(),
          expiresAt: overrideExpiresAt.trim() || null,
        }
      );
      setUsage(updated);
      setShowForm(false);
      setConfirmSave(false);
      toast.success(
        'Student capacity override saved',
        `Effective student limit for ${organizationName} is now ${updated.effectiveStudentLimit?.toLocaleString(
          'en-IN'
        )}.`
      );
      onUpdated?.(updated);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to update student capacity limit override.';
      setFormError(msg);
      toast.error('Override failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmClearOverride = async () => {
    if (isClearing) return;
    setFormError(null);
    setIsClearing(true);
    try {
      const updated = await platformDashboardApi.clearStudentLimitOverride(
        organizationId,
        clearReason.trim() || 'Cleared student limit override via Platform Admin'
      );
      setUsage(updated);
      setConfirmClear(false);
      setClearReason('');
      setShowForm(false);
      toast.info(
        'Student capacity override cleared',
        `Reverted ${organizationName} to its plan limit (${
          updated.planStudentLimit?.toLocaleString('en-IN') ?? '—'
        }).`
      );
      onUpdated?.(updated);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to clear student capacity override.';
      setFormError(msg);
      toast.error('Clear override failed', msg);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading && !usage) {
    return <LoadingState label="Loading student capacity and enrollment metrics..." />;
  }

  if (loadError && !usage) {
    return (
      <InlineAlert variant="error" title="Unable to load student capacity">
        {loadError}
      </InlineAlert>
    );
  }

  const planLimit = usage?.planStudentLimit ?? null;
  const overrideLimit = usage?.overrideStudentLimit ?? null;
  const effectiveLimit = usage?.effectiveStudentLimit ?? planLimit;
  const enrolledCount = usage?.enrolledStudentsCount ?? 0;
  const profilesCount = usage?.activeStudentProfilesCount ?? 0;
  const remainingCapacity = usage?.remainingStudentCapacity ?? 0;
  const utilization = usage?.utilizationPercentage ?? 0;
  const hasOverride = overrideLimit !== null && overrideLimit !== undefined;
  const limitDiff =
    planLimit !== null && effectiveLimit !== null
      ? effectiveLimit - planLimit
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900">
              Student Enrollment Capacity &amp; Limit Overrides
            </h3>
            {hasOverride ? (
              <Badge variant="warning" dot>
                Custom Capacity Override Active
              </Badge>
            ) : (
              <Badge variant="neutral">Using Plan Default Limit</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Grant a temporary or custom student enrollment limit above (or different from) the subscription plan&apos;s default capacity without modifying the underlying plan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isLoading}
            onClick={() => void fetchUsage()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          {canManageEntitlements && hasActiveSubscription && (
            <Button
              type="button"
              variant={showForm ? 'outline' : 'primary'}
              size="sm"
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                } else {
                  handleOpenEditForm();
                }
              }}
              leftIcon={<Sliders className="w-3.5 h-3.5" />}
            >
              {showForm
                ? 'Cancel'
                : hasOverride
                ? 'Modify Override'
                : 'Set Capacity Override'}
            </Button>
          )}
        </div>
      </div>

      {!hasActiveSubscription && (
        <InlineAlert variant="warning" title="No Active Subscription Assigned">
          This organization does not currently have an active subscription record. Assign a subscription plan first before configuring a student capacity override.
        </InlineAlert>
      )}

      {!canManageEntitlements && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Read-only view — <span className="font-mono font-semibold">platform.entitlement.manage</span> permission is required to set or clear student capacity overrides.
          </span>
        </div>
      )}

      {formError && (
        <InlineAlert variant="error" title="Student Capacity Override Error">
          {formError}
        </InlineAlert>
      )}

      {/* Capacity Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
          <span className="text-slate-500 block">Plan Default Limit</span>
          <span className="text-base font-bold text-slate-900 block tabular-nums">
            {planLimit !== null ? planLimit.toLocaleString('en-IN') : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block">
            {usage?.planName ? `${usage.planName} (${usage.planCode})` : 'No plan'}
          </span>
        </div>

        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-3.5 space-y-1">
          <span className="text-slate-600 font-medium block">
            Effective Student Limit
          </span>
          <span className="text-base font-bold text-indigo-700 block tabular-nums">
            {effectiveLimit !== null
              ? effectiveLimit.toLocaleString('en-IN')
              : '—'}
          </span>
          <span className="text-[11px] font-medium text-indigo-600 block">
            {limitDiff > 0
              ? `+${limitDiff.toLocaleString('en-IN')} above plan limit`
              : limitDiff < 0
              ? `${limitDiff.toLocaleString('en-IN')} vs plan limit`
              : 'Matches plan default'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
          <span className="text-slate-500 block">Active Enrolled Students</span>
          <span className="text-base font-bold text-slate-900 block tabular-nums">
            {enrolledCount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {profilesCount.toLocaleString('en-IN')} active student profiles
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1">
          <span className="text-slate-500 block">Remaining Capacity</span>
          <span
            className={`text-base font-bold block tabular-nums ${
              usage?.limitReached ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {remainingCapacity.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {utilization.toFixed(1)}% utilized
          </span>
        </div>
      </div>

      {/* Existing Override Banner */}
      {hasOverride && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-950 font-semibold">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Active Capacity Override: {overrideLimit?.toLocaleString('en-IN')} Students
                </span>
              </div>
              <p className="text-amber-900">
                <strong>Reason:</strong> {usage?.overrideReason || '—'}
              </p>
              <p className="text-amber-800">
                <strong>Expiry Date:</strong>{' '}
                {usage?.overrideExpiresAt
                  ? usage.overrideExpiresAt
                  : 'No expiry (Active until cleared)'}
              </p>
            </div>

            {canManageEntitlements && !confirmClear && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmClear(true)}
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear Override
              </Button>
            )}
          </div>

          {confirmClear && canManageEntitlements && (
            <div className="pt-2 border-t border-amber-200/80 space-y-2">
              <p className="font-semibold text-rose-900">
                Confirm clearing this student capacity override? The effective limit will revert to the plan default ({planLimit?.toLocaleString('en-IN') ?? '—'}).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  placeholder="Optional reason for clearing override..."
                  className="max-w-sm bg-white"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isClearing}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  isLoading={isClearing}
                  onClick={() => void handleConfirmClearOverride()}
                >
                  Confirm Clear Override
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set / Modify Override Form */}
      {showForm && canManageEntitlements && hasActiveSubscription && (
        <form
          onSubmit={handleValidateBeforeConfirm}
          noValidate
          className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2">
            <span className="font-semibold text-slate-900">
              {hasOverride
                ? 'Modify Student Capacity Limit Override'
                : 'Set Custom Student Capacity Limit Override'}
            </span>
            <span className="text-slate-500">
              Plan Default: <strong>{planLimit?.toLocaleString('en-IN') ?? '—'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField
              label="Override Student Limit"
              htmlFor="cap-ov-limit"
              hint="Total active enrolled students permitted across non-completed academic sessions."
              required
            >
              <Input
                id="cap-ov-limit"
                type="number"
                min={1}
                step={1}
                value={overrideLimitInput}
                onChange={(e) => {
                  setOverrideLimitInput(e.target.value);
                  setConfirmSave(false);
                }}
                placeholder="e.g., 500"
                required
              />
            </FormField>

            <FormField
              label="Optional Expiry Date"
              htmlFor="cap-ov-expiry"
              hint="Leave blank for an indefinite override."
            >
              <Input
                id="cap-ov-expiry"
                type="date"
                value={overrideExpiresAt}
                onChange={(e) => {
                  setOverrideExpiresAt(e.target.value);
                  setConfirmSave(false);
                }}
              />
            </FormField>
          </div>

          <FormField
            label="Reason for Capacity Override"
            htmlFor="cap-ov-reason"
            hint="Recorded in the subscription and platform audit logs."
            required
          >
            <Textarea
              id="cap-ov-reason"
              rows={2}
              maxLength={500}
              value={overrideReason}
              onChange={(e) => {
                setOverrideReason(e.target.value);
                setConfirmSave(false);
              }}
              placeholder="e.g., Mid-session admission expansion approved by platform management..."
              required
            />
          </FormField>

          {confirmSave ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-950 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Confirm setting student limit override to{' '}
                  <strong>
                    {Number(overrideLimitInput).toLocaleString('en-IN')} students
                  </strong>{' '}
                  (Plan default: {planLimit?.toLocaleString('en-IN') ?? '—'})
                  {overrideExpiresAt ? ` until ${overrideExpiresAt}` : ''}?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setConfirmSave(false)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isLoading={isSaving}
                  onClick={() => void handleConfirmSaveOverride()}
                >
                  Confirm &amp; Apply Override
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Review &amp; Apply Override
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};









