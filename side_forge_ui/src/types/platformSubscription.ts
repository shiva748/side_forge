import {
  BillingInterval,
  OrganizationSubscriptionResponse,
  PlatformFeature,
  SubscriptionStatus,
} from './auth';
import { BadgeVariant } from '../components/ui/Badge';

export type SubscriptionPaymentMethod =
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CHEQUE'
  | 'CASH'
  | 'DEMAND_DRAFT'
  | 'OTHER';

export type ReceiptExportFormat = 'PDF' | 'EXCEL' | 'CSV';

export const MANUAL_PAYMENT_METHODS: {
  value: SubscriptionPaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: 'BANK_TRANSFER',
    label: 'Bank Transfer (NEFT / RTGS / IMPS)',
    description: 'Direct bank transfer to Side_forge corporate account',
  },
  {
    value: 'UPI',
    label: 'UPI Transfer',
    description: 'Unified Payments Interface transaction with UTR/reference ID',
  },
  {
    value: 'CHEQUE',
    label: 'Cheque',
    description: 'Physical cheque clearance with cheque number reference',
  },
  {
    value: 'CASH',
    label: 'Cash',
    description: 'Offline cash settlement with voucher/receipt reference',
  },
];

export interface RecordSubscriptionPaymentRequest {
  paymentDate?: string;
  billedAmount?: number;
  amountReceived: number;
  paymentMethod: SubscriptionPaymentMethod;
  referenceNumber?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  renewSubscription?: boolean;
  remarks?: string;
}

export type SubscriptionPaymentStatus =
  | 'RECORDED'
  | 'PARTIAL'
  | 'PAID'
  | 'VOIDED';

export type SubscriptionEventType =
  | 'TRIAL_STARTED'
  | 'ASSIGNED'
  | 'ACTIVATED'
  | 'UPGRADED'
  | 'DOWNGRADED'
  | 'RENEWED'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REACTIVATED'
  | 'PAYMENT_RECORDED'
  | 'STUDENT_LIMIT_OVERRIDDEN';

export interface SubscriptionPlanResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStudents: number;
  active: boolean;
  defaultTrialPlan: boolean;
  defaultTrialDays: number | null;
  displayOrder: number | null;
  metadata: string | null;
  includedFeatures: PlatformFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPlanRequest {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStudents: number;
  includedFeatures: PlatformFeature[];
  defaultTrialPlan?: boolean;
  defaultTrialDays?: number;
  displayOrder?: number;
  metadata?: string;
}

export interface UpdateSubscriptionPlanRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxStudents: number;
  includedFeatures: PlatformFeature[];
  defaultTrialPlan?: boolean;
  defaultTrialDays?: number;
  displayOrder?: number;
  metadata?: string;
}

export interface AssignSubscriptionRequest {
  planId: number;
  billingInterval: BillingInterval;
  trial?: boolean;
  trialDays?: number;
  startDate?: string;
  contractedAmount?: number;
  remarks?: string;
}

export interface ChangeSubscriptionPlanRequest {
  newPlanId: number;
  billingInterval?: BillingInterval;
  effectiveDate?: string;
  contractedAmount?: number;
  remarks?: string;
}

export interface RenewSubscriptionRequest {
  billingInterval?: BillingInterval;
  renewalStartDate?: string;
  periodMonths?: number;
  contractedAmount?: number;
  remarks?: string;
}

export interface UpdateSubscriptionStatusRequest {
  status: SubscriptionStatus;
  reason: string;
  effectiveDate?: string;
}

export interface CancelSubscriptionRequest {
  reason: string;
  effectiveDate?: string;
}

export interface SubscriptionPaymentResponse {
  id: number;
  organizationId: number;
  organizationName: string;
  subscriptionId: number;
  invoiceNumber: string;
  paymentDate: string;
  billedAmount: number;
  amountReceived: number;
  paymentMethod: SubscriptionPaymentMethod;
  referenceNumber: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  status: SubscriptionPaymentStatus;
  remarks: string | null;
  recordedBy: number | null;
  createdAt: string;
}

export interface OrganizationBillingSummaryResponse {
  organizationId: number;
  organizationName: string;
  subscriptionStatus: SubscriptionStatus | null;
  planCode: string | null;
  planName: string | null;
  billingInterval: BillingInterval | null;
  currentPeriodContractedAmount: number;
  currentPeriodPaidAmount: number;
  currentPeriodOutstandingAmount: number;
  totalHistoricalRevenue: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextRenewalDate: string | null;
  expiryDate: string | null;
  payments: SubscriptionPaymentResponse[];
}

