import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Building2,
  Check,
  Clock,
  Download,
  Paperclip,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { parentPortalApi } from '@/api/parentPortalApi';
import type {
  FeePaymentMethod,
  OfflinePaymentSubmissionStatus,
  ParentFeePaymentSubmissionResponse,
  PickedPaymentProofAsset,
  SchoolOfflinePaymentInstructionsResponse,
  StoredFileResponse,
  StudentFeeDemandResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  BottomSheetModal,
  FeedbackBanner,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';
import {
  formatCurrencyINR,
  formatFeeDate,
  formatFeeDateTime,
  formatPaymentMethodLabel,
} from './ParentFeeComponents';
import { triggerReceiptBrowserOrShareDownload } from './ParentFeeDetailSheets';

export function getOfflineSubmissionStatusBadgeMeta(
  status: OfflinePaymentSubmissionStatus
): {
  label: string;
  tone: 'warning' | 'success' | 'danger' | 'neutral';
  description: string;
} {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return {
        label: 'Pending Verification',
        tone: 'warning',
        description:
          'Submitted by parent — awaiting verification by school administration (not yet settled)',
      };
    case 'APPROVED':
      return {
        label: 'Verified & Approved',
        tone: 'success',
        description: 'Verified and recorded by school administration',
      };
    case 'REJECTED':
      return {
        label: 'Verification Rejected',
        tone: 'danger',
        description: 'Could not be verified by school administration',
      };
    default:
      return {
        label: String(status || 'Pending').replace(/_/g, ' '),
        tone: 'neutral',
        description: `Status: ${String(status)}`,
      };
  }
}

