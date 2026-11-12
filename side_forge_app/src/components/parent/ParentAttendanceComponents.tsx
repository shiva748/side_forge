import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Info,
} from 'lucide-react-native';
import { useAppTheme, type ThemeColors } from '@/theme';
import type {
  MonthlyAttendanceSummaryItem,
  StudentAttendanceResponse,
  StudentAttendanceStatus,
  StudentAttendanceSummaryResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  EmptyState,
  SegmentedSelector,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatAttendanceStatusLabel(
  status: StudentAttendanceStatus
): string {
  switch (status) {
    case 'PRESENT':
      return 'Present';
    case 'ABSENT':
      return 'Absent';
    case 'HALF_DAY':
      return 'Half Day';
    case 'LATE':
      return 'Late';
    case 'EXCUSED':
      return 'Excused';
    case 'HOLIDAY':
      return 'Holiday';
    default:
      return status;
  }
}

export function getStatusBadgeTone(status: StudentAttendanceStatus) {
  switch (status) {
    case 'PRESENT':
      return 'success' as const;
    case 'ABSENT':
      return 'danger' as const;
    case 'HALF_DAY':
    case 'LATE':
      return 'warning' as const;
    case 'EXCUSED':
      return 'info' as const;
    case 'HOLIDAY':
    default:
      return 'primary' as const;
  }
}

export function getCalendarStatusPalette(
  status: StudentAttendanceStatus | undefined,
  colors: ThemeColors
) {
  if (!status) return null;
  switch (status) {
    case 'PRESENT':
      return {
        bg: colors.successSoft,
        border: colors.successBorder,
        text: colors.successText,
        dot: colors.success,
        short: 'P',
      };
    case 'ABSENT':
      return {
        bg: colors.dangerSoft,
        border: colors.dangerBorder,
        text: colors.dangerText,
        dot: colors.danger,
        short: 'A',
      };
    case 'HALF_DAY':
      return {
        bg: colors.warningSoft,
        border: colors.warningBorder,
        text: colors.warningText,
        dot: colors.warning,
        short: 'HD',
      };
    case 'LATE':
      return {
        bg: colors.warningSoft,
        border: colors.warningBorder,
        text: colors.warningText,
        dot: colors.warning,
        short: 'L',
      };
    case 'EXCUSED':
      return {
        bg: colors.infoSoft,
        border: colors.infoBorder,
        text: colors.infoText,
        dot: colors.info,
        short: 'E',
      };
    case 'HOLIDAY':
      return {
        bg: colors.primarySoft,
        border: colors.primarySoftBorder,
        text: colors.primaryText,
        dot: colors.primary,
        short: 'H',
      };
  }
}

export function formatFullDateWithDay(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function formatRecordTimestamp(isoInstant?: string | null): string | null {
  if (!isoInstant) return null;
  try {
    const d = new Date(isoInstant);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function AttendanceOverallSummaryCard({
  summary,
  academicSessionName,
}: {
  summary: StudentAttendanceSummaryResponse | null;
  academicSessionName?: string | null;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const hasWorkingDays = Boolean(summary && summary.applicableWorkingDays > 0);
  const pct = hasWorkingDays && summary ? summary.attendancePercentage : 0;

  const pctColor =
    pct >= 85
      ? colors.success
      : pct >= 75
      ? colors.warning
      : colors.danger;

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
        <View style={styles.rowCenter}>
          <CalendarCheck size={iconSizes.md} color={colors.primary} />
          <View style={{ marginLeft: spacing.xs }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Overall Session Attendance
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
              }}
            >
              {academicSessionName ?? 'Current Academic Session'}
            </Text>
          </View>
        </View>

        {hasWorkingDays && summary ? (
          <StatusBadge
            label={`${summary.attendancePercentage.toFixed(1)}%`}
            tone={
              pct >= 85 ? 'success' : pct >= 75 ? 'warning' : 'danger'
            }
          />
        ) : null}
      </View>

      {hasWorkingDays && summary ? (
        <>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.full,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(0, pct))}%`,
                height: '100%',
                backgroundColor: pctColor,
                borderRadius: radius.full,
              }}
            />
          </View>

          <View style={[styles.metricsGrid, { gap: spacing.xs }]}>
            <SummaryStatTile
              label="Working Days"
              value={summary.applicableWorkingDays}
              bg={colors.surfaceMuted}
              border={colors.border}
              textColor={colors.textPrimary}
            />
            <SummaryStatTile
              label="Present"
              value={summary.presentCount}
              bg={colors.successSoft}
              border={colors.successBorder}
              textColor={colors.successText}
            />
            <SummaryStatTile
              label="Absent"
              value={summary.absentCount}
              bg={colors.dangerSoft}
              border={colors.dangerBorder}
              textColor={colors.dangerText}
            />
            <SummaryStatTile
              label="Half-Day"
              value={summary.halfDayCount}
              bg={colors.warningSoft}
              border={colors.warningBorder}
              textColor={colors.warningText}
            />
          </View>

          {summary.lateCount > 0 ||
          summary.excusedDays > 0 ||
          summary.holidayDays > 0 ? (
            <View
              style={[
                styles.secondaryStatsRow,
                { marginTop: spacing.xs, gap: spacing.xs },
              ]}
            >
              {summary.lateCount > 0 ? (
                <StatusBadge
                  label={`Late: ${summary.lateCount}`}
                  tone="warning"
                />
              ) : null}
              {summary.excusedDays > 0 ? (
                <StatusBadge
                  label={`Excused: ${summary.excusedDays}`}
                  tone="info"
                />
              ) : null}
              {summary.holidayDays > 0 ? (
                <StatusBadge
                  label={`Holidays: ${summary.holidayDays}`}
                  tone="primary"
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.xs,
          }}
        >
          No working days have been recorded for this academic session yet.
        </Text>
      )}
    </SurfaceCard>
  );
}

function SummaryStatTile({
  label,
  value,
  bg,
  border,
  textColor,
}: {
  label: string;
  value: number;
  bg: string;
  border: string;
  textColor: string;
}) {
  const { colors, radius, spacing, typography } = useAppTheme();
  return (
    <View
      style={[
        styles.statBox,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius.md,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: 6,
        },
      ]}
    >
      <Text
        style={{
          color: textColor,
          fontSize: typography.fontSizes.lg,
          fontWeight: typography.fontWeights.bold,
        }}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          marginTop: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function MonthlyAttendanceCalendarCard({
  year,
  month,
  onChangeMonth,
  recordsByDate,
  monthlySummary,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  onChangeMonth: (nextYear: number, nextMonth: number) => void;
  recordsByDate: Record<string, StudentAttendanceResponse>;
  monthlySummary: MonthlyAttendanceSummaryItem | null;
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const handlePrevMonth = () => {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  };

  const calendarWeeks = useMemo(() => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [year, month]);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const selectedRecord = selectedDate ? recordsByDate[selectedDate] : undefined;

  const isSelectedDateSunday = useMemo(() => {
    if (!selectedDate) return false;
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return false;
    return new Date(y, m - 1, d).getDay() === 0;
  }, [selectedDate]);

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={handlePrevMonth}
          style={[
            styles.navIconBtn,
            { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
          ]}
        >
          <ChevronLeft size={iconSizes.md} color={colors.textPrimary} />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          {monthlySummary && monthlySummary.applicableWorkingDays > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 1 }}>
              {monthlySummary.attendancePercentage.toFixed(1)}% •{' '}
              {monthlySummary.presentCount}P • {monthlySummary.absentCount}A
              {monthlySummary.halfDayCount > 0
                ? ` • ${monthlySummary.halfDayCount}HD`
                : ''}
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: typography.fontSizes.xs, marginTop: 1 }}>
              Tap a date to inspect details
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          onPress={handleNextMonth}
          style={[
            styles.navIconBtn,
            { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
          ]}
        >
          <ChevronRight size={iconSizes.md} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={[styles.weekRow, { marginBottom: 6 }]}>
        {WEEKDAY_HEADERS.map((day, idx) => (
          <View key={day} style={styles.dayCellWrapper}>
            <Text
              style={{
                color: idx === 0 ? colors.dangerText : colors.textMuted,
                fontSize: 11,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        {calendarWeeks.map((week, wIdx) => (
          <View key={`week-${wIdx}`} style={styles.weekRow}>
            {week.map((dayNum, dIdx) => {
              if (!dayNum) {
                return (
                  <View
                    key={`empty-${wIdx}-${dIdx}`}
                    style={styles.dayCellWrapper}
                  />
                );
              }
              const isoDate = `${monthPrefix}-${String(dayNum).padStart(
                2,
                '0'
              )}`;
              const record = recordsByDate[isoDate];
              const palette = getCalendarStatusPalette(record?.status, colors);
              const isSelected = selectedDate === isoDate;
              const isSunday = dIdx === 0;

              return (
                <View key={isoDate} style={styles.dayCellWrapper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isoDate} ${record?.status ?? ''}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelectDate(isoDate)}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: palette
                          ? palette.bg
                          : isSelected
                          ? colors.surfaceMuted
                          : 'transparent',
                        borderColor: isSelected
                          ? colors.primary
                          : palette
                          ? palette.border
                          : 'transparent',
                        borderWidth: isSelected ? 2 : palette ? 1 : 0,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: palette
                          ? palette.text
                          : isSunday
                          ? colors.textMuted
                          : colors.textPrimary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight:
                          isSelected || palette
                            ? typography.fontWeights.bold
                            : typography.fontWeights.regular,
                      }}
                    >
                      {dayNum}
                    </Text>
                    {palette ? (
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: palette.dot },
                        ]}
                      />
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View
        style={[
          styles.legendRow,
          {
            marginTop: spacing.sm,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            gap: spacing.sm,
          },
        ]}
      >
        {(
          [
            { label: 'Present', color: colors.success },
            { label: 'Absent', color: colors.danger },
            { label: 'Half-Day / Late', color: colors.warning },
            { label: 'Excused', color: colors.info },
            { label: 'Holiday', color: colors.primary },
          ] as const
        ).map((item) => (
          <View key={item.label} style={styles.rowCenter}>
            <View
              style={[styles.legendDot, { backgroundColor: item.color }]}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                marginLeft: 4,
              }}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {selectedDate ? (
        <View
          style={[
            styles.selectedDateBox,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginTop: spacing.sm,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {formatFullDateWithDay(selectedDate)}
            </Text>
            {selectedRecord ? (
              <StatusBadge
                label={formatAttendanceStatusLabel(selectedRecord.status)}
                tone={getStatusBadgeTone(selectedRecord.status)}
              />
            ) : (
              <StatusBadge
                label={isSelectedDateSunday ? 'Weekend' : 'Not Recorded'}
                tone="neutral"
              />
            )}
          </View>

          {selectedRecord ? (
            <View style={{ marginTop: 4, gap: 2 }}>
              {selectedRecord.className ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  Class: {selectedRecord.className}
                </Text>
              ) : null}
              {formatRecordTimestamp(
                selectedRecord.updatedAt ?? selectedRecord.createdAt
              ) ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  Recorded at:{' '}
                  {formatRecordTimestamp(
                    selectedRecord.updatedAt ?? selectedRecord.createdAt
                  )}
                </Text>
              ) : null}
              {selectedRecord.remarks ? (
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  }}
                >
                  Remarks: {selectedRecord.remarks}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 4,
              }}
            >
              {isSelectedDateSunday
                ? 'Weekly off (Sunday). No attendance is marked.'
                : 'No attendance record has been marked for this date.'}
            </Text>
          )}
        </View>
      ) : null}
    </SurfaceCard>
  );
}
export type AttendanceHistoryScope = 'MONTH' | 'SESSION';
export type AttendanceStatusFilter = 'ALL' | StudentAttendanceStatus;

const STATUS_FILTER_OPTIONS: {
  label: string;
  value: AttendanceStatusFilter;
}[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Present', value: 'PRESENT' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Half-Day', value: 'HALF_DAY' },
  { label: 'Late', value: 'LATE' },
  { label: 'Excused', value: 'EXCUSED' },
  { label: 'Holiday', value: 'HOLIDAY' },
];

export function AttendanceHistorySection({
  dailyRecords,
  year,
  month,
  scope,
  onChangeScope,
  statusFilter,
  onChangeStatusFilter,
  onSelectDateOnCalendar,
}: {
  dailyRecords: StudentAttendanceResponse[];
  year: number;
  month: number;
  scope: AttendanceHistoryScope;
  onChangeScope: (next: AttendanceHistoryScope) => void;
  statusFilter: AttendanceStatusFilter;
  onChangeStatusFilter: (next: AttendanceStatusFilter) => void;
  onSelectDateOnCalendar: (isoDate: string) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const [visibleLimit, setVisibleLimit] = useState(15);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const filteredRecords = useMemo(() => {
    return dailyRecords
      .filter((r) => {
        if (scope === 'MONTH' && !r.attendanceDate.startsWith(monthPrefix)) {
          return false;
        }
        if (statusFilter !== 'ALL' && r.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  }, [dailyRecords, scope, monthPrefix, statusFilter]);

  const visibleRecords = filteredRecords.slice(0, visibleLimit);
  const hasMore = filteredRecords.length > visibleLimit;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={[styles.rowBetween, { marginBottom: spacing.xs }]}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.base,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Attendance History ({filteredRecords.length})
        </Text>
      </View>

      <SegmentedSelector<AttendanceHistoryScope>
        options={[
          { label: monthLabel, value: 'MONTH' },
          { label: 'Full Session', value: 'SESSION' },
        ]}
        value={scope}
        onChange={(next) => {
          setVisibleLimit(15);
          onChangeScope(next);
        }}
        style={{ marginBottom: spacing.xs }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        style={{ marginBottom: spacing.sm }}
      >
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const isSelected = statusFilter === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                setVisibleLimit(15);
                onChangeStatusFilter(opt.value);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected
                    ? colors.textOnPrimary
                    : colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={<Inbox size={iconSizes.xl} color={colors.primary} />}
          title="No Attendance Records Found"
          description={
            scope === 'MONTH'
              ? `No attendance records match the current filter for ${monthLabel}. Switch to "Full Session" to view all recorded dates.`
              : 'No attendance records match the selected filter in this academic session.'
          }
        />
      ) : (
        <View style={{ gap: spacing.xs }}>
          {visibleRecords.map((rec) => {
            const recordedTime = formatRecordTimestamp(
              rec.updatedAt ?? rec.createdAt
            );
            return (
              <SurfaceCard
                key={rec.id}
                elevation="none"
                onPress={() => onSelectDateOnCalendar(rec.attendanceDate)}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, marginRight: spacing.xs }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {formatFullDateWithDay(rec.attendanceDate)}
                    </Text>
                    <View style={[styles.rowCenter, { marginTop: 3, gap: 8 }]}>
                      {rec.className ? (
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: typography.fontSizes.xs,
                          }}
                        >
                          {rec.className}
                        </Text>
                      ) : null}
                      {recordedTime ? (
                        <View style={styles.rowCenter}>
                          <Clock size={11} color={colors.textMuted} />
                          <Text
                            style={{
                              color: colors.textMuted,
                              fontSize: typography.fontSizes.xs,
                              marginLeft: 3,
                            }}
                          >
                            Recorded {recordedTime}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <StatusBadge
                    label={formatAttendanceStatusLabel(rec.status)}
                    tone={getStatusBadgeTone(rec.status)}
                  />
                </View>

                {rec.remarks ? (
                  <View
                    style={[
                      styles.remarksRow,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 6,
                        marginTop: spacing.xs,
                      },
                    ]}
                  >
                    <Info size={12} color={colors.textSecondary} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginLeft: 6,
                        flex: 1,
                      }}
                    >
                      {rec.remarks}
                    </Text>
                  </View>
                ) : null}
              </SurfaceCard>
            );
          })}

          {hasMore ? (
            <AppButton
              label={`Show More (${
                filteredRecords.length - visibleLimit
              } remaining)`}
              variant="secondary"
              size="sm"
              fullWidth
              onPress={() => setVisibleLimit((prev) => prev + 20)}
              style={{ marginTop: spacing.xs }}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  navIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCellWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedDateBox: {
    borderWidth: 1,
  },
  filterChip: {
    borderWidth: 1,
  },
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
