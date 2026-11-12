import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Search,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type {
  ExaminationResponse,
  ExamScheduleResponse,
  ParentChildExaminationsResponse,
  ReportCardResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  AppInput,
  type BadgeTone,
  EmptyState,
  PickerField,
  type SelectOption,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export type ExamStatusFilter =
  | 'ALL'
  | 'PUBLISHED'
  | 'AWAITING_RESULTS'
  | 'UPCOMING';

export type ExamDisplayCategory =
  | 'PUBLISHED'
  | 'AWAITING_RESULTS'
  | 'ONGOING'
  | 'UPCOMING';

export interface UnifiedParentExamItem {
  examinationId: number;
  examinationName: string;
  examType: string;
  rawStatus: string;
  category: ExamDisplayCategory;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  startDate: string | null;
  endDate: string | null;
  instructions: string | null;
  gradingScaleName: string | null;
  publishedAt: string | null;
  schedules: ExamScheduleResponse[];
  reportCard: ReportCardResponse | null;
}

const SHORT_MONTHS = [
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

export function formatExamDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return `${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  return dateStr;
}

export function formatExamDateRange(
  startDate?: string | null,
  endDate?: string | null
): string {
  if (!startDate && !endDate) return 'Schedule announced by school';
  if (startDate && (!endDate || startDate === endDate)) {
    return formatExamDate(startDate);
  }
  if (!startDate && endDate) {
    return formatExamDate(endDate);
  }
  return `${formatExamDate(startDate)} – ${formatExamDate(endDate)}`;
}

export function formatExamTimeRange(
  startTime?: string | null,
  endTime?: string | null
): string {
  const fmt = (raw?: string | null) => {
    if (!raw) return '';
    const parts = raw.split(':').map(Number);
    if (
      parts.length >= 2 &&
      !Number.isNaN(parts[0]) &&
      !Number.isNaN(parts[1])
    ) {
      const h = parts[0];
      const m = String(parts[1]).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return raw.slice(0, 5);
  };
  const s = fmt(startTime);
  const e = fmt(endTime);
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

export function formatExamTypeLabel(examType?: string | null): string {
  if (!examType) return 'Examination';
  switch (examType.toUpperCase()) {
    case 'UNIT_TEST':
      return 'Unit Test';
    case 'MONTHLY_TEST':
      return 'Monthly Test';
    case 'QUARTERLY':
      return 'Quarterly Exam';
    case 'MID_TERM':
      return 'Mid-Term Exam';
    case 'HALF_YEARLY':
      return 'Half-Yearly Exam';
    case 'ANNUAL':
      return 'Annual Exam';
    case 'PRACTICAL':
      return 'Practical Assessment';
    case 'FINAL':
      return 'Final Examination';
    case 'OTHER':
      return 'Assessment';
    default:
      return examType
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatMarksNumber(val?: number | null): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return '—';
  }
  const num = Number(val);
  return Number.isInteger(num)
    ? String(num)
    : num.toFixed(1).replace(/\.0$/, '');
}

export function getCategoryBadgeMeta(category: ExamDisplayCategory): {
  label: string;
  tone: BadgeTone;
} {
  switch (category) {
    case 'PUBLISHED':
      return { label: 'Result Published', tone: 'success' };
    case 'AWAITING_RESULTS':
      return { label: 'Awaiting Publication', tone: 'warning' };
    case 'ONGOING':
      return { label: 'Ongoing Exam', tone: 'primary' };
    case 'UPCOMING':
    default:
      return { label: 'Upcoming Exam', tone: 'info' };
  }
}

function getTodayIsoString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function categorizeUnpublishedExam(
  exam: ExaminationResponse,
  todayIso = getTodayIsoString()
): ExamDisplayCategory {
  const statusUpper = (exam.status || '').toUpperCase();
  if (statusUpper === 'PUBLISHED') {
    return 'PUBLISHED';
  }
  if (statusUpper === 'COMPLETED') {
    return 'AWAITING_RESULTS';
  }
  const start = exam.startDate ? exam.startDate.slice(0, 10) : null;
  const end = exam.endDate ? exam.endDate.slice(0, 10) : null;

  if (end && end < todayIso) {
    return 'AWAITING_RESULTS';
  }
  if (
    statusUpper === 'IN_PROGRESS' ||
    (start && end && todayIso >= start && todayIso <= end)
  ) {
    return 'ONGOING';
  }
  return 'UPCOMING';
}

export function buildUnifiedExamItems(
  data: ParentChildExaminationsResponse | null | undefined
): UnifiedParentExamItem[] {
  if (!data) return [];

  const todayIso = getTodayIsoString();
  const examById = new Map<number, ExaminationResponse>();

  for (const exam of data.upcomingExaminations ?? []) {
    if ((exam.status || '').toUpperCase() === 'DRAFT') {
      continue;
    }
    examById.set(exam.id, exam);
  }

  const publishedMap = new Map<number, ReportCardResponse>();
  for (const card of data.publishedResults ?? []) {
    publishedMap.set(card.examinationId, card);
  }

  const unified: UnifiedParentExamItem[] = [];
  const handledIds = new Set<number>();

  for (const card of data.publishedResults ?? []) {
    const matchingExam = examById.get(card.examinationId);
    handledIds.add(card.examinationId);

    unified.push({
      examinationId: card.examinationId,
      examinationName: card.examinationName,
      examType: card.examType,
      rawStatus: card.examinationStatus || 'PUBLISHED',
      category: 'PUBLISHED',
      academicSessionId: card.academicSessionId,
      academicSessionName:
        card.academicSessionName ?? data.academicSessionName ?? null,
      classId: card.classId,
      className: card.className ?? data.className ?? null,
      startDate: matchingExam?.startDate ?? null,
      endDate: matchingExam?.endDate ?? null,
      instructions: matchingExam?.instructions ?? null,
      gradingScaleName: matchingExam?.gradingScaleName ?? null,
      publishedAt: matchingExam?.publishedAt ?? null,
      schedules: matchingExam?.schedules ?? [],
      reportCard: card,
    });
  }

  for (const exam of data.upcomingExaminations ?? []) {
    const statusUpper = (exam.status || '').toUpperCase();
    if (statusUpper === 'DRAFT' || handledIds.has(exam.id)) {
      continue;
    }
    const existingReport = publishedMap.get(exam.id) ?? null;
    const category = existingReport
      ? 'PUBLISHED'
      : categorizeUnpublishedExam(exam, todayIso);

    unified.push({
      examinationId: exam.id,
      examinationName: exam.name,
      examType: exam.examType,
      rawStatus: exam.status,
      category,
      academicSessionId: exam.academicSessionId,
      academicSessionName:
        exam.academicSessionName ?? data.academicSessionName ?? null,
      classId: exam.classId,
      className: exam.className ?? data.className ?? null,
      startDate: exam.startDate ?? null,
      endDate: exam.endDate ?? null,
      instructions: exam.instructions ?? null,
      gradingScaleName: exam.gradingScaleName ?? null,
      publishedAt: exam.publishedAt ?? null,
      schedules: exam.schedules ?? [],
      reportCard: existingReport,
    });
  }

  const categoryRank: Record<ExamDisplayCategory, number> = {
    PUBLISHED: 0,
    ONGOING: 1,
    AWAITING_RESULTS: 2,
    UPCOMING: 3,
  };

  return unified.sort((a, b) => {
    const rankDiff = categoryRank[a.category] - categoryRank[b.category];
    if (rankDiff !== 0) return rankDiff;
    if (a.category === 'PUBLISHED' && b.category === 'PUBLISHED') {
      return b.examinationId - a.examinationId;
    }
    if (a.startDate && b.startDate && a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return b.examinationId - a.examinationId;
  });
}

export function filterUnifiedExamItems(
  items: UnifiedParentExamItem[],
  statusFilter: ExamStatusFilter,
  selectedExamType: string,
  searchQuery: string
): UnifiedParentExamItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (statusFilter === 'PUBLISHED' && item.category !== 'PUBLISHED') {
      return false;
    }
    if (
      statusFilter === 'AWAITING_RESULTS' &&
      item.category !== 'AWAITING_RESULTS'
    ) {
      return false;
    }
    if (
      statusFilter === 'UPCOMING' &&
      item.category !== 'UPCOMING' &&
      item.category !== 'ONGOING'
    ) {
      return false;
    }

    if (
      selectedExamType !== 'ALL' &&
      item.examType.toUpperCase() !== selectedExamType.toUpperCase()
    ) {
      return false;
    }

    if (normalizedQuery.length > 0) {
      const nameMatch = item.examinationName
        .toLowerCase()
        .includes(normalizedQuery);
      const typeMatch = formatExamTypeLabel(item.examType)
        .toLowerCase()
        .includes(normalizedQuery);
      const gradeMatch = (item.reportCard?.overallGrade ?? '')
        .toLowerCase()
        .includes(normalizedQuery);
      const subjectMarkMatch = (item.reportCard?.subjectMarks ?? []).some(
        (m) =>
          m.subjectName.toLowerCase().includes(normalizedQuery) ||
          (m.subjectCode ?? '').toLowerCase().includes(normalizedQuery)
      );
      const scheduleMatch = (item.schedules ?? []).some(
        (s) =>
          s.subjectName.toLowerCase().includes(normalizedQuery) ||
          (s.subjectCode ?? '').toLowerCase().includes(normalizedQuery)
      );

      if (
        !nameMatch &&
        !typeMatch &&
        !gradeMatch &&
        !subjectMarkMatch &&
        !scheduleMatch
      ) {
        return false;
      }
    }

    return true;
  });
}

export function ExaminationOverviewSummaryCard({
  items,
  activeStatusFilter,
  onSelectStatusFilter,
  onOpenReportCard,
}: {
  items: UnifiedParentExamItem[];
  activeStatusFilter: ExamStatusFilter;
  onSelectStatusFilter: (filter: ExamStatusFilter) => void;
  onOpenReportCard: (item: UnifiedParentExamItem) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const counts = useMemo(() => {
    let published = 0;
    let awaiting = 0;
    let upcoming = 0;

    for (const item of items) {
      if (item.category === 'PUBLISHED') published += 1;
      else if (item.category === 'AWAITING_RESULTS') awaiting += 1;
      else upcoming += 1;
    }

    return {
      all: items.length,
      published,
      awaiting,
      upcoming,
    };
  }, [items]);

  const latestPublishedItem = useMemo(
    () => items.find((i) => i.category === 'PUBLISHED' && i.reportCard) ?? null,
    [items]
  );

  const filterTiles: Array<{
    key: ExamStatusFilter;
    label: string;
    count: number;
    accentColor: string;
    bgTint: string;
  }> = [
    {
      key: 'ALL',
      label: 'All Exams',
      count: counts.all,
      accentColor: colors.primary,
      bgTint: colors.primarySoft,
    },
    {
      key: 'PUBLISHED',
      label: 'Published',
      count: counts.published,
      accentColor: colors.success,
      bgTint: colors.successSoft,
    },
    {
      key: 'AWAITING_RESULTS',
      label: 'Awaiting',
      count: counts.awaiting,
      accentColor: colors.warning,
      bgTint: colors.warningSoft,
    },
    {
      key: 'UPCOMING',
      label: 'Upcoming',
      count: counts.upcoming,
      accentColor: colors.info,
      bgTint: colors.infoSoft,
    },
  ];

  return (
    <SurfaceCard style={{ marginBottom: spacing.md }}>
      <View style={styles.summaryHeaderRow}>
        <View style={styles.summaryTitleCluster}>
          <View
            style={[
              styles.summaryIconBox,
              {
                backgroundColor: colors.warningSoft,
                borderRadius: radius.md,
                marginRight: spacing.sm,
              },
            ]}
          >
            <GraduationCap size={iconSizes.md} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Examination & Result Summary
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              Tap a status bucket below to filter exams & published report cards
            </Text>
          </View>
        </View>
      </View>

      {latestPublishedItem && latestPublishedItem.reportCard ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View latest published result for ${latestPublishedItem.examinationName}`}
          onPress={() => onOpenReportCard(latestPublishedItem)}
          style={({ pressed }) => [
            styles.latestSpotlightBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: latestPublishedItem.reportCard?.overallPassed
                ? colors.success
                : colors.warning,
              borderRadius: radius.md,
              padding: spacing.md,
              marginTop: spacing.md,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={styles.spotlightTopRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: spacing.xs,
                }}
              >
                <StatusBadge label="Latest Published Result" tone="success" />
                <StatusBadge
                  label={formatExamTypeLabel(latestPublishedItem.examType)}
                  tone="neutral"
                />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: spacing.xs,
                }}
              >
                {latestPublishedItem.examinationName}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                Marks:{' '}
                {formatMarksNumber(
                  latestPublishedItem.reportCard.totalObtainedMarks
                )}{' '}
                /{' '}
                {formatMarksNumber(latestPublishedItem.reportCard.totalMaxMarks)}{' '}
                {latestPublishedItem.reportCard.overallGrade
                  ? `• Grade ${latestPublishedItem.reportCard.overallGrade}`
                  : ''}
              </Text>
            </View>

            <View
              style={[
                styles.percentageScoreCircle,
                {
                  backgroundColor: latestPublishedItem.reportCard.overallPassed
                    ? colors.successSoft
                    : colors.dangerSoft,
                  borderColor: latestPublishedItem.reportCard.overallPassed
                    ? colors.success
                    : colors.danger,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: latestPublishedItem.reportCard.overallPassed
                    ? colors.success
                    : colors.danger,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {Number(latestPublishedItem.reportCard.percentage ?? 0).toFixed(
                  1
                )}
                %
              </Text>
              <Text
                style={{
                  color: latestPublishedItem.reportCard.overallPassed
                    ? colors.success
                    : colors.danger,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.bold,
                  textTransform: 'uppercase',
                  marginTop: 1,
                }}
              >
                {latestPublishedItem.reportCard.overallPassed
                  ? 'PASSED'
                  : 'NEEDS REVIEW'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.spotlightFooterRow,
              {
                borderTopColor: colors.borderSubtle,
                marginTop: spacing.sm,
                paddingTop: spacing.xs,
              },
            ]}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              View Subject-Wise Marks & Official Report Card
            </Text>
            <ChevronRight size={iconSizes.sm} color={colors.primary} />
          </View>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.bucketGrid,
          { marginTop: spacing.md, gap: spacing.xs },
        ]}
      >
        {filterTiles.map((tile) => {
          const isSelected = activeStatusFilter === tile.key;
          return (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${tile.label}: ${tile.count} examinations`}
              onPress={() => onSelectStatusFilter(tile.key)}
              style={({ pressed }) => [
                styles.bucketTile,
                {
                  backgroundColor: isSelected
                    ? tile.bgTint
                    : colors.surfaceMuted,
                  borderColor: isSelected ? tile.accentColor : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: tile.accentColor,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {tile.count}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: isSelected
                    ? colors.textPrimary
                    : colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                  marginTop: 2,
                }}
              >
                {tile.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

export function ExaminationFilterSection({
  searchQuery,
  onChangeSearchQuery,
  selectedExamType,
  onChangeExamType,
  examTypeOptions,
  activeStatusFilter,
  onResetFilters,
}: {
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  selectedExamType: string;
  onChangeExamType: (type: string) => void;
  examTypeOptions: SelectOption<string>[];
  activeStatusFilter: ExamStatusFilter;
  onResetFilters: () => void;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  const hasActiveFilters =
    activeStatusFilter !== 'ALL' ||
    selectedExamType !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <SurfaceCard style={{ marginBottom: spacing.md }}>
      <AppInput
        label="Search Examinations or Subjects"
        placeholder="Search by exam title, subject name, or code..."
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        leftIcon={<Search size={iconSizes.sm} color={colors.textMuted} />}
        containerStyle={{ marginBottom: spacing.sm }}
      />

      {examTypeOptions.length > 1 ? (
        <PickerField<string>
          label="Examination Type"
          options={examTypeOptions}
          value={selectedExamType}
          onChange={onChangeExamType}
        />
      ) : null}

      {hasActiveFilters ? (
        <View
          style={[
            styles.activeFilterFooter,
            {
              borderTopColor: colors.borderSubtle,
              marginTop: spacing.sm,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              flex: 1,
            }}
          >
            Showing filtered examinations
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onResetFilters}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              paddingVertical: 4,
              paddingHorizontal: spacing.xs,
            })}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Reset Filters
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

function PublishedExamResultCard({
  item,
  sectionName,
  onSelectExam,
}: {
  item: UnifiedParentExamItem;
  sectionName?: string | null;
  onSelectExam: (item: UnifiedParentExamItem) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const report = item.reportCard;
  if (!report) return null;

  const pct = Math.max(0, Math.min(100, Number(report.percentage ?? 0)));
  const subjectMarks = report.subjectMarks ?? [];
  const passedCount = subjectMarks.filter((m) => m.passed).length;

  return (
    <SurfaceCard
      onPress={() => onSelectExam(item)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
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
              label={formatExamTypeLabel(item.examType)}
              tone="neutral"
            />
            {report.overallGrade ? (
              <StatusBadge
                label={`Grade ${report.overallGrade}`}
                tone={report.overallPassed ? 'primary' : 'warning'}
              />
            ) : null}
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.xs,
            }}
          >
            {item.examinationName}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {[
              report.className
                ? `${report.className}${sectionName ? ` • ${sectionName}` : ''}`
                : null,
              report.academicSessionName,
              item.startDate
                ? formatExamDateRange(item.startDate, item.endDate)
                : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>

        <View
          style={[
            styles.cardScorePill,
            {
              backgroundColor: report.overallPassed
                ? colors.successSoft
                : colors.dangerSoft,
              borderColor: report.overallPassed
                ? colors.success
                : colors.danger,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text
            style={{
              color: report.overallPassed ? colors.success : colors.danger,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {pct.toFixed(1)}%
          </Text>
          <Text
            style={{
              color: report.overallPassed ? colors.success : colors.danger,
              fontSize: 10,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
            }}
          >
            {report.overallPassed ? 'PASSED' : 'FAILED'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.metricsStrip,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.sm,
            padding: spacing.sm,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricColumn}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: typography.fontWeights.semibold,
              }}
            >
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

          <View style={styles.metricColumn}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              Overall Grade
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginTop: 2,
              }}
            >
              {report.overallGrade || '—'}
            </Text>
          </View>

          <View style={styles.metricColumn}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: typography.fontWeights.semibold,
              }}
            >
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
              {subjectMarks.length > 0
                ? `${passedCount} / ${subjectMarks.length}`
                : 'View Details'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: colors.borderSubtle,
              borderRadius: radius.full,
              marginTop: spacing.sm,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct}%`,
                backgroundColor: report.overallPassed
                  ? colors.success
                  : colors.danger,
                borderRadius: radius.full,
              },
            ]}
          />
        </View>
      </View>

      {subjectMarks.length > 0 ? (
        <View
          style={[
            styles.subjectChipsWrap,
            { marginTop: spacing.sm, gap: spacing.xs },
          ]}
        >
          {subjectMarks.slice(0, 4).map((mark) => (
            <View
              key={mark.id || mark.subjectId}
              style={[
                styles.subjectChip,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {mark.subjectName}:{' '}
                {mark.entryStatus === 'ABSENT'
                  ? 'Absent'
                  : mark.entryStatus === 'EXEMPTED'
                  ? 'Exempted'
                  : `${formatMarksNumber(mark.marksObtained)}/${formatMarksNumber(
                      mark.maxMarks
                    )}`}
                {mark.grade ? ` (${mark.grade})` : ''}
              </Text>
            </View>
          ))}
          {subjectMarks.length > 4 ? (
            <View
              style={[
                styles.subjectChip,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                +{subjectMarks.length - 4} more
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.cardActionRow,
          {
            borderTopColor: colors.borderSubtle,
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Award
            size={iconSizes.sm}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            View Subject Marks & Official Report Card
          </Text>
        </View>
        <ChevronRight size={iconSizes.sm} color={colors.primary} />
      </View>
    </SurfaceCard>
  );
}

function UnpublishedExamCard({
  item,
  sectionName,
  onSelectExam,
}: {
  item: UnifiedParentExamItem;
  sectionName?: string | null;
  onSelectExam: (item: UnifiedParentExamItem) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const badgeMeta = getCategoryBadgeMeta(item.category);
  const schedules = item.schedules ?? [];
  const isAwaiting = item.category === 'AWAITING_RESULTS';

  return (
    <SurfaceCard
      onPress={() => onSelectExam(item)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
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
              label={formatExamTypeLabel(item.examType)}
              tone="neutral"
            />
            {schedules.length > 0 ? (
              <StatusBadge
                label={`${schedules.length} ${
                  schedules.length === 1 ? 'Subject' : 'Subjects'
                }`}
                tone="info"
              />
            ) : null}
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
              marginTop: spacing.xs,
            }}
          >
            {item.examinationName}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {[
              item.className
                ? `${item.className}${sectionName ? ` • ${sectionName}` : ''}`
                : null,
              item.academicSessionName,
              item.gradingScaleName ? `Scale: ${item.gradingScaleName}` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.dateStripRow,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.sm,
            padding: spacing.sm,
            marginTop: spacing.sm,
          },
        ]}
      >
        <Calendar
          size={iconSizes.sm}
          color={colors.primary}
          style={{ marginRight: spacing.xs }}
        />
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.semibold,
            flex: 1,
          }}
        >
          Exam Dates: {formatExamDateRange(item.startDate, item.endDate)}
        </Text>
      </View>

      {isAwaiting ? (
        <View
          style={[
            styles.awaitingNoticeBox,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warning,
              borderRadius: radius.sm,
              padding: spacing.sm,
              marginTop: spacing.sm,
            },
          ]}
        >
          <Clock
            size={iconSizes.sm}
            color={colors.warning}
            style={{ marginRight: spacing.xs, marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Results Not Yet Published
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              This examination has concluded. Subject-wise marks, grades, and
              the official report card will appear here once published by the
              school.
            </Text>
          </View>
        </View>
      ) : schedules.length > 0 ? (
        <View
          style={[
            styles.subjectChipsWrap,
            { marginTop: spacing.sm, gap: spacing.xs },
          ]}
        >
          {schedules.slice(0, 3).map((sched) => (
            <View
              key={sched.id}
              style={[
                styles.subjectChip,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {sched.subjectName} • {formatExamDate(sched.examDate)}
              </Text>
            </View>
          ))}
          {schedules.length > 3 ? (
            <View
              style={[
                styles.subjectChip,
                {
                  backgroundColor: colors.infoSoft,
                  borderColor: colors.info,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 4,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.info,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                +{schedules.length - 3} more papers
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.cardActionRow,
          {
            borderTopColor: colors.borderSubtle,
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FileText
            size={iconSizes.sm}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {isAwaiting
              ? 'View Examination Details & Schedule'
              : 'View Subject Timetable & Instructions'}
          </Text>
        </View>
        <ChevronRight size={iconSizes.sm} color={colors.primary} />
      </View>
    </SurfaceCard>
  );
}

export function ExaminationListSection({
  items,
  totalOriginalCount,
  sectionName,
  onSelectExam,
  onResetFilters,
}: {
  items: UnifiedParentExamItem[];
  totalOriginalCount: number;
  sectionName?: string | null;
  onSelectExam: (item: UnifiedParentExamItem) => void;
  onResetFilters: () => void;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  if (totalOriginalCount === 0) {
    return (
      <EmptyState
        icon={<GraduationCap size={iconSizes.xl} color={colors.primary} />}
        title="No Examinations Scheduled Yet"
        description="No upcoming examinations or published report card results are recorded for this student in the selected academic session."
        style={{ marginBottom: spacing.md }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={iconSizes.xl} color={colors.primary} />}
        title="No Matching Examinations"
        description="No examinations or results match your active status, exam type, or search filter."
        actionLabel="Reset Filters"
        onActionPress={onResetFilters}
        style={{ marginBottom: spacing.md }}
      />
    );
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.semibold,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          Examinations & Report Cards ({items.length})
        </Text>
      </View>

      {items.map((item) =>
        item.category === 'PUBLISHED' && item.reportCard ? (
          <PublishedExamResultCard
            key={`pub-${item.examinationId}`}
            item={item}
            sectionName={sectionName}
            onSelectExam={onSelectExam}
          />
        ) : (
          <UnpublishedExamCard
            key={`unpub-${item.examinationId}`}
            item={item}
            sectionName={sectionName}
            onSelectExam={onSelectExam}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestSpotlightBox: {
    borderWidth: 1,
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentageScoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 78,
  },
  spotlightFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bucketTile: {
    flex: 1,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardScorePill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 68,
  },
  metricsStrip: {
    width: '100%',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricColumn: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  subjectChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectChip: {
    borderWidth: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  dateStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  awaitingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
});

export {
  ExaminationResultDetailSheetModal,
  ExaminationScheduleDetailSheetModal,
} from './ParentExaminationDetailSheets';











