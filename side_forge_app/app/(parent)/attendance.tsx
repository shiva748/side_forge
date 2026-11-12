import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { queryKeys } from '@/api/queryKeys';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  ChildSwitcherBanner,
  type ChildBannerOption,
} from '@/components/workspace/ChildSwitcherBanner';
import {
  AttendanceHistorySection,
  type AttendanceHistoryScope,
  AttendanceOverallSummaryCard,
  type AttendanceStatusFilter,
  MonthlyAttendanceCalendarCard,
} from '@/components/parent/ParentAttendanceComponents';
import type {
  ParentDashboardResponse,
  StudentAttendanceResponse,
} from '@/types/parentPortal';
import {
  FeedbackBanner,
  LoadingStateView,
  PickerField,
  ScreenContainer,
  type SelectOption,
} from '@/components/ui';

export default function ParentAttendanceScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();

  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(
    now.getMonth() + 1
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [historyScope, setHistoryScope] =
    useState<AttendanceHistoryScope>('MONTH');
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>('ALL');

  // Seed linked children from cached Parent Dashboard if already loaded
  const cachedDashboard = queryClient.getQueryData<ParentDashboardResponse>(
    queryKeys.parentPortal.dashboard(organizationId)
  );

  const childrenQuery = useQuery({
    queryKey: queryKeys.parentPortal.children(organizationId),
    queryFn: () => parentPortalApi.getLinkedChildren(organizationId),
    enabled: organizationId > 0,
    initialData: cachedDashboard
      ? cachedDashboard.children.map((c) => c.child)
      : undefined,
  });

  const childrenList = childrenQuery.data ?? [];

  const activeChildId = useMemo(() => {
    if (childrenList.length === 0) return null;
    const match = childrenList.find((c) => c.studentId === selectedChildId);
    return match ? match.studentId : childrenList[0].studentId;
  }, [childrenList, selectedChildId]);

  useEffect(() => {
    if (activeChildId && activeChildId !== selectedChildId) {
      setSelectedChildId(activeChildId);
    }
  }, [activeChildId, selectedChildId, setSelectedChildId]);

  const childDetailsQuery = useQuery({
    queryKey: queryKeys.parentPortal.childDetails(
      organizationId,
      activeChildId ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildDetails(organizationId, activeChildId!),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const effectiveSessionId = useMemo(() => {
    if (selectedSessionId) return selectedSessionId;
    const fromDetails =
      childDetailsQuery.data?.currentEnrollment?.academicSessionId;
    if (fromDetails) return fromDetails;
    const fromChild = childrenList.find(
      (c) => c.studentId === activeChildId
    )?.academicSessionId;
    return fromChild ?? null;
  }, [
    selectedSessionId,
    childDetailsQuery.data,
    childrenList,
    activeChildId,
  ]);

  const attendanceQuery = useQuery({
    queryKey: queryKeys.parentPortal.childAttendance(
      organizationId,
      activeChildId ?? 0,
      effectiveSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildAttendance(organizationId, activeChildId!, {
        academicSessionId: effectiveSessionId,
      }),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const attendanceData = attendanceQuery.data;

  useEffect(() => {
    const latestMonthItem = attendanceData?.monthlySummaries?.[0];
    if (latestMonthItem?.yearMonth) {
      const [y, m] = latestMonthItem.yearMonth.split('-').map(Number);
      if (y && m) {
        setCalendarYear(y);
        setCalendarMonth(m);
      }
    }
    const latestRecord = attendanceData?.dailyRecords?.[0];
    if (latestRecord?.attendanceDate) {
      setSelectedDate(latestRecord.attendanceDate);
    } else {
      setSelectedDate(null);
    }
  }, [
    activeChildId,
    effectiveSessionId,
    attendanceData?.studentId,
    attendanceData?.academicSessionId,
  ]);

  const handleSelectChild = useCallback(
    (newChildId: number) => {
      if (newChildId === activeChildId) return;
      setSelectedChildId(newChildId);
      setSelectedSessionId(null);
      setSelectedDate(null);
      setStatusFilter('ALL');
      setHistoryScope('MONTH');
    },
    [activeChildId, setSelectedChildId]
  );

  const handleChangeMonth = useCallback(
    (nextYear: number, nextMonth: number) => {
      setCalendarYear(nextYear);
      setCalendarMonth(nextMonth);
      setSelectedDate(null);
    },
    []
  );

  const handleSelectDateFromHistory = useCallback((isoDate: string) => {
    const [y, m] = isoDate.split('-').map(Number);
    if (y && m) {
      setCalendarYear(y);
      setCalendarMonth(m);
    }
    setSelectedDate(isoDate);
  }, []);

  const resolvedSectionName =
    childDetailsQuery.data?.currentEnrollment?.sectionName ?? null;

  const childBannerOptions: ChildBannerOption[] = useMemo(() => {
    return childrenList.map((child) => {
      const isCurrent = child.studentId === activeChildId;
      const sec = isCurrent ? resolvedSectionName : child.sectionName;
      const classLabel = [
        child.className ?? 'Unassigned Class',
        sec ? `Section ${sec}` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      return {
        id: child.studentId,
        studentId: child.studentId,
        organizationId: child.organizationId,
        fullName: child.fullName,
        classLabel,
        className: child.className,
        sectionName: sec,
        rollNumber: child.rollNumber,
        admissionNumber: child.admissionNumber,
        academicSessionName:
          isCurrent && attendanceData?.academicSessionName
            ? attendanceData.academicSessionName
            : child.academicSessionName,
        profilePhotoUrl: child.profilePhotoUrl,
        relationshipType: child.relationshipType,
      };
    });
  }, [
    childrenList,
    activeChildId,
    resolvedSectionName,
    attendanceData?.academicSessionName,
  ]);

  const sessionOptions: SelectOption<number>[] = useMemo(() => {
    const history = childDetailsQuery.data?.enrollmentHistory ?? [];
    const seen = new Set<number>();
    const out: SelectOption<number>[] = [];
    for (const e of history) {
      if (e.academicSessionId && !seen.has(e.academicSessionId)) {
        seen.add(e.academicSessionId);
        out.push({
          value: e.academicSessionId,
          label: e.academicSessionName ?? `Session #${e.academicSessionId}`,
          subtitle: [
            e.className,
            e.sectionName ? `Section ${e.sectionName}` : null,
          ]
            .filter(Boolean)
            .join(' • '),
        });
      }
    }
    return out;
  }, [childDetailsQuery.data]);

  const recordsByDate = useMemo(() => {
    const map: Record<string, StudentAttendanceResponse> = {};
    for (const rec of attendanceData?.dailyRecords ?? []) {
      map[rec.attendanceDate] = rec;
    }
    return map;
  }, [attendanceData?.dailyRecords]);

  const currentMonthlySummary = useMemo(() => {
    const ym = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
    return (
      attendanceData?.monthlySummaries?.find((m) => m.yearMonth === ym) ?? null
    );
  }, [attendanceData?.monthlySummaries, calendarYear, calendarMonth]);

  const handleRefresh = useCallback(async () => {
    if (organizationId <= 0) return;
    await Promise.all([
      childrenQuery.refetch(),
      activeChildId ? attendanceQuery.refetch() : Promise.resolve(),
    ]);
  }, [organizationId, activeChildId, childrenQuery, attendanceQuery]);

  const isRefreshing =
    childrenQuery.isRefetching || attendanceQuery.isRefetching;

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      header={
        <AppShellHeader
          title="Student Attendance"
          subtitle={activeWorkspace?.organizationName}
        />
      }
    >
      {childrenQuery.isLoading ? (
        <LoadingStateView message="Loading student profiles..." />
      ) : (
        <>
          {childrenQuery.isError ? (
            <FeedbackBanner
              tone="warning"
              title="Student Profile Link Pending"
              message={
                childrenQuery.error instanceof Error
                  ? childrenQuery.error.message
                  : 'No student profile is linked to your guardian account in this school yet.'
              }
              onRetry={() => void childrenQuery.refetch()}
              style={{ marginBottom: spacing.md }}
            />
          ) : childrenList.length === 0 ? (
            <FeedbackBanner
              tone="info"
              title="No Linked Children Yet"
              message="Once your school links your child's student profile to your guardian account, their daily attendance records and summaries will appear below."
              style={{ marginBottom: spacing.md }}
            />
          ) : (
            <ChildSwitcherBanner
              childrenList={childBannerOptions}
              selectedChildId={activeChildId}
              onSelectChild={handleSelectChild}
            />
          )}

          {sessionOptions.length > 1 ? (
            <View
              style={[styles.sessionPickerWrap, { marginBottom: spacing.md }]}
            >
              <PickerField<number>
                label="Academic Session"
                options={sessionOptions}
                value={effectiveSessionId}
                onChange={(nextSessionId) => {
                  setSelectedSessionId(nextSessionId);
                  setSelectedDate(null);
                }}
              />
            </View>
          ) : null}

          {attendanceQuery.isLoading && activeChildId !== null ? (
            <LoadingStateView message="Loading attendance records..." />
          ) : (
            <>
              {attendanceQuery.isError ? (
                <FeedbackBanner
                  tone="danger"
                  title="Unable to load attendance"
                  message={
                    attendanceQuery.error instanceof Error
                      ? attendanceQuery.error.message
                      : 'Could not load student attendance records.'
                  }
                  onRetry={() => void attendanceQuery.refetch()}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}

              <AttendanceOverallSummaryCard
                summary={attendanceData?.overallSummary ?? null}
                academicSessionName={attendanceData?.academicSessionName}
              />

              <MonthlyAttendanceCalendarCard
                year={calendarYear}
                month={calendarMonth}
                onChangeMonth={handleChangeMonth}
                recordsByDate={recordsByDate}
                monthlySummary={currentMonthlySummary}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              <AttendanceHistorySection
                dailyRecords={attendanceData?.dailyRecords ?? []}
                year={calendarYear}
                month={calendarMonth}
                scope={historyScope}
                onChangeScope={setHistoryScope}
                statusFilter={statusFilter}
                onChangeStatusFilter={setStatusFilter}
                onSelectDateOnCalendar={handleSelectDateFromHistory}
              />
            </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sessionPickerWrap: {
    width: '100%',
  },
});
