import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  Award,
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
  ShieldCheck,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import {
  parentPortalApi,
  type AuthorizedAttachmentDownloadResult,
} from '@/api/parentPortalApi';
import type {
  ConcessionResponse,
  FeeComponentResponse,
  FeePaymentReceiptResponse,
  FeeReceiptExportFormat,
  StudentFeeDemandResponse,
  StudentFinancialProfileResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  BottomSheetModal,
  FeedbackBanner,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';
import {
  formatConcessionTypeLabel,
  formatCurrencyINR,
  formatFeeCategoryLabel,
  formatFeeDate,
  formatFeeDateTime,
  formatFeeFrequencyLabel,
  formatMonthRangeLabel,
  formatPaymentMethodLabel,
  getDemandStatusBadgeMeta,
  getPaymentStatusBadgeMeta,
} from './ParentFeeComponents';

export async function triggerReceiptBrowserOrShareDownload(
  result: AuthorizedAttachmentDownloadResult,
  receiptTitle: string
): Promise<string> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (result.blob && typeof URL !== 'undefined' && URL.createObjectURL) {
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
      return `Downloaded ${result.filename} (${Math.max(
        1,
        Math.round(result.sizeBytes / 1024)
      )} KB).`;
    }
    if (result.textPreview && typeof Blob !== 'undefined') {
      const textBlob = new Blob([result.textPreview], {
        type: result.contentType || 'text/csv;charset=utf-8',
      });
      const objectUrl = URL.createObjectURL(textBlob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
      return `Downloaded ${result.filename}.`;
    }
  }

  try {
    await Share.share({
      title: receiptTitle,
      message: result.textPreview
        ? `${receiptTitle}\n\n${result.textPreview}`
        : `${receiptTitle} (${result.filename}) downloaded (${Math.max(
            1,
            Math.round(result.sizeBytes / 1024)
          )} KB).`,
    });
  } catch {
    // Share sheet dismissed by user
  }

  return `Verified & prepared ${result.filename} (${Math.max(
    1,
    Math.round(result.sizeBytes / 1024)
  )} KB).`;
}

