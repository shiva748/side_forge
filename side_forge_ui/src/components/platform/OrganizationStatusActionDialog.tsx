import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, PauseCircle, PowerOff } from 'lucide-react';
import {
  getOrganizationStatusBadgeMeta,
  ManageableOrganizationStatus,
  OrganizationStatus,
} from '../../types/platformDashboard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

export interface OrganizationStatusTarget {
  id: number;
  name: string;
  currentStatus: OrganizationStatus;
  nextStatus: ManageableOrganizationStatus;
}

export interface OrganizationStatusActionDialogProps {
  open: boolean;
  onClose: () => void;
  target: OrganizationStatusTarget | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirmStatusChange: (
    organizationId: number,
    nextStatus: ManageableOrganizationStatus,
    reason: string
  ) => Promise<void>;
}

const QUICK_REASONS_BY_STATUS: Record<ManageableOrganizationStatus, string[]> = {
  ACTIVE: [
    'Account verification completed and organization reactivated.',
    'Subscription billing resolved; restoring full school workspace access.',
    'Reactivated upon school administrator request.',
  ],
  SUSPENDED: [
    'Temporarily suspended due to overdue SaaS subscription renewal.',
    'Suspended pending compliance or administrative verification.',
    'Temporary suspension requested by institution leadership.',
  ],
  DEACTIVATED: [
    'Organization contract concluded at end of academic session.',
    'Duplicate or test school tenant deactivated by platform administrator.',
    'Deactivated upon formal closure request from school management.',
  ],
};

export const OrganizationStatusActionDialog: React.FC<
  OrganizationStatusActionDialogProps
> = ({
  open,
  onClose,
  target,
  isSubmitting,
  errorMessage,
  onConfirmStatusChange,
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError(null);
    }
  }, [open, target]);

  if (!open || !target) return null;

  const { nextStatus, currentStatus } = target;
  const currentMeta = getOrganizationStatusBadgeMeta(currentStatus);
  const nextMeta = getOrganizationStatusBadgeMeta(nextStatus);

  const dialogConfig = {
    ACTIVE: {
      title: 'Activate Organization',
      description: `Restore active operational status for ${target.name} (Org #${target.id}).`,
      buttonLabel: 'Confirm Activation',
      buttonVariant: 'primary' as const,
      icon: <CheckCircle2 className="w-4 h-4" />,
      impactTitle: 'Impact of Activation',
      impactText:
        'Activating this organization restores workspace access for all active members according to the school’s current subscription plan and entitlements.',
      alertVariant: 'info' as const,
    },
    SUSPENDED: {
      title: 'Suspend Organization',
      description: `Temporarily suspend workspace operations for ${target.name} (Org #${target.id}).`,
      buttonLabel: 'Confirm Suspension',
      buttonVariant: 'danger' as const,
      icon: <PauseCircle className="w-4 h-4" />,
      impactTitle: 'Impact of Suspension (Data Preserved)',
      impactText:
        'Suspending this organization restricts tenant operations until reactivated. No school, student, staff, academic, or financial records are deleted.',
      alertVariant: 'warning' as const,
    },
    DEACTIVATED: {
      title: 'Deactivate Organization',
      description: `Deactivate ${target.name} (Org #${target.id}) on the Side_forge platform.`,
      buttonLabel: 'Confirm Deactivation',
      buttonVariant: 'danger' as const,
      icon: <PowerOff className="w-4 h-4" />,
      impactTitle: 'Impact of Deactivation (Data Preserved)',
      impactText:
        'Deactivating marks the organization as inactive and disables workspace access. All historical school data and audit logs remain safely stored and can be reactivated later.',
      alertVariant: 'error' as const,
    },
  }[nextStatus];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('Please provide a reason for this status change.');
      return;
    }
    if (trimmed.length > 1000) {
      setValidationError('Reason cannot exceed 1,000 characters.');
      return;
    }
    setValidationError(null);
    await onConfirmStatusChange(target.id, nextStatus, trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={dialogConfig.title}
      description={dialogConfig.description}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={dialogConfig.buttonVariant}
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={dialogConfig.icon}
          >
            {dialogConfig.buttonLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Status update failed">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{target.name}</p>
            <p className="font-mono text-slate-500 mt-0.5">Organization ID #{target.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={currentMeta.variant}>{currentMeta.label}</Badge>
            <span className="text-slate-400">→</span>
            <Badge variant={nextMeta.variant} dot>
              {nextMeta.label}
            </Badge>
          </div>
        </div>

        <InlineAlert variant={dialogConfig.alertVariant} title={dialogConfig.impactTitle}>
          {dialogConfig.impactText}
        </InlineAlert>

        <FormField
          label="Administrative Reason"
          htmlFor="org-status-reason"
          required
          error={validationError || undefined}
          hint={`${reason.trim().length} / 1,000 characters. Recorded in organization status history and platform audit logs.`}
        >
          <Textarea
            id="org-status-reason"
            rows={3}
            maxLength={1000}
            hasError={Boolean(validationError)}
            placeholder={`Enter the reason for changing status to ${nextStatus}...`}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-slate-400" />
            <span>Quick reason templates:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS_BY_STATUS[nextStatus].map((preset) => (
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
