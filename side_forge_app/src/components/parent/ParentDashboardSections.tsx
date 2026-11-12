import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Clock,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type {
  AnnouncementResponse,
  ChildDashboardCard,
  ClassTimetableResponse,
  DayOfWeekName,
  StudentAttendanceStatus,
  TimetableSlotResponse,
} from '@/types/parentPortal';
import type { NotificationItem } from '@/types/notification';
import { StatusBadge, SurfaceCard } from '@/components/ui';

export function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatCurrencyINR(amount?: number | null): string {
  const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  const clean = (t?: string | null) => (t ? t.slice(0, 5) : '');
  const s = clean(start);
  const e = clean(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '—';
}

function getAttendanceTone(status: StudentAttendanceStatus) {
  switch (status) {
    case 'PRESENT':
      return 'success' as const;
    case 'ABSENT':
      return 'danger' as const;
    case 'LATE':
    case 'HALF_DAY':
      return 'warning' as const;
    case 'EXCUSED':
    case 'HOLIDAY':
    default:
      return 'info' as const;
  }
}

function SectionCardHeader({
  title,
  subtitle,
  icon,
  actionLabel,
  onActionPress,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  return (
    <View style={[styles.sectionHeaderRow, { marginBottom: spacing.sm }]}>
      <View style={[styles.rowCenter, { flex: 1, marginRight: spacing.xs }]}>
        {icon}
        <View style={{ marginLeft: spacing.xs, flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 1,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onActionPress}
          style={styles.rowCenter}
        >
          <Text
            style={{
              color: colors.primaryText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginRight: 2,
            }}
          >
            {actionLabel}
          </Text>
          <ChevronRight size={iconSizes.xs} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AcademicOverviewSection({
  card,
  sectionName,
  onOpenExams,
}: {
  card: ChildDashboardCard;
  sectionName?: string | null;
  onOpenExams: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { child, recentlyPublishedResults, upcomingExaminations } = card;

  const classAndSection = [
    child.className ?? 'Unassigned Class',
    sectionName || child.sectionName
      ? `Section ${sectionName || child.sectionName}`
      : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={onOpenExams}
      style={{ marginBottom: spacing.md }}
    >
      <SectionCardHeader
        title="Academic Overview"
        subtitle={child.academicSessionName ?? 'Current Academic Session'}
        icon={<GraduationCap size={iconSizes.md} color={colors.primary} />}
        actionLabel="Exams & Results"
        onActionPress={onOpenExams}
      />

      <View
        style={[
          styles.itemRow,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.sm,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginRight: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
              Enrolled Class & Section
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
                marginTop: 2,
              }}
            >
              {classAndSection}
            </Text>
          </View>
          {child.enrollmentStatus ? (
            <StatusBadge
              label={child.enrollmentStatus}
              tone={child.enrollmentStatus === 'ACTIVE' ? 'success' : 'neutral'}
            />
          ) : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs, marginTop: 4 }}>
          Admission: {child.admissionNumber}
          {child.rollNumber ? ` • Roll No: ${child.rollNumber}` : ''}
        </Text>
      </View>

      {recentlyPublishedResults.length > 0 ? (
        <View style={{ gap: spacing.xs, marginBottom: upcomingExaminations.length > 0 ? spacing.sm : 0 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            Published Examination Results
          </Text>
          {recentlyPublishedResults.slice(0, 2).map((res) => (
            <View
              key={res.examinationId}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={[styles.rowCenter, { flex: 1, marginRight: spacing.xs }]}>
                  <Award size={iconSizes.sm} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: 6,
                      flex: 1,
                    }}
                  >
                    {res.examinationName}
                  </Text>
                </View>
                <StatusBadge
                  label={
                    res.overallGrade
                      ? `Grade ${res.overallGrade} (${res.percentage}%)`
                      : `${res.percentage}%`
                  }
                  tone={res.overallPassed ? 'success' : 'warning'}
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 4 }}>
                Marks: {res.totalObtainedMarks} / {res.totalMaxMarks}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {upcomingExaminations.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            Upcoming Examinations ({upcomingExaminations.length})
          </Text>
          {upcomingExaminations.slice(0, 2).map((exam) => (
            <View
              key={exam.id}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    flex: 1,
                  }}
                >
                  {exam.name}
                </Text>
                <StatusBadge label={exam.examType} tone="info" />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 4 }}>
                {formatShortDate(exam.startDate)} – {formatShortDate(exam.endDate)}
              </Text>
            </View>
          ))}
        </View>
      ) : recentlyPublishedResults.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          No published examination results or upcoming exam schedules for this session yet.
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
export function AttendanceSummarySection({
  card,
  onOpenAttendance,
}: {
  card: ChildDashboardCard;
  onOpenAttendance: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const summary = card.attendanceSummary;
  const recent = card.recentAttendance ?? [];
  const hasWorkingDays = Boolean(summary && summary.applicableWorkingDays > 0);

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={onOpenAttendance}
      style={{ marginBottom: spacing.md }}
    >
      <SectionCardHeader
        title="Attendance Summary"
        subtitle={
          hasWorkingDays
            ? `${summary?.applicableWorkingDays} recorded working days`
            : 'Session attendance overview'
        }
        icon={<CalendarCheck size={iconSizes.md} color={colors.success} />}
        actionLabel="Attendance"
        onActionPress={onOpenAttendance}
      />

      {hasWorkingDays && summary ? (
        <>
          <View style={[styles.metricsRow, { gap: spacing.xs, marginBottom: spacing.sm }]}>
            <View
              style={[
                styles.metricBox,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primarySoftBorder,
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {summary.attendancePercentage.toFixed(1)}%
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                Attendance
              </Text>
            </View>

            <View
              style={[
                styles.metricBox,
                {
                  backgroundColor: colors.successSoft,
                  borderColor: colors.successBorder,
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.successText,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {summary.presentCount}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                Present
              </Text>
            </View>

            <View
              style={[
                styles.metricBox,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.dangerBorder,
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.dangerText,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {summary.absentCount}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                Absent
              </Text>
            </View>
          </View>

          {recent.length > 0 ? (
            <View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                  marginBottom: 6,
                }}
              >
                Recent Daily Status
              </Text>
              <View style={[styles.rowWrap, { gap: 6 }]}>
                {recent.slice(0, 4).map((r) => (
                  <StatusBadge
                    key={r.id}
                    label={`${formatShortDate(r.attendanceDate)}: ${r.status}`}
                    tone={getAttendanceTone(r.status)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          No attendance records have been marked for {card.child.firstName} in the current academic session yet.
        </Text>
      )}
    </SurfaceCard>
  );
}
const JS_DAY_TO_DAY_OF_WEEK: Record<number, DayOfWeekName> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export function TodaysScheduleSection({
  timetable,
  unavailableReason,
  loading,
  onOpenTimetable,
}: {
  timetable: ClassTimetableResponse | null;
  unavailableReason: string | null;
  loading?: boolean;
  onOpenTimetable: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const { todayDayName, todaySlots, activeOrNextSlot } = useMemo(() => {
    const now = new Date();
    const dayName = JS_DAY_TO_DAY_OF_WEEK[now.getDay()] ?? 'MONDAY';
    const slots = (timetable?.slots ?? [])
      .filter((s) => s.dayOfWeek === dayName)
      .sort((a, b) => (a.periodOrder ?? 0) - (b.periodOrder ?? 0));

    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    let highlighted: TimetableSlotResponse | null = null;
    for (const s of slots) {
      const endHHMM = (s.endTime ?? '').slice(0, 5);
      if (endHHMM >= currentHHMM) {
        highlighted = s;
        break;
      }
    }
    if (!highlighted && slots.length > 0) {
      highlighted = slots[0] ?? null;
    }

    return {
      todayDayName: dayName,
      todaySlots: slots,
      activeOrNextSlot: highlighted,
    };
  }, [timetable]);

  const formattedDay =
    todayDayName.charAt(0) + todayDayName.slice(1).toLowerCase();

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={onOpenTimetable}
      style={{ marginBottom: spacing.md }}
    >
      <SectionCardHeader
        title="Today's Schedule"
        subtitle={
          timetable?.sectionName
            ? `${formattedDay} • ${timetable.className ?? ''} Section ${timetable.sectionName}`
            : `${formattedDay} Class Timetable`
        }
        icon={<Calendar size={iconSizes.md} color={colors.primary} />}
        actionLabel="Full Timetable"
        onActionPress={onOpenTimetable}
      />
      {loading ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          Loading today&apos;s class schedule...
        </Text>
      ) : !timetable ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          {unavailableReason ||
            'No published class timetable is available for this session yet.'}
        </Text>
      ) : todaySlots.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          No classes are scheduled for {formattedDay}. Enjoy the break!
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {activeOrNextSlot ? (
            <View
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primarySoftBorder,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <StatusBadge label={activeOrNextSlot.periodName} tone="primary" />
                <View style={styles.rowCenter}>
                  <Clock size={iconSizes.xs} color={colors.primaryText} />
                  <Text
                    style={{
                      color: colors.primaryText,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: 4,
                    }}
                  >
                    {formatTimeRange(
                      activeOrNextSlot.startTime,
                      activeOrNextSlot.endTime
                    )}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.base,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 6,
                }}
              >
                {activeOrNextSlot.subjectName ?? 'Scheduled Period'}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                {[
                  [
                    activeOrNextSlot.teacherFirstName,
                    activeOrNextSlot.teacherLastName,
                  ]
                    .filter(Boolean)
                    .join(' ') || null,
                  activeOrNextSlot.room ? `Room ${activeOrNextSlot.room}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ') || 'Class Period'}
              </Text>
            </View>
          ) : null}

          {todaySlots.slice(0, 4).map((slot) => (
            <View
              key={slot.id}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    flex: 1,
                  }}
                >
                  {slot.periodName}: {slot.subjectName ?? 'Period'}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  {formatTimeRange(slot.startTime, slot.endTime)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}
export function HomeworkOverviewSection({
  card,
  onOpenHomework,
}: {
  card: ChildDashboardCard;
  onOpenHomework: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const upcoming = card.upcomingHomeworkDeadlines ?? [];
  const totalActionable = card.pendingHomeworkCount + card.overdueHomeworkCount;

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={onOpenHomework}
      style={{ marginBottom: spacing.md }}
    >
      <SectionCardHeader
        title="Homework Overview"
        subtitle={
          totalActionable > 0
            ? `${totalActionable} pending or overdue assignment${
                totalActionable === 1 ? '' : 's'
              }`
            : 'All assigned homework up to date'
        }
        icon={<FileSpreadsheet size={iconSizes.md} color={colors.info} />}
        actionLabel="Homework"
        onActionPress={onOpenHomework}
      />

      <View
        style={[
          styles.metricsRow,
          { gap: spacing.xs, marginBottom: upcoming.length > 0 ? spacing.sm : 0 },
        ]}
      >
        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warningBorder,
              borderRadius: radius.md,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text
            style={{
              color: colors.warningText,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {card.pendingHomeworkCount}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Pending
          </Text>
        </View>

        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: colors.dangerSoft,
              borderColor: colors.dangerBorder,
              borderRadius: radius.md,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text
            style={{
              color: colors.dangerText,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {card.overdueHomeworkCount}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Overdue
          </Text>
        </View>

        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: colors.successSoft,
              borderColor: colors.successBorder,
              borderRadius: radius.md,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text
            style={{
              color: colors.successText,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {card.submittedHomeworkCount + card.evaluatedHomeworkCount}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Submitted
          </Text>
        </View>
      </View>

      {upcoming.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {upcoming.slice(0, 3).map((hw) => (
            <View
              key={hw.homeworkId}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={[styles.rowCenter, { flex: 1, marginRight: spacing.xs }]}>
                  <BookOpen size={iconSizes.xs} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: 6,
                      flex: 1,
                    }}
                  >
                    {hw.homeworkTitle}
                  </Text>
                </View>
                <StatusBadge
                  label={hw.status}
                  tone={hw.status === 'OVERDUE' ? 'danger' : 'warning'}
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 4 }}>
                {hw.subjectName ?? 'Subject'} • Due {formatShortDate(hw.dueDate)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </SurfaceCard>
  );
}
export function FeeOverviewSection({
  card,
  onOpenFees,
}: {
  card: ChildDashboardCard;
  onOpenFees: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const hasOutstanding = (card.outstandingFeeDues ?? 0) > 0;
  const hasOverdue = (card.overdueFeeDues ?? 0) > 0;
  const latestReceipt = card.recentPayments?.[0] ?? null;

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={onOpenFees}
      style={{ marginBottom: spacing.md }}
    >
      <SectionCardHeader
        title="Fee Overview"
        subtitle={
          hasOutstanding
            ? 'Outstanding balance & payment status'
            : 'No pending fee balance'
        }
        icon={<CreditCard size={iconSizes.md} color={colors.primary} />}
        actionLabel="Fee Statements"
        onActionPress={onOpenFees}
      />

      <View
        style={[
          styles.metricsRow,
          { gap: spacing.xs, marginBottom: latestReceipt ? spacing.sm : 0 },
        ]}
      >
        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: hasOutstanding
                ? colors.warningSoft
                : colors.successSoft,
              borderColor: hasOutstanding
                ? colors.warningBorder
                : colors.successBorder,
              borderRadius: radius.md,
              paddingVertical: spacing.xs + 2,
            },
          ]}
        >
          <Text
            style={{
              color: hasOutstanding ? colors.warningText : colors.successText,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {formatCurrencyINR(card.outstandingFeeDues)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Outstanding
          </Text>
        </View>

        {hasOverdue ? (
          <View
            style={[
              styles.metricBox,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.dangerBorder,
                borderRadius: radius.md,
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <Text
              style={{
                color: colors.dangerText,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {formatCurrencyINR(card.overdueFeeDues)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
              Overdue
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.metricBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingVertical: spacing.xs + 2,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {formatCurrencyINR(card.totalPaidFees)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
            Paid This Session
          </Text>
        </View>
      </View>

      {latestReceipt ? (
        <View
          style={[
            styles.itemRow,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              Last Payment: {formatCurrencyINR(latestReceipt.totalAmount)}
            </Text>
            <StatusBadge label={latestReceipt.status} tone="success" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 }}>
            Receipt #{latestReceipt.receiptNumber} •{' '}
            {formatShortDate(latestReceipt.paymentDate)}
          </Text>
        </View>
      ) : null}
    </SurfaceCard>
  );
}
export function AnnouncementsSection({
  announcements,
  notifications,
  unreadCount,
  onOpenUpdates,
}: {
  announcements: AnnouncementResponse[];
  notifications: NotificationItem[];
  unreadCount: number;
  onOpenUpdates: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.lg }}>
      <SectionCardHeader
        title="School Announcements"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'Recent notices & updates'
        }
        icon={<Bell size={iconSizes.md} color={colors.primary} />}
        actionLabel="All Updates"
        onActionPress={onOpenUpdates}
      />

      {announcements.length === 0 && notifications.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
          No recent school announcements or notifications right now.
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {announcements.slice(0, 3).map((ann) => (
            <View
              key={ann.id}
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.background,
                  borderColor: ann.important
                    ? colors.warningBorder
                    : colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    flex: 1,
                    marginRight: spacing.xs,
                  }}
                >
                  {ann.title}
                </Text>
                {ann.important ? (
                  <StatusBadge label="Important" tone="warning" />
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                    {formatShortDate(ann.publicationDate)}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={2}
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 4,
                  lineHeight: typography.lineHeights.xs,
                }}
              >
                {ann.description}
              </Text>
            </View>
          ))}

          {announcements.length === 0 &&
            notifications.slice(0, 2).map((notif) => (
              <View
                key={notif.id}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={[styles.rowCenter, { flex: 1 }]}>
                    {!notif.read ? (
                      <View
                        style={[
                          styles.unreadDot,
                          {
                            backgroundColor: colors.primary,
                            marginRight: 6,
                          },
                        ]}
                      />
                    ) : null}
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.semibold,
                        flex: 1,
                      }}
                    >
                      {notif.title}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  }}
                >
                  {notif.message}
                </Text>
              </View>
            ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    borderWidth: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