export function FeeDemandDetailSheetModal({
  visible,
  demand,
  profile,
  sectionName,
  onOpenReceipt,
  onOpenOfflineSubmit,
  onClose,
}: {
  visible: boolean;
  demand: StudentFeeDemandResponse | null;
  profile: StudentFinancialProfileResponse | null;
  sectionName: string | null;
  onOpenReceipt: (payment: FeePaymentReceiptResponse) => void;
  onOpenOfflineSubmit?: (demand: StudentFeeDemandResponse) => void;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const matchingConcessions = useMemo<ConcessionResponse[]>(() => {
    if (!demand || !profile?.concessions) return [];
    return profile.concessions.filter((c) => {
      if (!c.active) return false;
      const codeMatch =
        !c.componentCode ||
        c.componentCode.toUpperCase() === demand.componentCode.toUpperCase();
      if (!codeMatch) return false;
      if (demand.frequency === 'MONTHLY' && demand.billingMonth > 0) {
        if (
          c.applicableFromMonth &&
          demand.billingMonth < c.applicableFromMonth
        ) {
          return false;
        }
        if (c.applicableToMonth && demand.billingMonth > c.applicableToMonth) {
          return false;
        }
      }
      return true;
    });
  }, [demand, profile]);

  const linkedStructureComponent = useMemo<FeeComponentResponse | null>(() => {
    if (!demand || !profile?.assignedFeeStructure?.components) return null;
    return (
      profile.assignedFeeStructure.components.find(
        (comp) =>
          comp.id === demand.componentId ||
          comp.code.toUpperCase() === demand.componentCode.toUpperCase()
      ) ?? null
    );
  }, [demand, profile]);

  const demandPayments = useMemo<
    Array<{
      payment: FeePaymentReceiptResponse;
      allocatedAmount: number;
      reversed: boolean;
    }>
  >(() => {
    if (!demand || !profile?.paymentHistory) return [];
    const out: Array<{
      payment: FeePaymentReceiptResponse;
      allocatedAmount: number;
      reversed: boolean;
    }> = [];
    for (const payment of profile.paymentHistory) {
      const alloc = (payment.allocations ?? []).find(
        (a) => a.demandId === demand.id
      );
      if (alloc) {
        out.push({
          payment,
          allocatedAmount: alloc.allocatedAmount,
          reversed: alloc.reversed,
        });
      }
    }
    return out;
  }, [demand, profile]);

  if (!demand) return null;

  const badgeMeta = getDemandStatusBadgeMeta(demand.status);
  const hasOutstanding = (demand.outstandingAmount ?? 0) > 0;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={demand.componentName}
      subtitle={`Demand #DEM-${demand.id} • ${demand.periodLabel || 'Session'}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      >
        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.rowBetweenStart}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {demand.studentName}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {[
                  demand.admissionNumber
                    ? `Adm #${demand.admissionNumber}`
                    : null,
                  demand.className
                    ? `${demand.className}${
                        sectionName ? ` (${sectionName})` : ''
                      }`
                    : null,
                  profile?.academicSessionName
                    ? `Session ${profile.academicSessionName}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
            <StatusBadge label={badgeMeta.label} tone={badgeMeta.tone} />
          </View>

          <View
            style={[
              styles.metaGrid,
              {
                marginTop: spacing.xs + 4,
                paddingTop: spacing.xs + 4,
                borderTopColor: colors.borderSubtle,
                gap: spacing.xs,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Fee Demand Reference
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                #DEM-{demand.id} ({demand.componentCode})
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Category & Schedule
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {formatFeeCategoryLabel(demand.category)} •{' '}
                {formatFeeFrequencyLabel(demand.frequency)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Billing Period
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {demand.periodLabel || 'Academic Session'}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Due Date
              </Text>
              <Text
                style={{
                  color:
                    demand.status === 'OVERDUE'
                      ? colors.dangerText
                      : colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {formatFeeDate(demand.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.xs + 4,
            }}
          >
            Fee Breakdown & Balance Composition
          </Text>

          <View style={{ gap: spacing.xs + 2 }}>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Original Fee Amount (Base)
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {formatCurrencyINR(demand.baseAmount)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Applicable Concessions / Waivers
              </Text>
              <Text
                style={{
                  color:
                    demand.concessionAmount > 0
                      ? colors.successText
                      : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {demand.concessionAmount > 0
                  ? `-${formatCurrencyINR(demand.concessionAmount)}`
                  : formatCurrencyINR(0)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Late Fees
              </Text>
              <Text
                style={{
                  color:
                    demand.lateFeeAmount > 0
                      ? colors.warningText
                      : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {demand.lateFeeAmount > 0
                  ? `+${formatCurrencyINR(demand.lateFeeAmount)}`
                  : formatCurrencyINR(0)}
              </Text>
            </View>

            <View
              style={[
                styles.rowBetween,
                {
                  paddingTop: spacing.xs + 2,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderSubtle,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Net Payable Amount
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {formatCurrencyINR(demand.netPayableAmount)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Amount Already Paid
              </Text>
              <Text
                style={{
                  color:
                    demand.paidAmount > 0
                      ? colors.successText
                      : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {demand.paidAmount > 0
                  ? `-${formatCurrencyINR(demand.paidAmount)}`
                  : formatCurrencyINR(0)}
              </Text>
            </View>

            <View
              style={[
                styles.rowBetween,
                {
                  backgroundColor: hasOutstanding
                    ? colors.primarySoft
                    : colors.successSoft,
                  borderColor: hasOutstanding
                    ? colors.primarySoftBorder
                    : colors.successBorder,
                  borderWidth: 1,
                  borderRadius: radius.sm,
                  padding: spacing.xs + 2,
                  marginTop: 4,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Remaining Balance
              </Text>
              <Text
                style={{
                  color: hasOutstanding
                    ? demand.status === 'OVERDUE'
                      ? colors.dangerText
                      : colors.primary
                    : colors.successText,
                  fontSize: typography.fontSizes.base,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {formatCurrencyINR(demand.outstandingAmount)}
              </Text>
            </View>
          </View>
        </View>
        {(matchingConcessions.length > 0 || demand.remarks) ? (
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: colors.successSoft,
                borderColor: colors.successBorder,
                borderRadius: radius.md,
                padding: spacing.sm + 2,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={[styles.rowCenter, { marginBottom: spacing.xs + 2 }]}>
              <Award size={iconSizes.sm} color={colors.successText} />
              <Text
                style={{
                  color: colors.successText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  marginLeft: 6,
                }}
              >
                Concession & Waiver Details
              </Text>
            </View>

            {matchingConcessions.map((conc) => (
              <View key={conc.id} style={{ marginTop: 4 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  • {formatConcessionTypeLabel(conc.concessionType, conc.value)}{' '}
                  ({formatMonthRangeLabel(conc.applicableFromMonth, conc.applicableToMonth)})
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginTop: 1,
                  }}
                >
                  Reason: {conc.reason}
                </Text>
              </View>
            ))}

            {demand.remarks ? (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: matchingConcessions.length > 0 ? 6 : 2,
                }}
              >
                Note: {demand.remarks}
              </Text>
            ) : null}
          </View>
        ) : null}

        {linkedStructureComponent &&
        linkedStructureComponent.lateFeeType &&
        linkedStructureComponent.lateFeeType !== 'NONE' ? (
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={styles.rowCenter}>
              <Clock size={iconSizes.xs} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: 6,
                }}
              >
                Component Late Fee Rule
              </Text>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              {linkedStructureComponent.lateFeeType === 'PER_DAY'
                ? `${formatCurrencyINR(
                    linkedStructureComponent.lateFeeAmount
                  )} per day after ${
                    linkedStructureComponent.lateFeeGraceDays ?? 0
                  } grace day(s)`
                : `${formatCurrencyINR(
                    linkedStructureComponent.lateFeeAmount
                  )} fixed late fee after ${
                    linkedStructureComponent.lateFeeGraceDays ?? 0
                  } grace day(s)`}
              {linkedStructureComponent.lateFeeCap
                ? ` (Capped at ${formatCurrencyINR(
                    linkedStructureComponent.lateFeeCap
                  )})`
                : ''}
            </Text>
          </View>
        ) : null}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.xs + 2,
            }}
          >
            Payment History for This Demand ({demandPayments.length})
          </Text>

          {demandPayments.length === 0 ? (
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm + 2,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                No payments have been allocated to this fee demand yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.xs + 2 }}>
              {demandPayments.map(({ payment, allocatedAmount, reversed }) => {
                const pStatus = getPaymentStatusBadgeMeta(payment.status);
                return (
                  <Pressable
                    key={`${payment.id}-${demand.id}`}
                    onPress={() => onOpenReceipt(payment)}
                    style={({ pressed }) => [
                      styles.sectionBox,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        padding: spacing.sm,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={styles.rowBetweenStart}>
                      <View style={{ flex: 1, marginRight: spacing.xs }}>
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontSize: typography.fontSizes.xs,
                            fontWeight: typography.fontWeights.bold,
                          }}
                        >
                          Receipt #{payment.receiptNumber}
                        </Text>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {formatFeeDate(payment.paymentDate)} •{' '}
                          {formatPaymentMethodLabel(payment.paymentMethod)}
                          {payment.referenceNumber
                            ? ` • Ref: ${payment.referenceNumber}`
                            : ''}
                        </Text>
                      </View>
                      <StatusBadge
                        label={reversed ? 'Reversed' : pStatus.label}
                        tone={reversed ? 'danger' : pStatus.tone}
                      />
                    </View>

                    <View
                      style={[
                        styles.rowBetween,
                        {
                          marginTop: spacing.xs + 2,
                          paddingTop: spacing.xs + 2,
                          borderTopWidth: 1,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                        }}
                      >
                        Allocated to this demand:{' '}
                        <Text
                          style={{
                            color: reversed
                              ? colors.textMuted
                              : colors.successText,
                            fontWeight: typography.fontWeights.bold,
                          }}
                        >
                          {formatCurrencyINR(allocatedAmount)}
                        </Text>
                      </Text>

                      <View style={styles.rowCenter}>
                        <Text
                          style={{
                            color: colors.primary,
                            fontSize: 11,
                            fontWeight: typography.fontWeights.semibold,
                            marginRight: 2,
                          }}
                        >
                          Open Receipt
                        </Text>
                        <ChevronRight size={12} color={colors.primary} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View
          style={[
            styles.infoBannerBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
            },
          ]}
        >
          <ShieldCheck size={iconSizes.sm} color={colors.primary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginLeft: 8,
              flex: 1,
            }}
          >
            Fee demands and balances reflect official school records. Once a
            payment is verified by school administration, the remaining balance
            and receipt are updated immediately.
          </Text>
        </View>

        {hasOutstanding && onOpenOfflineSubmit ? (
          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              label="Submit Offline Payment Reference (UTR)"
              variant="primary"
              size="sm"
              fullWidth
              onPress={() => onOpenOfflineSubmit(demand)}
            />
          </View>
        ) : null}
      </ScrollView>
    </BottomSheetModal>
  );
}
export function PaymentReceiptDetailSheetModal({
  visible,
  organizationId,
  studentId,
  receipt,
  isLoadingReceipt,
  receiptError,
  onRetryReceipt,
  onClose,
}: {
  visible: boolean;
  organizationId: number;
  studentId: number;
  receipt: FeePaymentReceiptResponse | null;
  isLoadingReceipt: boolean;
  receiptError: string | null;
  onRetryReceipt: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const [downloadingFormat, setDownloadingFormat] =
    useState<FeeReceiptExportFormat | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    tone: 'success' | 'danger' | 'info';
    message: string;
  } | null>(null);
  const [csvPreviewText, setCsvPreviewText] = useState<string | null>(null);

  useEffect(() => {
    setDownloadingFormat(null);
    setDownloadFeedback(null);
    setCsvPreviewText(null);
  }, [receipt?.id, studentId, visible]);

  if (!receipt) return null;

  const statusMeta = getPaymentStatusBadgeMeta(receipt.status);
  const allocations = receipt.allocations ?? [];
  const isReversedOrRefunded =
    receipt.status === 'REVERSED' ||
    receipt.status === 'REFUNDED' ||
    receipt.status === 'PARTIALLY_REFUNDED';

  const handleDownloadReceipt = async (format: FeeReceiptExportFormat) => {
    if (downloadingFormat !== null) return;
    setDownloadingFormat(format);
    setDownloadFeedback(null);

    try {
      const ext = format === 'CSV' ? 'csv' : format === 'EXCEL' ? 'xls' : 'pdf';
      const safeReceiptCode = (receipt.receiptNumber || String(receipt.id))
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .toLowerCase();
      const filename = `fee-receipt-${safeReceiptCode}.${ext}`;
      const result = await parentPortalApi.downloadChildPaymentReceipt(
        organizationId,
        studentId,
        receipt.id,
        format,
        filename
      );

      if (format === 'CSV' && result.textPreview) {
        setCsvPreviewText(result.textPreview);
      }

      const summaryMsg = await triggerReceiptBrowserOrShareDownload(
        result,
        `Fee Receipt ${receipt.receiptNumber} - ${receipt.studentName}`
      );
      setDownloadFeedback({
        tone: 'success',
        message: summaryMsg,
      });
    } catch (err) {
      setDownloadFeedback({
        tone: 'danger',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to download official fee receipt right now.',
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={`Receipt #${receipt.receiptNumber}`}
      subtitle={`${receipt.studentName} • ${formatFeeDate(
        receipt.paymentDate
      )}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      >
        {isLoadingReceipt ? (
          <View
            style={[
              styles.rowCenter,
              { marginBottom: spacing.sm, justifyContent: 'center' },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginLeft: 8,
              }}
            >
              Verifying latest receipt details...
            </Text>
          </View>
        ) : null}

        {receiptError ? (
          <View style={{ marginBottom: spacing.sm }}>
            <FeedbackBanner
              tone="warning"
              title="Showing cached receipt record"
              message={receiptError}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor:
                receipt.status === 'COMPLETED'
                  ? colors.successSoft
                  : receipt.status === 'REVERSED'
                  ? colors.dangerSoft
                  : colors.surfaceMuted,
              borderColor:
                receipt.status === 'COMPLETED'
                  ? colors.successBorder
                  : receipt.status === 'REVERSED'
                  ? colors.dangerBorder
                  : colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.rowBetweenStart}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                Official Payment Amount
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xl,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {formatCurrencyINR(receipt.totalAmount)}
              </Text>
            </View>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
          </View>

          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 6,
            }}
          >
            {statusMeta.verificationLabel}
          </Text>
        </View>

        {isReversedOrRefunded ? (
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
                borderRadius: radius.md,
                padding: spacing.sm,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={styles.rowCenter}>
              <AlertCircle size={iconSizes.sm} color={colors.warningText} />
              <Text
                style={{
                  color: colors.warningText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  marginLeft: 6,
                }}
              >
                Payment Adjustment Record ({statusMeta.label})
              </Text>
            </View>
            {(receipt.refundedAmount ?? 0) > 0 ? (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 4,
                }}
              >
                Refunded Amount: {formatCurrencyINR(receipt.refundedAmount)}
              </Text>
            ) : null}
            {receipt.reversedAt ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Adjusted On: {formatFeeDateTime(receipt.reversedAt)}
              </Text>
            ) : null}
            {receipt.reversalReason ? (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Reason: {receipt.reversalReason}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
              marginBottom: spacing.md,
              gap: spacing.xs + 2,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Receipt Number
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {receipt.receiptNumber}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Student
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {receipt.studentName} ({receipt.admissionNumber})
            </Text>
          </View>

          {receipt.academicSessionName ? (
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Academic Session
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {receipt.academicSessionName}
              </Text>
            </View>
          ) : null}

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Payment Date
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {formatFeeDate(receipt.paymentDate)}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Payment Method
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {formatPaymentMethodLabel(receipt.paymentMethod)}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              UTR / Transaction Ref
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.medium,
              }}
            >
              {receipt.referenceNumber || '—'}
            </Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Allocated to Fee Demands
            </Text>
            <Text
              style={{
                color: colors.successText,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {formatCurrencyINR(receipt.allocatedAmount)}
            </Text>
          </View>

          {(receipt.unappliedCreditAmount ?? 0) > 0 ? (
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Unapplied Credit
              </Text>
              <Text
                style={{
                  color: colors.infoText,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {formatCurrencyINR(receipt.unappliedCreditAmount)}
              </Text>
            </View>
          ) : null}

          {receipt.remarks ? (
            <View style={{ marginTop: 2 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Remarks: {receipt.remarks}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.xs + 2,
            }}
          >
            Allocated Fee Demands ({allocations.length})
          </Text>

          {allocations.length === 0 ? (
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                Unallocated / Advance Payment
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {allocations.map((alloc) => (
                <View
                  key={alloc.id}
                  style={[
                    styles.sectionBox,
                    {
                      backgroundColor: colors.surfaceMuted,
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
                          color: alloc.reversed
                            ? colors.textMuted
                            : colors.textPrimary,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: typography.fontWeights.bold,
                          textDecorationLine: alloc.reversed
                            ? 'line-through'
                            : 'none',
                        }}
                      >
                        {alloc.componentName} ({alloc.componentCode})
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Period: {alloc.periodLabel} • Demand #{alloc.demandId}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          color: alloc.reversed
                            ? colors.textMuted
                            : colors.successText,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {formatCurrencyINR(alloc.allocatedAmount)}
                      </Text>
                      {alloc.reversed ? (
                        <Text
                          style={{
                            color: colors.dangerText,
                            fontSize: 10,
                            fontWeight: typography.fontWeights.semibold,
                          }}
                        >
                          Reversed
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Official Receipt Download Box */}
        <View
          style={[
            styles.sectionBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
            },
          ]}
        >
          <View style={styles.rowCenter}>
            <Download size={iconSizes.sm} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              Download Official School Receipt
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 4,
              marginBottom: spacing.sm,
            }}
          >
            Export the authorized payment receipt generated by the school in
            PDF, CSV, or Excel format.
          </Text>

          <View style={[styles.downloadRow, { gap: spacing.xs }]}>
            <View style={{ flex: 1 }}>
              <AppButton
                label={
                  downloadingFormat === 'PDF'
                    ? 'Preparing PDF...'
                    : 'Download PDF'
                }
                variant="primary"
                size="sm"
                loading={downloadingFormat === 'PDF'}
                disabled={downloadingFormat !== null}
                onPress={() => void handleDownloadReceipt('PDF')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={
                  downloadingFormat === 'CSV'
                    ? 'Preparing CSV...'
                    : 'Export CSV'
                }
                variant="secondary"
                size="sm"
                loading={downloadingFormat === 'CSV'}
                disabled={downloadingFormat !== null}
                onPress={() => void handleDownloadReceipt('CSV')}
              />
            </View>
          </View>

          {downloadFeedback ? (
            <View style={{ marginTop: spacing.xs + 2 }}>
              <FeedbackBanner
                tone={downloadFeedback.tone}
                message={downloadFeedback.message}
              />
            </View>
          ) : null}

          {csvPreviewText ? (
            <View
              style={[
                styles.csvPreviewBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  padding: spacing.xs + 2,
                  marginTop: spacing.xs + 2,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                  marginBottom: 4,
                }}
              >
                RECEIPT CSV PREVIEW
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 11,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
              >
                {csvPreviewText}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheetModal>
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
  sectionBox: {
    borderWidth: 1,
  },
  metaGrid: {
    borderTopWidth: 1,
  },
  infoBannerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  csvPreviewBox: {
    borderWidth: 1,
  },
});



