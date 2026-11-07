import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Gift,
  Settings2,
} from 'lucide-react';
import { BillingInterval, SubscriptionStatus } from '../../types/auth';
import { getSubscriptionStatusBadgeMeta } from '../../types/platformDashboard';
import {
  AssignSubscriptionRequest,
  ChangeSubscriptionPlanRequest,
  formatCurrencyINR,
  FullOrganizationSubscriptionResponse,
  RenewSubscriptionRequest,
  SubscriptionPlanResponse,
  UpdateSubscriptionStatusRequest,
} from '../../types/platformSubscription';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

export type SubscriptionActionMode =
  | 'ASSIGN'
  | 'CHANGE_PLAN'
  | 'RENEW'
  | 'CHANGE_STATUS';

export interface SubscriptionActionTarget {
  organizationId: number;
  organizationName: string;
  currentSubscription: FullOrganizationSubscriptionResponse | null;
  mode: SubscriptionActionMode;
  presetStatus?: SubscriptionStatus;
  presetComplimentary?: boolean;
}

export interface SubscriptionActionDialogProps {
  open: boolean;
  onClose: () => void;
  target: SubscriptionActionTarget | null;
  plans: SubscriptionPlanResponse[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirmAssign: (
    organizationId: number,
    payload: AssignSubscriptionRequest
  ) => Promise<void>;
  onConfirmChangePlan: (
    organizationId: number,
    payload: ChangeSubscriptionPlanRequest
  ) => Promise<void>;
  onConfirmRenew: (
    organizationId: number,
    payload: RenewSubscriptionRequest
  ) => Promise<void>;
  onConfirmChangeStatus: (
    organizationId: number,
    payload: UpdateSubscriptionStatusRequest
  ) => Promise<void>;
}

const STATUS_QUICK_REASONS: Record<SubscriptionStatus, string[]> = {
  ACTIVE: [
    'Manually activated after offline payment verification.',
    'Subscription restored to active status by Platform Administrator.',
    'Approved complimentary / institutional activation.',
  ],
  TRIAL: [
    'Converted to trial status for evaluation period.',
    'Trial status restored by Platform Administrator.',
  ],
  PAST_DUE: [
    'Moved to 15-day grace period pending renewal payment clearance.',
    'Invoice overdue; grace period granted to school administration.',
  ],
  SUSPENDED: [
    'Suspended due to unpaid subscription invoice past the grace window.',
    'Temporarily suspended upon administrative review.',
  ],
  EXPIRED: [
    'Marked as expired following conclusion of billing term.',
    'Trial period concluded without renewal.',
  ],
  CANCELLED: [
    'Subscription cancelled upon formal request from school management.',
    'Contract terminated at the end of academic session.',
  ],
};

function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function addMonthsMinusOneDayIso(isoDate: string, months: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN) || months <= 0) return isoDate;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1 + months, parts[2]));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export const SubscriptionActionDialog: React.FC<SubscriptionActionDialogProps> = ({
  open,
  onClose,
  target,
  plans,
  isSubmitting,
  errorMessage,
  onConfirmAssign,
  onConfirmChangePlan,
  onConfirmRenew,
  onConfirmChangeStatus,
}) => {
  const selectablePlans = useMemo(() => {
    const active = plans.filter((p) => p.active);
    return active.length > 0 ? active : plans;
  }, [plans]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY');
  const [isComplimentary, setIsComplimentary] = useState<boolean>(false);
  const [trialDays, setTrialDays] = useState<string>('30');
  const [periodMonths, setPeriodMonths] = useState<string>('12');
  const [contractedAmount, setContractedAmount] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [nextStatus, setNextStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [extendWhenActivatingExpired, setExtendWhenActivatingExpired] =
    useState<boolean>(true);
  const [remarks, setRemarks] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const targetOrgId = target?.organizationId;
  const targetMode = target?.mode;
  const targetPresetStatus = target?.presetStatus;
  const targetPresetComp = target?.presetComplimentary;

  // Initialize form state ONLY when dialog opens or target action/organization changes
  useEffect(() => {
    if (!open || !target) return;
    setValidationError(null);

    const todayIso = new Date().toISOString().slice(0, 10);
    const cur = target.currentSubscription;
    const defaultPlan =
      selectablePlans.find((p) => p.id === cur?.planId) ||
      selectablePlans.find((p) => p.defaultTrialPlan) ||
      selectablePlans[0];

    setSelectedPlanId(defaultPlan ? String(defaultPlan.id) : '');

    if (target.mode === 'ASSIGN') {
      const initialInterval: BillingInterval = target.presetComplimentary
        ? 'YEARLY'
        : cur?.billingInterval || 'MONTHLY';
      setBillingInterval(initialInterval);
      setIsComplimentary(Boolean(target.presetComplimentary));
      setTrialDays(String(defaultPlan?.defaultTrialDays || 30));
      setContractedAmount(target.presetComplimentary ? '0' : '');
      setEffectiveDate(todayIso);
      setRemarks(
        target.presetComplimentary
          ? 'Complimentary subscription assigned by Platform Administrator'
          : ''
      );
      return;
    }

    if (target.mode === 'CHANGE_PLAN') {
      const nonTrialInterval: BillingInterval =
        cur?.billingInterval && cur.billingInterval !== 'TRIAL'
          ? cur.billingInterval
          : 'YEARLY';
      const otherPlan =
        selectablePlans.find((p) => p.id !== cur?.planId) || defaultPlan;
      setSelectedPlanId(otherPlan ? String(otherPlan.id) : '');
      setBillingInterval(nonTrialInterval);
      setIsComplimentary(false);
      setContractedAmount('');
      setEffectiveDate(todayIso);
      setRemarks('');
      return;
    }

    if (target.mode === 'RENEW') {
      const nonTrialInterval: BillingInterval =
        cur?.billingInterval && cur.billingInterval !== 'TRIAL'
          ? cur.billingInterval
          : 'YEARLY';
      setBillingInterval(nonTrialInterval);
      setPeriodMonths(nonTrialInterval === 'MONTHLY' ? '1' : '12');
      setIsComplimentary(false);
      setContractedAmount('');
      const defaultStart =
        cur?.expiryDate && !cur.trial && cur.expiryDate >= todayIso
          ? addDaysIso(cur.expiryDate, 1)
          : todayIso;
      setEffectiveDate(defaultStart);
      setRemarks('');
      return;
    }

    if (target.mode === 'CHANGE_STATUS') {
      const curEff = cur?.effectiveStatus || cur?.status;
      const defaultNext: SubscriptionStatus =
        target.presetStatus || (curEff === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
      setNextStatus(defaultNext);
      setExtendWhenActivatingExpired(true);
      setEffectiveDate(todayIso);
      setRemarks('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetOrgId, targetMode, targetPresetStatus, targetPresetComp]);

  if (!open || !target) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const cur = target.currentSubscription;
  const isCurrentExpired = Boolean(cur?.expiryDate && cur.expiryDate < todayIso);

  const chosenPlan =
    selectablePlans.find((p) => String(p.id) === selectedPlanId) ||
    selectablePlans.find((p) => p.id === cur?.planId) ||
    selectablePlans[0];

  const projectedExpiryDate = (() => {
    const baseDate = effectiveDate || todayIso;
    if (target.mode === 'ASSIGN' && billingInterval === 'TRIAL') {
      const days = Math.max(1, parseInt(trialDays, 10) || 30);
      return addDaysIso(baseDate, days);
    }
    if (target.mode === 'RENEW') {
      const months = Math.max(1, parseInt(periodMonths, 10) || 12);
      return addMonthsMinusOneDayIso(baseDate, months);
    }
    if (target.mode === 'ASSIGN' || target.mode === 'CHANGE_PLAN') {
      return addMonthsMinusOneDayIso(
        baseDate,
        billingInterval === 'YEARLY' ? 12 : 1
      );
    }
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (target.mode === 'ASSIGN') {
      const planIdNum = Number(selectedPlanId);
      if (!planIdNum) {
        setValidationError('Please select a subscription plan.');
        return;
      }
      const isTrial = billingInterval === 'TRIAL';
      const parsedCustomAmt =
        isComplimentary
          ? 0
          : contractedAmount.trim() !== ''
          ? Number(contractedAmount)
          : undefined;

      if (
        parsedCustomAmt !== undefined &&
        (Number.isNaN(parsedCustomAmt) || parsedCustomAmt < 0)
      ) {
        setValidationError('Contracted amount must be 0 or greater.');
        return;
      }

      await onConfirmAssign(target.organizationId, {
        planId: planIdNum,
        billingInterval,
        trial: isTrial,
        trialDays: isTrial ? Math.max(1, parseInt(trialDays, 10) || 30) : undefined,
        startDate: effectiveDate || undefined,
        contractedAmount: isTrial ? undefined : parsedCustomAmt,
        remarks: remarks.trim() || undefined,
      });
      return;
    }

    if (target.mode === 'CHANGE_PLAN') {
      const newPlanIdNum = Number(selectedPlanId);
      if (!newPlanIdNum) {
        setValidationError('Please select the target plan.');
        return;
      }
      const parsedCustomAmt = isComplimentary
        ? 0
        : contractedAmount.trim() !== ''
        ? Number(contractedAmount)
        : undefined;

      await onConfirmChangePlan(target.organizationId, {
        newPlanId: newPlanIdNum,
        billingInterval: billingInterval === 'TRIAL' ? 'MONTHLY' : billingInterval,
        effectiveDate: effectiveDate || undefined,
        contractedAmount: parsedCustomAmt,
        remarks: remarks.trim() || undefined,
      });
      return;
    }

    if (target.mode === 'RENEW') {
      const months = parseInt(periodMonths, 10);
      if (Number.isNaN(months) || months < 1 || months > 60) {
        setValidationError('Extension duration must be between 1 and 60 months.');
        return;
      }
      const parsedCustomAmt = isComplimentary
        ? 0
        : contractedAmount.trim() !== ''
        ? Number(contractedAmount)
        : undefined;

      await onConfirmRenew(target.organizationId, {
        billingInterval: billingInterval === 'TRIAL' ? 'YEARLY' : billingInterval,
        renewalStartDate: effectiveDate || undefined,
        periodMonths: months,
        contractedAmount: parsedCustomAmt,
        remarks: remarks.trim() || undefined,
      });
      return;
    }

    if (target.mode === 'CHANGE_STATUS') {
      if (!remarks.trim()) {
        setValidationError('Please provide a reason for this subscription status change.');
        return;
      }
      // If activating an already-expired subscription and the admin opted to extend validity, renew it so effectiveStatus becomes ACTIVE
      if (nextStatus === 'ACTIVE' && isCurrentExpired && extendWhenActivatingExpired) {
        const renewInterval: BillingInterval =
          cur?.billingInterval === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';
        await onConfirmRenew(target.organizationId, {
          billingInterval: renewInterval,
          renewalStartDate: effectiveDate || todayIso,
          periodMonths: renewInterval === 'MONTHLY' ? 1 : 12,
          remarks: remarks.trim(),
        });
        return;
      }

      await onConfirmChangeStatus(target.organizationId, {
        status: nextStatus,
        reason: remarks.trim(),
        effectiveDate: effectiveDate || undefined,
      });
    }
  };

  const modeMeta = {
    ASSIGN: {
      title: 'Assign Subscription / Trial / Complimentary Plan',
      description: `Assign a subscription plan to ${target.organizationName} (Org #${target.organizationId}).`,
      buttonLabel: 'Confirm Assignment',
      icon: <CreditCard className="w-4 h-4" />,
      impact:
        'Assigning a new subscription supersedes any existing current subscription record for this organization, updates its student capacity and feature entitlements, and logs an audit entry.',
    },
    CHANGE_PLAN: {
      title: 'Upgrade or Downgrade Subscription Plan',
      description: `Change the current subscription plan for ${target.organizationName}.`,
      buttonLabel: 'Confirm Plan Change',
      icon: <ArrowUpRight className="w-4 h-4" />,
      impact:
        'Changing the plan updates the organization’s plan tier, student limit snapshot, and feature entitlements effective on the selected date.',
    },
    RENEW: {
      title: 'Extend / Renew Subscription Validity',
      description: `Extend the subscription period for ${target.organizationName}.`,
      buttonLabel: 'Confirm Renewal',
      icon: <CalendarPlus className="w-4 h-4" />,
      impact:
        'Renewing extends the subscription expiry date and restores ACTIVE status if the subscription was in a grace period or expired.',
    },
    CHANGE_STATUS: {
      title: 'Manually Update Subscription Status',
      description: `Manually activate or update the subscription status for ${target.organizationName}.`,
      buttonLabel: 'Confirm Status Update',
      icon: <Settings2 className="w-4 h-4" />,
      impact:
        'Manually changing subscription status immediately updates workspace entitlement enforcement and records a subscription history event.',
    },
  }[target.mode];

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={modeMeta.title}
      description={modeMeta.description}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={
              target.mode === 'CHANGE_STATUS' &&
              (nextStatus === 'CANCELLED' || nextStatus === 'SUSPENDED')
                ? 'danger'
                : 'primary'
            }
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={modeMeta.icon}
          >
            {modeMeta.buttonLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Operation failed">
            {errorMessage || validationError}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{target.organizationName}</p>
            <p className="text-slate-500 mt-0.5">
              Current Plan:{' '}
              <strong className="font-medium text-slate-800">
                {target.currentSubscription?.planName || 'None'}
              </strong>
              {target.currentSubscription?.expiryDate
                ? ` • Exp: ${target.currentSubscription.expiryDate}`
                : ''}
            </p>
          </div>
          {target.currentSubscription && (
            <Badge
              variant={
                getSubscriptionStatusBadgeMeta(
                  target.currentSubscription.effectiveStatus ||
                    target.currentSubscription.status
                ).variant
              }
              dot
            >
              {
                getSubscriptionStatusBadgeMeta(
                  target.currentSubscription.effectiveStatus ||
                    target.currentSubscription.status
                ).label
              }
            </Badge>
          )}
        </div>

        <InlineAlert variant="info" title="Operational Impact">
          {modeMeta.impact}
        </InlineAlert>

        {(target.mode === 'ASSIGN' || target.mode === 'CHANGE_PLAN') && (
          <FormField
            label={target.mode === 'ASSIGN' ? 'Subscription Plan' : 'Target Plan'}
            htmlFor="sub-action-plan"
            required
          >
            <Select
              id="sub-action-plan"
              value={selectedPlanId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPlanId(val);
                const found = selectablePlans.find((p) => String(p.id) === val);
                if (found?.defaultTrialDays) {
                  setTrialDays(String(found.defaultTrialDays));
                }
              }}
              disabled={isSubmitting}
            >
              {selectablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.code}) — {formatCurrencyINR(plan.monthlyPrice)}/mo •{' '}
                  {formatCurrencyINR(plan.yearlyPrice)}/yr • Max{' '}
                  {plan.maxStudents.toLocaleString('en-IN')} students
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {(target.mode === 'ASSIGN' ||
          target.mode === 'CHANGE_PLAN' ||
          target.mode === 'RENEW') && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Billing Cycle" htmlFor="sub-action-interval" required>
                <Select
                  id="sub-action-interval"
                  value={
                    target.mode !== 'ASSIGN' && billingInterval === 'TRIAL'
                      ? 'YEARLY'
                      : billingInterval
                  }
                  onChange={(e) => {
                    const val = e.target.value as BillingInterval;
                    setBillingInterval(val);
                    if (val === 'TRIAL') {
                      setIsComplimentary(false);
                    }
                    if (target.mode === 'RENEW') {
                      setPeriodMonths(val === 'MONTHLY' ? '1' : '12');
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {target.mode === 'ASSIGN' && (
                    <option value="TRIAL">Free Trial Period</option>
                  )}
                  <option value="MONTHLY">Monthly Billing</option>
                  <option value="YEARLY">Yearly Billing</option>
                </Select>
              </FormField>

              <FormField
                label={
                  target.mode === 'ASSIGN'
                    ? 'Start Date'
                    : target.mode === 'RENEW'
                    ? 'Renewal Start Date'
                    : 'Effective Date'
                }
                htmlFor="sub-action-date"
              >
                <Input
                  id="sub-action-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            {target.mode === 'ASSIGN' && billingInterval === 'TRIAL' && (
              <FormField
                label="Trial Duration (Days)"
                htmlFor="sub-action-trial-days"
                hint="Number of trial days from the selected Start Date"
              >
                <Input
                  id="sub-action-trial-days"
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>
            )}

            {target.mode === 'RENEW' && (
              <div className="space-y-2">
                <FormField
                  label="Extension Duration (Months)"
                  htmlFor="sub-action-months"
                  required
                >
                  <Input
                    id="sub-action-months"
                    type="number"
                    min={1}
                    max={60}
                    value={periodMonths}
                    onChange={(e) => setPeriodMonths(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FormField>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 mr-1">Quick duration:</span>
                  {[1, 3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setPeriodMonths(String(m));
                        setBillingInterval(m >= 12 ? 'YEARLY' : 'MONTHLY');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        Number(periodMonths) === m
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      +{m} {m === 1 ? 'Month' : 'Months'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {projectedExpiryDate && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Projected Subscription Period:</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {effectiveDate || todayIso} → {projectedExpiryDate}
                </span>
              </div>
            )}
          </div>
        )}

        {(target.mode === 'ASSIGN' || target.mode === 'RENEW') &&
          billingInterval !== 'TRIAL' && (
          <label className="flex items-center justify-between gap-2 rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3 cursor-pointer">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-950">
              <Gift className="w-4 h-4 text-indigo-600" />
              <span>Mark as Complimentary Subscription (₹0 Contracted Amount)</span>
            </span>
            <input
              type="checkbox"
              checked={isComplimentary}
              onChange={(e) => {
                setIsComplimentary(e.target.checked);
                if (e.target.checked) setContractedAmount('0');
                else setContractedAmount('');
              }}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        )}

        {(target.mode === 'ASSIGN' ||
          target.mode === 'CHANGE_PLAN' ||
          target.mode === 'RENEW') &&
          billingInterval !== 'TRIAL' &&
          !isComplimentary && (
            <FormField
              label="Custom Contracted Amount (INR — Optional)"
              htmlFor="sub-action-amount"
              hint={
                chosenPlan
                  ? `Leave blank to use default plan price (${formatCurrencyINR(
                      billingInterval === 'YEARLY'
                        ? chosenPlan.yearlyPrice
                        : chosenPlan.monthlyPrice
                    )})`
                  : 'Leave blank to use the plan’s standard price'
              }
            >
              <Input
                id="sub-action-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="Standard plan price"
                value={contractedAmount}
                onChange={(e) => setContractedAmount(e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>
          )}

        {target.mode === 'CHANGE_STATUS' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Target Subscription Status" htmlFor="sub-next-status" required>
                <Select
                  id="sub-next-status"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as SubscriptionStatus)}
                  disabled={isSubmitting}
                >
                  <option value="ACTIVE">ACTIVE (Manually Activate)</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="PAST_DUE">PAST_DUE (Grace Period)</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </Select>
              </FormField>

              <FormField label="Effective Date" htmlFor="sub-status-date">
                <Input
                  id="sub-status-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            {nextStatus === 'ACTIVE' && isCurrentExpired && (
              <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 cursor-pointer text-xs text-amber-950">
                <input
                  type="checkbox"
                  checked={extendWhenActivatingExpired}
                  onChange={(e) => setExtendWhenActivatingExpired(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <strong className="font-semibold block">
                    Extend expired validity from {effectiveDate || todayIso}
                  </strong>
                  <span className="text-[11px] text-amber-800">
                    The current expiry date ({cur?.expiryDate}) is in the past. Extending validity
                    ensures the subscription’s effective status becomes ACTIVE.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        <FormField
          label={
            target.mode === 'CHANGE_STATUS'
              ? 'Reason for Status Update'
              : 'Administrative Notes / Remarks (Optional)'
          }
          htmlFor="sub-action-remarks"
          required={target.mode === 'CHANGE_STATUS'}
        >
          <Textarea
            id="sub-action-remarks"
            rows={2}
            maxLength={500}
            hasError={Boolean(validationError && target.mode === 'CHANGE_STATUS')}
            placeholder={
              target.mode === 'CHANGE_STATUS'
                ? 'Provide the reason for this manual status update...'
                : 'Add optional administrative notes...'
            }
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
          />
        </FormField>

        {target.mode === 'CHANGE_STATUS' && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-slate-400" />
              <span>Quick reason templates:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(STATUS_QUICK_REASONS[nextStatus] || []).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setRemarks(preset);
                    if (validationError) setValidationError(null);
                  }}
                  className="text-left text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
};
