import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  Info,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type {
  ClassTimetableResponse,
  DayOfWeekName,
  PeriodType,
  TimetableConfigResponse,
  TimetableSlotResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  EmptyState,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export interface WeekdayMeta {
  key: DayOfWeekName;
  shortLabel: string;
  fullLabel: string;
  jsDay: number;
}

export const ALL_WEEK_DAYS: WeekdayMeta[] = [
  { key: 'MONDAY', shortLabel: 'Mon', fullLabel: 'Monday', jsDay: 1 },
  { key: 'TUESDAY', shortLabel: 'Tue', fullLabel: 'Tuesday', jsDay: 2 },
  { key: 'WEDNESDAY', shortLabel: 'Wed', fullLabel: 'Wednesday', jsDay: 3 },
  { key: 'THURSDAY', shortLabel: 'Thu', fullLabel: 'Thursday', jsDay: 4 },
  { key: 'FRIDAY', shortLabel: 'Fri', fullLabel: 'Friday', jsDay: 5 },
  { key: 'SATURDAY', shortLabel: 'Sat', fullLabel: 'Saturday', jsDay: 6 },
  { key: 'SUNDAY', shortLabel: 'Sun', fullLabel: 'Sunday', jsDay: 0 },
];

const JS_DAY_MAP: Record<number, DayOfWeekName> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export function getTodayDayOfWeek(): DayOfWeekName {
  return JS_DAY_MAP[new Date().getDay()] ?? 'MONDAY';
}

export function getWeekdayMeta(day: DayOfWeekName): WeekdayMeta {
  return (
    ALL_WEEK_DAYS.find((d) => d.key === day) ?? {
      key: day,
      shortLabel: day.slice(0, 3),
      fullLabel: day.charAt(0) + day.slice(1).toLowerCase(),
      jsDay: 1,
    }
  );
}

export function normalizeHHMM(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return trimmed;
}

export function formatTime12h(timeStr?: string | null): string {
  const hhmm = normalizeHHMM(timeStr);
  if (!hhmm) return '—';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange12h(
  startTime?: string | null,
  endTime?: string | null
): string {
  const start = formatTime12h(startTime);
  const end = formatTime12h(endTime);
  if (start === '—' && end === '—') return 'Time not specified';
  if (end === '—') return start;
  return `${start} – ${end}`;
}

export function computeDurationMinutes(
  startTime?: string | null,
  endTime?: string | null
): number | null {
  const s = normalizeHHMM(startTime);
  const e = normalizeHHMM(endTime);
  if (!s || !e) return null;
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return null;
  }
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

export function formatTeacherName(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const joined = [firstName?.trim(), lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  return joined.length > 0 ? joined : null;
}

export function formatPublishedDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export type DailyScheduleEntry =
  | {
      key: string;
      kind: 'TEACHING_SLOT';
      periodOrder: number | null;
      periodName: string;
      startTime: string;
      endTime: string;
      durationMinutes: number | null;
      slot: TimetableSlotResponse;
      isCurrentNow: boolean;
      isNextUp: boolean;
    }
  | {
      key: string;
      kind: 'NON_TEACHING_PERIOD';
      periodOrder: number | null;
      periodName: string;
      periodType: PeriodType;
      startTime: string;
      endTime: string;
      durationMinutes: number | null;
      isCurrentNow: boolean;
    }
  | {
      key: string;
      kind: 'UNSCHEDULED_PERIOD';
      periodOrder: number | null;
      periodName: string;
      startTime: string;
      endTime: string;
      durationMinutes: number | null;
      isCurrentNow: boolean;
    };

export function resolveWorkingDays(
  timetable: ClassTimetableResponse | null,
  config: TimetableConfigResponse | null
): DayOfWeekName[] {
  if (config?.workingDays && config.workingDays.length > 0) {
    return config.workingDays;
  }
  const slotDays = new Set<DayOfWeekName>();
  for (const s of timetable?.slots ?? []) {
    if (s.dayOfWeek) {
      slotDays.add(s.dayOfWeek);
    }
  }
  if (slotDays.size > 0) {
    const defaults: DayOfWeekName[] = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
    ];
    for (const d of defaults) {
      slotDays.add(d);
    }
    return ALL_WEEK_DAYS.map((d) => d.key).filter((k) => slotDays.has(k));
  }
  return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
}

export function buildDayScheduleEntries(
  day: DayOfWeekName,
  timetable: ClassTimetableResponse | null,
  config: TimetableConfigResponse | null
): DailyScheduleEntry[] {
  if (!timetable) return [];

  const isToday = day === getTodayDayOfWeek();
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const daySlots = (timetable.slots ?? [])
    .filter((s) => s.dayOfWeek === day)
    .sort((a, b) => {
      const timeCmp = normalizeHHMM(a.startTime).localeCompare(
        normalizeHHMM(b.startTime)
      );
      if (timeCmp !== 0) return timeCmp;
      return (a.periodOrder ?? 0) - (b.periodOrder ?? 0);
    });

  const workingDays = resolveWorkingDays(timetable, config);
  const isWorkingDay = workingDays.includes(day);
  const rawEntries: DailyScheduleEntry[] = [];

  if (
    config?.periods &&
    config.periods.length > 0 &&
    (isWorkingDay || daySlots.length > 0)
  ) {
    const matchedSlotIds = new Set<number>();
    const sortedPeriods = [...config.periods].sort((a, b) => {
      const orderCmp = (a.periodOrder ?? 0) - (b.periodOrder ?? 0);
      if (orderCmp !== 0) return orderCmp;
      return normalizeHHMM(a.startTime).localeCompare(
        normalizeHHMM(b.startTime)
      );
    });

    for (const period of sortedPeriods) {
      const startHHMM = normalizeHHMM(period.startTime);
      const endHHMM = normalizeHHMM(period.endTime);
      const isNow =
        isToday &&
        Boolean(startHHMM && endHHMM) &&
        currentHHMM >= startHHMM &&
        currentHHMM < endHHMM;
      const duration = computeDurationMinutes(period.startTime, period.endTime);

      if (period.periodType !== 'TEACHING' || period.breakPeriod) {
        rawEntries.push({
          key: `period-break-${period.id}`,
          kind: 'NON_TEACHING_PERIOD',
          periodOrder: period.periodOrder ?? null,
          periodName: period.name,
          periodType: period.periodType,
          startTime: period.startTime,
          endTime: period.endTime,
          durationMinutes: duration,
          isCurrentNow: isNow,
        });
        continue;
      }

      const matchingSlot = daySlots.find(
        (s) =>
          s.periodId === period.id ||
          (s.periodOrder === period.periodOrder &&
            normalizeHHMM(s.startTime) === startHHMM)
      );

      if (matchingSlot) {
        matchedSlotIds.add(matchingSlot.id);
        rawEntries.push({
          key: `slot-${matchingSlot.id}`,
          kind: 'TEACHING_SLOT',
          periodOrder: matchingSlot.periodOrder ?? period.periodOrder ?? null,
          periodName: matchingSlot.periodName || period.name,
          startTime: matchingSlot.startTime || period.startTime,
          endTime: matchingSlot.endTime || period.endTime,
          durationMinutes: computeDurationMinutes(
            matchingSlot.startTime || period.startTime,
            matchingSlot.endTime || period.endTime
          ),
          slot: matchingSlot,
          isCurrentNow: isNow,
          isNextUp: false,
        });
      } else if (daySlots.length > 0) {
        rawEntries.push({
          key: `unscheduled-${period.id}`,
          kind: 'UNSCHEDULED_PERIOD',
          periodOrder: period.periodOrder ?? null,
          periodName: period.name,
          startTime: period.startTime,
          endTime: period.endTime,
          durationMinutes: duration,
          isCurrentNow: isNow,
        });
      }
    }

    for (const unmatched of daySlots) {
      if (!matchedSlotIds.has(unmatched.id)) {
        const startHHMM = normalizeHHMM(unmatched.startTime);
        const endHHMM = normalizeHHMM(unmatched.endTime);
        const isNow =
          isToday &&
          Boolean(startHHMM && endHHMM) &&
          currentHHMM >= startHHMM &&
          currentHHMM < endHHMM;
        rawEntries.push({
          key: `slot-${unmatched.id}`,
          kind: 'TEACHING_SLOT',
          periodOrder: unmatched.periodOrder ?? null,
          periodName:
            unmatched.periodName ||
            `Period ${unmatched.periodOrder ?? ''}`.trim(),
          startTime: unmatched.startTime,
          endTime: unmatched.endTime,
          durationMinutes: computeDurationMinutes(
            unmatched.startTime,
            unmatched.endTime
          ),
          slot: unmatched,
          isCurrentNow: isNow,
          isNextUp: false,
        });
      }
    }
  } else {
    for (const slot of daySlots) {
      const startHHMM = normalizeHHMM(slot.startTime);
      const endHHMM = normalizeHHMM(slot.endTime);
      const isNow =
        isToday &&
        Boolean(startHHMM && endHHMM) &&
        currentHHMM >= startHHMM &&
        currentHHMM < endHHMM;
      rawEntries.push({
        key: `slot-${slot.id}`,
        kind: 'TEACHING_SLOT',
        periodOrder: slot.periodOrder ?? null,
        periodName:
          slot.periodName || `Period ${slot.periodOrder ?? ''}`.trim(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: computeDurationMinutes(slot.startTime, slot.endTime),
        slot,
        isCurrentNow: isNow,
        isNextUp: false,
      });
    }
  }

  rawEntries.sort((a, b) => {
    const timeCmp = normalizeHHMM(a.startTime).localeCompare(
      normalizeHHMM(b.startTime)
    );
    if (timeCmp !== 0) return timeCmp;
    return (a.periodOrder ?? 0) - (b.periodOrder ?? 0);
  });

  if (isToday && !rawEntries.some((e) => e.isCurrentNow)) {
    for (const entry of rawEntries) {
      if (
        entry.kind === 'TEACHING_SLOT' &&
        normalizeHHMM(entry.startTime) > currentHHMM
      ) {
        entry.isNextUp = true;
        break;
      }
    }
  }

  return rawEntries;
}

export function TimetableAcademicContextCard({
  timetable,
  config,
  fallbackSessionName,
  fallbackClassName,
  fallbackSectionName,
}: {
  timetable: ClassTimetableResponse;
  config: TimetableConfigResponse | null;
  fallbackSessionName?: string | null;
  fallbackClassName?: string | null;
  fallbackSectionName?: string | null;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const sessionLabel =
    timetable.academicSessionName ?? fallbackSessionName ?? null;
  const classLabel = timetable.className ?? fallbackClassName ?? null;
  const sectionLabel = timetable.sectionName ?? fallbackSectionName ?? null;
  const workingDays = useMemo(
    () => resolveWorkingDays(timetable, config),
    [timetable, config]
  );

  const schoolHoursLabel = useMemo(() => {
    if (config?.dayStartTime && config?.dayEndTime) {
      return formatTimeRange12h(config.dayStartTime, config.dayEndTime);
    }
    const slots = timetable.slots ?? [];
    if (slots.length === 0) return null;
    const sortedStarts = slots
      .map((s) => normalizeHHMM(s.startTime))
      .filter(Boolean)
      .sort();
    const sortedEnds = slots
      .map((s) => normalizeHHMM(s.endTime))
      .filter(Boolean)
      .sort();
    if (sortedStarts.length === 0 || sortedEnds.length === 0) return null;
    return formatTimeRange12h(
      sortedStarts[0],
      sortedEnds[sortedEnds.length - 1]
    );
  }, [timetable.slots, config]);

  const breakPeriodsCount = useMemo(() => {
    if (!config?.periods) return 0;
    return config.periods.filter(
      (p) => p.periodType !== 'TEACHING' || p.breakPeriod
    ).length;
  }, [config]);

  const publishedDateLabel = formatPublishedDate(timetable.publishedAt);
  const uniqueSubjectsCount = useMemo(() => {
    const ids = new Set<string>();
    for (const s of timetable.slots ?? []) {
      const key = s.subjectId
        ? `id-${s.subjectId}`
        : (s.subjectName ?? '').trim().toLowerCase();
      if (key) ids.add(key);
    }
    return ids.size;
  }, [timetable.slots]);

  const metrics: Array<{
    key: string;
    label: string;
    value: string;
    Icon: typeof Clock;
  }> = [
    ...(schoolHoursLabel
      ? [
          {
            key: 'hours',
            label: 'School Hours',
            value: schoolHoursLabel,
            Icon: Clock,
          },
        ]
      : []),
    {
      key: 'days',
      label: 'Working Days',
      value: `${workingDays.length} ${
        workingDays.length === 1 ? 'Day' : 'Days'
      } / Week`,
      Icon: Calendar,
    },
    {
      key: 'periods',
      label: 'Weekly Periods',
      value: `${(timetable.slots ?? []).length} Classes${
        uniqueSubjectsCount > 0 ? ` • ${uniqueSubjectsCount} Subjects` : ''
      }`,
      Icon: BookOpen,
    },
  ];

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={[styles.rowCenterWrap, { gap: 6 }]}>
        <StatusBadge label="Published" tone="success" />
        {sessionLabel ? (
          <StatusBadge label={sessionLabel} tone="primary" />
        ) : null}
        {classLabel ? (
          <StatusBadge
            label={
              sectionLabel
                ? `${classLabel} • Section ${sectionLabel}`
                : `${classLabel} (Class-Wide)`
            }
            tone="neutral"
          />
        ) : null}
        {timetable.revisionNumber && timetable.revisionNumber > 1 ? (
          <StatusBadge label={`Rev #${timetable.revisionNumber}`} tone="info" />
        ) : null}
      </View>

      <View
        style={[
          styles.metricsGrid,
          { marginTop: spacing.sm, gap: spacing.xs },
        ]}
      >
        {metrics.map((m) => (
          <View
            key={m.key}
            style={[
              styles.metricPill,
              {
                backgroundColor: colors.backgroundSubtle,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <View style={styles.rowCenter}>
              <m.Icon size={iconSizes.xs} color={colors.primary} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  marginLeft: 4,
                }}
              >
                {m.label}
              </Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                marginTop: 2,
              }}
            >
              {m.value}
            </Text>
          </View>
        ))}
      </View>

      {timetable.timetableConfigName ||
      publishedDateLabel ||
      breakPeriodsCount > 0 ||
      timetable.notes ? (
        <View
          style={{
            marginTop: spacing.sm,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            gap: 4,
          }}
        >
          <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
            {timetable.timetableConfigName ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                Structure:{' '}
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {timetable.timetableConfigName}
                </Text>
                {breakPeriodsCount > 0
                  ? ` (${breakPeriodsCount} daily break${
                      breakPeriodsCount === 1 ? '' : 's'
                    })`
                  : ''}
              </Text>
            ) : null}
            {publishedDateLabel ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                Published {publishedDateLabel}
              </Text>
            ) : null}
          </View>
          {timetable.notes ? (
            <View style={[styles.rowCenter, { marginTop: 2 }]}>
              <Info size={iconSizes.xs} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginLeft: 5,
                  flex: 1,
                }}
              >
                {timetable.notes}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </SurfaceCard>
  );
}

export type TimetableViewMode = 'DAILY' | 'WEEKLY_SUMMARY';

export function WeekdaySelectorStrip({
  selectedDay,
  onSelectDay,
  timetable,
  config,
  viewMode,
  onChangeViewMode,
  showViewModeToggle = true,
}: {
  selectedDay: DayOfWeekName;
  onSelectDay: (day: DayOfWeekName) => void;
  timetable: ClassTimetableResponse;
  config: TimetableConfigResponse | null;
  viewMode: TimetableViewMode;
  onChangeViewMode: (mode: TimetableViewMode) => void;
  showViewModeToggle?: boolean;
}) {
  const { colors, spacing, typography, radius, touchTargets } = useAppTheme();
  const todayDay = getTodayDayOfWeek();
  const workingDays = useMemo(
    () => resolveWorkingDays(timetable, config),
    [timetable, config]
  );

  const slotCountsByDay = useMemo(() => {
    const counts: Record<DayOfWeekName, number> = {
      MONDAY: 0,
      TUESDAY: 0,
      WEDNESDAY: 0,
      THURSDAY: 0,
      FRIDAY: 0,
      SATURDAY: 0,
      SUNDAY: 0,
    };
    for (const s of timetable.slots ?? []) {
      if (s.dayOfWeek && counts[s.dayOfWeek] !== undefined) {
        counts[s.dayOfWeek] += 1;
      }
    }
    return counts;
  }, [timetable.slots]);

  const todayMeta = getWeekdayMeta(todayDay);

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.rowBetweenWrap,
          { marginBottom: spacing.sm, gap: spacing.xs },
        ]}
      >
        <View style={[styles.rowCenterWrap, { gap: 8 }]}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            Select Day of Week
          </Text>
          {selectedDay !== todayDay ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Jump to today, ${todayMeta.fullLabel}`}
              onPress={() => {
                onSelectDay(todayDay);
                if (viewMode !== 'DAILY') {
                  onChangeViewMode('DAILY');
                }
              }}
              style={({ pressed }) => [
                styles.todayJumpChip,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primarySoftBorder,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.xs + 2,
                  paddingVertical: 3,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Today ({todayMeta.shortLabel})
              </Text>
            </Pressable>
          ) : null}
        </View>

        {showViewModeToggle ? (
          <View
            style={[
              styles.modeSegment,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.sm,
                padding: 2,
              },
            ]}
          >
            {(
              [
                { mode: 'DAILY' as const, label: 'Daily' },
                { mode: 'WEEKLY_SUMMARY' as const, label: 'Subjects' },
              ]
            ).map((opt) => {
              const active = viewMode === opt.mode;
              return (
                <Pressable
                  key={opt.mode}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => onChangeViewMode(opt.mode)}
                  style={[
                    styles.modeSegmentBtn,
                    {
                      backgroundColor: active ? colors.surface : 'transparent',
                      borderRadius: radius.xs ?? 6,
                      paddingHorizontal: spacing.xs + 2,
                      paddingVertical: 4,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: active
                        ? typography.fontWeights.bold
                        : typography.fontWeights.medium,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>


      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {ALL_WEEK_DAYS.map((day) => {
          const isSelected = selectedDay === day.key;
          const isToday = todayDay === day.key;
          const count = slotCountsByDay[day.key] ?? 0;
          const isWorking = workingDays.includes(day.key) || count > 0;

          return (
            <Pressable
              key={day.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${day.fullLabel}${
                isToday ? ', Today' : ''
              }, ${
                isWorking
                  ? `${count} scheduled ${count === 1 ? 'period' : 'periods'}`
                  : 'Non-working day'
              }`}
              onPress={() => {
                onSelectDay(day.key);
                if (viewMode !== 'DAILY') {
                  onChangeViewMode('DAILY');
                }
              }}
              style={({ pressed }) => [
                styles.dayChip,
                {
                  minHeight: touchTargets.minHeight,
                  backgroundColor: isSelected
                    ? colors.primary
                    : isToday
                    ? colors.primarySoft
                    : isWorking
                    ? colors.backgroundSubtle
                    : colors.surfaceMuted,
                  borderColor: isSelected
                    ? colors.primary
                    : isToday
                    ? colors.primarySoftBorder
                    : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  opacity: pressed ? 0.85 : isWorking || isSelected ? 1 : 0.72,
                },
              ]}
            >
              <View style={styles.rowCenter}>
                <Text
                  style={{
                    color: isSelected
                      ? colors.textOnPrimary
                      : isToday
                      ? colors.primaryText
                      : isWorking
                      ? colors.textPrimary
                      : colors.textMuted,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {day.shortLabel}
                </Text>
                {isToday ? (
                  <View
                    style={[
                      styles.todayDot,
                      {
                        backgroundColor: isSelected
                          ? colors.textOnPrimary
                          : colors.primary,
                        marginLeft: 4,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <Text
                style={{
                  color: isSelected
                    ? colors.textOnPrimary
                    : isToday
                    ? colors.primaryText
                    : isWorking
                    ? colors.textSecondary
                    : colors.textMuted,
                  fontSize: 10,
                  fontWeight: typography.fontWeights.medium,
                  marginTop: 2,
                }}
              >
                {isWorking
                  ? `${count} ${count === 1 ? 'class' : 'classes'}`
                  : 'Off'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SurfaceCard>
  );
}

function formatPeriodTypeLabel(periodType: PeriodType): string {
  switch (periodType) {
    case 'LUNCH_BREAK':
      return 'Lunch Break';
    case 'SHORT_BREAK':
      return 'Short Break';
    case 'ASSEMBLY':
      return 'Morning Assembly';
    default:
      return 'Teaching Period';
  }
}

export function DailyScheduleTimelineSection({
  selectedDay,
  timetable,
  config,
  onSelectSlot,
  onJumpToDay,
}: {
  selectedDay: DayOfWeekName;
  timetable: ClassTimetableResponse;
  config: TimetableConfigResponse | null;
  onSelectSlot: (slot: TimetableSlotResponse) => void;
  onJumpToDay: (day: DayOfWeekName) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const dayMeta = getWeekdayMeta(selectedDay);
  const todayDay = getTodayDayOfWeek();
  const isToday = selectedDay === todayDay;

  const workingDays = useMemo(
    () => resolveWorkingDays(timetable, config),
    [timetable, config]
  );

  const entries = useMemo(
    () => buildDayScheduleEntries(selectedDay, timetable, config),
    [selectedDay, timetable, config]
  );

  const teachingEntries = useMemo(
    () => entries.filter((e) => e.kind === 'TEACHING_SLOT'),
    [entries]
  );

  const breakEntries = useMemo(
    () => entries.filter((e) => e.kind === 'NON_TEACHING_PERIOD'),
    [entries]
  );

  const isWorkingDay =
    workingDays.includes(selectedDay) || teachingEntries.length > 0;

  const fallbackJumpDay = useMemo<DayOfWeekName>(() => {
    if (workingDays.includes(todayDay)) return todayDay;
    return workingDays[0] ?? 'MONDAY';
  }, [workingDays, todayDay]);

  const fallbackJumpMeta = getWeekdayMeta(fallbackJumpDay);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.rowBetweenWrap,
          { marginBottom: spacing.sm, gap: spacing.xs },
        ]}
      >
        <View style={[styles.rowCenterWrap, { gap: 8 }]}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {dayMeta.fullLabel} Schedule
          </Text>
          {isToday ? <StatusBadge label="Today" tone="primary" /> : null}
          <StatusBadge
            label={isWorkingDay ? 'Working Day' : 'Non-Working Day'}
            tone={isWorkingDay ? 'success' : 'neutral'}
          />
        </View>
        {isWorkingDay && teachingEntries.length > 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.medium,
            }}
          >
            {teachingEntries.length}{' '}
            {teachingEntries.length === 1 ? 'Class' : 'Classes'}
            {breakEntries.length > 0
              ? ` • ${breakEntries.length} ${
                  breakEntries.length === 1 ? 'Break' : 'Breaks'
                }`
              : ''}
          </Text>
        ) : null}
      </View>

      {!isWorkingDay && teachingEntries.length === 0 ? (
        <EmptyState
          icon={<Calendar size={iconSizes.xl} color={colors.textMuted} />}
          title={`No School on ${dayMeta.fullLabel}`}
          description={`${dayMeta.fullLabel} is a non-working day for ${
            timetable.className ?? 'this class'
          }${
            timetable.sectionName ? ` (Section ${timetable.sectionName})` : ''
          }. No teaching periods are scheduled.`}
          actionLabel={`View ${fallbackJumpMeta.fullLabel}'s Schedule`}
          onActionPress={() => onJumpToDay(fallbackJumpDay)}
        />
      ) : teachingEntries.length === 0 ? (
        <EmptyState
          icon={<Clock size={iconSizes.xl} color={colors.primary} />}
          title={`No Classes Scheduled for ${dayMeta.fullLabel}`}
          description={`While ${dayMeta.fullLabel} is part of the school week, no subject periods have been assigned for this day in the published timetable.`}
          actionLabel={
            selectedDay !== fallbackJumpDay
              ? `View ${fallbackJumpMeta.fullLabel}'s Schedule`
              : undefined
          }
          onActionPress={
            selectedDay !== fallbackJumpDay
              ? () => onJumpToDay(fallbackJumpDay)
              : undefined
          }
        />
      ) : (
        <View style={{ gap: spacing.xs + 2 }}>
          {entries.map((entry) => (
            <DailyScheduleEntryRow
              key={entry.key}
              entry={entry}
              onSelectSlot={onSelectSlot}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function DailyScheduleEntryRow({
  entry,
  onSelectSlot,
}: {
  entry: DailyScheduleEntry;
  onSelectSlot: (slot: TimetableSlotResponse) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isNarrowScreen = windowWidth > 0 && windowWidth < 400;

  if (entry.kind === 'NON_TEACHING_PERIOD') {
    const isAssembly = entry.periodType === 'ASSEMBLY';
    const toneBg = isAssembly ? colors.infoSoft : colors.warningSoft;
    const toneBorder = isAssembly ? colors.infoBorder : colors.warningBorder;
    const toneText = isAssembly ? colors.infoText : colors.warningText;
    const typeLabel = formatPeriodTypeLabel(entry.periodType);
    const displayTitle = (entry.periodName || typeLabel).trim();
    const showTypeBadge =
      displayTitle.toLowerCase() !== typeLabel.toLowerCase();

    return (
      <View
        style={[
          styles.breakRow,
          {
            backgroundColor: toneBg,
            borderColor: toneBorder,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 4,
          },
        ]}
      >
        <Sparkles
          size={iconSizes.sm}
          color={toneText}
          style={{ marginTop: 2, marginRight: spacing.xs }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={[
              styles.rowBetweenWrap,
              { gap: 6, alignItems: 'center' },
            ]}
          >
            <View
              style={[
                styles.rowCenterWrap,
                { gap: 6, flexShrink: 1, minWidth: 0 },
              ]}
            >
              <Text
                style={{
                  color: toneText,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                  flexShrink: 1,
                }}
              >
                {displayTitle}
              </Text>
              {showTypeBadge ? (
                <StatusBadge
                  label={typeLabel}
                  tone={isAssembly ? 'info' : 'warning'}
                />
              ) : null}
              {entry.isCurrentNow ? (
                <StatusBadge label="NOW" tone="primary" />
              ) : null}
            </View>

            {!isNarrowScreen ? (
              <View style={[styles.rowCenter, { flexShrink: 0 }]}>
                <Text
                  style={{
                    color: toneText,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {formatTimeRange12h(entry.startTime, entry.endTime)}
                </Text>
                {entry.durationMinutes ? (
                  <Text
                    style={{
                      color: toneText,
                      fontSize: 11,
                      opacity: 0.85,
                      marginLeft: 4,
                    }}
                  >
                    ({entry.durationMinutes}m)
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {isNarrowScreen ? (
            <View style={[styles.rowCenter, { marginTop: 4 }]}>
              <Clock size={12} color={toneText} />
              <Text
                style={{
                  color: toneText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: 4,
                }}
              >
                {formatTimeRange12h(entry.startTime, entry.endTime)}
                {entry.durationMinutes ? ` • ${entry.durationMinutes} min` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (entry.kind === 'UNSCHEDULED_PERIOD') {
    const periodBadgeLabel = entry.periodOrder
      ? `P${entry.periodOrder}`
      : 'Free';

    return (
      <View
        style={[
          styles.unscheduledRow,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: spacing.xs + 4,
          },
        ]}
      >
        <View
          style={[
            styles.freePeriodLeftBadge,
            {
              backgroundColor: colors.backgroundSubtle,
              borderColor: colors.border,
              borderRadius: radius.sm,
              paddingVertical: 5,
              paddingHorizontal: 7,
              marginRight: spacing.sm,
            },
          ]}
        >
          <Clock size={12} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: typography.fontWeights.bold,
              marginLeft: 4,
            }}
          >
            {periodBadgeLabel}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {isNarrowScreen ? (
            <View style={{ gap: 3 }}>
              <View style={[styles.rowCenterWrap, { gap: 6, minWidth: 0 }]}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    flexShrink: 1,
                  }}
                >
                  Free Period
                </Text>
                {entry.periodName ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                      flexShrink: 1,
                    }}
                  >
                    • {entry.periodName}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                }}
              >
                {formatTimeRange12h(entry.startTime, entry.endTime)}
                {entry.durationMinutes ? ` (${entry.durationMinutes}m)` : ''}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.rowBetweenWrap,
                { gap: 6, alignItems: 'center' },
              ]}
            >
              <View
                style={[
                  styles.rowCenterWrap,
                  { gap: 6, flexShrink: 1, minWidth: 0 },
                ]}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  Free Period
                </Text>
                {entry.periodName ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                      flexShrink: 1,
                    }}
                  >
                    • {entry.periodName}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.medium,
                  flexShrink: 0,
                }}
              >
                {formatTimeRange12h(entry.startTime, entry.endTime)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const { slot } = entry;
  const teacherName = formatTeacherName(
    slot.teacherFirstName,
    slot.teacherLastName
  );
  const highlighted = entry.isCurrentNow || entry.isNextUp;

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={() => onSelectSlot(slot)}
      style={
        highlighted
          ? {
              borderColor: colors.primary,
              borderWidth: 1.5,
              backgroundColor: entry.isCurrentNow
                ? colors.primarySoft
                : colors.surface,
            }
          : undefined
      }
    >
      <View style={styles.periodCardRow}>
        <View
          style={[
            styles.periodOrderBox,
            {
              backgroundColor: highlighted
                ? colors.primary
                : colors.primarySoft,
              borderRadius: radius.md,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.xs,
              marginRight: spacing.sm,
            },
          ]}
        >
          <Text
            style={{
              color: highlighted ? colors.textOnPrimary : colors.primaryText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {entry.periodOrder ? `P${entry.periodOrder}` : 'Class'}
          </Text>
          {entry.durationMinutes ? (
            <Text
              style={{
                color: highlighted ? colors.textOnPrimary : colors.primaryText,
                fontSize: 10,
                opacity: 0.9,
                marginTop: 2,
              }}
            >
              {entry.durationMinutes}m
            </Text>
          ) : null}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
            <View
              style={[
                styles.rowCenterWrap,
                { gap: 6, flexShrink: 1, minWidth: 0 },
              ]}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  flexShrink: 1,
                }}
              >
                {entry.periodName}
              </Text>
              {entry.isCurrentNow ? (
                <StatusBadge label="In Progress" tone="primary" />
              ) : entry.isNextUp ? (
                <StatusBadge label="Up Next" tone="info" />
              ) : null}
            </View>
            <View style={[styles.rowCenter, { flexShrink: 0 }]}>
              <Clock size={iconSizes.xs} color={colors.textMuted} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: 4,
                }}
              >
                {formatTimeRange12h(entry.startTime, entry.endTime)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.rowCenterWrap,
              { marginTop: 4, gap: 6, minWidth: 0 },
            ]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
                flexShrink: 1,
              }}
            >
              {slot.subjectName ?? 'Scheduled Subject'}
            </Text>
            {slot.subjectCode ? (
              <StatusBadge label={slot.subjectCode} tone="neutral" />
            ) : null}
          </View>

          {teacherName || slot.room ? (
            <View
              style={[
                styles.rowCenterWrap,
                { marginTop: 6, gap: spacing.sm },
              ]}
            >
              {teacherName ? (
                <View style={styles.rowCenter}>
                  <UserCheck size={iconSizes.xs} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      marginLeft: 4,
                    }}
                  >
                    {teacherName}
                  </Text>
                </View>
              ) : null}

              {slot.room ? (
                <View style={styles.rowCenter}>
                  <Building2 size={iconSizes.xs} color={colors.textMuted} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginLeft: 4,
                    }}
                  >
                    Room {slot.room}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {slot.remarks ? (
            <Text
              numberOfLines={2}
              style={{
                color: colors.textMuted,
                fontSize: typography.fontSizes.xs,
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              Note: {slot.remarks}
            </Text>
          ) : null}
        </View>
      </View>
    </SurfaceCard>
  );
}

interface SubjectAggregateRow {
  key: string;
  subjectName: string;
  subjectCode: string | null;
  teachers: string[];
  rooms: string[];
  weeklyCount: number;
  days: DayOfWeekName[];
}

export function WeeklySubjectSummarySection({
  timetable,
  selectedDay,
  onSelectDay,
}: {
  timetable: ClassTimetableResponse;
  selectedDay: DayOfWeekName;
  onSelectDay: (day: DayOfWeekName) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const subjectRows = useMemo<SubjectAggregateRow[]>(() => {
    const map = new Map<
      string,
      {
        subjectName: string;
        subjectCode: string | null;
        teachers: Set<string>;
        rooms: Set<string>;
        weeklyCount: number;
        days: Set<DayOfWeekName>;
      }
    >();

    for (const s of timetable.slots ?? []) {
      const key = s.subjectId
        ? `id-${s.subjectId}`
        : (s.subjectName ?? 'Scheduled Subject').trim().toLowerCase();
      let row = map.get(key);
      if (!row) {
        row = {
          subjectName: s.subjectName ?? 'Scheduled Subject',
          subjectCode: s.subjectCode ?? null,
          teachers: new Set<string>(),
          rooms: new Set<string>(),
          weeklyCount: 0,
          days: new Set<DayOfWeekName>(),
        };
        map.set(key, row);
      }
      row.weeklyCount += 1;
      if (s.dayOfWeek) row.days.add(s.dayOfWeek);
      const tName = formatTeacherName(s.teacherFirstName, s.teacherLastName);
      if (tName) row.teachers.add(tName);
      if (s.room?.trim()) row.rooms.add(s.room.trim());
    }

    return Array.from(map.entries())
      .map(([key, val]) => ({
        key,
        subjectName: val.subjectName,
        subjectCode: val.subjectCode,
        teachers: Array.from(val.teachers),
        rooms: Array.from(val.rooms),
        weeklyCount: val.weeklyCount,
        days: ALL_WEEK_DAYS.map((d) => d.key).filter((d) => val.days.has(d)),
      }))
      .sort((a, b) => {
        if (b.weeklyCount !== a.weeklyCount) return b.weeklyCount - a.weeklyCount;
        return a.subjectName.localeCompare(b.subjectName);
      });
  }, [timetable.slots]);

  if (subjectRows.length === 0) {
    return null;
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ marginBottom: spacing.sm }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.base,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Weekly Subject Distribution
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginTop: 2,
          }}
        >
          {subjectRows.length}{' '}
          {subjectRows.length === 1 ? 'subject' : 'subjects'} across{' '}
          {(timetable.slots ?? []).length} weekly teaching periods
        </Text>
      </View>

      <View style={{ gap: spacing.xs + 2 }}>
        {subjectRows.map((row) => (
          <SurfaceCard key={row.key} elevation="subtle">
            <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
              <View style={[styles.rowCenterWrap, { gap: 6, flex: 1 }]}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {row.subjectName}
                </Text>
                {row.subjectCode ? (
                  <StatusBadge label={row.subjectCode} tone="neutral" />
                ) : null}
              </View>
              <StatusBadge
                label={`${row.weeklyCount} ${
                  row.weeklyCount === 1 ? 'period' : 'periods'
                }/wk`}
                tone="primary"
              />
            </View>

            {row.teachers.length > 0 || row.rooms.length > 0 ? (
              <View
                style={[
                  styles.rowCenterWrap,
                  { marginTop: 6, gap: spacing.sm },
                ]}
              >
                {row.teachers.length > 0 ? (
                  <View style={styles.rowCenter}>
                    <UserCheck size={iconSizes.xs} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginLeft: 4,
                      }}
                    >
                      {row.teachers.join(', ')}
                    </Text>
                  </View>
                ) : null}
                {row.rooms.length > 0 ? (
                  <View style={styles.rowCenter}>
                    <Building2 size={iconSizes.xs} color={colors.textMuted} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginLeft: 4,
                      }}
                    >
                      {row.rooms.map((r) => `Room ${r}`).join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.rowCenterWrap,
                { marginTop: spacing.xs + 2, gap: 6 },
              ]}
            >
              {row.days.map((d) => {
                const meta = getWeekdayMeta(d);
                const isSelected = d === selectedDay;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${meta.fullLabel} schedule for ${row.subjectName}`}
                    onPress={() => onSelectDay(d)}
                    style={({ pressed }) => [
                      styles.subjectDayBadge,
                      {
                        backgroundColor: isSelected
                          ? colors.primarySoft
                          : colors.backgroundSubtle,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        borderRadius: radius.sm,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? colors.primaryText
                          : colors.textSecondary,
                        fontSize: 11,
                        fontWeight: isSelected
                          ? typography.fontWeights.bold
                          : typography.fontWeights.medium,
                      }}
                    >
                      {meta.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SurfaceCard>
        ))}
      </View>
    </View>
  );
}

export function TimetableSlotDetailModal({
  visible,
  slot,
  academicSessionName,
  onClose,
}: {
  visible: boolean;
  slot: TimetableSlotResponse | null;
  academicSessionName?: string | null;
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  if (!slot) return null;

  const dayMeta = getWeekdayMeta(slot.dayOfWeek);
  const teacherName = formatTeacherName(
    slot.teacherFirstName,
    slot.teacherLastName
  );
  const duration = computeDurationMinutes(slot.startTime, slot.endTime);

  const infoRows: Array<{ label: string; value: string }> = [
    {
      label: 'Day & Period',
      value: `${dayMeta.fullLabel} • ${
        slot.periodName || `Period ${slot.periodOrder ?? ''}`
      }${slot.periodOrder ? ` (#${slot.periodOrder})` : ''}`,
    },
    {
      label: 'Time Slot',
      value: `${formatTimeRange12h(slot.startTime, slot.endTime)}${
        duration ? ` (${duration} mins)` : ''
      }`,
    },
    ...(slot.className
      ? [
          {
            label: 'Class & Section',
            value: slot.sectionName
              ? `${slot.className} • Section ${slot.sectionName}`
              : `${slot.className} (Class-Wide)`,
          },
        ]
      : []),
    ...(academicSessionName
      ? [{ label: 'Academic Session', value: academicSessionName }]
      : []),
    ...(teacherName ? [{ label: 'Assigned Teacher', value: teacherName }] : []),
    ...(slot.room ? [{ label: 'Classroom / Room', value: slot.room }] : []),
    ...(slot.remarks
      ? [{ label: 'Teacher / Schedule Note', value: slot.remarks }]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlayScrim, padding: spacing.md },
        ]}
      >
        <SurfaceCard
          style={{
            ...styles.modalCard,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          }}
        >
          <View style={[styles.rowBetweenWrap, { marginBottom: spacing.sm }]}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <View style={[styles.rowCenterWrap, { gap: 6 }]}>
                <StatusBadge label={dayMeta.fullLabel} tone="primary" />
                {slot.subjectCode ? (
                  <StatusBadge label={slot.subjectCode} tone="neutral" />
                ) : null}
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 6,
                }}
              >
                {slot.subjectName ?? 'Scheduled Period'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close period details"
              hitSlop={8}
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.full,
                  padding: 6,
                },
              ]}
            >
              <X size={iconSizes.sm} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: spacing.xs + 2, marginBottom: spacing.md }}>
            {infoRows.map((row) => (
              <View
                key={row.label}
                style={[
                  styles.detailRow,
                  {
                    backgroundColor: colors.backgroundSubtle,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs + 2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  {row.label}
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    marginTop: 2,
                  }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <AppButton
            label="Done"
            variant="secondary"
            fullWidth
            onPress={onClose}
          />
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowCenterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowBetweenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricPill: {
    flexGrow: 1,
    minWidth: 130,
    borderWidth: 1,
  },
  todayJumpChip: {
    borderWidth: 1,
  },
  modeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  modeSegmentBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  unscheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  freePeriodLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  periodCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  periodOrderBox: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectDayBadge: {
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    borderWidth: 1,
  },
});
