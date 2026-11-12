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
  Award,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import {
  parentPortalApi,
  type AuthorizedAttachmentDownloadResult,
} from '@/api/parentPortalApi';
import type {
  ExamMarkResponse,
  ReportCardExportFormat,
  ReportCardResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  BottomSheetModal,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';
import {
  formatExamDate,
  formatExamDateRange,
  formatExamTimeRange,
  formatExamTypeLabel,
  formatMarksNumber,
  getCategoryBadgeMeta,
  type UnifiedParentExamItem,
} from './ParentExaminationComponents';

async function triggerBrowserOrShareDownload(
  result: AuthorizedAttachmentDownloadResult,
  reportTitle: string
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

  // Native mobile fallback: invoke system Share sheet with summary/text or authorized link
  try {
    await Share.share({
      title: reportTitle,
      message: result.textPreview
        ? `${reportTitle}\n\n${result.textPreview}`
        : `${reportTitle} (${result.filename}) downloaded (${Math.max(
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

export function ExaminationResultDetailSheetModal({
  visible,
  organizationId,
  studentId,
  examItem,
  reportCardData,
  sectionName,
  isLoadingReportCard,
  reportCardError,
  onRetryReportCard,
  onClose,
}: {
  visible: boolean;
  organizationId: number;
  studentId: number;
  examItem: UnifiedParentExamItem | null;
  reportCardData: ReportCardResponse | null;
  sectionName?: string | null;
  isLoadingReportCard: boolean;
  reportCardError: string | null;
  onRetryReportCard: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const [downloadingFormat, setDownloadingFormat] =
    useState<ReportCardExportFormat | null>(null);
  const [downloadBanner, setDownloadBanner] = useState<{
    tone: 'success' | 'danger' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [csvPreviewText, setCsvPreviewText] = useState<string | null>(null);

  const report = reportCardData ?? examItem?.reportCard ?? null;

  useEffect(() => {
    setDownloadingFormat(null);
    setDownloadBanner(null);
    setCsvPreviewText(null);
  }, [examItem?.examinationId, studentId, visible]);

  const subjectMarks = useMemo(
    () => report?.subjectMarks ?? [],
    [report?.subjectMarks]
  );

  const performanceStats = useMemo(() => {
    const totalSubjects = subjectMarks.length;
    const passedSubjects = subjectMarks.filter((m) => m.passed).length;
    let highestMark: ExamMarkResponse | null = null;
    let highestRatio = -1;

    for (const m of subjectMarks) {
      if (
        m.entryStatus === 'PRESENT' &&
        m.marksObtained !== null &&
        m.maxMarks > 0
      ) {
        const ratio = Number(m.marksObtained) / Number(m.maxMarks);
        if (ratio > highestRatio) {
          highestRatio = ratio;
          highestMark = m;
        }
      }
    }

    return {
      totalSubjects,
      passedSubjects,
      highestMark,
    };
  }, [subjectMarks]);

  const handleDownloadReportCard = async (format: ReportCardExportFormat) => {
    if (!report || downloadingFormat) return;
    setDownloadingFormat(format);
    setDownloadBanner(null);

    const ext = format === 'CSV' ? 'csv' : 'pdf';
    const safeAdm = (report.admissionNumber || String(studentId)).replace(
      /[^a-zA-Z0-9_-]/g,
      '-'
    );
    const fallbackFilename = `report-card-${safeAdm}-exam-${report.examinationId}.${ext}`;

    try {
      const result = await parentPortalApi.downloadChildReportCard(
        organizationId,
        studentId,
        report.examinationId,
        format,
        fallbackFilename
      );

      if (format === 'CSV' && result.textPreview) {
        setCsvPreviewText(result.textPreview);
      }

      const summaryMsg = await triggerBrowserOrShareDownload(
        result,
        `${report.examinationName} — ${report.studentName} Report Card`
      );

      setDownloadBanner({
        tone: 'success',
        title:
          format === 'PDF'
            ? 'PDF Report Card Ready'
            : 'CSV Report Card Exported',
        message: summaryMsg,
      });
    } catch (err) {
      setDownloadBanner({
        tone: 'danger',
        title: 'Unable to Download Report Card',
        message:
          err instanceof Error
            ? err.message
            : 'Could not download the official report card right now.',
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (!examItem || !report) {
    return null;
  }

  const pct = Math.max(0, Math.min(100, Number(report.percentage ?? 0)));

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={report.examinationName}
      subtitle={`${formatExamTypeLabel(report.examType)} • Official Report Card`}
    >
      <ScrollView
        style={{ maxHeight: 540 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      >
        {/* 1. Student & Examination Identity Card */}
        <View
          style={[
            styles.identityBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.identityHeaderRow}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: spacing.xs,
              }}
            >
              <StatusBadge label="Result Published" tone="success" />
              <StatusBadge
                label={formatExamTypeLabel(report.examType)}
                tone="neutral"
              />
              {report.overallGrade ? (
                <StatusBadge
                  label={`Overall Grade ${report.overallGrade}`}
                  tone={report.overallPassed ? 'primary' : 'warning'}
                />
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {report.studentName}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {[
                report.admissionNumber
                  ? `Adm No: ${report.admissionNumber}`
                  : null,
                report.className
                  ? `${report.className}${
                      sectionName ? ` • ${sectionName}` : ''
                    }`
                  : null,
                report.academicSessionName,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </View>
        </View>

        {/* 2. Overall Performance Summary Card */}
        <View
          style={[
            styles.overallSummaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: report.overallPassed
                ? colors.success
                : colors.danger,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.overallTopRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  fontWeight: typography.fontWeights.semibold,
                  letterSpacing: 0.5,
                }}
              >
                Overall Result & Percentage
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  marginTop: 4,
                  gap: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: report.overallPassed
                      ? colors.success
                      : colors.danger,
                    fontSize: typography.fontSizes.xxl,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {pct.toFixed(1)}%
                </Text>
                <StatusBadge
                  label={report.overallPassed ? 'PASSED' : 'FAILED'}
                  tone={report.overallPassed ? 'success' : 'danger'}
                />
              </View>
            </View>

            <View
              style={[
                styles.gradeBadgeBox,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                Grade
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {report.overallGrade || '—'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.overallMetricsGrid,
              {
                borderTopColor: colors.borderSubtle,
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Total Marks
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {formatMarksNumber(report.totalObtainedMarks)} /{' '}
                {formatMarksNumber(report.totalMaxMarks)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Subjects Passed
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {performanceStats.totalSubjects > 0
                  ? `${performanceStats.passedSubjects} / ${performanceStats.totalSubjects}`
                  : '—'}
              </Text>
            </View>

            {performanceStats.highestMark ? (
              <View style={{ flex: 1.2 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                  Top Subject
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                    marginTop: 2,
                  }}
                >
                  {performanceStats.highestMark.subjectName} (
                  {formatMarksNumber(
                    performanceStats.highestMark.marksObtained
                  )}
                  /{formatMarksNumber(performanceStats.highestMark.maxMarks)})
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 3. Official Report Card Download / Share Actions */}
        <View
          style={[
            styles.reportCardActionBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.reportCardActionHeader}>
            <Award
              size={iconSizes.md}
              color={colors.primary}
              style={{ marginRight: spacing.xs }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Official Report Card Export
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 1,
                }}
              >
                Download or share the official school report card in PDF or CSV
                format
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.downloadButtonsRow,
              { marginTop: spacing.sm, gap: spacing.sm },
            ]}
          >
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
                leftIcon={
                  <Download size={iconSizes.sm} color={colors.textInverse} />
                }
                onPress={() => void handleDownloadReportCard('PDF')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={
                  downloadingFormat === 'CSV'
                    ? 'Exporting CSV...'
                    : 'Export CSV'
                }
                variant="secondary"
                size="sm"
                loading={downloadingFormat === 'CSV'}
                disabled={downloadingFormat !== null}
                leftIcon={
                  <FileSpreadsheet size={iconSizes.sm} color={colors.primary} />
                }
                onPress={() => void handleDownloadReportCard('CSV')}
              />
            </View>
          </View>

          {downloadBanner ? (
            <FeedbackBanner
              tone={downloadBanner.tone}
              title={downloadBanner.title}
              message={downloadBanner.message}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}

          {csvPreviewText ? (
            <View
              style={[
                styles.csvPreviewBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Report Card Statement Preview
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
              >
                {csvPreviewText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 4. Subject-Wise Marks, Grades & Teacher Remarks */}
        <View style={{ marginBottom: spacing.xs }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing.sm,
            }}
          >
            Subject-Wise Marks & Grades ({subjectMarks.length})
          </Text>

          {isLoadingReportCard && subjectMarks.length === 0 ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: spacing.xs,
                }}
              >
                Loading subject-wise marks...
              </Text>
            </View>
          ) : reportCardError && subjectMarks.length === 0 ? (
            <FeedbackBanner
              tone="danger"
              title="Unable to load subject marks"
              message={reportCardError}
              onRetry={onRetryReportCard}
            />
          ) : subjectMarks.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={iconSizes.lg} color={colors.primary} />}
              title="No Subject Marks Listed"
              description="Individual subject mark rows were not returned for this examination."
            />
          ) : (
            subjectMarks.map((mark) => {
              const isAbsent = mark.entryStatus === 'ABSENT';
              const isExempted = mark.entryStatus === 'EXEMPTED';
              const subPct =
                !isAbsent &&
                !isExempted &&
                mark.marksObtained !== null &&
                mark.maxMarks > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (Number(mark.marksObtained) / Number(mark.maxMarks)) *
                          100
                      )
                    )
                  : 0;

              return (
                <View
                  key={mark.id || mark.subjectId}
                  style={[
                    styles.subjectMarkCard,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.subjectMarkTopRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {mark.subjectName}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          marginTop: 2,
                        }}
                      >
                        {[
                          mark.subjectCode ? `Code: ${mark.subjectCode}` : null,
                          `Passing Marks: ${formatMarksNumber(
                            mark.passingMarks
                          )}`,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                      }}
                    >
                      {mark.grade ? (
                        <StatusBadge
                          label={`Grade ${mark.grade}`}
                          tone={mark.passed ? 'primary' : 'warning'}
                        />
                      ) : null}
                      <StatusBadge
                        label={
                          isAbsent
                            ? 'ABSENT'
                            : isExempted
                            ? 'EXEMPTED'
                            : mark.passed
                            ? 'PASS'
                            : 'FAIL'
                        }
                        tone={
                          isExempted
                            ? 'info'
                            : isAbsent || !mark.passed
                            ? 'danger'
                            : 'success'
                        }
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.subjectScoreRow,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {isAbsent
                        ? 'Absent (0)'
                        : isExempted
                        ? 'Exempted'
                        : `${formatMarksNumber(
                            mark.marksObtained
                          )} / ${formatMarksNumber(mark.maxMarks)}`}
                    </Text>
                    {!isAbsent && !isExempted ? (
                      <Text
                        style={{
                          color: mark.passed ? colors.success : colors.danger,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: typography.fontWeights.bold,
                        }}
                      >
                        {subPct.toFixed(1)}%
                      </Text>
                    ) : null}
                  </View>

                  {!isAbsent && !isExempted ? (
                    <View
                      style={[
                        styles.subjectProgressTrack,
                        {
                          backgroundColor: colors.borderSubtle,
                          borderRadius: radius.full,
                          marginTop: 6,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.subjectProgressFill,
                          {
                            width: `${subPct}%`,
                            backgroundColor: mark.passed
                              ? colors.success
                              : colors.danger,
                            borderRadius: radius.full,
                          },
                        ]}
                      />
                    </View>
                  ) : null}

                  {mark.remarks ? (
                    <View
                      style={[
                        styles.remarksBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.borderSubtle,
                          borderRadius: radius.sm,
                          padding: spacing.xs,
                          marginTop: spacing.sm,
                        },
                      ]}
                    >
                      <MessageSquare
                        size={13}
                        color={colors.primary}
                        style={{ marginRight: 6, marginTop: 1 }}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          flex: 1,
                        }}
                      >
                        Teacher Remark: {mark.remarks}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

export function ExaminationScheduleDetailSheetModal({
  visible,
  examItem,
  studentName,
  sectionName,
  onClose,
}: {
  visible: boolean;
  examItem: UnifiedParentExamItem | null;
  studentName?: string | null;
  sectionName?: string | null;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  if (!examItem) return null;

  const badgeMeta = getCategoryBadgeMeta(examItem.category);
  const schedules = examItem.schedules ?? [];
  const isAwaiting = examItem.category === 'AWAITING_RESULTS';

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={examItem.examinationName}
      subtitle={`${formatExamTypeLabel(examItem.examType)} • ${badgeMeta.label}`}
    >
      <ScrollView
        style={{ maxHeight: 520 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      >
        <View
          style={[
            styles.identityBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.xs,
            }}
          >
            <StatusBadge label={badgeMeta.label} tone={badgeMeta.tone} />
            <StatusBadge
              label={formatExamTypeLabel(examItem.examType)}
              tone="neutral"
            />
            {examItem.gradingScaleName ? (
              <StatusBadge
                label={`Scale: ${examItem.gradingScaleName}`}
                tone="info"
              />
            ) : null}
          </View>

          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.sm,
            }}
          >
            Exam Window:{' '}
            {formatExamDateRange(examItem.startDate, examItem.endDate)}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {[
              studentName,
              examItem.className
                ? `${examItem.className}${
                    sectionName ? ` • ${sectionName}` : ''
                  }`
                : null,
              examItem.academicSessionName,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>

        {isAwaiting ? (
          <FeedbackBanner
            tone="warning"
            title="Results Awaiting Publication"
            message="This examination has concluded. Subject-wise marks and the official report card are currently being evaluated or moderated by the school and will appear automatically once published."
            style={{ marginBottom: spacing.md }}
          />
        ) : (
          <FeedbackBanner
            tone="info"
            title={
              examItem.category === 'ONGOING'
                ? 'Examination Currently in Progress'
                : 'Upcoming Examination Schedule'
            }
            message="Review the subject-wise examination timetable, timings, maximum/passing marks, and room assignments below."
            style={{ marginBottom: spacing.md }}
          />
        )}

        {examItem.instructions ? (
          <View
            style={[
              styles.instructionsCard,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 10,
                fontWeight: typography.fontWeights.bold,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Examination Instructions
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                lineHeight: 18,
              }}
            >
              {examItem.instructions}
            </Text>
          </View>
        ) : null}

        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing.sm,
            }}
          >
            Subject Papers & Timetable ({schedules.length})
          </Text>

          {schedules.length === 0 ? (
            <EmptyState
              icon={<Calendar size={iconSizes.lg} color={colors.primary} />}
              title="Subject Timetable Not Published Yet"
              description="Individual subject paper dates and timings will appear here once scheduled by the school."
            />
          ) : (
            schedules.map((sched) => (
              <View
                key={sched.id}
                style={[
                  styles.scheduleItemCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <View style={styles.subjectMarkTopRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {sched.subjectName}
                    </Text>
                    {sched.subjectCode ? (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          marginTop: 2,
                        }}
                      >
                        Subject Code: {sched.subjectCode}
                      </Text>
                    ) : null}
                  </View>

                  <StatusBadge
                    label={formatExamDate(sched.examDate)}
                    tone="primary"
                  />
                </View>

                <View
                  style={[
                    styles.scheduleMetaRow,
                    {
                      borderTopColor: colors.borderSubtle,
                      marginTop: spacing.sm,
                      paddingTop: spacing.xs,
                      gap: spacing.sm,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock
                      size={13}
                      color={colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                      }}
                    >
                      {formatExamTimeRange(sched.startTime, sched.endTime)}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    Max: {formatMarksNumber(sched.maxMarks)} • Pass:{' '}
                    {formatMarksNumber(sched.passingMarks)}
                  </Text>

                  {sched.room ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: typography.fontWeights.medium,
                        }}
                      >
                        • Room {sched.room}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  identityBox: {
    borderWidth: 1,
  },
  identityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallSummaryCard: {
    borderWidth: 1.5,
  },
  overallTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeBadgeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 68,
  },
  overallMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  reportCardActionBox: {
    borderWidth: 1,
  },
  reportCardActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  csvPreviewBox: {
    borderWidth: 1,
  },
  subjectMarkCard: {
    borderWidth: 1,
  },
  subjectMarkTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  subjectScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectProgressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
  },
  remarksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  instructionsCard: {
    borderWidth: 1,
  },
  scheduleItemCard: {
    borderWidth: 1,
  },
  scheduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
});








