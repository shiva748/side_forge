import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Layers,
  PauseCircle,
  Plus,
  Users,
} from 'lucide-react';
import { PlatformFeature } from '../../types/auth';
import {
  ALL_PLATFORM_FEATURES,
  CreateSubscriptionPlanRequest,
  formatCurrencyINR,
  PLATFORM_FEATURE_LABELS,
  SubscriptionPlanResponse,
  UpdateSubscriptionPlanRequest,
} from '../../types/platformSubscription';
import { formatOnboardingDate } from './OnboardingRequestDetailsModal';
import { Badge, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

export interface PlanDetailsModalProps {
  open: boolean;
  onClose: () => void;
  plan: SubscriptionPlanResponse | null;
  canManagePlans: boolean;
  onEditPlan: (plan: SubscriptionPlanResponse) => void;
  onTogglePlanStatus: (plan: SubscriptionPlanResponse) => void;
}

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({
  open,
  onClose,
  plan,
  canManagePlans,
  onEditPlan,
  onTogglePlanStatus,
}) => {
  if (!open || !plan) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${plan.name} (${plan.code})`}
      description={`Subscription Plan ID #${plan.id} • Updated ${formatOnboardingDate(
        plan.updatedAt
      )}`}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {plan.defaultTrialPlan ? 'Default onboarding trial plan' : 'Standard SaaS plan'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {canManagePlans && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onTogglePlanStatus(plan);
                  }}
                >
                  {plan.active ? 'Deactivate Plan' : 'Activate Plan'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onEditPlan(plan);
                  }}
                  leftIcon={<Edit3 className="w-4 h-4" />}
                >
                  Edit Plan
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <IdLabel>{plan.code}</IdLabel>
            <Badge variant={plan.active ? 'success' : 'neutral'} dot>
              {plan.active ? 'Active Plan' : 'Inactive Plan'}
            </Badge>
            {plan.defaultTrialPlan && (
              <Badge variant="primary">
                Default Trial ({plan.defaultTrialDays || 14} days)
              </Badge>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Display Order: #{plan.displayOrder ?? 10}
          </span>
        </div>

        {plan.description && (
          <p className="text-xs text-slate-600 leading-relaxed">{plan.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
            <span className="text-xs text-slate-500 block">Monthly Price</span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              {formatCurrencyINR(plan.monthlyPrice)}
            </span>
            <span className="text-[11px] text-slate-400">per month</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
            <span className="text-xs text-slate-500 block">Yearly Price</span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              {formatCurrencyINR(plan.yearlyPrice)}
            </span>
            <span className="text-[11px] text-slate-400">per year</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
            <span className="text-xs text-slate-500 block">Max Student Limit</span>
            <span className="text-lg font-bold text-indigo-700 mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {plan.maxStudents.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">active enrolled students</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Included Feature Entitlements ({(plan.includedFeatures || []).length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(plan.includedFeatures || []).map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-3 py-1.5 text-xs text-emerald-900"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  {PLATFORM_FEATURE_LABELS[feat] || feat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export interface PlanStatusConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  plan: SubscriptionPlanResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirmToggle: (planId: number, nextActive: boolean) => Promise<void>;
}

export const PlanStatusConfirmDialog: React.FC<PlanStatusConfirmDialogProps> = ({
  open,
  onClose,
  plan,
  isSubmitting,
  errorMessage,
  onConfirmToggle,
}) => {
  if (!open || !plan) return null;

  const nextActive = !plan.active;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={nextActive ? 'Activate Subscription Plan' : 'Deactivate Subscription Plan'}
      description={`${plan.name} (${plan.code})`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={nextActive ? 'primary' : 'danger'}
            isLoading={isSubmitting}
            onClick={() => void onConfirmToggle(plan.id, nextActive)}
            leftIcon={
              nextActive ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <PauseCircle className="w-4 h-4" />
              )
            }
          >
            {nextActive ? 'Confirm Activation' : 'Confirm Deactivation'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Could not update plan status">
            {errorMessage}
          </InlineAlert>
        )}

        <InlineAlert
          variant={nextActive ? 'info' : 'warning'}
          title={
            nextActive
              ? 'Impact on New & Existing Subscriptions'
              : 'Existing Subscriptions Are Preserved'
          }
        >
          {nextActive
            ? `Activating ${plan.name} (${plan.code}) makes it selectable for new organization subscriptions, onboarding approvals, and plan upgrades.`
            : `Deactivating ${plan.name} (${plan.code}) prevents new subscriptions from being assigned to this plan. All existing organizations currently subscribed to ${plan.name} keep their active subscription and history unchanged.`}
        </InlineAlert>
      </div>
    </Dialog>
  );
};

export interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  editingPlan: SubscriptionPlanResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmitCreate: (payload: CreateSubscriptionPlanRequest) => Promise<void>;
  onSubmitUpdate: (
    planId: number,
    payload: UpdateSubscriptionPlanRequest
  ) => Promise<void>;
}

const DEFAULT_CORE_FEATURES: PlatformFeature[] = [
  'ACADEMIC_MANAGEMENT',
  'STUDENT_MANAGEMENT',
  'STAFF_MANAGEMENT',
  'TIMETABLE',
  'ATTENDANCE',
  'DASHBOARD_AND_REPORTS',
];

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  open,
  onClose,
  editingPlan,
  isSubmitting,
  errorMessage,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditMode = Boolean(editingPlan);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('0');
  const [yearlyPrice, setYearlyPrice] = useState('0');
  const [maxStudents, setMaxStudents] = useState('500');
  const [defaultTrialPlan, setDefaultTrialPlan] = useState(false);
  const [defaultTrialDays, setDefaultTrialDays] = useState('30');
  const [displayOrder, setDisplayOrder] = useState('10');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<PlatformFeature>>(
    new Set(DEFAULT_CORE_FEATURES)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    if (editingPlan) {
      setCode(editingPlan.code);
      setName(editingPlan.name);
      setDescription(editingPlan.description || '');
      setMonthlyPrice(String(editingPlan.monthlyPrice ?? 0));
      setYearlyPrice(String(editingPlan.yearlyPrice ?? 0));
      setMaxStudents(String(editingPlan.maxStudents ?? 500));
      setDefaultTrialPlan(Boolean(editingPlan.defaultTrialPlan));
      setDefaultTrialDays(String(editingPlan.defaultTrialDays ?? 30));
      setDisplayOrder(String(editingPlan.displayOrder ?? 10));
      setSelectedFeatures(new Set(editingPlan.includedFeatures || DEFAULT_CORE_FEATURES));
    } else {
      setCode('');
      setName('');
      setDescription('');
      setMonthlyPrice('2999');
      setYearlyPrice('29990');
      setMaxStudents('500');
      setDefaultTrialPlan(false);
      setDefaultTrialDays('30');
      setDisplayOrder('10');
      setSelectedFeatures(new Set(DEFAULT_CORE_FEATURES));
    }
  }, [editingPlan, open]);

  if (!open) return null;

  const toggleFeature = (feature: PlatformFeature) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) {
        next.delete(feature);
      } else {
        next.add(feature);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const parsedMonthly = Number(monthlyPrice);
    const parsedYearly = Number(yearlyPrice);
    const parsedStudents = parseInt(maxStudents, 10);
    const parsedTrialDays = parseInt(defaultTrialDays, 10) || 30;
    const parsedOrder = parseInt(displayOrder, 10) || 10;

    if (!isEditMode && !trimmedCode) {
      setValidationError('Plan code is required (e.g., GROWTH_PLUS).');
      return;
    }
    if (!trimmedName) {
      setValidationError('Plan name is required.');
      return;
    }
    if (Number.isNaN(parsedMonthly) || parsedMonthly < 0) {
      setValidationError('Monthly price must be 0 or greater.');
      return;
    }
    if (Number.isNaN(parsedYearly) || parsedYearly < 0) {
      setValidationError('Yearly price must be 0 or greater.');
      return;
    }
    if (Number.isNaN(parsedStudents) || parsedStudents < 1) {
      setValidationError('Maximum student limit must be at least 1.');
      return;
    }
    if (selectedFeatures.size === 0) {
      setValidationError('Select at least one included feature entitlement.');
      return;
    }

    setValidationError(null);
    const featureList = Array.from(selectedFeatures);

    if (isEditMode && editingPlan) {
      await onSubmitUpdate(editingPlan.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        monthlyPrice: parsedMonthly,
        yearlyPrice: parsedYearly,
        maxStudents: parsedStudents,
        includedFeatures: featureList,
        defaultTrialPlan,
        defaultTrialDays: Math.max(1, parsedTrialDays),
        displayOrder: Math.max(1, parsedOrder),
      });
    } else {
      await onSubmitCreate({
        code: trimmedCode,
        name: trimmedName,
        description: description.trim() || undefined,
        monthlyPrice: parsedMonthly,
        yearlyPrice: parsedYearly,
        maxStudents: parsedStudents,
        includedFeatures: featureList,
        defaultTrialPlan,
        defaultTrialDays: Math.max(1, parsedTrialDays),
        displayOrder: Math.max(1, parsedOrder),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={isEditMode ? `Edit Plan: ${editingPlan?.name}` : 'Create Subscription Plan'}
      description={
        isEditMode
          ? `Modify plan pricing, capacity, and included feature entitlements for ${editingPlan?.code}.`
          : 'Define a new Side_forge SaaS subscription plan for school organizations.'
      }
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={isEditMode ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {isEditMode ? 'Save Plan Changes' : 'Create Plan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Validation Error">
            {errorMessage || validationError}
          </InlineAlert>
        )}

        {isEditMode ? (
          <InlineAlert
            variant="info"
            title="How Plan Updates Affect New vs. Existing Subscriptions"
          >
            Updated <strong className="font-semibold">monthly/yearly prices</strong> and{' '}
            <strong className="font-semibold">student limits</strong> apply to{' '}
            <strong className="font-semibold">
              new purchases, renewals, and plan upgrades/downgrades
            </strong>
            . Existing active subscriptions retain their snapshotted contracted amount and student
            limit for their current billing period, while updated{' '}
            <strong className="font-semibold">feature entitlements</strong> apply immediately unless
            overridden per organization.
          </InlineAlert>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Plan Code"
            htmlFor="plan-code-input"
            required={!isEditMode}
            hint={isEditMode ? 'Plan code is immutable after creation' : 'Unique uppercase identifier'}
          >
            <Input
              id="plan-code-input"
              placeholder="e.g. GROWTH_PLUS"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isEditMode || isSubmitting}
            />
          </FormField>

          <FormField label="Plan Name" htmlFor="plan-name-input" required>
            <Input
              id="plan-name-input"
              placeholder="e.g. Growth Plus Plan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="plan-desc-input">
          <Textarea
            id="plan-desc-input"
            rows={2}
            placeholder="Describe the target school size and key capabilities of this plan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Monthly Price (INR)" htmlFor="plan-monthly-price" required>
            <Input
              id="plan-monthly-price"
              type="number"
              min={0}
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Yearly Price (INR)" htmlFor="plan-yearly-price" required>
            <Input
              id="plan-yearly-price"
              type="number"
              min={0}
              step="0.01"
              value={yearlyPrice}
              onChange={(e) => setYearlyPrice(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Max Student Limit" htmlFor="plan-max-students" required>
            <Input
              id="plan-max-students"
              type="number"
              min={1}
              step={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={defaultTrialPlan}
                onChange={(e) => setDefaultTrialPlan(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Set as Default Onboarding Trial Plan</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Used automatically when approving school onboarding requests unless another plan is
              selected.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="Default Trial Days" htmlFor="plan-trial-days">
              <Input
                id="plan-trial-days"
                type="number"
                min={1}
                max={365}
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>
            <FormField label="Display Order" htmlFor="plan-display-order">
              <Input
                id="plan-display-order"
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Included Feature Entitlements ({selectedFeatures.size} selected){' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setSelectedFeatures(new Set(ALL_PLATFORM_FEATURES.map((f) => f.code)))
                }
                className="text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedFeatures(new Set(DEFAULT_CORE_FEATURES))}
                className="text-slate-500 hover:underline cursor-pointer"
              >
                Reset to Core
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-slate-200/80 bg-white">
            {ALL_PLATFORM_FEATURES.map((feat) => {
              const checked = selectedFeatures.has(feat.code);
              return (
                <label
                  key={feat.code}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'border-indigo-200 bg-indigo-50/50 text-indigo-950 font-medium'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(feat.code)}
                    disabled={isSubmitting}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate">{feat.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </Dialog>
  );
};
