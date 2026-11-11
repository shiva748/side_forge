import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  History,
  Receipt,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getSubscriptionStatusBadgeMeta,
  OrganizationSubscriptionHistoryItem,
} from '../../types/platformDashboard';
import {
  formatCurrencyINR,
  FullOrganizationSubscriptionResponse,
  getGracePeriodEndDate,
  getPaymentStatusBadgeMeta,
  OrganizationBillingSummaryResponse,
  resolveSubscriptionPaymentLabel,
} from '../../types/platformSubscription';
import { formatOnboardingDate } from './OnboardingRequestDetailsModal';
import { PaymentReceiptDownloadButtons } from './ManualPaymentAndReceiptControls';
import { OrganizationStudentCapacityPanel } from './OrganizationGovernancePanels';
import { SubscriptionActionMode } from './SubscriptionActionDialogs';
import { Badge, CounterLabel, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { InlineAlert, LoadingState } from '../ui/StateViews';

export interface SubscriptionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: number | null;
  organizationName: string;
  currentSubscription: FullOrganizationSubscriptionResponse | null;
  subscriptionHistory: OrganizationSubscriptionHistoryItem[];
  billingSummary: OrganizationBillingSummaryResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  canManageSubscriptions: boolean;
  canManageBilling?: boolean;
  canManageEntitlements?: boolean;
  onOpenRecordPayment?: () => void;
  onCapacityOverrideUpdated?: () => void;
  onTriggerAction: (
    mode: SubscriptionActionMode,
    options?: { presetStatus?: 'ACTIVE'; presetComplimentary?: boolean }
  ) => void;
}