export interface FullOrganizationSubscriptionResponse
  extends OrganizationSubscriptionResponse {
  endedDate?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const ALL_PLATFORM_FEATURES: {
  code: PlatformFeature;
  label: string;
}[] = [
  { code: 'ACADEMIC_MANAGEMENT', label: 'Academic Management' },
  { code: 'STUDENT_MANAGEMENT', label: 'Student Management' },
  { code: 'STAFF_MANAGEMENT', label: 'Staff & Teacher Management' },
  { code: 'TIMETABLE', label: 'Timetable Management' },
  { code: 'ATTENDANCE', label: 'Attendance Tracking' },
  { code: 'EXAMINATION_AND_RESULTS', label: 'Examinations & Results' },
  { code: 'FEES_AND_FINANCE', label: 'Fees & Finance' },
  { code: 'HOMEWORK_AND_ASSIGNMENTS', label: 'Homework & Assignments' },
  { code: 'DASHBOARD_AND_REPORTS', label: 'Dashboards & Reports' },
  { code: 'REPORT_EXPORTS', label: 'Report Exports (PDF/Excel/CSV)' },
  { code: 'COMMUNICATION_AND_NOTIFICATIONS', label: 'Communication & Notifications' },
  { code: 'PARENT_PORTAL', label: 'Parent Portal' },
  { code: 'FILE_STORAGE', label: 'Cloud / File Storage' },
  { code: 'TRANSPORT', label: 'Transport Management' },
  { code: 'LIBRARY', label: 'Library Management' },
  { code: 'INVENTORY', label: 'Inventory Management' },
  { code: 'HR_AND_PAYROLL', label: 'HR & Payroll' },
];

export const PLATFORM_FEATURE_LABELS: Record<PlatformFeature, string> =
  Object.fromEntries(ALL_PLATFORM_FEATURES.map((f) => [f.code, f.label])) as Record<
    PlatformFeature,
    string
  >;

export function formatCurrencyINR(
  amount?: number | null,
  showDecimals = false
): string {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return showDecimals ? '₹0.00' : '₹0';
  }
  const num = Number(amount);
  const hasCents = num % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals || hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function getPaymentStatusBadgeMeta(
  status?: SubscriptionPaymentStatus | string | null
): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'PAID':
      return { label: 'Paid', variant: 'success' };
    case 'RECORDED':
      return { label: 'Recorded', variant: 'success' };
    case 'PARTIAL':
      return { label: 'Partially Paid', variant: 'warning' };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger' };
    case 'REFUNDED':
      return { label: 'Refunded', variant: 'info' };
    case 'VOIDED':
      return { label: 'Voided', variant: 'danger' };
    default:
      return { label: status || 'Payment Pending', variant: 'warning' };
  }
}

export interface SubscriptionPaymentPresentation {
  label: string;
  amountText?: string;
  amountTone?: 'neutral' | 'warning' | 'danger' | 'success';
  variant: BadgeVariant;
}

export function resolveSubscriptionPaymentLabel(
  sub?: FullOrganizationSubscriptionResponse | null
): SubscriptionPaymentPresentation {
  if (!sub) return { label: 'Unassigned', variant: 'neutral' };
  const contracted = Number(sub.contractedAmount || 0);
  const paid = Number(sub.amountPaid || 0);
  const outstanding = Number(sub.outstandingAmount || 0);

  if (sub.trial || sub.billingInterval === 'TRIAL') {
    return {
      label: 'Free Trial',
      amountText: 'No charge during trial',
      amountTone: 'neutral',
      variant: 'primary',
    };
  }
  if (contracted === 0) {
    return {
      label: 'Complimentary',
      amountText: `${formatCurrencyINR(0, true)} billed`,
      amountTone: 'neutral',
      variant: 'info',
    };
  }
  if (outstanding <= 0 && paid >= contracted) {
    return {
      label: 'Paid',
      amountText: `${formatCurrencyINR(paid, true)} paid`,
      amountTone: 'success',
      variant: 'success',
    };
  }
  if (paid > 0 && outstanding > 0) {
    return {
      label: 'Partially Paid',
      amountText: `${formatCurrencyINR(outstanding, true)} due`,
      amountTone: 'warning',
      variant: 'warning',
    };
  }
  return {
    label: 'Payment Pending',
    amountText: `${formatCurrencyINR(outstanding, true)} due`,
    amountTone: 'danger',
    variant: 'danger',
  };
}

export function getGracePeriodEndDate(expiryDate?: string | null): string | null {
  if (!expiryDate) return null;
  const parts = expiryDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + 15);
  return dt.toISOString().slice(0, 10);
}
