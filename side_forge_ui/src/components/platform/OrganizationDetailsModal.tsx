import React from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  HardDrive,
  History,
  Layers,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  PowerOff,
  ShieldCheck,
  Sliders,
  UserPlus,
  Users,
} from 'lucide-react';
import { BOARD_AFFILIATION_LABELS } from '../../types/onboarding';
import {
  formatStorageBytes,
  getOrganizationStatusBadgeMeta,
  getSubscriptionStatusBadgeMeta,
  ManageableOrganizationStatus,
  OrganizationAdminDetailResponse,
} from '../../types/platformDashboard';
import { formatOnboardingDate } from './OnboardingRequestDetailsModal';
import {
  OrganizationEntitlementsPanel,
  OrganizationInvitationsPanel,
  OrganizationStudentCapacityPanel,
} from './OrganizationGovernancePanels';
import { Badge, CounterLabel, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { InlineAlert, LoadingState } from '../ui/StateViews';

export type OrganizationDetailsTab =
  | 'OVERVIEW'
  | 'INVITATIONS'
  | 'ENTITLEMENTS'
  | 'CAPACITY';

export interface OrganizationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  organization: OrganizationAdminDetailResponse | null;
  applicantContactName?: string | null;
  applicantDesignation?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  canManageOrganization: boolean;
  canManageEntitlements?: boolean;
  initialTab?: OrganizationDetailsTab;
  onOrganizationUpdated?: () => void;
  onTriggerStatusAction: (
    organization: OrganizationAdminDetailResponse,
    nextStatus: ManageableOrganizationStatus
  ) => void;
}
export const OrganizationDetailsModal: React.FC<OrganizationDetailsModalProps> = ({
  open,
  onClose,
  organization,
  applicantContactName,
  applicantDesignation,
  isLoading = false,
  errorMessage = null,
  canManageOrganization,
  canManageEntitlements = false,
  initialTab = 'OVERVIEW',
  onOrganizationUpdated,
  onTriggerStatusAction,
}) => {
  const [activeTab, setActiveTab] =
    React.useState<OrganizationDetailsTab>(initialTab);

  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open, organization?.id]);

  if (!open) return null;

  const orgStatusMeta = organization
    ? getOrganizationStatusBadgeMeta(organization.status)
    : null;
  const sub = organization?.currentSubscription || null;
  const effectiveSubStatus = sub?.effectiveStatus || sub?.status || null;
  const subStatusMeta = getSubscriptionStatusBadgeMeta(effectiveSubStatus);
  const isGracePeriod = effectiveSubStatus === 'PAST_DUE';

  const footer = organization ? (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs text-slate-500">
        {canManageOrganization ? (
          <span>
            Status transitions preserve all organization data and record an audit entry.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Read-only view (platform.organization.manage required to change status)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {canManageOrganization && (
          <>
            {organization.status !== 'ACTIVE' && (
              <Button
                variant="primary"
                onClick={() => onTriggerStatusAction(organization, 'ACTIVE')}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Activate
              </Button>
            )}
            {organization.status !== 'SUSPENDED' && (
              <Button
                variant="outline"
                onClick={() => onTriggerStatusAction(organization, 'SUSPENDED')}
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
                leftIcon={<PauseCircle className="w-4 h-4" />}
              >
                Suspend
              </Button>
            )}
            {organization.status !== 'DEACTIVATED' && (
              <Button
                variant="danger"
                onClick={() => onTriggerStatusAction(organization, 'DEACTIVATED')}
                leftIcon={<PowerOff className="w-4 h-4" />}
              >
                Deactivate
              </Button>
            )}
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
      title={organization ? organization.name : 'Organization Details'}
      description={
        organization
          ? `Organization ID #${organization.id} • Registered ${formatOnboardingDate(
              organization.createdAt
            )}`
          : 'Loading organization details...'
      }
      maxWidthClass="max-w-3xl"
      footer={footer}
    >
      {isLoading && !organization ? (
        <LoadingState label="Loading organization profile, subscription, and status history..." />
      ) : errorMessage && !organization ? (
        <InlineAlert variant="error" title="Unable to load organization details">
          {errorMessage}
        </InlineAlert>
      ) : !organization ? (
        <InlineAlert variant="error" title="Organization unavailable">
          The requested organization record could not be found.
        </InlineAlert>
      ) : (
        <div className="space-y-5">
          {/* Top Identity & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <IdLabel>Org #{organization.id}</IdLabel>
              <Badge variant="neutral">
                {BOARD_AFFILIATION_LABELS[organization.boardAffiliation] ||
                  organization.boardAffiliation}
              </Badge>
              {orgStatusMeta && (
                <Badge variant={orgStatusMeta.variant} dot>
                  {orgStatusMeta.label}
                </Badge>
              )}
              <Badge variant={subStatusMeta.variant} dot>
                SaaS: {sub?.planName ? `${sub.planName} • ` : ''}
                {subStatusMeta.label}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Updated: {formatOnboardingDate(organization.updatedAt)}</span>
            </div>
          </div>


          {/* Grace Period / Status Banners */}
          {isGracePeriod && (
            <InlineAlert variant="warning" title="Subscription in 15-Day Grace Period (Past Due)">
              This organization&apos;s SaaS subscription period has ended and is currently within the
              15-day grace window. Full workspace access remains active until the grace period
              concludes.
            </InlineAlert>
          )}

          {organization.status === 'SUSPENDED' && (
            <InlineAlert variant="warning" title="Organization Suspended">
              This organization is currently suspended. All school data is preserved, and normal
              operations can be restored by activating the organization.
            </InlineAlert>
          )}

          {organization.status === 'DEACTIVATED' && (
            <InlineAlert variant="error" title="Organization Deactivated">
              This organization is deactivated. All historical school records and audit logs remain
              preserved.
            </InlineAlert>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Overview &amp; History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INVITATIONS')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'INVITATIONS'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>School Admin Invitations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ENTITLEMENTS')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'ENTITLEMENTS'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Feature Entitlements</span>
              {organization.entitlements && (
                <CounterLabel
                  count={(organization.entitlements.enabledFeatures || []).length}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CAPACITY')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'CAPACITY'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Student Capacity</span>
              {organization.usage?.overrideStudentLimit != null && (
                <Badge variant="warning">Override</Badge>
              )}
            </button>
          </div>

          {activeTab === 'INVITATIONS' && (
            <OrganizationInvitationsPanel
              organization={organization}
              applicantContactName={applicantContactName}
              canManageOrganization={canManageOrganization}
              onOrganizationUpdated={onOrganizationUpdated}
            />
          )}

          {activeTab === 'ENTITLEMENTS' && (
            <OrganizationEntitlementsPanel
              organization={organization}
              canManageEntitlements={canManageEntitlements}
              onOrganizationUpdated={onOrganizationUpdated}
            />
          )}

          {activeTab === 'CAPACITY' && (
            <OrganizationStudentCapacityPanel
              organizationId={organization.id}
              organizationName={organization.name}
              initialUsage={organization.usage}
              hasActiveSubscription={Boolean(sub)}
              canManageEntitlements={canManageEntitlements}
              onUpdated={() => onOrganizationUpdated?.()}
            />
          )}

          {activeTab === 'OVERVIEW' && (
            <>
          {/* Grid: Basic Organization Info & Contact / Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Basic Organization Information */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Basic Organization Information</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500">Organization / School Name</dt>
                  <dd className="font-semibold text-slate-900 text-sm mt-0.5">
                    {organization.name}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-500">Organization Identifier</dt>
                    <dd className="font-mono font-semibold text-slate-800 mt-0.5">
                      #{organization.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Board Affiliation</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">
                      {BOARD_AFFILIATION_LABELS[organization.boardAffiliation] ||
                        organization.boardAffiliation}
                    </dd>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-500">Active Members</dt>
                    <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{organization.totalMembers} active member(s)</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Timezone</dt>
                    <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{organization.timezone || 'Asia/Kolkata'}</span>
                    </dd>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <dt className="text-slate-500">Created At</dt>
                    <dd className="text-slate-700 mt-0.5">
                      {formatOnboardingDate(organization.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Last Updated</dt>
                    <dd className="text-slate-700 mt-0.5">
                      {formatOnboardingDate(organization.updatedAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* 2. Contact Details & Location */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Contact Details &amp; Location</span>
              </div>

              <dl className="space-y-2.5 text-xs">
                {applicantContactName && (
                  <div>
                    <dt className="text-slate-500">Onboarding Contact Person</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">
                      {applicantContactName}
                      {applicantDesignation ? (
                        <span className="font-normal text-slate-500">
                          {' '}
                          ({applicantDesignation})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">Official Contact Email</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5 break-all">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${organization.contactEmail}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {organization.contactEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Official Contact Number</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{organization.contactPhone}</span>
                  </dd>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <dt className="text-slate-500">Street Address</dt>
                  <dd className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                    {organization.address}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-slate-500">City</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{organization.city}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">State</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{organization.state}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">PIN Code</dt>
                    <dd className="font-mono font-medium text-slate-800 mt-0.5">
                      {organization.postalCode}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
          {/* 3. Read-Only Side_forge SaaS Subscription Summary */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Side_forge SaaS Subscription (Read-Only Summary)</span>
              </div>
              <Badge variant={subStatusMeta.variant} dot>
                {subStatusMeta.label}
              </Badge>
            </div>

            {sub ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Current Plan</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {sub.planName} ({sub.planCode})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {sub.billingInterval} {sub.trial ? '• Trial' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Start Date</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {sub.startDate || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expiry Date</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {sub.expiryDate || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Grace-Period Status</span>
                  <span
                    className={`font-semibold mt-0.5 block ${
                      isGracePeriod ? 'text-amber-700' : 'text-slate-800'
                    }`}
                  >
                    {isGracePeriod ? 'In 15-Day Grace Period' : 'Not in Grace Period'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No active Side_forge SaaS subscription record is assigned to this organization.
              </p>
            )}

            {organization.usage && (
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Enrolled Students:{' '}
                    <strong className="font-semibold text-slate-900">
                      {organization.usage.enrolledStudentsCount.toLocaleString('en-IN')}
                    </strong>{' '}
                    / {organization.usage.effectiveStudentLimit?.toLocaleString('en-IN') ?? '—'}{' '}
                    limit
                  </span>
                </div>
                {organization.usage.storageUsage && (
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Storage Used:{' '}
                      <strong className="font-semibold text-slate-900">
                        {formatStorageBytes(organization.usage.storageUsage.totalStorageBytes)}
                      </strong>{' '}
                      ({organization.usage.storageUsage.totalFilesCount} files)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('INVITATIONS')}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                School Admin Invitations
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('ENTITLEMENTS')}
                leftIcon={<Layers className="w-3.5 h-3.5" />}
              >
                Feature Entitlements
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('CAPACITY')}
                leftIcon={<Sliders className="w-3.5 h-3.5" />}
              >
                Student Capacity Override
              </Button>
            </div>
          </div>


          {/* 4. Registration, Onboarding & Status History */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Registration, Onboarding &amp; Status History</span>
              </div>
              <CounterLabel
                count={(organization.statusHistory || []).length}
                label={(organization.statusHistory || []).length === 1 ? 'record' : 'records'}
              />
            </div>

            {!organization.statusHistory || organization.statusHistory.length === 0 ? (
              <p className="text-xs text-slate-500">
                Registered on {formatOnboardingDate(organization.createdAt)}. No status history
                entries recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {organization.statusHistory.map((item) => {
                  const newMeta = getOrganizationStatusBadgeMeta(item.newStatus);
                  const prevMeta = item.previousStatus
                    ? getOrganizationStatusBadgeMeta(item.previousStatus)
                    : null;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {prevMeta ? (
                            <>
                              <Badge variant={prevMeta.variant}>{prevMeta.label}</Badge>
                              <span className="text-slate-400">→</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500">
                              Initial Provisioning:
                            </span>
                          )}
                          <Badge variant={newMeta.variant} dot>
                            {newMeta.label}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatOnboardingDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800">{item.reason}</p>
                      <p className="text-[11px] text-slate-500">
                        Changed by Platform Admin ID #{item.changedBy ?? '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
};
