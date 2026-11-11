import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Receipt,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../lib/api-client';
import { platformSubscriptionApi } from '../../services/platformSubscriptionApi';
import {
  formatCurrencyINR,
  FullOrganizationSubscriptionResponse,
   getPaymentStatusBadgeMeta,
  MANUAL_PAYMENT_METHODS,
  OrganizationBillingSummaryResponse,
  ReceiptExportFormat,
  RecordSubscriptionPaymentRequest,
  SubscriptionPaymentMethod,
  SubscriptionPaymentResponse,
} from '../../types/platformSubscription';
import { Badge, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

// ============================================================================
// 1. Receipt Download Action Buttons (PDF / EXCEL / CSV)
// ============================================================================

export interface PaymentReceiptDownloadButtonsProps {
  organizationId: number;
  paymentId: number;
  invoiceNumber: string;
  compact?: boolean;
}

export const PaymentReceiptDownloadButtons: React.FC<
  PaymentReceiptDownloadButtonsProps
> = ({ organizationId, paymentId, invoiceNumber, compact = true }) => {
  const toast = useToast();
  const [downloadingFormat, setDownloadingFormat] =
    useState<ReceiptExportFormat | null>(null);

  const handleDownload = async (format: ReceiptExportFormat) => {
    if (downloadingFormat !== null) return;
    setDownloadingFormat(format);
    try {
      const { filename } = await platformSubscriptionApi.downloadPaymentReceipt(
        organizationId,
        paymentId,
        format
      );
      toast.success(
        `Receipt downloaded (${format})`,
        `Saved ${filename} for invoice ${invoiceNumber}.`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : `Failed to download ${format} receipt for ${invoiceNumber}.`;
      toast.error('Receipt download failed', msg);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const formats: { format: ReceiptExportFormat; label: string }[] = [
    { format: 'PDF', label: 'PDF' },
    { format: 'EXCEL', label: 'Excel' },
    { format: 'CSV', label: 'CSV' },
  ];

  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label={`Download receipt for ${invoiceNumber}`}
    >
      {formats.map(({ format, label }) => {
        const isCurrentLoading = downloadingFormat === format;
        return (
          <button
            key={format}
            type="button"
            disabled={downloadingFormat !== null}
            onClick={() => void handleDownload(format)}
            title={`Download ${label} receipt for ${invoiceNumber}`}
            className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            }`}
          >
            {format === 'PDF' ? (
              <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
            ) : format === 'EXCEL' ? (
              <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <Download className="w-3 h-3 text-slate-500 shrink-0" />
            )}
            <span>{isCurrentLoading ? '...' : label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// 2. Record Manual Subscription Payment Dialog
// ============================================================================

export interface RecordManualPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: number | null;
  organizationName: string;
  currentSubscription: FullOrganizationSubscriptionResponse | null;
  billingSummary?: OrganizationBillingSummaryResponse | null;
  onPaymentRecorded: (
    payment: SubscriptionPaymentResponse,
    updatedSubscription: FullOrganizationSubscriptionResponse | null,
    updatedBilling: OrganizationBillingSummaryResponse | null
  ) => void;
}

export const RecordManualPaymentDialog: React.FC<
  RecordManualPaymentDialogProps
> = ({
  open,
  onClose,
  organizationId,
  organizationName,
  currentSubscription,
  billingSummary,
  onPaymentRecorded,
}) => {
  const toast = useToast();

  const todayIso = new Date().toISOString().slice(0, 10);

  const [paymentMethod, setPaymentMethod] =
    useState<SubscriptionPaymentMethod>('BANK_TRANSFER');
  const [billedAmountInput, setBilledAmountInput] = useState('');
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [renewSubscription, setRenewSubscription] = useState(false);
  const [remarks, setRemarks] = useState('');

  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmed backend result state
  const [recordedPayment, setRecordedPayment] =
    useState<SubscriptionPaymentResponse | null>(null);
  const [updatedSubAfterPayment, setUpdatedSubAfterPayment] =
    useState<FullOrganizationSubscriptionResponse | null>(null);
  const [updatedBillingAfterPayment, setUpdatedBillingAfterPayment] =
    useState<OrganizationBillingSummaryResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const contracted = Number(currentSubscription?.contractedAmount ?? 0);
    const outstanding = Number(
      billingSummary?.currentPeriodOutstandingAmount ??
        currentSubscription?.outstandingAmount ??
        contracted
    );

    setPaymentMethod('BANK_TRANSFER');
    setBilledAmountInput(contracted > 0 ? String(contracted) : '');
    setAmountReceivedInput(
      outstanding > 0
        ? String(outstanding)
        : contracted > 0
        ? String(contracted)
        : ''
    );
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber('');
    setBillingPeriodStart(currentSubscription?.currentPeriodStart || '');
    setBillingPeriodEnd(currentSubscription?.currentPeriodEnd || '');
    setRenewSubscription(false);
    setRemarks('');
    setConfirmStep(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    setRecordedPayment(null);
    setUpdatedSubAfterPayment(null);
    setUpdatedBillingAfterPayment(null);
  }, [billingSummary, currentSubscription, open]);

  if (!open || !organizationId) return null;

  const contractedAmount = Number(
    billingSummary?.currentPeriodContractedAmount ??
      currentSubscription?.contractedAmount ??
      0
  );
  const paidBefore = Number(
    billingSummary?.currentPeriodPaidAmount ??
      currentSubscription?.amountPaid ??
      0
  );
  const outstandingBefore = Number(
    billingSummary?.currentPeriodOutstandingAmount ??
      currentSubscription?.outstandingAmount ??
      0
  );

  const handleValidateBeforeConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentSubscription) {
      setErrorMessage(
        'This organization does not have a current subscription record to record payment against.'
      );
      return;
    }

    const received = Number(amountReceivedInput);
    if (
      !amountReceivedInput.trim() ||
      Number.isNaN(received) ||
      received < 0.01
    ) {
      setErrorMessage(
        'Amount received is required and must be at least ₹0.01.'
      );
      return;
    }

    if (billedAmountInput.trim()) {
      const billed = Number(billedAmountInput);
      if (Number.isNaN(billed) || billed < 0) {
        setErrorMessage('Billed amount must be ₹0.00 or greater.');
        return;
      }
    }

    if (
      billingPeriodStart &&
      billingPeriodEnd &&
      billingPeriodEnd < billingPeriodStart
    ) {
      setErrorMessage(
        'Billing period end date cannot be earlier than billing period start date.'
      );
      return;
    }

    if (referenceNumber.trim().length > 120) {
      setErrorMessage('Reference number must be 120 characters or fewer.');
      return;
    }

    if (remarks.trim().length > 1000) {
      setErrorMessage('Remarks must be 1000 characters or fewer.');
      return;
    }

    setConfirmStep(true);
  };

  const handleConfirmRecordPayment = async () => {
    if (isSubmitting || !organizationId) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: RecordSubscriptionPaymentRequest = {
        amountReceived: Number(Number(amountReceivedInput).toFixed(2)),
        billedAmount: billedAmountInput.trim()
          ? Number(Number(billedAmountInput).toFixed(2))
          : undefined,
        paymentMethod,
        paymentDate: paymentDate.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        billingPeriodStart: billingPeriodStart.trim() || undefined,
        billingPeriodEnd: billingPeriodEnd.trim() || undefined,
        renewSubscription,
        remarks: remarks.trim() || undefined,
      };

      const savedPayment = await platformSubscriptionApi.recordManualPayment(
        organizationId,
        payload
      );

      const [freshSub, freshBilling] = await Promise.all([
        platformSubscriptionApi
          .getCurrentSubscription(organizationId)
          .catch(() => null),
        platformSubscriptionApi
          .getOrganizationBillingSummary(organizationId)
          .catch(() => null),
      ]);

      setRecordedPayment(savedPayment);
      setUpdatedSubAfterPayment(freshSub);
      setUpdatedBillingAfterPayment(freshBilling);
      setConfirmStep(false);

      toast.success(
        'Manual payment recorded',
        `Recorded ${formatCurrencyINR(
          savedPayment.amountReceived,
          true
        )} (${savedPayment.invoiceNumber}) for ${organizationName}.`
      );
      onPaymentRecorded(savedPayment, freshSub, freshBilling);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to record manual subscription payment.';
      setErrorMessage(msg);
      toast.error('Payment recording failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = recordedPayment ? (
    <div className="w-full flex items-center justify-between gap-3">
      <PaymentReceiptDownloadButtons
        organizationId={organizationId}
        paymentId={recordedPayment.id}
        invoiceNumber={recordedPayment.invoiceNumber}
        compact={false}
      />
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </div>
  ) : confirmStep ? (
    <div className="w-full flex items-center justify-between gap-3">
      <span className="text-xs text-amber-800 font-medium">
        Please verify the payment amount, method, and billing period before confirming.
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setConfirmStep(false)}
        >
          Back to Edit
        </Button>
        <Button
          type="button"
          variant="primary"
          isLoading={isSubmitting}
          onClick={() => void handleConfirmRecordPayment()}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          Confirm &amp; Record Payment
        </Button>
      </div>
    </div>
  ) : (
    <div className="w-full flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">
        Offline manual billing settlement • Generates an official invoice &amp; audit entry
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="record-manual-payment-form"
          variant="primary"
          disabled={!currentSubscription}
          leftIcon={<Receipt className="w-4 h-4" />}
        >
          Review Payment
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Record Manual Payment: ${organizationName}`}
      description={`Organization ID #${organizationId}${
        currentSubscription
          ? ` • Subscription #${currentSubscription.id} (${currentSubscription.planName})`
          : ''
      }`}
      maxWidthClass="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Organization & Subscription Financial Summary */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>{organizationName}</span>
              <IdLabel>Org #{organizationId}</IdLabel>
            </div>
            {currentSubscription && (
              <Badge variant="primary">
                {currentSubscription.planName} ({currentSubscription.billingInterval})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white border border-slate-200/70 p-2.5">
              <span className="text-slate-500 block">Contracted Amount</span>
              <span className="font-bold text-slate-900 text-sm tabular-nums block mt-0.5">
                {formatCurrencyINR(contractedAmount, true)}
              </span>
            </div>
            <div className="rounded-lg bg-white border border-slate-200/70 p-2.5">
              <span className="text-slate-500 block">Paid So Far</span>
              <span className="font-bold text-emerald-700 text-sm tabular-nums block mt-0.5">
                {formatCurrencyINR(paidBefore, true)}
              </span>
            </div>
            <div className="rounded-lg bg-white border border-rose-200/80 p-2.5">
              <span className="text-slate-500 block">Outstanding Balance</span>
              <span className="font-bold text-rose-700 text-sm tabular-nums block mt-0.5">
                {formatCurrencyINR(outstandingBefore, true)}
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <InlineAlert variant="error" title="Payment Validation / Submission Error">
            {errorMessage}
          </InlineAlert>
        )}

        {recordedPayment ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-emerald-950">
                  Payment Recorded &amp; Verified by Backend
                </h3>
                <p className="text-emerald-800">
                  Invoice <span className="font-mono font-bold">{recordedPayment.invoiceNumber}</span> has been generated and applied to {organizationName}&apos;s subscription ledger.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-white border border-emerald-200/80 p-3">
              <div>
                <span className="text-slate-500 block">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  {recordedPayment.invoiceNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Amount Received</span>
                <span className="font-bold text-emerald-700 mt-0.5 block tabular-nums">
                  {formatCurrencyINR(recordedPayment.amountReceived, true)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Updated Total Paid</span>
                <span className="font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {formatCurrencyINR(
                    updatedBillingAfterPayment?.currentPeriodPaidAmount ??
                      updatedSubAfterPayment?.amountPaid ??
                      recordedPayment.amountReceived,
                    true
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Updated Outstanding</span>
                <span className="font-bold text-rose-700 mt-0.5 block tabular-nums">
                  {formatCurrencyINR(
                    updatedBillingAfterPayment?.currentPeriodOutstandingAmount ??
                      updatedSubAfterPayment?.outstandingAmount ??
                      0,
                    true
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : confirmStep ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-950">
                  Confirm Offline Subscription Payment
                </h3>
                <p className="text-amber-900 leading-relaxed">
                  You are about to record a manual subscription payment for{' '}
                  <strong>{organizationName}</strong>. This action updates the organization&apos;s subscription balance, generates an official invoice number, and logs a platform audit event.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-lg bg-white border border-amber-200 p-3">
              <div>
                <dt className="text-slate-500">Amount Received</dt>
                <dd className="font-bold text-emerald-700 text-sm tabular-nums">
                  {formatCurrencyINR(Number(amountReceivedInput), true)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Billed Amount</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {billedAmountInput.trim()
                    ? formatCurrencyINR(Number(billedAmountInput), true)
                    : formatCurrencyINR(
                        contractedAmount > 0
                          ? contractedAmount
                          : Number(amountReceivedInput),
                        true
                      )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment Method</dt>
                <dd className="font-semibold text-slate-900">{paymentMethod}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment Date</dt>
                <dd className="font-medium text-slate-800">{paymentDate || todayIso}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reference / UTR #</dt>
                <dd className="font-mono font-medium text-slate-800">
                  {referenceNumber.trim() || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Billing Period</dt>
                <dd className="font-medium text-slate-800">
                  {billingPeriodStart || '—'} → {billingPeriodEnd || '—'}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <form
            id="record-manual-payment-form"
            onSubmit={handleValidateBeforeConfirm}
            noValidate
            className="space-y-3.5 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField
                label="Amount Received (INR)"
                htmlFor="pmt-amount-received"
                hint="Actual offline payment amount received (min ₹0.01)."
                required
              >
                <Input
                  id="pmt-amount-received"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amountReceivedInput}
                  onChange={(e) => setAmountReceivedInput(e.target.value)}
                  placeholder="e.g., 24000.00"
                  leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
                  required
                />
              </FormField>

              <FormField
                label="Billed Amount (INR)"
                htmlFor="pmt-billed-amount"
                hint="Defaults to contracted subscription amount if left blank."
              >
                <Input
                  id="pmt-billed-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={billedAmountInput}
                  onChange={(e) => setBilledAmountInput(e.target.value)}
                  placeholder="e.g., 24000.00"
                  leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                />
              </FormField>

              <FormField
                label="Payment Method"
                htmlFor="pmt-method"
                required
              >
                <Select
                  id="pmt-method"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as SubscriptionPaymentMethod)
                  }
                >
                  {MANUAL_PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Payment Date"
                htmlFor="pmt-date"
                required
              >
                <Input
                  id="pmt-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </FormField>

              <FormField
                label="Transaction / Reference Number"
                htmlFor="pmt-ref"
                hint="UTR, NEFT/RTGS reference, UPI transaction ID, cheque #, or cash voucher."
              >
                <Input
                  id="pmt-ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., UTR2026110988412"
                  maxLength={120}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField label="Period Start" htmlFor="pmt-period-start">
                  <Input
                    id="pmt-period-start"
                    type="date"
                    value={billingPeriodStart}
                    onChange={(e) => setBillingPeriodStart(e.target.value)}
                  />
                </FormField>
                <FormField label="Period End" htmlFor="pmt-period-end">
                  <Input
                    id="pmt-period-end"
                    type="date"
                    value={billingPeriodEnd}
                    onChange={(e) => setBillingPeriodEnd(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={renewSubscription}
                onChange={(e) => setRenewSubscription(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Apply as Subscription Period Renewal
                </span>
                <span className="text-[11px] text-slate-500">
                  When checked, updates the subscription&apos;s active billing period and expiry date to match the billing period above. Leave unchecked when settling the current period&apos;s balance.
                </span>
              </div>
            </label>

            <FormField label="Administrative Remarks" htmlFor="pmt-remarks">
              <Textarea
                id="pmt-remarks"
                rows={2}
                maxLength={1000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional accounting notes, bank branch, or settlement details..."
              />
            </FormField>
          </form>
        )}
      </div>
    </Dialog>
  );
};