export const SubscriptionDetailsModal: React.FC<SubscriptionDetailsModalProps> = ({
  open,
  onClose,
  organizationId,
  organizationName,
  currentSubscription,
  subscriptionHistory,
  billingSummary,
  isLoading,
  errorMessage,
  canManageSubscriptions,
  canManageBilling = false,
  canManageEntitlements = false,
  onOpenRecordPayment,
  onCapacityOverrideUpdated,
  onTriggerAction,
}) => {
  if (!open) return null;

  const sub = currentSubscription;
  const effStatus = sub?.effectiveStatus || sub?.status || null;
  const subStatusMeta = getSubscriptionStatusBadgeMeta(effStatus);
  const paymentMeta = resolveSubscriptionPaymentLabel(sub);
  const isGracePeriod = effStatus === 'PAST_DUE';
  const graceEndDate = isGracePeriod ? getGracePeriodEndDate(sub?.expiryDate) : null;
  const isComplimentary =
    sub != null && !sub.trial && Number(sub.contractedAmount || 0) === 0;

  const footer = (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-xs text-slate-500">
        {canManageSubscriptions ? (
          <span>Select a manual subscription action or close this view.</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Read-only view (platform.subscription.manage required to modify subscriptions)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {canManageBilling && sub && onOpenRecordPayment && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRecordPayment}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            leftIcon={<Receipt className="w-3.5 h-3.5" />}
          >
            Record Payment
          </Button>
        )}
        {canManageSubscriptions && organizationId && (
          <>
            {sub && effStatus !== 'ACTIVE' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onTriggerAction('CHANGE_STATUS', { presetStatus: 'ACTIVE' })}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Manually Activate
              </Button>
            )}
            {sub && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTriggerAction('CHANGE_PLAN')}
                  leftIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                >
                  Change Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTriggerAction('RENEW')}
                  leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
                >
                  Extend / Renew
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTriggerAction('CHANGE_STATUS')}
                  leftIcon={<Settings2 className="w-3.5 h-3.5" />}
                >
                  Status
                </Button>
              </>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => onTriggerAction('ASSIGN')}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              {sub ? 'Reassign Plan' : 'Assign Plan'}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Subscription Details: ${organizationName}`}
      description={
        organizationId
          ? `Organization ID #${organizationId}${
              sub ? ` • Subscription #${sub.id}` : ''
            }`
          : 'Loading subscription details...'
      }
      maxWidthClass="max-w-3xl"
      footer={footer}
    >
      {isLoading ? (
        <LoadingState label="Loading subscription details, payment records, and renewal history..." />
      ) : errorMessage && !sub ? (
        <InlineAlert variant="error" title="Unable to load subscription details">
          {errorMessage}
        </InlineAlert>
      ) : (
        <div className="space-y-5">
          {/* Top Status & Classification Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <IdLabel>Org #{organizationId}</IdLabel>
              <Badge variant={subStatusMeta.variant} dot>
                {subStatusMeta.label}
              </Badge>
              <div className="inline-flex items-center gap-2">
                <Badge variant={paymentMeta.variant} dot>
                  {paymentMeta.label}
                </Badge>
                {paymentMeta.amountText && (
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      paymentMeta.amountTone === 'danger'
                        ? 'text-rose-700'
                        : paymentMeta.amountTone === 'warning'
                        ? 'text-amber-700'
                        : paymentMeta.amountTone === 'success'
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {paymentMeta.amountText}
                  </span>
                )}
              </div>
              {sub?.trial && <Badge variant="primary">Trial Subscription</Badge>}
              {isComplimentary && (
                <Badge variant="info">
                  <Gift className="w-3 h-3 mr-1" />
                  Complimentary
                </Badge>
              )}
            </div>

            {sub && (
              <span className="text-xs text-slate-500">
                Billing Cycle:{' '}
                <strong className="font-semibold text-slate-800">
                  {sub.billingInterval}
                </strong>
              </span>
            )}
          </div>

          {isGracePeriod && (
            <InlineAlert variant="warning" title="15-Day Grace Period Active (PAST_DUE)">
              This subscription expired on{' '}
              <strong className="font-semibold">{sub?.expiryDate || '—'}</strong> and is currently
              within the 15-day post-expiry grace period
              {graceEndDate ? ` (grace window ends ${graceEndDate})` : ''}. Full school operations
              remain enabled during the grace period.
            </InlineAlert>
          )}

          {!sub ? (
            <InlineAlert variant="warning" title="No Current Subscription Assigned">
              This organization does not currently have an active subscription record. Use{' '}
              <strong className="font-semibold">Assign Plan</strong> below to provision a trial,
              paid, or complimentary subscription.
            </InlineAlert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Organization & Current Plan */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Organization &amp; Current Plan</span>
                </div>

                <dl className="space-y-2.5 text-xs">
                  <div>
                    <dt className="text-slate-500">Organization</dt>
                    <dd className="font-semibold text-slate-900 text-sm mt-0.5">
                      {organizationName} (Org #{organizationId})
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">Current Plan</dt>
                      <dd className="font-semibold text-indigo-700 mt-0.5">
                        {sub.planName} ({sub.planCode})
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Billing Cycle</dt>
                      <dd className="font-medium text-slate-800 mt-0.5">
                        {sub.billingInterval}
                        {sub.trial ? ' (Trial)' : ''}
                      </dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">Effective Student Limit</dt>
                      <dd className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {(
                            sub.effectiveStudentLimit ?? sub.planStudentLimit
                          )?.toLocaleString('en-IN')}{' '}
                          students
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Contracted Amount</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">
                        {formatCurrencyINR(sub.contractedAmount)}
                      </dd>
                    </div>
                  </div>
                  {sub.remarks && (
                    <div className="pt-1 border-t border-slate-100">
                      <dt className="text-slate-500">Subscription Notes / Remarks</dt>
                      <dd className="text-slate-700 mt-0.5">{sub.remarks}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* 2. Dates & Grace Period Information */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Dates &amp; Grace-Period Status</span>
                </div>

                <dl className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">Subscription Start Date</dt>
                      <dd className="font-medium text-slate-800 mt-0.5">
                        {sub.startDate || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Expiry Date</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">
                        {sub.expiryDate || '—'}
                      </dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">Current Period</dt>
                      <dd className="font-medium text-slate-800 mt-0.5">
                        {sub.currentPeriodStart || '—'} → {sub.currentPeriodEnd || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Next Renewal Date</dt>
                      <dd className="font-medium text-slate-800 mt-0.5">
                        {sub.nextRenewalDate || '—'}
                      </dd>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">Grace-Period Status</dt>
                      <dd
                        className={`font-semibold mt-0.5 ${
                          isGracePeriod ? 'text-amber-700' : 'text-slate-800'
                        }`}
                      >
                        {isGracePeriod ? 'Active (15-Day Window)' : 'Not in Grace Period'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Grace Period Ends</dt>
                      <dd className="font-medium text-slate-800 mt-0.5">
                        {graceEndDate || '—'}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* 3. Billing & Payment History */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Billing Summary &amp; Payment History</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {billingSummary && (
                  <span className="text-xs text-slate-500">
                    Paid:{' '}
                    <strong className="font-semibold text-emerald-700">
                      {formatCurrencyINR(billingSummary.currentPeriodPaidAmount)}
                    </strong>{' '}
                    • Outstanding:{' '}
                    <strong className="font-semibold text-rose-700">
                      {formatCurrencyINR(billingSummary.currentPeriodOutstandingAmount)}
                    </strong>
                  </span>
                )}
                {canManageBilling && sub && onOpenRecordPayment && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={onOpenRecordPayment}
                    leftIcon={<Receipt className="w-3.5 h-3.5" />}
                  >
                    Record Manual Payment
                  </Button>
                )}
              </div>
            </div>

            {!billingSummary?.payments || billingSummary.payments.length === 0 ? (
              <p className="text-xs text-slate-500">
                No SaaS subscription payments have been recorded for this organization yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Invoice / Ref</th>
                      <th className="py-2 px-3 font-semibold">Payment Date</th>
                      <th className="py-2 px-3 font-semibold">Method</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 pl-3 font-semibold text-right">Receipts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingSummary.payments.map((pmt) => {
                      const pmtMeta = getPaymentStatusBadgeMeta(pmt.status);
                      return (
                        <tr key={pmt.id}>
                          <td className="py-2 pr-3 font-mono text-slate-800">
                            {pmt.invoiceNumber}
                            {pmt.referenceNumber ? (
                              <span className="block text-[10px] text-slate-400">
                                Ref: {pmt.referenceNumber}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{pmt.paymentDate}</td>
                          <td className="py-2 px-3 text-slate-600">{pmt.paymentMethod}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {formatCurrencyINR(pmt.amountReceived)}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={pmtMeta.variant} dot>
                              {pmtMeta.label}
                            </Badge>
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <PaymentReceiptDownloadButtons
                              organizationId={pmt.organizationId}
                              paymentId={pmt.id}
                              invoiceNumber={pmt.invoiceNumber}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3B. Student Enrollment Capacity & Limit Override */}
          {organizationId && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4">
              <OrganizationStudentCapacityPanel
                organizationId={organizationId}
                organizationName={organizationName}
                hasActiveSubscription={Boolean(sub)}
                canManageEntitlements={canManageEntitlements}
                onUpdated={() => onCapacityOverrideUpdated?.()}
              />
            </div>
          )}

          {/* 4. Renewal & Plan Change History */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Renewal, Plan Change &amp; Lifecycle History</span>
              </div>
              <CounterLabel
                count={subscriptionHistory.length}
                label={subscriptionHistory.length === 1 ? 'event' : 'events'}
              />
            </div>

            {subscriptionHistory.length === 0 ? (
              <p className="text-xs text-slate-500">
                No subscription lifecycle events have been recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {subscriptionHistory.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="primary">{evt.eventType}</Badge>
                        {evt.previousPlanCode &&
                        evt.newPlanCode &&
                        evt.previousPlanCode !== evt.newPlanCode ? (
                          <span className="font-mono text-[11px] text-slate-700">
                            Plan: {evt.previousPlanCode} → {evt.newPlanCode}
                          </span>
                        ) : evt.newPlanCode ? (
                          <span className="font-mono text-[11px] text-slate-600">
                            Plan: {evt.newPlanCode}
                          </span>
                        ) : null}
                        {evt.newStatus && (
                          <span className="text-[11px] text-slate-500">
                            • Status: {evt.previousStatus ? `${evt.previousStatus} → ` : ''}
                            <strong className="text-slate-700">{evt.newStatus}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatOnboardingDate(evt.createdAt)}
                      </span>
                    </div>
                    {evt.remarks && (
                      <p className="font-medium text-slate-800">{evt.remarks}</p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      {evt.billingInterval ? `Billing: ${evt.billingInterval}` : ''}
                      {evt.contractedAmount !== null && evt.contractedAmount !== undefined
                        ? ` • Contracted: ${formatCurrencyINR(evt.contractedAmount)}`
                        : ''}
                      {evt.effectiveDate ? ` • Effective: ${evt.effectiveDate}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
};
