import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import {
  BOARD_AFFILIATION_LABELS,
  MANAGEMENT_SYSTEM_LABELS,
  OnboardingRequestResponse,
  OnboardingStatus,
  PlatformOnboardingAuditItem,
  STUDENT_STRENGTH_LABELS,
} from '../../types/onboarding';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { InlineAlert, LoadingState } from '../ui/StateViews';

export function getOnboardingStatusBadgeMeta(status: OnboardingStatus): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending Review', variant: 'warning' };
    case 'UNDER_REVIEW':
      return { label: 'Under Review', variant: 'info' };
    case 'APPROVED':
      return { label: 'Approved', variant: 'success' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function formatOnboardingDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export interface OnboardingRequestDetailsModalProps {
  open: boolean;
  onClose: () => void;
  request: OnboardingRequestResponse | null;
  isLoadingDetails?: boolean;
  canManageOnboarding: boolean;
  auditEntries?: PlatformOnboardingAuditItem[];
  onApproveClick: (request: OnboardingRequestResponse) => void;
  onRejectClick: (request: OnboardingRequestResponse) => void;
}

export const OnboardingRequestDetailsModal: React.FC<OnboardingRequestDetailsModalProps> = ({
  open,
  onClose,
  request,
  isLoadingDetails = false,
  canManageOnboarding,
  auditEntries = [],
  onApproveClick,
  onRejectClick,
}) => {
  if (!open) return null;

  const isActionable =
    request != null && (request.status === 'PENDING' || request.status === 'UNDER_REVIEW');

  const statusMeta = request ? getOnboardingStatusBadgeMeta(request.status) : null;

  const footer = request ? (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs text-slate-500">
        {isActionable ? (
          canManageOnboarding ? (
            <span>Ready for platform review decision.</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Read-only view (platform.organization.manage required to approve or reject)
            </span>
          )
        ) : (
          <span>
            This application was{' '}
            <strong className="font-semibold text-slate-700">
              {request.status.toLowerCase()}
            </strong>
            {request.reviewedBy ? ` by Reviewer #${request.reviewedBy}` : ''}.
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {isActionable && canManageOnboarding && (
          <>
            <Button
              variant="danger"
              onClick={() => onRejectClick(request)}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Reject Request
            </Button>
            <Button
              variant="primary"
              onClick={() => onApproveClick(request)}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Approve Request
            </Button>
          </>
        )}
      </div>
    </div>
  ) : (
    <Button variant="outline" onClick={onClose}>
      Close
    </Button>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={request ? request.schoolName : 'Onboarding Request Details'}
      description={
        request
          ? `Application Reference #ONB-${request.id} • Submitted ${formatOnboardingDate(
              request.createdAt
            )}`
          : 'Loading onboarding application details...'
      }
      maxWidthClass="max-w-3xl"
      footer={footer}
    >
      {isLoadingDetails && !request ? (
        <LoadingState label="Loading onboarding application details..." />
      ) : !request ? (
        <InlineAlert variant="error" title="Request unavailable">
          The requested onboarding application could not be loaded.
        </InlineAlert>
      ) : (
        <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-5">
          {/* Top Status & Workflow Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 rounded-md">
                #ONB-{request.id}
              </span>
              <Badge variant="neutral">
                {BOARD_AFFILIATION_LABELS[request.boardAffiliation] || request.boardAffiliation}
              </Badge>
              {statusMeta && (
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Submitted: {formatOnboardingDate(request.createdAt)}</span>
            </div>
          </div>
          {/* Status-Specific Contextual Banner */}
          {request.status === 'REJECTED' && (
            <InlineAlert variant="error" title="Application Rejected">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">Rejection Reason:</span>{' '}
                  {request.rejectionReason || 'No reason recorded.'}
                </p>
                <p className="text-[11px] opacity-85">
                  Reviewed by Platform Admin ID #{request.reviewedBy ?? '—'} • Updated{' '}
                  {formatOnboardingDate(request.updatedAt)}
                </p>
              </div>
            </InlineAlert>
          )}

          {request.status === 'APPROVED' && (
            <InlineAlert variant="success" title="Application Approved & Organization Provisioned">
              <div className="space-y-1">
                <p>
                  This onboarding request has been approved. The school organization, default
                  subscription plan, and initial{' '}
                  <span className="font-mono font-semibold">SCHOOL_ADMIN</span> access have been
                  provisioned.
                </p>
                <p className="text-[11px] opacity-85">
                  Approved by Platform Admin ID #{request.reviewedBy ?? '—'} • Updated{' '}
                  {formatOnboardingDate(request.updatedAt)}
                </p>
              </div>
            </InlineAlert>
          )}

          {(request.status === 'PENDING' || request.status === 'UNDER_REVIEW') && (
            <InlineAlert variant="info" title="Provisioning Workflow on Approval">
              Approving this request automatically creates an{' '}
              <span className="font-semibold">ACTIVE</span> organization, provisions the default
              trial subscription (or selected plan), and{' '}
              {request.requestedBy ? (
                <>
                  assigns <span className="font-mono font-semibold">SCHOOL_ADMIN</span> membership
                  directly to registered applicant User #{request.requestedBy}.
                </>
              ) : (
                <>
                  dispatches an initial <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
                  invitation link to <span className="font-mono">{request.contactEmail}</span>.
                </>
              )}
            </InlineAlert>
          )}

          {/* Grid: School Info & Applicant Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. School / Organization Information */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>School / Organization Details</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500">School Name</dt>
                  <dd className="font-semibold text-slate-900 text-sm mt-0.5">
                    {request.schoolName}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-500">Board Affiliation</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">
                      {BOARD_AFFILIATION_LABELS[request.boardAffiliation] ||
                        request.boardAffiliation}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Campuses / Branches</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">
                      {request.campusCount} {request.campusCount === 1 ? 'Campus' : 'Campuses'}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-slate-500">Official School Email</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5 break-all">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${request.schoolEmail}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {request.schoolEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Official School Phone</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{request.schoolPhone}</span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* 2. Applicant & Primary Contact Person */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Applicant &amp; Primary Contact</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-500">Applicant Name</dt>
                    <dd className="font-semibold text-slate-900 text-sm mt-0.5">
                      {request.contactPersonName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Designation</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{request.designation}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-slate-500">Applicant Contact Email</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5 break-all">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${request.contactEmail}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {request.contactEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Applicant Mobile Number</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>+91 {request.mobileNumber}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Submission Account Mode</dt>
                  <dd className="mt-1">
                    {request.requestedBy ? (
                      <Badge variant="primary">
                        Authenticated Applicant (User #{request.requestedBy})
                      </Badge>
                    ) : (
                      <Badge variant="neutral">
                        Public Submission (Provisioned via Invitation)
                      </Badge>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Grid: Address & Operational Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3. School Location & Address */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Campus Address &amp; Location</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500">Street Address</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                    {request.address}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-slate-500">City</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{request.city}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">State</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{request.state}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">PIN Code</dt>
                    <dd className="font-mono font-medium text-slate-800 mt-0.5">
                      {request.postalCode}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
            {/* 4. Operational Information */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Operational Scale &amp; Current System</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500">Estimated Student Strength</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {STUDENT_STRENGTH_LABELS[request.studentStrength] || request.studentStrength}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Current Management System</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">
                    {MANAGEMENT_SYSTEM_LABELS[request.managementSystem] ||
                      request.managementSystem}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="text-slate-700 mt-0.5">
                    {formatOnboardingDate(request.updatedAt || request.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 5. Additional Requirements */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Additional Requirements &amp; Applicant Notes</span>
            </div>
            {request.additionalRequirements && request.additionalRequirements.trim() ? (
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                {request.additionalRequirements}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic pt-1">
                No additional requirements or custom notes were submitted with this application.
              </p>
            )}
          </div>


          {/* 6. Platform Review & Audit History */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Review History &amp; Applicant Communication</span>
              </div>
              <a
                href={`mailto:${request.contactEmail}?subject=${encodeURIComponent(
                  `Regarding your SchoolForge Onboarding Application (#ONB-${request.id} - ${request.schoolName})`
                )}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Applicant ({request.contactEmail})</span>
              </a>
            </div>

            {auditEntries.length > 0 ? (
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            entry.action === 'ONBOARDING_APPROVED'
                              ? 'success'
                              : entry.action === 'ONBOARDING_REJECTED'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {entry.action}
                        </Badge>
                        {entry.organizationId && (
                          <span className="font-mono text-[11px] text-slate-600">
                            Organization ID #{entry.organizationId}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {formatOnboardingDate(entry.createdAt)}
                      </span>
                    </div>
                    {entry.summary && (
                      <p className="font-medium text-slate-800">{entry.summary}</p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Actor: {entry.actorEmail || `User #${entry.actorUserId ?? '—'}`}
                      {entry.details ? ` • ${entry.details}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                {request.status === 'PENDING' || request.status === 'UNDER_REVIEW'
                  ? 'No platform review decision has been recorded for this request yet.'
                  : `Processed by Reviewer #${request.reviewedBy ?? '—'} on ${formatOnboardingDate(
                      request.updatedAt
                    )}.`}
              </p>
            )}

            <p className="text-[11px] text-slate-500 bg-white/80 border border-slate-200/60 rounded-lg px-3 py-2">
              <strong className="font-semibold text-slate-700">Note on Applicant Messaging:</strong>{' '}
              The backend supports formal approval (with automatic{' '}
              <span className="font-mono">SCHOOL_ADMIN</span> provisioning/invitation) and rejection
              (with a recorded rejection reason), and does not expose an in-app applicant messaging
              endpoint. Use the email link above if clarification is needed before deciding.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
};