export function SchoolOfflinePaymentInstructionsCard({
  instructions,
  onOpenSubmitModal,
}: {
  instructions: SchoolOfflinePaymentInstructionsResponse | null;
  onOpenSubmitModal: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  if (!instructions) return null;

  const hasBankOrUpi = Boolean(
    instructions.upiId ||
      instructions.accountNumber ||
      instructions.bankName ||
      instructions.ifscCode
  );

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={styles.rowBetweenStart}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <View style={styles.rowCenter}>
            <Building2 size={iconSizes.sm} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              School Offline Payment Details
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            Payee: {instructions.payeeName || instructions.organizationName}
          </Text>
        </View>
        <StatusBadge label="Offline / UTR" tone="info" />
      </View>

      <View
        style={[
          styles.detailsBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginTop: spacing.xs + 4,
            gap: 4,
          },
        ]}
      >
        {instructions.upiId ? (
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              School UPI ID
            </Text>
            <Text
              selectable
              style={{
                color: colors.primary,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {instructions.upiId}
            </Text>
          </View>
        ) : null}

        {instructions.bankName ? (
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Bank Name
            </Text>
            <Text
              selectable
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {instructions.bankName}
            </Text>
          </View>
        ) : null}

        {instructions.accountNumber ? (
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Account Number
            </Text>
            <Text
              selectable
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {instructions.accountNumber}
            </Text>
          </View>
        ) : null}

        {instructions.ifscCode ? (
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              IFSC Code
            </Text>
            <Text
              selectable
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {instructions.ifscCode}
            </Text>
          </View>
        ) : null}

        {!hasBankOrUpi ? (
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            School Office:{' '}
            {[
              instructions.branchOrAddress,
              instructions.contactPhone,
              instructions.contactEmail,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        ) : null}

        {instructions.instructionsNote ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {instructions.instructionsNote}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <AppButton
          label="Submit Payment Reference (UTR / Proof)"
          variant="primary"
          size="sm"
          fullWidth
          onPress={onOpenSubmitModal}
        />
      </View>
    </SurfaceCard>
  );
}

function OfflineSubmissionCardItem({
  sub,
  targetLabels,
  downloadingProofKey,
  onDownloadProof,
}: {
  sub: ParentFeePaymentSubmissionResponse;
  targetLabels: string[];
  downloadingProofKey: string | null;
  onDownloadProof: (
    submission: ParentFeePaymentSubmissionResponse,
    file: StoredFileResponse
  ) => void;
}) {
  const { colors, spacing, typography, radius } = useAppTheme();
  const badgeMeta = getOfflineSubmissionStatusBadgeMeta(sub.status);
  const proofFiles = sub.proofFiles ?? [];

  return (
    <SurfaceCard elevation="subtle">
      <View style={styles.rowBetweenStart}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {formatCurrencyINR(sub.amount)} •{' '}
            {formatPaymentMethodLabel(sub.paymentMethod)}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            UTR / Ref: {sub.utrOrReferenceNumber} • Paid{' '}
            {formatFeeDate(sub.paymentDate)}
          </Text>
        </View>
        <StatusBadge label={badgeMeta.label} tone={badgeMeta.tone} />
      </View>

      <View
        style={[
          styles.detailsBox,
          {
            backgroundColor:
              sub.status === 'PENDING_VERIFICATION'
                ? colors.warningSoft
                : sub.status === 'REJECTED'
                ? colors.dangerSoft
                : colors.surfaceMuted,
            borderColor:
              sub.status === 'PENDING_VERIFICATION'
                ? colors.warningBorder
                : sub.status === 'REJECTED'
                ? colors.dangerBorder
                : colors.border,
            borderRadius: radius.sm,
            padding: spacing.xs + 2,
            marginTop: spacing.xs + 2,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 11,
            fontWeight: typography.fontWeights.medium,
          }}
        >
          {badgeMeta.description}
        </Text>

        {sub.approvedReceiptNumber ? (
          <Text
            style={{
              color: colors.successText,
              fontSize: 11,
              fontWeight: typography.fontWeights.bold,
              marginTop: 2,
            }}
          >
            Official Receipt Issued: #{sub.approvedReceiptNumber}
          </Text>
        ) : null}

        {sub.reviewRemarks ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            School Review Note: {sub.reviewRemarks}
          </Text>
        ) : null}
      </View>

      {targetLabels.length > 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            marginTop: 6,
          }}
        >
          Towards: {targetLabels.join(', ')}
        </Text>
      ) : null}

      {sub.remarks ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          Parent Note: {sub.remarks}
        </Text>
      ) : null}

      {proofFiles.length > 0 ? (
        <View style={{ marginTop: 6, gap: 4 }}>
          {proofFiles.map((file) => {
            const key = `${sub.id}:${file.id}`;
            const isLoading = downloadingProofKey === key;
            return (
              <Pressable
                key={file.id}
                disabled={downloadingProofKey !== null}
                onPress={() => onDownloadProof(sub, file)}
                style={[
                  styles.proofRowBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.xs + 2,
                    paddingVertical: 4,
                  },
                ]}
              >
                <View style={[styles.rowCenter, { flex: 1 }]}>
                  <Paperclip size={12} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.primary,
                      fontSize: 11,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: 4,
                      flex: 1,
                    }}
                  >
                    {file.originalFilename}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Download size={12} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SurfaceCard>
  );
}

export function ParentOfflinePaymentSubmissionsList({
  submissions,
  demands,
  downloadingProofKey,
  onDownloadProof,
}: {
  submissions: ParentFeePaymentSubmissionResponse[];
  demands: StudentFeeDemandResponse[];
  downloadingProofKey: string | null;
  onDownloadProof: (
    submission: ParentFeePaymentSubmissionResponse,
    file: StoredFileResponse
  ) => void;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  const demandMap = useMemo(() => {
    const map = new Map<number, StudentFeeDemandResponse>();
    for (const d of demands) {
      map.set(d.id, d);
    }
    return map;
  }, [demands]);

  if (submissions.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={[styles.rowBetween, { marginBottom: spacing.xs + 2 }]}>
        <View style={styles.rowCenter}>
          <Clock size={iconSizes.sm} color={colors.warningText} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginLeft: 6,
            }}
          >
            Submitted Payment References ({submissions.length})
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          marginBottom: spacing.xs + 4,
        }}
      >
        Offline UTR / payment references submitted by you. A submitted reference
        is not proof of settlement until verified and recorded by school
        administration.
      </Text>

      <View style={{ gap: spacing.xs + 4 }}>
        {submissions.map((sub) => {
          const targetLabels = (sub.targetDemandIds ?? [])
            .map((id) => {
              const d = demandMap.get(id);
              return d
                ? `${d.componentName} (${d.periodLabel})`
                : `Demand #${id}`;
            })
            .filter(Boolean);

          return (
            <OfflineSubmissionCardItem
              key={sub.id}
              sub={sub}
              targetLabels={targetLabels}
              downloadingProofKey={downloadingProofKey}
              onDownloadProof={onDownloadProof}
            />
          );
        })}
      </View>
    </View>
  );
}

