import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type {
  ClassFeeStructureResponse,
  ConcessionResponse,
  ConcessionType,
  FeeCategory,
  FeeDemandStatus,
  FeeFrequency,
  FeePaymentMethod,
  FeePaymentReceiptResponse,
  FeePaymentStatus,
  FeeReceiptExportFormat,
  ParentConsolidatedFeesResponse,
  StudentFeeDemandResponse,
  StudentFinancialProfileResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  EmptyState,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export type FeeSectionTab = 'DEMANDS' | 'PAYMENTS' | 'STRUCTURE';

export type FeeDemandStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'WAIVED';

export type FeeDemandFrequencyFilter = 'ALL' | 'MONTHLY' | 'YEARLY_ONE_TIME';

export type PaymentDateWindowFilter =
  | 'ALL_TIME'
  | 'THIS_MONTH'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS';

export type PaymentMethodFilter =
  | 'ALL'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'CHEQUE'
  | 'CARD'
  | 'OTHER';

export interface UpcomingDuesSummary {
  upcomingAmount: number;
  upcomingCount: number;
  nearestDueDate: string | null;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatCurrencyINR(amount: number | null | undefined): string {
  const safe =
    typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    const fixed = safe % 1 === 0 ? safe.toFixed(0) : safe.toFixed(2);
    return `₹${fixed}`;
  }
}

export function formatFeeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0]?.split('-') ?? [];
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const monthIdx = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (
      !Number.isNaN(year) &&
      monthIdx >= 0 &&
      monthIdx < 12 &&
      !Number.isNaN(day)
    ) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

export function formatFeeDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return isoStr;
  }
}

