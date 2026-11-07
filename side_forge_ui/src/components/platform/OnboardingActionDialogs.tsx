import React, { useEffect, useState } from 'react';
import { CheckCircle2, Settings2, XCircle } from 'lucide-react';
import {
  ApproveOnboardingSubscriptionRequest,
  BOARD_AFFILIATION_LABELS,
  OnboardingBillingInterval,
  OnboardingRequestResponse,
  STUDENT_STRENGTH_LABELS,
  SubscriptionPlanSummary,
} from '../../types/onboarding';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

export interface ApproveOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  request: OnboardingRequestResponse | null;
  plans: SubscriptionPlanSummary[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirmApprove: (
    requestId: number,
    subscriptionRequest?: ApproveOnboardingSubscriptionRequest
  ) => Promise<void>;
}

export const ApproveOnboardingDialog: React.FC<ApproveOnboardingDialogProps> = ({
  open,
  onClose,
  request,
  plans,
  isSubmitting,
  errorMessage,
  onConfirmApprove,
}) => {
  const [customizeSubscription, setCustomizeSubscription] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingInterval, setBillingInterval] = useState<OnboardingBillingInterval>('TRIAL');
  const [trialDays, setTrialDays] = useState<string>('14');
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (open) {
      setCustomizeSubscription(false);
      const defaultPlan = plans.find((p) => p.defaultTrialPlan) || plans[0];
      setSelectedPlanId(defaultPlan ? String(defaultPlan.id) : '');
      setBillingInterval('TRIAL');
      setTrialDays(
        defaultPlan?.defaultTrialDays ? String(defaultPlan.defaultTrialDays) : '14'
      );
      setRemarks('');
    }
  }, [open, plans]);

  if (!open || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customizeSubscription) {
      await onConfirmApprove(request.id, undefined);
      return;
    }

    const parsedPlanId = selectedPlanId ? Number(selectedPlanId) : undefined;
    const isTrial = billingInterval === 'TRIAL';
    const parsedTrialDays =
      isTrial && trialDays.trim() ? Math.max(1, parseInt(trialDays, 10) || 14) : undefined;

    const payload: ApproveOnboardingSubscriptionRequest = {
      planId: parsedPlanId || undefined,
      billingInterval,
      trial: isTrial,
      trialDays: parsedTrialDays,
      remarks: remarks.trim() || undefined,
    };

    await onConfirmApprove(request.id, payload);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Approve Onboarding Request"
      description={`Confirm approval and tenant provisioning for ${request.schoolName} (#ONB-${request.id}).`}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm &amp; Approve School
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Approval failed">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-900 text-sm">{request.schoolName}</span>
            <Badge variant="neutral">
              {BOARD_AFFILIATION_LABELS[request.boardAffiliation] || request.boardAffiliation}
            </Badge>
          </div>
          <div className="text-slate-600 space-y-1">
            <p>
              <span className="text-slate-500">Applicant:</span>{' '}
              <strong className="font-medium text-slate-800">{request.contactPersonName}</strong> (
              {request.designation}) • {request.contactEmail}
            </p>
            <p>
              <span className="text-slate-500">Location &amp; Scale:</span> {request.city},{' '}
              {request.state} •{' '}
              {STUDENT_STRENGTH_LABELS[request.studentStrength] || request.studentStrength}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3.5 text-xs text-slate-700 space-y-1.5">
          <p className="font-semibold text-indigo-950">What happens on approval:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>
              Creates an <span className="font-semibold text-slate-800">ACTIVE</span> school
              organization record.
            </li>
            <li>
              {request.requestedBy ? (
                <>
                  Activates initial <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
                  membership for User #{request.requestedBy}.
                </>
              ) : (
                <>
                  Sends an initial <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
                  invitation to <span className="font-mono">{request.contactEmail}</span>.
                </>
              )}
            </li>
            <li>Provisions the school&apos;s initial SaaS subscription and feature entitlements.</li>
          </ul>
        </div>
        {plans.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Customize initial subscription plan (optional)</span>
              </span>
              <input
                type="checkbox"
                checked={customizeSubscription}
                onChange={(e) => setCustomizeSubscription(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {customizeSubscription && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <FormField label="Subscription Plan" htmlFor="approve-plan-select">
                  <Select
                    id="approve-plan-select"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    disabled={isSubmitting}
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.code}) — Up to {plan.maxStudents.toLocaleString('en-IN')}{' '}
                        students
                        {plan.defaultTrialPlan ? ' [Default Trial]' : ''}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Billing Interval" htmlFor="approve-billing-interval">
                    <Select
                      id="approve-billing-interval"
                      value={billingInterval}
                      onChange={(e) =>
                        setBillingInterval(e.target.value as OnboardingBillingInterval)
                      }
                      disabled={isSubmitting}
                    >
                      <option value="TRIAL">Trial Period</option>
                      <option value="MONTHLY">Monthly Billing</option>
                      <option value="YEARLY">Yearly Billing</option>
                    </Select>
                  </FormField>

                  {billingInterval === 'TRIAL' && (
                    <FormField label="Trial Duration (Days)" htmlFor="approve-trial-days">
                      <Input
                        id="approve-trial-days"
                        type="number"
                        min={1}
                        max={365}
                        value={trialDays}
                        onChange={(e) => setTrialDays(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </FormField>
                  )}
                </div>

                <FormField label="Provisioning Remarks (Optional)" htmlFor="approve-remarks">
                  <Input
                    id="approve-remarks"
                    placeholder="e.g. Approved with 14-day Growth trial"
                    maxLength={1000}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
};

export interface RejectOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  request: OnboardingRequestResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirmReject: (requestId: number, rejectionReason: string) => Promise<void>;
}

const QUICK_REJECTION_REASONS = [
  'Incomplete or unverifiable school affiliation details.',
  'Duplicate onboarding application submitted for the same institution.',
  'Unable to verify official school contact email or phone number.',
];

export const RejectOnboardingDialog: React.FC<RejectOnboardingDialogProps> = ({
  open,
  onClose,
  request,
  isSubmitting,
  errorMessage,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError(null);
    }
  }, [open]);

  if (!open || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('Please provide a reason for rejecting this onboarding request.');
      return;
    }
    if (trimmed.length > 1000) {
      setValidationError('Rejection reason cannot exceed 1,000 characters.');
      return;
    }
    setValidationError(null);
    await onConfirmReject(request.id, trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Reject Onboarding Request"
      description={`Provide a clear rejection reason for ${request.schoolName} (#ONB-${request.id}).`}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Confirm Rejection
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Rejection failed">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-900 text-sm">{request.schoolName}</span>
            <span className="font-mono text-xs text-slate-500">#ONB-{request.id}</span>
          </div>
          <p className="text-slate-600">
            Applicant: <strong className="font-medium">{request.contactPersonName}</strong> (
            {request.contactEmail})
          </p>
        </div>

        <FormField
          label="Rejection Reason"
          htmlFor="rejection-reason-textarea"
          required
          error={validationError || undefined}
          hint={`${reason.trim().length} / 1,000 characters. This reason is permanently recorded on the onboarding request and platform audit log.`}
        >
          <Textarea
            id="rejection-reason-textarea"
            rows={4}
            maxLength={1000}
            hasError={Boolean(validationError)}
            placeholder="Explain why this school onboarding request is being rejected..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-slate-500">Quick reason templates:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REJECTION_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setReason(preset);
                  setValidationError(null);
                }}
                className="text-left text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
};