const SUBMISSION_METHODS: FeePaymentMethod[] = [
  'UPI',
  'BANK_TRANSFER',
  'CHEQUE',
  'CASH',
  'CARD',
];

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function OfflinePaymentSubmissionSheetModal({
  visible,
  organizationId,
  studentId,
  academicSessionId,
  studentName,
  instructions,
  unpaidDemands,
  preselectedDemandId,
  onSubmittedSuccess,
  onClose,
}: {
  visible: boolean;
  organizationId: number;
  studentId: number;
  academicSessionId: number | null;
  studentName: string;
  instructions: SchoolOfflinePaymentInstructionsResponse | null;
  unpaidDemands: StudentFeeDemandResponse[];
  preselectedDemandId: number | null;
  onSubmittedSuccess: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const [selectedDemandIds, setSelectedDemandIds] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<FeePaymentMethod>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(todayIsoDate());
  const [amountInput, setAmountInput] = useState<string>('');
  const [utrInput, setUtrInput] = useState<string>('');
  const [remarksInput, setRemarksInput] = useState<string>('');
  const [proofAsset, setProofAsset] = useState<PickedPaymentProofAsset | null>(
    null
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    tone: 'danger' | 'success' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPaymentDate(todayIsoDate());
    setPaymentMethod('UPI');
    setUtrInput('');
    setRemarksInput('');
    setProofAsset(null);
    setFeedback(null);
    setSubmitting(false);

    if (preselectedDemandId) {
      const match = unpaidDemands.find((d) => d.id === preselectedDemandId);
      setSelectedDemandIds(match ? [match.id] : []);
      setAmountInput(match ? String(match.outstandingAmount) : '');
    } else if (unpaidDemands.length > 0) {
      const first = unpaidDemands[0];
      setSelectedDemandIds(first ? [first.id] : []);
      setAmountInput(first ? String(first.outstandingAmount) : '');
    } else {
      setSelectedDemandIds([]);
      setAmountInput('');
    }
  }, [visible, preselectedDemandId, unpaidDemands]);

  const toggleDemandSelection = (demand: StudentFeeDemandResponse) => {
    setSelectedDemandIds((prev) => {
      const next = prev.includes(demand.id)
        ? prev.filter((id) => id !== demand.id)
        : [...prev, demand.id];
      const sum = unpaidDemands
        .filter((d) => next.includes(d.id))
        .reduce((acc, d) => acc + (d.outstandingAmount ?? 0), 0);
      if (sum > 0) {
        setAmountInput(String(Math.round(sum * 100) / 100));
      }
      return next;
    });
  };

  const handlePickProofWeb = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setFeedback({
        tone: 'info',
        message:
          'Enter your UTR / bank reference number below. File proof attachment is supported via browser upload.',
      });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setFeedback({
          tone: 'danger',
          message: 'Payment proof file size must not exceed 10 MB.',
        });
        return;
      }
      const uri = URL.createObjectURL(file);
      setProofAsset({
        uri,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        webFile: file,
      });
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setFeedback(null);

    const parsedAmount = Number(amountInput.trim());
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFeedback({
        tone: 'danger',
        message: 'Please enter a valid payment amount greater than zero.',
      });
      return;
    }

    const trimmedUtr = utrInput.trim();
    if (!trimmedUtr) {
      setFeedback({
        tone: 'danger',
        message: 'UTR or transaction reference number is required.',
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate.trim())) {
      setFeedback({
        tone: 'danger',
        message: 'Payment date must be in YYYY-MM-DD format.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = await parentPortalApi.submitChildOfflinePayment(
        organizationId,
        studentId,
        {
          academicSessionId,
          paymentDate: paymentDate.trim(),
          amount: parsedAmount,
          paymentMethod,
          utrOrReferenceNumber: trimmedUtr,
          targetDemandIds:
            selectedDemandIds.length > 0 ? selectedDemandIds : null,
          remarks: remarksInput.trim() || null,
        }
      );

      if (proofAsset) {
        await parentPortalApi.uploadChildOfflinePaymentProof(
          organizationId,
          studentId,
          created.id,
          proofAsset
        );
      }

      onSubmittedSuccess();
      onClose();
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to submit offline payment reference.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Submit Payment Reference"
      subtitle={`${studentName} • Offline / UTR Verification`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      >
        <View
          style={[
            styles.noticeBanner,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warningBorder,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
        >
          <ShieldCheck size={iconSizes.sm} color={colors.warningText} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 11,
              marginLeft: 8,
              flex: 1,
            }}
          >
            A submitted UTR or payment reference is not proof of settlement. Fee
            demands remain unpaid until verified and recorded by school
            administration.
          </Text>
        </View>

        {feedback ? (
          <View style={{ marginBottom: spacing.sm }}>
            <FeedbackBanner tone={feedback.tone} message={feedback.message} />
          </View>
        ) : null}

        {unpaidDemands.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: typography.fontWeights.bold,
                marginBottom: 6,
              }}
            >
              Select Fee Demand(s) Paid Towards
            </Text>
            <View style={{ gap: 6 }}>
              {unpaidDemands.slice(0, 6).map((d) => {
                const isChecked = selectedDemandIds.includes(d.id);
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => toggleDemandSelection(d)}
                    style={[
                      styles.demandSelectRow,
                      {
                        backgroundColor: isChecked
                          ? colors.primarySoft
                          : colors.surfaceMuted,
                        borderColor: isChecked
                          ? colors.primarySoftBorder
                          : colors.border,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 8,
                      },
                    ]}
                  >
                    <View
                      style={[styles.rowCenter, { flex: 1, marginRight: 8 }]}
                    >
                      <Check
                        size={14}
                        color={isChecked ? colors.primary : colors.textMuted}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.textPrimary,
                          fontSize: 12,
                          fontWeight: isChecked
                            ? typography.fontWeights.bold
                            : typography.fontWeights.medium,
                          marginLeft: 6,
                          flex: 1,
                        }}
                      >
                        {d.componentName} ({d.periodLabel})
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: isChecked
                          ? colors.primary
                          : colors.textSecondary,
                        fontSize: 12,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {formatCurrencyINR(d.outstandingAmount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 12,
              fontWeight: typography.fontWeights.bold,
              marginBottom: 6,
            }}
          >
            Payment Method
          </Text>
          <View style={[styles.rowCenter, { flexWrap: 'wrap', gap: 6 }]}>
            {SUBMISSION_METHODS.map((method) => {
              const isSelected = paymentMethod === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[
                    styles.methodPill,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceMuted,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? colors.textInverse
                        : colors.textPrimary,
                      fontSize: 11,
                      fontWeight: isSelected
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {formatPaymentMethodLabel(method)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.twoColRow, { gap: spacing.xs, marginBottom: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Amount Paid (INR) *
            </Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 4500"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Payment Date (YYYY-MM-DD) *
            </Text>
            <TextInput
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  color: colors.textPrimary,
                },
              ]}
            />
          </View>
        </View>

        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            UTR / Bank / Cheque Reference Number *
          </Text>
          <TextInput
            value={utrInput}
            onChangeText={setUtrInput}
            autoCapitalize="characters"
            placeholder="Enter 12-digit UTR or transaction reference"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.sm,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            Optional Remarks
          </Text>
          <TextInput
            value={remarksInput}
            onChangeText={setRemarksInput}
            placeholder="Any notes for the school accounts office..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.sm,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            Optional Payment Proof / Screenshot
          </Text>
          {proofAsset ? (
            <View
              style={[
                styles.proofRowBtn,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primarySoftBorder,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                },
              ]}
            >
              <View style={[styles.rowCenter, { flex: 1, marginRight: 8 }]}>
                <Paperclip size={14} color={colors.primary} />
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: typography.fontWeights.semibold,
                    marginLeft: 6,
                    flex: 1,
                  }}
                >
                  {proofAsset.name}
                </Text>
              </View>
              <Pressable onPress={() => setProofAsset(null)} hitSlop={8}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickProofWeb}
              style={[
                styles.uploadBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingVertical: 10,
                },
              ]}
            >
              <Upload size={14} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: 6,
                }}
              >
                Attach Payment Receipt / Screenshot
              </Text>
            </Pressable>
          )}
        </View>

        <AppButton
          label={
            submitting
              ? 'Submitting Reference...'
              : 'Submit Reference for Verification'
          }
          variant="primary"
          fullWidth
          loading={submitting}
          disabled={submitting}
          onPress={() => void handleSubmit()}
        />
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
  detailsBox: {
    borderWidth: 1,
  },
  proofRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  demandSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  methodPill: {
    borderWidth: 1,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});