export function formatFeeCategoryLabel(
  category: FeeCategory | null | undefined
): string {
  if (!category) return 'Fee';
  switch (category) {
    case 'TUITION':
      return 'Tuition';
    case 'DEVELOPMENT':
      return 'Development';
    case 'EXAMINATION':
      return 'Examination';
    case 'ADMISSION':
      return 'Admission';
    case 'TRANSPORT':
      return 'Transport';
    case 'LIBRARY':
      return 'Library';
    case 'LAB':
      return 'Laboratory';
    case 'SPORTS':
      return 'Sports';
    case 'OTHER':
      return 'Other Fee';
    default:
      return String(category)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatFeeFrequencyLabel(
  frequency: FeeFrequency | null | undefined
): string {
  if (!frequency) return 'Periodic';
  switch (frequency) {
    case 'MONTHLY':
      return 'Monthly';
    case 'YEARLY':
      return 'Yearly';
    case 'ONE_TIME':
      return 'One-Time';
    default:
      return String(frequency)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatPaymentMethodLabel(
  method: FeePaymentMethod | null | undefined
): string {
  if (!method) return 'Payment';
  switch (method) {
    case 'UPI':
      return 'UPI';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    case 'CHEQUE':
      return 'Cheque';
    case 'CASH':
      return 'Cash';
    case 'CARD':
      return 'Card';
    case 'OTHER':
      return 'Other';
    default:
      return String(method)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatConcessionTypeLabel(
  type: ConcessionType,
  value: number
): string {
  switch (type) {
    case 'PERCENTAGE':
      return `${value}% Concession`;
    case 'FIXED_AMOUNT':
      return `${formatCurrencyINR(value)} Fixed Concession`;
    case 'FULL_WAIVER':
      return '100% Full Fee Waiver';
    case 'PARTIAL_WAIVER':
      return `${formatCurrencyINR(value)} Partial Waiver`;
    default:
      return `${String(type).replace(/_/g, ' ')} (${value})`;
  }
}

export function formatMonthRangeLabel(
  fromMonth: number | null | undefined,
  toMonth: number | null | undefined
): string {
  if (!fromMonth && !toMonth) return 'Full Academic Session';
  const fromLabel =
    fromMonth && fromMonth >= 1 && fromMonth <= 12
      ? MONTH_NAMES[fromMonth - 1]
      : null;
  const toLabel =
    toMonth && toMonth >= 1 && toMonth <= 12
      ? MONTH_NAMES[toMonth - 1]
      : null;
  if (fromLabel && toLabel) {
    return fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`;
  }
  if (fromLabel) return `From ${fromLabel}`;
  if (toLabel) return `Up to ${toLabel}`;
  return 'Selected Months';
}

export function getDemandStatusBadgeMeta(status: FeeDemandStatus): {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
} {
  switch (status) {
    case 'PAID':
      return { label: 'Paid', tone: 'success' };
    case 'PARTIALLY_PAID':
      return { label: 'Partially Paid', tone: 'info' };
    case 'PENDING':
      return { label: 'Unpaid', tone: 'warning' };
    case 'OVERDUE':
      return { label: 'Overdue', tone: 'danger' };
    case 'WAIVED':
      return { label: 'Waived', tone: 'neutral' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return {
        label: String(status || 'Pending').replace(/_/g, ' '),
        tone: 'neutral',
      };
  }
}

export function getPaymentStatusBadgeMeta(status: FeePaymentStatus): {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  verificationLabel: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Verified & Recorded',
        tone: 'success',
        verificationLabel: 'Confirmed by school administration',
      };
    case 'PARTIALLY_REFUNDED':
      return {
        label: 'Partially Refunded',
        tone: 'info',
        verificationLabel: 'Verified payment with partial refund',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        tone: 'warning',
        verificationLabel: 'Payment refunded by school administration',
      };
    case 'REVERSED':
      return {
        label: 'Reversed',
        tone: 'danger',
        verificationLabel: 'Payment entry reversed by school administration',
      };
    default:
      return {
        label: String(status || 'Recorded').replace(/_/g, ' '),
        tone: 'neutral',
        verificationLabel: `Status: ${String(status)}`,
      };
  }
}

export function buildCombinedFeeDemands(
  profile: StudentFinancialProfileResponse | null | undefined
): StudentFeeDemandResponse[] {
  if (!profile) return [];
  const combined = [
    ...(profile.monthlyDemands ?? []),
    ...(profile.yearlyAndOneTimeDemands ?? []),
  ];
  return combined.sort((a, b) => {
    const dueCmp = (a.dueDate || '').localeCompare(b.dueDate || '');
    if (dueCmp !== 0) return dueCmp;
    return a.id - b.id;
  });
}

export function computeUpcomingDuesSummary(
  demands: StudentFeeDemandResponse[]
): UpcomingDuesSummary {
  let upcomingAmount = 0;
  let upcomingCount = 0;
  let nearestDueDate: string | null = null;

  for (const d of demands) {
    if (
      (d.status === 'PENDING' || d.status === 'PARTIALLY_PAID') &&
      d.outstandingAmount > 0
    ) {
      upcomingAmount += d.outstandingAmount;
      upcomingCount += 1;
      if (
        d.dueDate &&
        (nearestDueDate === null || d.dueDate.localeCompare(nearestDueDate) < 0)
      ) {
        nearestDueDate = d.dueDate;
      }
    }
  }

  return {
    upcomingAmount: Math.round(upcomingAmount * 100) / 100,
    upcomingCount,
    nearestDueDate,
  };
}

export function filterFeeDemands(
  demands: StudentFeeDemandResponse[],
  statusFilter: FeeDemandStatusFilter,
  frequencyFilter: FeeDemandFrequencyFilter,
  searchQuery: string
): StudentFeeDemandResponse[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return demands.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) {
      return false;
    }

    if (frequencyFilter === 'MONTHLY' && d.frequency !== 'MONTHLY') {
      return false;
    }
    if (
      frequencyFilter === 'YEARLY_ONE_TIME' &&
      d.frequency !== 'YEARLY' &&
      d.frequency !== 'ONE_TIME'
    ) {
      return false;
    }

    if (normalizedQuery.length > 0) {
      const hay = [
        d.componentName,
        d.componentCode,
        d.periodLabel,
        d.category,
        d.frequency,
        d.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function resolveDateWindowBounds(
  windowFilter: PaymentDateWindowFilter
): { startDate?: string; endDate?: string } {
  if (windowFilter === 'ALL_TIME') {
    return {};
  }
  const now = new Date();
  const toIsoDate = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const endDate = toIsoDate(now);

  if (windowFilter === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toIsoDate(startOfMonth), endDate };
  }

  const daysBack = windowFilter === 'LAST_30_DAYS' ? 30 : 90;
  const startDt = new Date(now);
  startDt.setDate(startDt.getDate() - daysBack);
  return { startDate: toIsoDate(startDt), endDate };
}
export function FamilyConsolidatedFeesBanner({
  consolidated,
  childrenCount,
}: {
  consolidated: ParentConsolidatedFeesResponse;
  childrenCount: number;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  if (childrenCount <= 1) return null;

  return (
    <SurfaceCard
      elevation="none"
      style={{
        padding: spacing.sm,
        marginBottom: spacing.md,
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.border,
      }}
    >
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <Users size={iconSizes.sm} color={colors.primary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              marginLeft: 6,
            }}
          >
            Family Consolidated Summary ({childrenCount} Children)
          </Text>
        </View>
        {consolidated.academicSessionName ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {consolidated.academicSessionName}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.familyMetricsRow,
          {
            marginTop: spacing.xs + 2,
            paddingTop: spacing.xs + 2,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.familyMetricCol}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Net Payable
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              marginTop: 1,
            }}
          >
            {formatCurrencyINR(consolidated.totalNetPayableAmount)}
          </Text>
        </View>

        <View style={styles.familyMetricCol}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Total Paid
          </Text>
          <Text
            style={{
              color: colors.successText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              marginTop: 1,
            }}
          >
            {formatCurrencyINR(consolidated.totalPaidAmount)}
          </Text>
        </View>

        <View style={styles.familyMetricCol}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Outstanding
          </Text>
          <Text
            style={{
              color:
                consolidated.totalOutstandingAmount > 0
                  ? colors.warningText
                  : colors.successText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              marginTop: 1,
            }}
          >
            {formatCurrencyINR(consolidated.totalOutstandingAmount)}
          </Text>
        </View>

        {consolidated.totalOverdueAmount > 0 ? (
          <View style={styles.familyMetricCol}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Overdue
            </Text>
            <Text
              style={{
                color: colors.dangerText,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                marginTop: 1,
              }}
            >
              {formatCurrencyINR(consolidated.totalOverdueAmount)}
            </Text>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

export function FeesOverviewSummaryCard({
  profile,
  sectionName,
  upcomingSummary,
  latestPayment,
  onOpenRecentReceipt,
  onSelectOverdueFilter,
  onSelectUpcomingFilter,
}: {
  profile: StudentFinancialProfileResponse;
  sectionName: string | null;
  upcomingSummary: UpcomingDuesSummary;
  latestPayment: FeePaymentReceiptResponse | null;
  onOpenRecentReceipt: (payment: FeePaymentReceiptResponse) => void;
  onSelectOverdueFilter: () => void;
  onSelectUpcomingFilter: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const totalNet = profile.totalNetPayableFees ?? 0;
  const totalPaid = profile.totalPaidAmount ?? 0;
  const totalOutstanding = profile.totalOutstandingBalance ?? 0;
  const totalOverdue = profile.totalOverdueAmount ?? 0;
  const totalBase = profile.totalBaseFees ?? 0;
  const totalConcessions = profile.totalConcessionsAndWaivers ?? 0;
  const totalLate = profile.totalLateFees ?? 0;
  const unappliedCredit = profile.unappliedAccountCredit ?? 0;

  const paidProgressRatio =
    totalNet > 0 ? Math.min(1, Math.max(0, totalPaid / totalNet)) : 1;
  const paidPercentLabel =
    totalNet > 0 ? `${Math.round(paidProgressRatio * 100)}% Paid` : 'No Dues';

  const hasOutstanding = totalOutstanding > 0;
  const hasOverdue = totalOverdue > 0;

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {profile.studentName}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {[
              profile.academicSessionName
                ? `Session ${profile.academicSessionName}`
                : null,
              profile.className
                ? `${profile.className}${sectionName ? ` (${sectionName})` : ''}`
                : null,
              profile.admissionNumber ? `Adm #${profile.admissionNumber}` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>
        <StatusBadge
          label={hasOutstanding ? 'Balance Due' : 'All Dues Settled'}
          tone={hasOutstanding ? 'info' : 'success'}
        />
      </View>

      <View
        style={[
          styles.primaryBalanceCard,
          {
            backgroundColor: hasOutstanding
              ? colors.primarySoft
              : colors.successSoft,
            borderColor: hasOutstanding
              ? colors.primarySoftBorder
              : colors.successBorder,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              Total Outstanding Balance
            </Text>
            <Text
              style={{
                color: hasOutstanding ? colors.primary : colors.successText,
                fontSize: typography.fontSizes.xxl,
                fontWeight: typography.fontWeights.bold,
                marginTop: 2,
              }}
            >
              {formatCurrencyINR(totalOutstanding)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
              }}
            >
              Net Session Payable
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                marginTop: 2,
              }}
            >
              {formatCurrencyINR(totalNet)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
              }}
            >
              Total Paid: {formatCurrencyINR(totalPaid)}
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {paidPercentLabel}
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: colors.background,
                borderRadius: radius.full,
                marginTop: 6,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(
                    paidProgressRatio > 0 ? 4 : 0,
                    Math.round(paidProgressRatio * 100)
                  )}%`,
                  backgroundColor: hasOutstanding
                    ? colors.primary
                    : colors.success,
                  borderRadius: radius.full,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.secondaryGrid,
          { gap: spacing.xs, marginTop: spacing.sm },
        ]}
      >
        <Pressable
          onPress={onSelectUpcomingFilter}
          style={({ pressed }) => [
            styles.metricTile,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.rowCenter}>
            <Calendar size={iconSizes.xs} color={colors.primary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginLeft: 4,
              }}
            >
              Upcoming Dues
            </Text>
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
              marginTop: 4,
            }}
          >
            {formatCurrencyINR(upcomingSummary.upcomingAmount)}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textMuted,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {upcomingSummary.nearestDueDate
              ? `Next due ${formatFeeDate(upcomingSummary.nearestDueDate)}`
              : 'No upcoming unpaid bills'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSelectOverdueFilter}
          style={({ pressed }) => [
            styles.metricTile,
            {
              backgroundColor: hasOverdue
                ? colors.warningSoft
                : colors.surfaceMuted,
              borderColor: hasOverdue
                ? colors.warningBorder
                : colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.rowCenter}>
            <Clock
              size={iconSizes.xs}
              color={hasOverdue ? colors.warningText : colors.textSecondary}
            />
            <Text
              style={{
                color: hasOverdue ? colors.warningText : colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginLeft: 4,
              }}
            >
              Overdue Amount
            </Text>
          </View>
          <Text
            style={{
              color: hasOverdue ? colors.warningText : colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
              marginTop: 4,
            }}
          >
            {formatCurrencyINR(totalOverdue)}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: hasOverdue ? colors.warningText : colors.textMuted,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {hasOverdue ? 'Tap to filter overdue items' : 'Zero overdue dues'}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.compositionStrip,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View style={styles.compositionItem}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Base Fee Total
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginTop: 2,
            }}
          >
            {formatCurrencyINR(totalBase)}
          </Text>
        </View>

        <View style={styles.compositionItem}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Concessions
          </Text>
          <Text
            style={{
              color:
                totalConcessions > 0
                  ? colors.successText
                  : colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginTop: 2,
            }}
          >
            {totalConcessions > 0
              ? `-${formatCurrencyINR(totalConcessions)}`
              : formatCurrencyINR(0)}
          </Text>
        </View>

        <View style={styles.compositionItem}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Late Fees
          </Text>
          <Text
            style={{
              color: totalLate > 0 ? colors.warningText : colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginTop: 2,
            }}
          >
            {totalLate > 0
              ? `+${formatCurrencyINR(totalLate)}`
              : formatCurrencyINR(0)}
          </Text>
        </View>
      </View>

      {unappliedCredit > 0 ? (
        <View
          style={[
            styles.creditBanner,
            {
              backgroundColor: colors.infoSoft,
              borderColor: colors.infoBorder,
              borderRadius: radius.md,
              padding: spacing.xs + 2,
              marginTop: spacing.xs + 2,
            },
          ]}
        >
          <Sparkles size={iconSizes.xs} color={colors.infoText} />
          <Text
            style={{
              color: colors.infoText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              marginLeft: 6,
              flex: 1,
            }}
          >
            Unapplied Account Credit: {formatCurrencyINR(unappliedCredit)}
          </Text>
        </View>
      ) : null}

      {latestPayment ? (
        <Pressable
          onPress={() => onOpenRecentReceipt(latestPayment)}
          style={({ pressed }) => [
            styles.recentPaymentBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginTop: spacing.sm,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <View
              style={[
                styles.rowCenter,
                { flex: 1, marginRight: spacing.xs },
              ]}
            >
              <CheckCircle2 size={iconSizes.sm} color={colors.success} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  Recent Payment: {formatCurrencyINR(latestPayment.totalAmount)} (
                  {formatPaymentMethodLabel(latestPayment.paymentMethod)})
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginTop: 1,
                  }}
                >
                  {latestPayment.receiptNumber} •{' '}
                  {formatFeeDate(latestPayment.paymentDate)}
                </Text>
              </View>
            </View>
            <View style={styles.rowCenter}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginRight: 2,
                }}
              >
                Receipt
              </Text>
              <ChevronRight size={iconSizes.xs} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.verificationNoteRow,
          {
            marginTop: spacing.sm,
            paddingTop: spacing.xs + 2,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        <ShieldCheck size={iconSizes.xs} color={colors.textSecondary} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            marginLeft: 6,
            flex: 1,
          }}
        >
          Fee payments (UPI, Bank Transfer, Cheque, Cash, Card) are verified and
          recorded by school administration. Official receipts appear
          automatically once confirmed.
        </Text>
      </View>
    </SurfaceCard>
  );
}

export function FeesSectionTabSwitcher({
  activeTab,
  onSelectTab,
  demandsCount,
  paymentsCount,
  concessionsCount,
}: {
  activeTab: FeeSectionTab;
  onSelectTab: (tab: FeeSectionTab) => void;
  demandsCount: number;
  paymentsCount: number;
  concessionsCount: number;
}) {
  const { colors, spacing, typography, radius } = useAppTheme();

  const tabs: Array<{
    key: FeeSectionTab;
    label: string;
    badgeCount: number;
  }> = [
    { key: 'DEMANDS', label: 'Fee Demands', badgeCount: demandsCount },
    { key: 'PAYMENTS', label: 'Payment History', badgeCount: paymentsCount },
    {
      key: 'STRUCTURE',
      label: 'Fee Structure',
      badgeCount: concessionsCount,
    },
  ];

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: 4,
          marginBottom: spacing.md,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={[
              styles.tabItem,
              {
                backgroundColor: isActive ? colors.surface : 'transparent',
                borderColor: isActive ? colors.primarySoftBorder : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: isActive ? colors.primary : colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight: isActive
                  ? typography.fontWeights.bold
                  : typography.fontWeights.medium,
              }}
            >
              {tab.label}
              {tab.badgeCount > 0 ? ` (${tab.badgeCount})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FeeDemandsFilterSection({
  statusFilter,
  onSelectStatusFilter,
  frequencyFilter,
  onSelectFrequencyFilter,
  searchQuery,
  onChangeSearchQuery,
  statusCounts,
  onResetFilters,
}: {
  statusFilter: FeeDemandStatusFilter;
  onSelectStatusFilter: (status: FeeDemandStatusFilter) => void;
  frequencyFilter: FeeDemandFrequencyFilter;
  onSelectFrequencyFilter: (freq: FeeDemandFrequencyFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  statusCounts: Record<FeeDemandStatusFilter, number>;
  onResetFilters: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const statusChips: Array<{
    key: FeeDemandStatusFilter;
    label: string;
  }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'PAID', label: 'Paid' },
    ...(statusCounts.WAIVED > 0
      ? [{ key: 'WAIVED' as const, label: 'Waived' }]
      : []),
  ];

  const frequencyChips: Array<{
    key: FeeDemandFrequencyFilter;
    label: string;
  }> = [
    { key: 'ALL', label: 'All Schedules' },
    { key: 'MONTHLY', label: 'Monthly' },
    { key: 'YEARLY_ONE_TIME', label: 'Yearly & One-Time' },
  ];

  const hasActiveFilter =
    statusFilter !== 'ALL' ||
    frequencyFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.searchInputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            marginBottom: spacing.xs + 2,
          },
        ]}
      >
        <Search size={iconSizes.sm} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder="Search fee component or billing period..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              marginLeft: spacing.xs,
            },
          ]}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={() => onChangeSearchQuery('')}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            <X size={iconSizes.sm} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.xs,
          paddingVertical: 2,
        }}
      >
        {statusChips.map((chip) => {
          const isSelected = statusFilter === chip.key;
          const count = statusCounts[chip.key] ?? 0;
          return (
            <Pressable
              key={chip.key}
              onPress={() => onSelectStatusFilter(chip.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected ? colors.textInverse : colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                }}
              >
                {chip.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.rowBetween,
          { marginTop: spacing.xs + 2, flexWrap: 'wrap', gap: spacing.xs },
        ]}
      >
        <View style={[styles.rowCenter, { gap: 6, flexWrap: 'wrap' }]}>
          {frequencyChips.map((freq) => {
            const isSelected = frequencyFilter === freq.key;
            return (
              <Pressable
                key={freq.key}
                onPress={() => onSelectFrequencyFilter(freq.key)}
                style={[
                  styles.freqPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : colors.surfaceMuted,
                    borderColor: isSelected
                      ? colors.primarySoftBorder
                      : colors.borderSubtle,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.xs + 4,
                    paddingVertical: 4,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {freq.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasActiveFilter ? (
          <Pressable onPress={onResetFilters} hitSlop={8}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              Reset
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FeeDemandCardItem({
  demand,
  academicSessionName,
  onSelectDemand,
}: {
  demand: StudentFeeDemandResponse;
  academicSessionName: string | null;
  onSelectDemand: (demand: StudentFeeDemandResponse) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const badgeMeta = getDemandStatusBadgeMeta(demand.status);
  const hasConcession = (demand.concessionAmount ?? 0) > 0;
  const hasLateFee = (demand.lateFeeAmount ?? 0) > 0;
  const hasOutstanding = (demand.outstandingAmount ?? 0) > 0;

  return (
    <SurfaceCard elevation="subtle" onPress={() => onSelectDemand(demand)}>
      <View style={styles.rowBetweenStart}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {demand.componentName}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {[
              formatFeeCategoryLabel(demand.category),
              formatFeeFrequencyLabel(demand.frequency),
              demand.componentCode ? `Code: ${demand.componentCode}` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>
        <StatusBadge label={badgeMeta.label} tone={badgeMeta.tone} />
      </View>

      <View
        style={[
          styles.demandMetaRow,
          {
            marginTop: spacing.xs + 2,
            paddingTop: spacing.xs + 2,
            borderTopColor: colors.borderSubtle,
            gap: spacing.sm,
          },
        ]}
      >
        <View style={styles.rowCenter}>
          <Calendar size={iconSizes.xs} color={colors.textSecondary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginLeft: 4,
            }}
          >
            Period:{' '}
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {demand.periodLabel || 'Session'}
            </Text>
            {academicSessionName ? ` (${academicSessionName})` : ''}
          </Text>
        </View>

        <View style={styles.rowCenter}>
          <Clock
            size={iconSizes.xs}
            color={
              demand.status === 'OVERDUE'
                ? colors.dangerText
                : colors.textSecondary
            }
          />
          <Text
            style={{
              color:
                demand.status === 'OVERDUE'
                  ? colors.dangerText
                  : colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight:
                demand.status === 'OVERDUE'
                  ? typography.fontWeights.semibold
                  : typography.fontWeights.regular,
              marginLeft: 4,
            }}
          >
            Due: {formatFeeDate(demand.dueDate)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.demandAmountsBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.xs + 4,
            marginTop: spacing.xs + 4,
          },
        ]}
      >
        <View style={styles.demandAmountCol}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Net Payable
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: 2,
            }}
          >
            {formatCurrencyINR(demand.netPayableAmount)}
          </Text>
        </View>

        <View style={styles.demandAmountCol}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Paid Amount
          </Text>
          <Text
            style={{
              color:
                demand.paidAmount > 0
                  ? colors.successText
                  : colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: 2,
            }}
          >
            {formatCurrencyINR(demand.paidAmount)}
          </Text>
        </View>

        <View style={[styles.demandAmountCol, { alignItems: 'flex-end' }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Outstanding
          </Text>
          <Text
            style={{
              color: hasOutstanding
                ? demand.status === 'OVERDUE'
                  ? colors.dangerText
                  : colors.primary
                : colors.successText,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: 2,
            }}
          >
            {formatCurrencyINR(demand.outstandingAmount)}
          </Text>
        </View>
      </View>

      <View style={[styles.rowBetween, { marginTop: spacing.xs + 2 }]}>
        <View
          style={[
            styles.rowCenter,
            { gap: spacing.xs, flexWrap: 'wrap', flex: 1 },
          ]}
        >
          {hasConcession ? (
            <Text
              style={{
                color: colors.successText,
                fontSize: 11,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              Concession: -{formatCurrencyINR(demand.concessionAmount)}
            </Text>
          ) : null}
          {hasLateFee ? (
            <Text
              style={{
                color: colors.warningText,
                fontSize: 11,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              Late Fee: +{formatCurrencyINR(demand.lateFeeAmount)}
            </Text>
          ) : null}
          {!hasConcession && !hasLateFee ? (
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              Demand #{demand.id}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowCenter}>
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginRight: 2,
            }}
          >
            View Breakdown
          </Text>
          <ChevronRight size={iconSizes.xs} color={colors.primary} />
        </View>
      </View>
    </SurfaceCard>
  );
}

export function FeeDemandsListSection({
  demands,
  totalOriginalCount,
  academicSessionName,
  onSelectDemand,
  onResetFilters,
}: {
  demands: StudentFeeDemandResponse[];
  totalOriginalCount: number;
  academicSessionName: string | null;
  onSelectDemand: (demand: StudentFeeDemandResponse) => void;
  onResetFilters: () => void;
}) {
  const { colors, spacing, iconSizes } = useAppTheme();

  if (totalOriginalCount === 0) {
    return (
      <EmptyState
        icon={<CreditCard size={iconSizes.xl} color={colors.primary} />}
        title="No Fee Demands Assigned"
        description="No fee demands have been generated for this child in the selected academic session yet."
      />
    );
  }

  if (demands.length === 0) {
    return (
      <EmptyState
        icon={<Search size={iconSizes.xl} color={colors.primary} />}
        title="No Matching Fee Demands"
        description="No fee demands match your current status, schedule, or search filter."
        actionLabel="Clear Filters"
        onActionPress={onResetFilters}
      />
    );
  }

  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      {demands.map((demand) => (
        <FeeDemandCardItem
          key={demand.id}
          demand={demand}
          academicSessionName={academicSessionName}
          onSelectDemand={onSelectDemand}
        />
      ))}
    </View>
  );
}
function PaymentHistoryCardItem({
  payment,
  downloadingKey,
  onSelectPayment,
  onQuickDownloadReceipt,
}: {
  payment: FeePaymentReceiptResponse;
  downloadingKey: string | null;
  onSelectPayment: (payment: FeePaymentReceiptResponse) => void;
  onQuickDownloadReceipt: (
    payment: FeePaymentReceiptResponse,
    format: FeeReceiptExportFormat
  ) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const statusMeta = getPaymentStatusBadgeMeta(payment.status);
  const allocations = payment.allocations ?? [];
  const pdfKey = `${payment.id}:PDF`;
  const csvKey = `${payment.id}:CSV`;
  const isDownloadingPdf = downloadingKey === pdfKey;
  const isDownloadingCsv = downloadingKey === csvKey;

  return (
    <SurfaceCard elevation="subtle" onPress={() => onSelectPayment(payment)}>
      <View style={styles.rowBetweenStart}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <View style={styles.rowCenter}>
            <FileCheck size={iconSizes.sm} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              {formatCurrencyINR(payment.totalAmount)}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            Receipt #{payment.receiptNumber} •{' '}
            {formatFeeDate(payment.paymentDate)}
          </Text>
        </View>
        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
      </View>

      <View
        style={[
          styles.paymentMetaBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.xs + 4,
            marginTop: spacing.xs + 4,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Payment Method
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {formatPaymentMethodLabel(payment.paymentMethod)}
          </Text>
        </View>

        {payment.referenceNumber ? (
          <View style={[styles.rowBetween, { marginTop: 4 }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              UTR / Transaction Ref
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.medium,
                maxWidth: '65%',
              }}
            >
              {payment.referenceNumber}
            </Text>
          </View>
        ) : null}

        <View style={[styles.rowBetween, { marginTop: 4 }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            Verification
          </Text>
          <Text
            style={{
              color:
                payment.status === 'COMPLETED'
                  ? colors.successText
                  : payment.status === 'REVERSED'
                  ? colors.dangerText
                  : colors.textSecondary,
              fontSize: 11,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {statusMeta.verificationLabel}
          </Text>
        </View>

        {(payment.refundedAmount ?? 0) > 0 ? (
          <View style={[styles.rowBetween, { marginTop: 4 }]}>
            <Text style={{ color: colors.warningText, fontSize: 11 }}>
              Refunded Amount
            </Text>
            <Text
              style={{
                color: colors.warningText,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {formatCurrencyINR(payment.refundedAmount)}
            </Text>
          </View>
        ) : null}
      </View>

      {allocations.length > 0 ? (
        <View style={{ marginTop: spacing.xs + 4 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: typography.fontWeights.medium,
              marginBottom: 4,
            }}
          >
            Allocated Fee Demands ({allocations.length})
          </Text>
          <View style={{ gap: 4 }}>
            {allocations.slice(0, 3).map((alloc) => (
              <View key={alloc.id} style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: alloc.reversed
                      ? colors.textMuted
                      : colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    flex: 1,
                    marginRight: spacing.xs,
                    textDecorationLine: alloc.reversed
                      ? 'line-through'
                      : 'none',
                  }}
                >
                  {alloc.componentName} ({alloc.periodLabel})
                </Text>
                <Text
                  style={{
                    color: alloc.reversed
                      ? colors.textMuted
                      : colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {formatCurrencyINR(alloc.allocatedAmount)}
                </Text>
              </View>
            ))}
            {allocations.length > 3 ? (
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                +{allocations.length - 3} more demand allocation(s)
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.rowBetween,
          {
            marginTop: spacing.sm,
            paddingTop: spacing.xs + 2,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        <Pressable
          onPress={() => onSelectPayment(payment)}
          style={styles.rowCenter}
        >
          <FileText size={iconSizes.xs} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginLeft: 4,
            }}
          >
            View Official Receipt
          </Text>
        </Pressable>

        <View style={[styles.rowCenter, { gap: spacing.xs }]}>
          <Pressable
            disabled={downloadingKey !== null}
            onPress={() => onQuickDownloadReceipt(payment, 'PDF')}
            style={[
              styles.quickReceiptBtn,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primarySoftBorder,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.xs + 4,
                paddingVertical: 4,
              },
            ]}
          >
            {isDownloadingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.rowCenter}>
                <Download size={12} color={colors.primary} />
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: typography.fontWeights.bold,
                    marginLeft: 4,
                  }}
                >
                  PDF
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            disabled={downloadingKey !== null}
            onPress={() => onQuickDownloadReceipt(payment, 'CSV')}
            style={[
              styles.quickReceiptBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.xs + 4,
                paddingVertical: 4,
              },
            ]}
          >
            {isDownloadingCsv ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <View style={styles.rowCenter}>
                <FileSpreadsheet size={12} color={colors.textSecondary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    fontWeight: typography.fontWeights.semibold,
                    marginLeft: 4,
                  }}
                >
                  CSV
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </SurfaceCard>
  );
}


const DATE_WINDOWS: Array<{ key: PaymentDateWindowFilter; label: string }> = [
  { key: 'ALL_TIME', label: 'All Time' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { key: 'LAST_90_DAYS', label: 'Last 90 Days' },
];

const PAYMENT_METHODS: Array<{ key: PaymentMethodFilter; label: string }> = [
  { key: 'ALL', label: 'All Methods' },
  { key: 'UPI', label: 'UPI' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'CASH', label: 'Cash' },
  { key: 'CARD', label: 'Card' },
  { key: 'OTHER', label: 'Other' },
];

export function PaymentHistorySection({
  payments,
  dateWindowFilter,
  onSelectDateWindowFilter,
  methodFilter,
  onSelectMethodFilter,
  downloadingKey,
  onSelectPayment,
  onQuickDownloadReceipt,
  onResetFilters,
}: {
  payments: FeePaymentReceiptResponse[];
  dateWindowFilter: PaymentDateWindowFilter;
  onSelectDateWindowFilter: (window: PaymentDateWindowFilter) => void;
  methodFilter: PaymentMethodFilter;
  onSelectMethodFilter: (method: PaymentMethodFilter) => void;
  downloadingKey: string | null;
  onSelectPayment: (payment: FeePaymentReceiptResponse) => void;
  onQuickDownloadReceipt: (
    payment: FeePaymentReceiptResponse,
    format: FeeReceiptExportFormat
  ) => void;
  onResetFilters: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const filteredPayments =
    methodFilter === 'ALL'
      ? payments
      : payments.filter((p) => p.paymentMethod === methodFilter);

  const hasFilters = dateWindowFilter !== 'ALL_TIME' || methodFilter !== 'ALL';

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ marginBottom: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
        >
          {DATE_WINDOWS.map((w) => {
            const isSelected = dateWindowFilter === w.key;
            return (
              <Pressable
                key={w.key}
                onPress={() => onSelectDateWindowFilter(w.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: 6,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? colors.textInverse : colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                  }}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View
          style={[
            styles.rowBetween,
            { marginTop: spacing.xs + 2, flexWrap: 'wrap', gap: spacing.xs },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {PAYMENT_METHODS.map((m) => {
              const isSelected = methodFilter === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => onSelectMethodFilter(m.key)}
                  style={[
                    styles.freqPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : colors.surfaceMuted,
                      borderColor: isSelected
                        ? colors.primarySoftBorder
                        : colors.borderSubtle,
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.xs + 4,
                      paddingVertical: 4,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? colors.primary
                        : colors.textSecondary,
                      fontSize: 11,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {hasFilters ? (
            <Pressable onPress={onResetFilters} hitSlop={8}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                Reset
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={<FileCheck size={iconSizes.xl} color={colors.primary} />}
          title={
            hasFilters
              ? 'No Matching Payments Found'
              : 'No Payment Records Yet'
          }
          description={
            hasFilters
              ? 'No verified payments match the selected date window or payment method.'
              : 'When fee payments are recorded and verified by the school accounts office, official receipts and allocations will appear here.'
          }
          actionLabel={hasFilters ? 'Reset Filters' : undefined}
          onActionPress={hasFilters ? onResetFilters : undefined}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filteredPayments.map((payment) => (
            <PaymentHistoryCardItem
              key={payment.id}
              payment={payment}
              downloadingKey={downloadingKey}
              onSelectPayment={onSelectPayment}
              onQuickDownloadReceipt={onQuickDownloadReceipt}
            />
          ))}
        </View>
      )}
    </View>
  );
}
export function FeeStructureAndConcessionsSection({
  structure,
  structureVersion,
  concessions,
}: {
  structure: ClassFeeStructureResponse | null;
  structureVersion: number | null;
  concessions: ConcessionResponse[];
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  if (!structure && concessions.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={iconSizes.xl} color={colors.primary} />}
        title="No Fee Structure Details"
        description="No published class fee structure or active concession records were returned for this academic session."
      />
    );
  }

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      {concessions.length > 0 ? (
        <SurfaceCard elevation="subtle">
          <View style={[styles.rowCenter, { marginBottom: spacing.sm }]}>
            <Award size={iconSizes.md} color={colors.success} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 8,
              }}
            >
              Active Concessions & Waivers ({concessions.length})
            </Text>
          </View>

          <View style={{ gap: spacing.xs + 2 }}>
            {concessions.map((conc) => (
              <View
                key={conc.id}
                style={[
                  styles.concessionCard,
                  {
                    backgroundColor: colors.successSoft,
                    borderColor: colors.successBorder,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View style={styles.rowBetweenStart}>
                  <Text
                    style={{
                      color: colors.successText,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.bold,
                      flex: 1,
                      marginRight: spacing.xs,
                    }}
                  >
                    {formatConcessionTypeLabel(conc.concessionType, conc.value)}
                  </Text>
                  <StatusBadge
                    label={
                      conc.componentCode
                        ? `Code: ${conc.componentCode}`
                        : 'All Components'
                    }
                    tone="success"
                  />
                </View>

                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 4,
                  }}
                >
                  Reason: {conc.reason}
                </Text>

                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  Applicable:{' '}
                  {formatMonthRangeLabel(
                    conc.applicableFromMonth,
                    conc.applicableToMonth
                  )}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}
      {structure ? (
        <SurfaceCard elevation="subtle">
          <View style={styles.rowBetweenStart}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.base,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {structure.name}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {[
                  structure.className,
                  structure.academicSessionName,
                  `v${structureVersion ?? structure.versionNumber}`,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
            <StatusBadge label={structure.status} tone="info" />
          </View>

          <View
            style={[
              styles.compositionStrip,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                marginTop: spacing.sm,
              },
            ]}
          >
            <View style={styles.compositionItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Monthly Rate
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {formatCurrencyINR(structure.totalMonthlyAmount)}
              </Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Yearly Total
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {formatCurrencyINR(structure.totalYearlyAmount)}
              </Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                One-Time
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {formatCurrencyINR(structure.totalOneTimeAmount)}
              </Text>
            </View>
          </View>

          {(structure.components ?? []).length > 0 ? (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs + 2 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Configured Fee Components ({structure.components.length})
              </Text>
              {structure.components.map((comp) => (
                <View
                  key={comp.id}
                  style={[
                    styles.componentRowCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.rowBetweenStart}>
                    <View style={{ flex: 1, marginRight: spacing.xs }}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.semibold,
                        }}
                      >
                        {comp.name} ({comp.code})
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {[
                          formatFeeCategoryLabel(comp.category),
                          formatFeeFrequencyLabel(comp.frequency),
                          comp.dueDayOfMonth
                            ? `Due Day: ${comp.dueDayOfMonth}`
                            : comp.dueDate
                            ? `Due: ${formatFeeDate(comp.dueDate)}`
                            : null,
                          comp.optionalComponent ? 'Optional' : null,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {formatCurrencyINR(comp.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBetweenStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  familyMetricCol: {
    flex: 1,
  },
  primaryBalanceCard: {
    borderWidth: 1,
  },
  progressTrack: {
    height: 7,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  secondaryGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricTile: {
    flex: 1,
    borderWidth: 1,
  },
  compositionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  compositionItem: {
    flex: 1,
  },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  recentPaymentBox: {
    borderWidth: 1,
  },
  verificationNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 4,
  },
  filterChip: {
    borderWidth: 1,
  },
  freqPill: {
    borderWidth: 1,
  },
  demandMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
  demandAmountsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  demandAmountCol: {
    flex: 1,
  },
  paymentMetaBox: {
    borderWidth: 1,
  },
  quickReceiptBtn: {
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concessionCard: {
    borderWidth: 1,
  },
  componentRowCard: {
    borderWidth: 1,
  },
});



