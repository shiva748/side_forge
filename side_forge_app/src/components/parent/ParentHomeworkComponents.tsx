import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Info,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import {
  parentPortalApi,
  type AuthorizedAttachmentDownloadResult,
} from '@/api/parentPortalApi';
import type {
  HomeworkSubmissionStatus,
  ParentChildHomeworkDetailResponse,
  StoredFileResponse,
  StudentHomeworkDashboardResponse,
  StudentHomeworkSubmissionResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  AppInput,
  type BadgeTone,
  BottomSheetModal,
  EmptyState,
  FeedbackBanner,
  PickerField,
  type SelectOption,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export type HomeworkStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'OVERDUE'
  | 'SUBMITTED'
  | 'EVALUATED';

export type HomeworkSortAndWindowOption =
  | 'PRIORITY'
  | 'DUE_THIS_WEEK'
  | 'OVERDUE_ONLY'
  | 'DUE_LATEST'
  | 'RECENTLY_ASSIGNED';

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

export function formatHomeworkDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return `${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  return dateStr;
}

export function formatHomeworkDateTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) {
    return formatHomeworkDate(isoStr);
  }
  const day = dt.getDate();
  const mon = SHORT_MONTHS[dt.getMonth()];
  const year = dt.getFullYear();
  const hours = dt.getHours();
  const mins = String(dt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hr12 = hours % 12 || 12;
  return `${day} ${mon} ${year}, ${hr12}:${mins} ${ampm}`;
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return '';
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function getFileTypeBadgeLabel(
  contentType?: string | null,
  filename?: string | null
): string {
  const ct = (contentType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  if (ct.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp)$/.test(name)) {
    return 'IMAGE';
  }
  if (ct.includes('pdf') || name.endsWith('.pdf')) {
    return 'PDF';
  }
  if (
    ct.includes('word') ||
    ct.includes('document') ||
    /\.(doc|docx|odt|rtf)$/.test(name)
  ) {
    return 'DOC';
  }
  if (
    ct.includes('sheet') ||
    ct.includes('excel') ||
    ct.includes('csv') ||
    /\.(xls|xlsx|csv)$/.test(name)
  ) {
    return 'SHEET';
  }
  if (ct.startsWith('text/') || /\.(txt|md|json)$/.test(name)) {
    return 'TEXT';
  }
  return 'FILE';
}

export function getHomeworkStatusMeta(status: HomeworkSubmissionStatus): {
  label: string;
  shortLabel: string;
  tone: BadgeTone;
} {
  switch (status) {
    case 'EVALUATED':
      return {
        label: 'Evaluated',
        shortLabel: 'Evaluated',
        tone: 'success',
      };
    case 'SUBMITTED':
      return {
        label: 'Submitted · Pending Evaluation',
        shortLabel: 'Submitted',
        tone: 'info',
      };
    case 'OVERDUE':
      return {
        label: 'Overdue · Not Submitted',
        shortLabel: 'Overdue',
        tone: 'danger',
      };
    case 'PENDING':
    default:
      return {
        label: 'Not Submitted',
        shortLabel: 'Pending',
        tone: 'warning',
      };
  }
}

function parseLocalMidnight(dateStr: string): Date | null {
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function getHomeworkDueUrgency(
  dueDateStr: string,
  status: HomeworkSubmissionStatus,
  referenceDateStr?: string | null
): {
  label: string;
  tone: BadgeTone;
  daysFromRef: number;
  isUrgent: boolean;
} | null {
  const dueDt = parseLocalMidnight(dueDateStr);
  if (!dueDt) return null;

  const refDt =
    (referenceDateStr ? parseLocalMidnight(referenceDateStr) : null) ??
    (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    })();

  const diffDays = Math.round(
    (dueDt.getTime() - refDt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (status === 'EVALUATED' || status === 'SUBMITTED') {
    return null;
  }

  if (status === 'OVERDUE' || diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label:
        overdueDays <= 0
          ? 'Past due date'
          : overdueDays === 1
          ? 'Overdue by 1 day'
          : `Overdue by ${overdueDays} days`,
      tone: 'danger',
      daysFromRef: diffDays,
      isUrgent: true,
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Due today',
      tone: 'warning',
      daysFromRef: 0,
      isUrgent: true,
    };
  }

  if (diffDays === 1) {
    return {
      label: 'Due tomorrow',
      tone: 'warning',
      daysFromRef: 1,
      isUrgent: true,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `Due in ${diffDays} days`,
      tone: 'warning',
      daysFromRef: diffDays,
      isUrgent: false,
    };
  }

  return {
    label: `Due in ${diffDays} days`,
    tone: 'neutral',
    daysFromRef: diffDays,
    isUrgent: false,
  };
}

export function filterAndSortHomeworkItems(
  items: StudentHomeworkSubmissionResponse[],
  filters: {
    statusFilter: HomeworkStatusFilter;
    subjectId: number | 'ALL';
    sortAndWindow: HomeworkSortAndWindowOption;
    searchQuery: string;
    referenceDateStr?: string | null;
  }
): StudentHomeworkSubmissionResponse[] {
  const {
    statusFilter,
    subjectId,
    sortAndWindow,
    searchQuery,
    referenceDateStr,
  } = filters;
  const query = searchQuery.trim().toLowerCase();

  const refDt =
    (referenceDateStr ? parseLocalMidnight(referenceDateStr) : null) ??
    (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    })();

  const filtered = items.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (subjectId !== 'ALL' && item.subjectId !== subjectId) {
      return false;
    }
    if (sortAndWindow === 'OVERDUE_ONLY') {
      const dueDt = parseLocalMidnight(item.dueDate);
      const isPastDue = dueDt ? dueDt.getTime() < refDt.getTime() : false;
      if (
        item.status !== 'OVERDUE' &&
        !(item.status === 'PENDING' && isPastDue)
      ) {
        return false;
      }
    } else if (sortAndWindow === 'DUE_THIS_WEEK') {
      const dueDt = parseLocalMidnight(item.dueDate);
      if (!dueDt) return false;
      const diffDays = Math.round(
        (dueDt.getTime() - refDt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0 || diffDays > 7) {
        return false;
      }
    }

    if (query.length > 0) {
      const haystack = [
        item.homeworkTitle,
        item.homeworkDescription,
        item.subjectName,
        item.teacherName,
        item.className,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const statusPriority: Record<HomeworkSubmissionStatus, number> = {
    OVERDUE: 0,
    PENDING: 1,
    SUBMITTED: 2,
    EVALUATED: 3,
  };

  return [...filtered].sort((a, b) => {
    const dueA = parseLocalMidnight(a.dueDate)?.getTime() ?? 0;
    const dueB = parseLocalMidnight(b.dueDate)?.getTime() ?? 0;
    const assignedA = parseLocalMidnight(a.assignedDate)?.getTime() ?? 0;
    const assignedB = parseLocalMidnight(b.assignedDate)?.getTime() ?? 0;

    if (sortAndWindow === 'DUE_LATEST') {
      if (dueB !== dueA) return dueB - dueA;
      return assignedB - assignedA;
    }
    if (sortAndWindow === 'RECENTLY_ASSIGNED') {
      if (assignedB !== assignedA) return assignedB - assignedA;
      return dueA - dueB;
    }
    // PRIORITY, DUE_THIS_WEEK, OVERDUE_ONLY
    const prioDiff =
      (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
    if (prioDiff !== 0) return prioDiff;
    if (dueA !== dueB) return dueA - dueB;
    return assignedB - assignedA;
  });
}

export interface HomeworkSummaryOverviewCardProps {
  dashboard: StudentHomeworkDashboardResponse | null;
  activeStatusFilter: HomeworkStatusFilter;
  onSelectStatusFilter: (filter: HomeworkStatusFilter) => void;
  academicSessionName?: string | null;
}

export function HomeworkSummaryOverviewCard({
  dashboard,
  activeStatusFilter,
  onSelectStatusFilter,
  academicSessionName,
}: HomeworkSummaryOverviewCardProps) {
  const { colors, spacing, radius, typography, iconSizes } = useAppTheme();

  const totalCount = dashboard?.totalAssignedCount ?? 0;
  const pendingCount = dashboard?.pendingCount ?? 0;
  const overdueCount = dashboard?.overdueCount ?? 0;
  const submittedCount = dashboard?.submittedCount ?? 0;
  const evaluatedCount = dashboard?.evaluatedCount ?? 0;

  const statusBuckets: {
    key: HomeworkStatusFilter;
    label: string;
    count: number;
    toneColor: string;
    softBg: string;
    borderCol: string;
  }[] = [
    {
      key: 'ALL',
      label: 'All',
      count: totalCount,
      toneColor: colors.primary,
      softBg: colors.primarySoft,
      borderCol: colors.primarySoftBorder,
    },
    {
      key: 'PENDING',
      label: 'Pending',
      count: pendingCount,
      toneColor: colors.warningText,
      softBg: colors.warningSoft,
      borderCol: colors.warningBorder,
    },
    {
      key: 'OVERDUE',
      label: 'Overdue',
      count: overdueCount,
      toneColor: colors.dangerText,
      softBg: colors.dangerSoft,
      borderCol: colors.dangerBorder,
    },
    {
      key: 'SUBMITTED',
      label: 'Submitted',
      count: submittedCount,
      toneColor: colors.infoText,
      softBg: colors.infoSoft,
      borderCol: colors.infoBorder,
    },
    {
      key: 'EVALUATED',
      label: 'Evaluated',
      count: evaluatedCount,
      toneColor: colors.successText,
      softBg: colors.successSoft,
      borderCol: colors.successBorder,
    },
  ];

  return (
    <SurfaceCard style={{ marginBottom: spacing.md }}>
      <View style={[styles.headerRow, { marginBottom: spacing.sm }]}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.infoSoft,
                borderRadius: radius.sm,
                marginRight: spacing.xs,
              },
            ]}
          >
            <FileSpreadsheet size={iconSizes.sm} color={colors.infoText} />
          </View>
          <View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Homework Overview
            </Text>
            {academicSessionName ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 1,
                }}
              >
                Session {academicSessionName}
              </Text>
            ) : null}
          </View>
        </View>
        <StatusBadge
          label={`${totalCount} Assigned`}
          tone={totalCount > 0 ? 'primary' : 'neutral'}
        />
      </View>

      <View style={[styles.bucketGrid, { gap: spacing.xs }]}>
        {statusBuckets.map((bucket) => {
          const isSelected = activeStatusFilter === bucket.key;
          return (
            <Pressable
              key={bucket.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${bucket.label}: ${bucket.count} assignments`}
              onPress={() => onSelectStatusFilter(bucket.key)}
              style={({ pressed }) => [
                styles.bucketCell,
                {
                  backgroundColor: isSelected
                    ? bucket.softBg
                    : pressed
                    ? colors.surfaceInteractivePressed
                    : colors.surfaceMuted,
                  borderColor: isSelected ? bucket.borderCol : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs + 2,
                  paddingHorizontal: spacing.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: bucket.toneColor,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {bucket.count}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: isSelected ? bucket.toneColor : colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: isSelected
                    ? typography.fontWeights.semibold
                    : typography.fontWeights.medium,
                  marginTop: 2,
                }}
              >
                {bucket.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {overdueCount > 0 || pendingCount > 0 ? (
        <View
          style={[
            styles.attentionCallout,
            {
              backgroundColor:
                overdueCount > 0 ? colors.dangerSoft : colors.warningSoft,
              borderColor:
                overdueCount > 0 ? colors.dangerBorder : colors.warningBorder,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs + 2,
              marginTop: spacing.sm,
            },
          ]}
        >
          {overdueCount > 0 ? (
            <AlertTriangle size={iconSizes.sm} color={colors.dangerText} />
          ) : (
            <Clock size={iconSizes.sm} color={colors.warningText} />
          )}
          <Text
            style={{
              flex: 1,
              color: overdueCount > 0 ? colors.dangerText : colors.warningText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              marginLeft: spacing.xs,
            }}
          >
            {overdueCount > 0 && pendingCount > 0
              ? `${overdueCount} overdue and ${pendingCount} pending homework assignment${
                  pendingCount === 1 ? '' : 's'
                } require attention.`
              : overdueCount > 0
              ? `${overdueCount} homework assignment${
                  overdueCount === 1 ? ' is' : 's are'
                } past the submission due date.`
              : `${pendingCount} homework assignment${
                  pendingCount === 1 ? ' is' : 's are'
                } pending submission.`}
          </Text>
        </View>
      ) : totalCount > 0 ? (
        <View
          style={[
            styles.attentionCallout,
            {
              backgroundColor: colors.successSoft,
              borderColor: colors.successBorder,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs + 2,
              marginTop: spacing.sm,
            },
          ]}
        >
          <CheckCircle2 size={iconSizes.sm} color={colors.successText} />
          <Text
            style={{
              flex: 1,
              color: colors.successText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
              marginLeft: spacing.xs,
            }}
          >
            All assigned homework has been submitted or evaluated.
          </Text>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

export const HomeworkOverviewSummaryCard = HomeworkSummaryOverviewCard;

export interface HomeworkFilterAndSearchSectionProps {
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  selectedSubjectId: number | 'ALL';
  onChangeSubjectId: (value: number | 'ALL') => void;
  subjectOptions: SelectOption<number | 'ALL'>[];
  sortAndWindow: HomeworkSortAndWindowOption;
  onChangeSortAndWindow: (value: HomeworkSortAndWindowOption) => void;
  activeStatusFilter: HomeworkStatusFilter;
  onResetAllFilters: () => void;
}

export function HomeworkFilterAndSearchSection({
  searchQuery,
  onChangeSearchQuery,
  selectedSubjectId,
  onChangeSubjectId,
  subjectOptions,
  sortAndWindow,
  onChangeSortAndWindow,
  activeStatusFilter,
  onResetAllFilters,
}: HomeworkFilterAndSearchSectionProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const sortOptions: SelectOption<HomeworkSortAndWindowOption>[] = [
    {
      value: 'PRIORITY',
      label: 'Priority & Soonest Due',
      subtitle: 'Overdue & upcoming deadlines first',
    },
    {
      value: 'DUE_THIS_WEEK',
      label: 'Due Within 7 Days',
      subtitle: 'Show assignments due over the next week',
    },
    {
      value: 'OVERDUE_ONLY',
      label: 'Overdue Deadlines Only',
      subtitle: 'Show assignments past their due date',
    },
    {
      value: 'DUE_LATEST',
      label: 'Due Date (Latest First)',
      subtitle: 'Sort by furthest due date to earliest',
    },
    {
      value: 'RECENTLY_ASSIGNED',
      label: 'Recently Assigned',
      subtitle: 'Sort by newest assigned date first',
    },
  ];

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedSubjectId !== 'ALL' ||
    sortAndWindow !== 'PRIORITY' ||
    activeStatusFilter !== 'ALL';

  return (
    <SurfaceCard style={{ marginBottom: spacing.md }}>
      <AppInput
        placeholder="Search by homework title, subject, or teacher..."
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        isSearch
        onClearSearch={() => onChangeSearchQuery('')}
        containerStyle={{ marginBottom: spacing.sm }}
      />

      <View style={[styles.filterDropdownRow, { gap: spacing.xs }]}>
        <View style={{ flex: 1 }}>
          <PickerField<number | 'ALL'>
            label="Subject"
            options={subjectOptions}
            value={selectedSubjectId}
            onChange={onChangeSubjectId}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PickerField<HomeworkSortAndWindowOption>
            label="Due Date & Sort"
            options={sortOptions}
            value={sortAndWindow}
            onChange={onChangeSortAndWindow}
          />
        </View>
      </View>

      {hasActiveFilters ? (
        <View
          style={[
            styles.activeFilterFooter,
            {
              marginTop: spacing.xs + 2,
              paddingTop: spacing.xs,
              borderTopColor: colors.separator,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
            }}
          >
            Filters applied
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all homework filters"
            hitSlop={6}
            onPress={onResetAllFilters}
            style={({ pressed }) => [
              styles.clearFilterBtn,
              {
                backgroundColor: pressed
                  ? colors.surfaceInteractivePressed
                  : colors.primarySoft,
                borderRadius: radius.full,
                paddingHorizontal: spacing.xs + 4,
                paddingVertical: 4,
              },
            ]}
          >
            <RefreshCw size={12} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginLeft: 4,
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
export interface HomeworkAssignmentListSectionProps {
  assignments: StudentHomeworkSubmissionResponse[];
  totalOriginalCount: number;
  referenceDate?: string | null;
  onSelectAssignment: (item: StudentHomeworkSubmissionResponse) => void;
  onResetFilters: () => void;
}

const PAGE_SIZE = 15;

export function HomeworkAssignmentListSection({
  assignments,
  totalOriginalCount,
  referenceDate,
  onSelectAssignment,
  onResetFilters,
}: HomeworkAssignmentListSectionProps) {
  const { colors, spacing, radius, typography, iconSizes } = useAppTheme();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleItems = useMemo(
    () => assignments.slice(0, visibleCount),
    [assignments, visibleCount]
  );

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.sectionHeaderRow,
          { marginBottom: spacing.sm, paddingHorizontal: 2 },
        ]}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Assignments ({assignments.length})
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSizes.xs,
          }}
        >
          Tap an item to view details
        </Text>
      </View>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={iconSizes.lg} color={colors.textMuted} />}
          title={
            totalOriginalCount === 0
              ? 'No Homework Assigned Yet'
              : 'No Matching Homework Found'
          }
          description={
            totalOriginalCount === 0
              ? 'When teachers publish homework assignments for your child’s class, they will appear here with deadlines and submission statuses.'
              : 'No homework assignments match the selected filters or search query.'
          }
          actionLabel={
            totalOriginalCount > 0 ? 'Reset Filters' : undefined
          }
          onActionPress={
            totalOriginalCount > 0 ? onResetFilters : undefined
          }
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visibleItems.map((item) => {
            const statusMeta = getHomeworkStatusMeta(item.status);
            const urgency = getHomeworkDueUrgency(
              item.dueDate,
              item.status,
              referenceDate
            );
            const teacherRefCount = item.referenceAttachments?.length ?? 0;
            const studentSubCount = item.submissionAttachments?.length ?? 0;
            const totalAttachments = teacherRefCount + studentSubCount;
            const hasScore =
              item.marksAwarded !== null && item.marksAwarded !== undefined;
            const hasFeedback = Boolean(item.teacherFeedback?.trim());

            return (
              <SurfaceCard
                key={`${item.homeworkId}-${item.submissionId ?? 'pending'}`}
                onPress={() => onSelectAssignment(item)}
              >
                <View
                  style={[
                    styles.cardTopRow,
                    { marginBottom: spacing.xs + 2, gap: spacing.xs },
                  ]}
                >
                  <View style={styles.cardBadgeRow}>
                    <StatusBadge
                      label={item.subjectName || 'Subject'}
                      tone="primary"
                    />
                    {totalAttachments > 0 ? (
                      <View
                        style={[
                          styles.attachmentPill,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                            borderRadius: radius.full,
                            paddingHorizontal: spacing.xs + 2,
                            paddingVertical: 2,
                            marginLeft: spacing.xxs + 2,
                          },
                        ]}
                      >
                        <Paperclip size={11} color={colors.textSecondary} />
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: typography.fontSizes.xs,
                            fontWeight: typography.fontWeights.medium,
                            marginLeft: 3,
                          }}
                        >
                          {totalAttachments}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <StatusBadge
                    label={statusMeta.shortLabel}
                    tone={statusMeta.tone}
                  />
                </View>

                <View style={styles.titleChevronRow}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {item.homeworkTitle}
                    </Text>
                    {item.homeworkDescription ? (
                      <Text
                        numberOfLines={2}
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          marginTop: 3,
                          lineHeight: 17,
                        }}
                      >
                        {item.homeworkDescription}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
                </View>

                <View
                  style={[
                    styles.metaGridRow,
                    {
                      marginTop: spacing.sm,
                      paddingTop: spacing.xs + 2,
                      borderTopColor: colors.separator,
                      gap: spacing.xs,
                    },
                  ]}
                >
                  {item.teacherName ? (
                    <View style={styles.metaInlineItem}>
                      <User size={12} color={colors.textMuted} />
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          marginLeft: 4,
                        }}
                      >
                        {item.teacherName}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metaInlineItem}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginLeft: 4,
                      }}
                    >
                      Assigned: {formatHomeworkDate(item.assignedDate)}
                    </Text>
                  </View>

                  <View style={styles.metaInlineItem}>
                    <Clock
                      size={12}
                      color={
                        urgency?.tone === 'danger'
                          ? colors.dangerText
                          : urgency?.tone === 'warning'
                          ? colors.warningText
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={{
                        color:
                          urgency?.tone === 'danger'
                            ? colors.dangerText
                            : urgency?.tone === 'warning'
                            ? colors.warningText
                            : colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: urgency?.isUrgent
                          ? typography.fontWeights.semibold
                          : typography.fontWeights.regular,
                        marginLeft: 4,
                      }}
                    >
                      Due: {formatHomeworkDate(item.dueDate)}
                      {urgency ? ` (${urgency.label})` : ''}
                    </Text>
                  </View>
                </View>

                {item.status === 'SUBMITTED' ||
                item.status === 'EVALUATED' ||
                item.lateSubmission ||
                (item.submissionCount ?? 0) > 1 ? (
                  <View
                    style={[
                      styles.submissionFooterStrip,
                      {
                        backgroundColor:
                          item.status === 'EVALUATED'
                            ? colors.successSoft
                            : colors.surfaceMuted,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        marginTop: spacing.xs + 2,
                      },
                    ]}
                  >
                    <View style={styles.footerLeftInfo}>
                      {item.status === 'EVALUATED' ? (
                        <Award size={14} color={colors.successText} />
                      ) : (
                        <FileCheck size={14} color={colors.infoText} />
                      )}
                      <Text
                        numberOfLines={1}
                        style={{
                          color:
                            item.status === 'EVALUATED'
                              ? colors.successText
                              : colors.textSecondary,
                          fontSize: typography.fontSizes.xs,
                          fontWeight: typography.fontWeights.semibold,
                          marginLeft: 5,
                        }}
                      >
                        {item.status === 'EVALUATED'
                          ? hasScore
                            ? `Evaluated · Marks: ${item.marksAwarded}${
                                item.maxMarks ? ` / ${item.maxMarks}` : ''
                              }`
                            : 'Evaluated by Teacher'
                          : `Submitted${
                              item.submissionDate || item.submittedAt
                                ? ` on ${formatHomeworkDate(
                                    item.submissionDate || item.submittedAt
                                  )}`
                                : ''
                            } · Pending Evaluation`}
                      </Text>
                    </View>

                    <View style={styles.footerBadges}>
                      {item.lateSubmission ? (
                        <StatusBadge label="Late" tone="warning" />
                      ) : null}
                      {(item.submissionCount ?? 0) > 1 ? (
                        <StatusBadge label="Resubmitted" tone="info" />
                      ) : null}
                      {hasFeedback ? (
                        <StatusBadge label="Feedback" tone="success" />
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </SurfaceCard>
            );
          })}

          {visibleCount < assignments.length ? (
            <View style={{ marginTop: spacing.xs }}>
              <AppButton
                label={`Show More (${assignments.length - visibleCount} remaining)`}
                variant="secondary"
                size="sm"
                fullWidth
                onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
export interface HomeworkDetailSheetModalProps {
  visible: boolean;
  organizationId: number;
  studentId: number;
  summaryItem: StudentHomeworkSubmissionResponse | null;
  detailData: ParentChildHomeworkDetailResponse | null;
  isLoadingDetail: boolean;
  detailError: string | null;
  onRetryDetail: () => void;
  referenceDate?: string | null;
  onClose: () => void;
}

export function HomeworkDetailSheetModal({
  visible,
  organizationId,
  studentId,
  summaryItem,
  detailData,
  isLoadingDetail,
  detailError,
  onRetryDetail,
  referenceDate,
  onClose,
}: HomeworkDetailSheetModalProps) {
  const { colors, spacing, radius, typography, iconSizes } = useAppTheme();

  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(
    null
  );
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] =
    useState<AuthorizedAttachmentDownloadResult | null>(null);

  const submission = detailData?.submission ?? summaryItem;
  const teacherAttachments: StoredFileResponse[] =
    detailData?.teacherAttachments ?? [];
  const studentSubmissionFiles: StoredFileResponse[] =
    detailData?.studentSubmissionFiles ?? [];

  if (!submission) {
    return null;
  }

  const statusMeta = getHomeworkStatusMeta(submission.status);
  const urgency = getHomeworkDueUrgency(
    submission.dueDate,
    submission.status,
    referenceDate
  );

  const handleOpenOrDownloadAttachment = async (
    file: StoredFileResponse,
    sourceKind: 'TEACHER' | 'SUBMISSION'
  ) => {
    setAttachmentError(null);
    setDownloadingFileId(file.id);

    try {
      const endpointPath =
        sourceKind === 'TEACHER'
          ? parentPortalApi.buildHomeworkTeacherAttachmentEndpoint(
              organizationId,
              studentId,
              submission.homeworkId,
              file.id
            )
          : submission.submissionId
          ? parentPortalApi.buildHomeworkSubmissionAttachmentEndpoint(
              organizationId,
              studentId,
              submission.homeworkId,
              submission.submissionId,
              file.id
            )
          : null;

      if (!endpointPath) {
        throw new Error(
          'Submission record is not available for this attachment.'
        );
      }

      const result = await parentPortalApi.fetchAuthorizedHomeworkAttachment(
        organizationId,
        endpointPath,
        file.originalFilename,
        file.contentType
      );

      // On Web, trigger a clean browser file download when a blob is available
      if (
        Platform.OS === 'web' &&
        result.blob &&
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      ) {
        const objectUrl = window.URL.createObjectURL(result.blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = result.filename || file.originalFilename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 5000);
      }

      setPreviewResult(result);
    } catch (err) {
      setAttachmentError(
        err instanceof Error
          ? err.message
          : 'Could not access or download this attachment.'
      );
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleSharePreview = async () => {
    if (!previewResult) return;
    try {
      await Share.share({
        title: previewResult.filename,
        message: previewResult.textPreview
          ? `${previewResult.filename}\n\n${previewResult.textPreview}`
          : `${previewResult.filename} (${
              formatFileSize(previewResult.sizeBytes) ||
              previewResult.contentType
            })`,
      });
    } catch {
      // Ignore user share cancellation
    }
  };

  const hasMarks =
    submission.marksAwarded !== null && submission.marksAwarded !== undefined;
  const maxMarksVal = submission.maxMarks;
  const scorePercentage =
    hasMarks && maxMarksVal && maxMarksVal > 0
      ? Math.round((Number(submission.marksAwarded) / Number(maxMarksVal)) * 100)
      : null;

  return (
    <BottomSheetModal
      visible={visible}
      title={submission.homeworkTitle}
      subtitle={`${submission.subjectName || 'Subject'}${
        submission.className ? ` · ${submission.className}` : ''
      }`}
      onClose={() => {
        setPreviewResult(null);
        setAttachmentError(null);
        onClose();
      }}
    >
      {/* Status Banner */}
      <View
        style={[
          styles.detailStatusBanner,
          {
            backgroundColor:
              statusMeta.tone === 'success'
                ? colors.successSoft
                : statusMeta.tone === 'danger'
                ? colors.dangerSoft
                : statusMeta.tone === 'info'
                ? colors.infoSoft
                : colors.warningSoft,
            borderColor:
              statusMeta.tone === 'success'
                ? colors.successBorder
                : statusMeta.tone === 'danger'
                ? colors.dangerBorder
                : statusMeta.tone === 'info'
                ? colors.infoBorder
                : colors.warningBorder,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          },
        ]}
      >
        <View style={styles.bannerTopRow}>
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
          {urgency ? (
            <StatusBadge label={urgency.label} tone={urgency.tone} />
          ) : null}
        </View>

        <View
          style={[
            styles.detailMetaGrid,
            { marginTop: spacing.xs + 4, gap: spacing.xs },
          ]}
        >
          {submission.teacherName ? (
            <View style={styles.detailMetaCell}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                Teacher
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginTop: 1,
                }}
              >
                {submission.teacherName}
              </Text>
            </View>
          ) : null}

          <View style={styles.detailMetaCell}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.fontSizes.xs,
              }}
            >
              Assigned Date
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginTop: 1,
              }}
            >
              {formatHomeworkDate(submission.assignedDate)}
            </Text>
          </View>

          <View style={styles.detailMetaCell}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.fontSizes.xs,
              }}
            >
              Due Date
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
                marginTop: 1,
              }}
            >
              {formatHomeworkDate(submission.dueDate)}
            </Text>
          </View>

          {maxMarksVal !== null && maxMarksVal !== undefined ? (
            <View style={styles.detailMetaCell}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                Maximum Marks
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginTop: 1,
                }}
              >
                {maxMarksVal}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Instructions & Description */}
      <View
        style={[
          styles.detailSectionBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.semibold,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: spacing.xs,
          }}
        >
          Instructions & Description
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            lineHeight: 20,
          }}
        >
          {submission.homeworkDescription ||
            'No additional instructions provided.'}
        </Text>

        {/* Submission Rules Row */}
        <View
          style={[
            styles.policyRow,
            {
              marginTop: spacing.sm,
              paddingTop: spacing.xs + 2,
              borderTopColor: colors.separator,
              gap: spacing.xs,
            },
          ]}
        >
          <StatusBadge
            label={
              submission.allowResubmission
                ? 'Resubmission Allowed Before Due Date'
                : 'Single Submission Only'
            }
            tone={submission.allowResubmission ? 'info' : 'neutral'}
          />
          {submission.lateSubmissionPolicy ? (
            <StatusBadge
              label={
                submission.lateSubmissionPolicy === 'REJECT_LATE'
                  ? 'Strict Deadline (No Late Submissions)'
                  : 'Late Submissions Accepted'
              }
              tone={
                submission.lateSubmissionPolicy === 'REJECT_LATE'
                  ? 'warning'
                  : 'neutral'
              }
            />
          ) : null}
        </View>
      </View>

      {detailError ? (
        <FeedbackBanner
          tone="danger"
          title="Could not load full attachment metadata"
          message={detailError}
          onRetry={onRetryDetail}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {attachmentError ? (
        <FeedbackBanner
          tone="danger"
          title="Attachment Access Error"
          message={attachmentError}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {/* In-App Authorized Attachment Preview Card */}
      {previewResult ? (
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.primarySoftBorder,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={[styles.previewHeaderRow, { marginBottom: spacing.xs }]}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {previewResult.filename}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 1,
                }}
              >
                {getFileTypeBadgeLabel(
                  previewResult.contentType,
                  previewResult.filename
                )}
                {previewResult.sizeBytes > 0
                  ? ` · ${formatFileSize(previewResult.sizeBytes)}`
                  : ''}
              </Text>
            </View>

            <View style={styles.previewActionButtons}>
              {Platform.OS !== 'web' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share attachment"
                  onPress={handleSharePreview}
                  style={[
                    styles.smallPillBtn,
                    {
                      backgroundColor: colors.primarySoft,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.xs + 4,
                      paddingVertical: 4,
                      marginRight: spacing.xs,
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
                    Share
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close attachment preview"
                hitSlop={8}
                onPress={() => setPreviewResult(null)}
              >
                <X size={iconSizes.sm} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {previewResult.contentType.startsWith('image/') ? (
            <View
              style={[
                styles.imagePreviewContainer,
                {
                  backgroundColor: colors.background,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Image
                source={previewResult.authorizedSource}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          ) : previewResult.textPreview !== null ? (
            <ScrollView
              style={[
                styles.textPreviewScroll,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  padding: spacing.xs + 2,
                },
              ]}
              nestedScrollEnabled
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  lineHeight: 18,
                }}
              >
                {previewResult.textPreview || '(Empty file)'}
              </Text>
            </ScrollView>
          ) : (
            <View
              style={[
                styles.verifiedDownloadNotice,
                {
                  backgroundColor: colors.successSoft,
                  borderColor: colors.successBorder,
                  borderRadius: radius.sm,
                  padding: spacing.xs + 2,
                },
              ]}
            >
              <CheckCircle2 size={iconSizes.sm} color={colors.successText} />
              <Text
                style={{
                  flex: 1,
                  color: colors.successText,
                  fontSize: typography.fontSizes.xs,
                  marginLeft: spacing.xs,
                }}
              >
                {Platform.OS === 'web'
                  ? `Downloaded "${previewResult.filename}" (${formatFileSize(
                      previewResult.sizeBytes
                    )}).`
                  : `Verified attachment "${
                      previewResult.filename
                    }" (${formatFileSize(
                      previewResult.sizeBytes
                    )}). Tap Share above to export or open in another app.`}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Teacher Reference Attachments Section */}
      <View
        style={[
          styles.detailSectionBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginBottom: spacing.md,
          },
        ]}
      >
        <View style={[styles.sectionSubHeader, { marginBottom: spacing.xs }]}>
          <View style={styles.titleRow}>
            <Paperclip size={14} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              Teacher Reference Files
            </Text>
          </View>
          {isLoadingDetail ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <StatusBadge
              label={`${teacherAttachments.length} File${
                teacherAttachments.length === 1 ? '' : 's'
              }`}
              tone={teacherAttachments.length > 0 ? 'primary' : 'neutral'}
            />
          )}
        </View>

        {teacherAttachments.length === 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
            }}
          >
            {isLoadingDetail
              ? 'Loading attached reference materials...'
              : 'No reference files attached by the teacher.'}
          </Text>
        ) : (
          <View style={{ gap: spacing.xs, marginTop: spacing.xxs }}>
            {teacherAttachments.map((file) => {
              const isBusy = downloadingFileId === file.id;
              const typeBadge = getFileTypeBadgeLabel(
                file.contentType,
                file.originalFilename
              );
              const isPreviewable =
                file.contentType.startsWith('image/') ||
                file.contentType.startsWith('text/');

              return (
                <View
                  key={file.id}
                  style={[
                    styles.attachmentItemRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                      padding: spacing.xs + 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fileTypeBadge,
                      {
                        backgroundColor: colors.primarySoft,
                        borderRadius: radius.xs,
                        marginRight: spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 10,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {typeBadge}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      {file.originalFilename}
                    </Text>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      {formatFileSize(file.sizeBytes)}
                      {file.createdAt
                        ? ` · ${formatHomeworkDate(file.createdAt)}`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() =>
                      void handleOpenOrDownloadAttachment(file, 'TEACHER')
                    }
                    style={({ pressed }) => [
                      styles.attachmentActionBtn,
                      {
                        backgroundColor: pressed
                          ? colors.surfaceInteractivePressed
                          : colors.primarySoft,
                        borderColor: colors.primarySoftBorder,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.xs + 4,
                        paddingVertical: 6,
                      },
                    ]}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : isPreviewable ? (
                      <Eye size={13} color={colors.primary} />
                    ) : (
                      <Download size={13} color={colors.primary} />
                    )}
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.semibold,
                        marginLeft: 4,
                      }}
                    >
                      {isPreviewable ? 'Preview' : 'Download'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Student Submission Status & Files */}
      <View
        style={[
          styles.detailSectionBox,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginBottom: spacing.md,
          },
        ]}
      >
        <View style={[styles.sectionSubHeader, { marginBottom: spacing.xs }]}>
          <View style={styles.titleRow}>
            <FileCheck size={14} color={colors.infoText} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              Student Submission
            </Text>
          </View>

          <View style={styles.footerBadges}>
            {submission.lateSubmission ? (
              <StatusBadge label="Submitted Late" tone="warning" />
            ) : null}
            {(submission.submissionCount ?? 0) > 1 ? (
              <StatusBadge
                label={`Resubmitted (${submission.submissionCount}x)`}
                tone="info"
              />
            ) : null}
          </View>
        </View>

        {submission.status === 'PENDING' || submission.status === 'OVERDUE' ? (
          <View
            style={[
              styles.pendingSubmissionBox,
              {
                backgroundColor:
                  submission.status === 'OVERDUE'
                    ? colors.dangerSoft
                    : colors.warningSoft,
                borderColor:
                  submission.status === 'OVERDUE'
                    ? colors.dangerBorder
                    : colors.warningBorder,
                borderRadius: radius.sm,
                padding: spacing.xs + 2,
              },
            ]}
          >
            {submission.status === 'OVERDUE' ? (
              <AlertCircle size={iconSizes.sm} color={colors.dangerText} />
            ) : (
              <Clock size={iconSizes.sm} color={colors.warningText} />
            )}
            <Text
              style={{
                flex: 1,
                color:
                  submission.status === 'OVERDUE'
                    ? colors.dangerText
                    : colors.warningText,
                fontSize: typography.fontSizes.xs,
                marginLeft: spacing.xs,
              }}
            >
              {submission.status === 'OVERDUE'
                ? 'Your child has not submitted this assignment yet and the due date has passed.'
                : 'Your child has not submitted this assignment yet.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <View style={[styles.detailMetaGrid, { marginTop: 2, gap: spacing.xs }]}>
              <View style={styles.detailMetaCell}>
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  Submitted At
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                    marginTop: 1,
                  }}
                >
                  {submission.submittedAt
                    ? formatHomeworkDateTime(submission.submittedAt)
                    : formatHomeworkDate(submission.submissionDate)}
                </Text>
              </View>

              {submission.lastResubmittedAt ? (
                <View style={styles.detailMetaCell}>
                  <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                    Last Resubmitted
                  </Text>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                      marginTop: 1,
                    }}
                  >
                    {formatHomeworkDateTime(submission.lastResubmittedAt)}
                  </Text>
                </View>
              ) : null}
            </View>

            {submission.submissionText ? (
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderRadius: radius.sm,
                    padding: spacing.xs + 2,
                    marginTop: spacing.xxs,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: typography.fontWeights.semibold,
                    marginBottom: 2,
                  }}
                >
                  Student Submission Notes
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    lineHeight: 18,
                  }}
                >
                  {submission.submissionText}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Student Submission Files */}
      {studentSubmissionFiles.length > 0 ? (
        <View
          style={[
            styles.detailSectionBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm + 2,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={[styles.sectionSubHeader, { marginBottom: spacing.xs }]}>
            <View style={styles.titleRow}>
              <FileText size={14} color={colors.infoText} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                  marginLeft: 6,
                }}
              >
                Submitted Student Files
              </Text>
            </View>
            <StatusBadge
              label={`${studentSubmissionFiles.length} File${
                studentSubmissionFiles.length === 1 ? '' : 's'
              }`}
              tone="info"
            />
          </View>

          <View style={{ gap: spacing.xs, marginTop: spacing.xxs }}>
            {studentSubmissionFiles.map((file) => {
              const isBusy = downloadingFileId === file.id;
              const typeBadge = getFileTypeBadgeLabel(
                file.contentType,
                file.originalFilename
              );
              const isPreviewable =
                file.contentType.startsWith('image/') ||
                file.contentType.startsWith('text/');

              return (
                <View
                  key={file.id}
                  style={[
                    styles.attachmentItemRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                      padding: spacing.xs + 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fileTypeBadge,
                      {
                        backgroundColor: colors.infoSoft,
                        borderRadius: radius.xs,
                        marginRight: spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.infoText,
                        fontSize: 10,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {typeBadge}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      {file.originalFilename}
                    </Text>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      {formatFileSize(file.sizeBytes)}
                      {file.createdAt
                        ? ` · ${formatHomeworkDate(file.createdAt)}`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() =>
                      void handleOpenOrDownloadAttachment(file, 'SUBMISSION')
                    }
                    style={({ pressed }) => [
                      styles.attachmentActionBtn,
                      {
                        backgroundColor: pressed
                          ? colors.surfaceInteractivePressed
                          : colors.infoSoft,
                        borderColor: colors.infoBorder,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.xs + 4,
                        paddingVertical: 6,
                      },
                    ]}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.infoText} />
                    ) : isPreviewable ? (
                      <Eye size={13} color={colors.infoText} />
                    ) : (
                      <Download size={13} color={colors.infoText} />
                    )}
                    <Text
                      style={{
                        color: colors.infoText,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.semibold,
                        marginLeft: 4,
                      }}
                    >
                      {isPreviewable ? 'Preview' : 'Download'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Teacher Evaluation & Feedback Section */}
      <View
        style={[
          styles.detailSectionBox,
          {
            backgroundColor:
              submission.status === 'EVALUATED'
                ? colors.successSoft
                : colors.surfaceMuted,
            borderColor:
              submission.status === 'EVALUATED'
                ? colors.successBorder
                : colors.border,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <View style={[styles.sectionSubHeader, { marginBottom: spacing.xs }]}>
          <View style={styles.titleRow}>
            <Award
              size={14}
              color={
                submission.status === 'EVALUATED'
                  ? colors.successText
                  : colors.textMuted
              }
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 6,
              }}
            >
              Teacher Evaluation & Feedback
            </Text>
          </View>
          {scorePercentage !== null ? (
            <StatusBadge label={`${scorePercentage}% Score`} tone="success" />
          ) : null}
        </View>

        {submission.status === 'EVALUATED' ? (
          <View style={{ gap: spacing.xs }}>
            <View style={[styles.detailMetaGrid, { gap: spacing.xs }]}>
              <View style={styles.detailMetaCell}>
                <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                  Marks Awarded
                </Text>
                <Text
                  style={{
                    color: colors.successText,
                    fontSize: typography.fontSizes.md,
                    fontWeight: typography.fontWeights.bold,
                    marginTop: 1,
                  }}
                >
                  {hasMarks
                    ? `${submission.marksAwarded}${
                        maxMarksVal ? ` / ${maxMarksVal}` : ''
                      }`
                    : 'Evaluated (No Numeric Marks)'}
                </Text>
              </View>

              {submission.evaluatedAt ? (
                <View style={styles.detailMetaCell}>
                  <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                    Evaluated On
                  </Text>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                      marginTop: 1,
                    }}
                  >
                    {formatHomeworkDateTime(submission.evaluatedAt)}
                  </Text>
                </View>
              ) : null}
            </View>

            {submission.teacherFeedback ? (
              <View
                style={[
                  styles.feedbackQuoteBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.successBorder,
                    borderRadius: radius.sm,
                    padding: spacing.xs + 4,
                    marginTop: 4,
                  },
                ]}
              >
                <View style={[styles.titleRow, { marginBottom: 4 }]}>
                  <MessageSquare size={12} color={colors.successText} />
                  <Text
                    style={{
                      color: colors.successText,
                      fontSize: 11,
                      fontWeight: typography.fontWeights.bold,
                      marginLeft: 5,
                    }}
                  >
                    Teacher Feedback
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    lineHeight: 18,
                  }}
                >
                  {submission.teacherFeedback}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                No written feedback remarks were added by the teacher.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Info size={13} color={colors.textMuted} />
            <Text
              style={{
                flex: 1,
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginLeft: 6,
              }}
            >
              {submission.status === 'SUBMITTED'
                ? 'Your child’s submission is awaiting teacher evaluation and remarks.'
                : 'Teacher evaluation will appear here once the assignment is submitted and graded.'}
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bucketCell: {
    flexGrow: 1,
    flexBasis: '18%',
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  filterDropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activeFilterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  titleChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
  metaInlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  submissionFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailStatusBanner: {
    borderWidth: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailMetaCell: {
    minWidth: '45%',
    flexGrow: 1,
  },
  detailSectionBox: {
    borderWidth: 1,
  },
  policyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
  sectionSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  pendingSubmissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  notesBox: {
    borderWidth: 1,
  },
  feedbackQuoteBox: {
    borderWidth: 1,
  },
  previewBox: {
    borderWidth: 1.5,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  textPreviewScroll: {
    maxHeight: 180,
    borderWidth: 1,
  },
  verifiedDownloadNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});

