import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, GraduationCap, Users } from 'lucide-react-native';
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
import { ParentAcademicSubNavBar } from '@/components/parent/ParentAcademicSubNavBar';
import {
  DailyScheduleTimelineSection,
  getTodayDayOfWeek,
  TimetableAcademicContextCard,
  TimetableSlotDetailModal,
  type TimetableViewMode,
  WeekdaySelectorStrip,
  WeeklySubjectSummarySection,
} from '@/components/parent/ParentTimetableComponents';
import type {
  DayOfWeekName,
  ParentDashboardResponse,
  TimetableSlotResponse,
} from '@/types/parentPortal';
import {
  EmptyState,
  FeedbackBanner,
  LoadingStateView,
  PickerField,
  ScreenContainer,
  type SelectOption,
} from '@/components/ui';

export default function ParentTimetableScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, iconSizes } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { navigateTo } = useSafeNavigation();

  const isTabletOrWide = windowWidth >= 768;

  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeekName>(() =>
    getTodayDayOfWeek()
  );
  const [viewMode, setViewMode] = useState<TimetableViewMode>('DAILY');
  const [selectedSlot, setSelectedSlot] =
    useState<TimetableSlotResponse | null>(null);

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
      parentPortalApi.getChildDetails(organizationId, activeChildId ?? 0),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const sessionOptions: SelectOption<number>[] = useMemo(() => {
    const details = childDetailsQuery.data;
    if (!details) return [];
    const seen = new Set<number>();
    const list: SelectOption<number>[] = [];

    if (details.currentEnrollment?.academicSessionId) {
      seen.add(details.currentEnrollment.academicSessionId);
      list.push({
        value: details.currentEnrollment.academicSessionId,
        label: `${
          details.currentEnrollment.academicSessionName ?? 'Current Session'
        } (Current)`,
        subtitle: [
          details.currentEnrollment.className,
          details.currentEnrollment.sectionName
            ? `Section ${details.currentEnrollment.sectionName}`
            : null,
        ]
          .filter(Boolean)
          .join(' • '),
      });
    }

    for (const hist of details.enrollmentHistory ?? []) {
      if (hist.academicSessionId && !seen.has(hist.academicSessionId)) {
        seen.add(hist.academicSessionId);
        list.push({
          value: hist.academicSessionId,
          label:
            hist.academicSessionName ?? `Session #${hist.academicSessionId}`,
          subtitle: [
            hist.className,
            hist.sectionName ? `Section ${hist.sectionName}` : null,
            hist.status,
          ]
            .filter(Boolean)
            .join(' • '),
        });
      }
    }
    return list;
  }, [childDetailsQuery.data]);

  const timetableQuery = useQuery({
    queryKey: queryKeys.parentPortal.childTimetable(
      organizationId,
      activeChildId ?? 0,
      selectedSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildTimetable(
        organizationId,
        activeChildId ?? 0,
        selectedSessionId
      ),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const timetableResult = timetableQuery.data ?? null;
  const timetable =
    timetableResult?.timetable?.status === 'PUBLISHED'
      ? timetableResult.timetable
      : null;
  const configId = timetable?.timetableConfigId ?? 0;

  const timetableConfigQuery = useQuery({
    queryKey: queryKeys.parentPortal.timetableConfig(organizationId, configId),
    queryFn: () => parentPortalApi.getTimetableConfig(organizationId, configId),
    enabled: organizationId > 0 && timetable !== null && configId > 0,
  });

  const timetableConfig = timetableConfigQuery.data ?? null;

  const effectiveSessionId =
    selectedSessionId ??
    timetable?.academicSessionId ??
    childDetailsQuery.data?.currentEnrollment?.academicSessionId ??
    null;

  const resolvedEnrollment = useMemo(() => {
    const details = childDetailsQuery.data;
    if (!details) return null;
    if (
      details.currentEnrollment &&
      (!effectiveSessionId ||
        details.currentEnrollment.academicSessionId === effectiveSessionId)
    ) {
      return details.currentEnrollment;
    }
    return (
      (details.enrollmentHistory ?? []).find(
        (h) => h.academicSessionId === effectiveSessionId
      ) ?? null
    );
  }, [childDetailsQuery.data, effectiveSessionId]);

  const resolvedSectionName =
    timetable?.sectionName ?? resolvedEnrollment?.sectionName ?? null;

  const handleSelectChild = useCallback(
    (studentId: number) => {
      if (studentId === activeChildId) return;
      setSelectedChildId(studentId);
      setSelectedSessionId(null);
      setSelectedSlot(null);
    },
    [activeChildId, setSelectedChildId]
  );

  const handleRefresh = useCallback(async () => {
    const tasks: Promise<unknown>[] = [childrenQuery.refetch()];
    if (activeChildId !== null) {
      tasks.push(childDetailsQuery.refetch(), timetableQuery.refetch());
      if (timetable !== null && configId > 0) {
        tasks.push(timetableConfigQuery.refetch());
      }
    }
    await Promise.all(tasks);
  }, [
    activeChildId,
    childrenQuery,
    childDetailsQuery,
    timetableQuery,
    timetable,
    configId,
    timetableConfigQuery,
  ]);

  const activeChildMeta = useMemo(
    () => childrenList.find((c) => c.studentId === activeChildId) ?? null,
    [childrenList, activeChildId]
  );

  const childBannerOptions: ChildBannerOption[] = useMemo(
    () =>
      childrenList.map((c) => {
        const isCurrent = c.studentId === activeChildId;
        const resolvedClassName = isCurrent
          ? timetable?.className ??
            resolvedEnrollment?.className ??
            c.className ??
            null
          : c.className ?? null;
        const resolvedSec = isCurrent
          ? resolvedSectionName ?? c.sectionName ?? null
          : c.sectionName ?? null;
        const classLabelParts = [
          resolvedClassName || 'Unassigned Class',
          resolvedSec ? `Sec ${resolvedSec}` : null,
        ].filter(Boolean);

        return {
          id: c.studentId,
          studentId: c.studentId,
          fullName: `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`,
          classLabel: classLabelParts.join(' • '),
          className: resolvedClassName,
          sectionName: resolvedSec,
          rollNumber: isCurrent
            ? resolvedEnrollment?.rollNumber ?? c.rollNumber
            : c.rollNumber,
          admissionNumber: c.admissionNumber,
          academicSessionName: isCurrent
            ? timetable?.academicSessionName ??
              resolvedEnrollment?.academicSessionName ??
              c.academicSessionName ??
              null
            : c.academicSessionName ?? null,
          profilePhotoUrl: c.profilePhotoUrl,
          relationshipType: c.relationshipType,
        };
      }),
    [
      childrenList,
      activeChildId,
      timetable,
      resolvedEnrollment,
      resolvedSectionName,
    ]
  );

  const isRefreshing =
    childrenQuery.isRefetching ||
    childDetailsQuery.isRefetching ||
    timetableQuery.isRefetching ||
    timetableConfigQuery.isRefetching;

  const headerSubtitle = useMemo(() => {
    if (!activeChildMeta) {
      return 'Weekly class schedule, period timings & subject teachers';
    }
    const childName = `${activeChildMeta.firstName}${
      activeChildMeta.lastName ? ` ${activeChildMeta.lastName}` : ''
    }`;
    const classText =
      timetable?.className ??
      resolvedEnrollment?.className ??
      activeChildMeta.className ??
      null;
    const sectionText = resolvedSectionName ? `Sec ${resolvedSectionName}` : null;
    const sessionText =
      timetable?.academicSessionName ??
      resolvedEnrollment?.academicSessionName ??
      activeChildMeta.academicSessionName ??
      null;

    return [childName, classText, sectionText, sessionText]
      .filter(Boolean)
      .join(' • ');
  }, [
    activeChildMeta,
    timetable,
    resolvedEnrollment,
    resolvedSectionName,
  ]);

  const unavailableKind = timetableResult?.unavailableKind ?? null;
  const unavailableReason = timetableResult?.unavailableReason ?? null;

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={() => void handleRefresh()}
      header={
        <AppShellHeader title="Class Timetable" subtitle={headerSubtitle} />
      }
    >
      <ParentAcademicSubNavBar activeSection="timetable" />

      {childrenQuery.isLoading ? (
        <LoadingStateView message="Loading linked children..." />
      ) : childrenQuery.isError ? (
        <FeedbackBanner
          tone="danger"
          title="Unable to load student profiles"
          message={
            childrenQuery.error instanceof Error
              ? childrenQuery.error.message
              : 'Could not retrieve your linked student profiles.'
          }
          onRetry={() => void childrenQuery.refetch()}
        />
      ) : childrenList.length === 0 ? (
        <EmptyState
          icon={<Users size={iconSizes.xl} color={colors.primary} />}
          title="No Linked Students Found"
          description="Your parent account is active in this school, but no student profiles are currently linked."
          actionLabel="Back to Overview"
          onActionPress={() => navigateTo('/(parent)')}
        />
      ) : (
        <>
          <ChildSwitcherBanner
            childrenList={childBannerOptions}
            selectedChildId={activeChildId}
            onSelectChild={handleSelectChild}
          />

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
                  setSelectedSlot(null);
                }}
              />
            </View>
          ) : null}

          {resolvedEnrollment?.status &&
          resolvedEnrollment.status !== 'ACTIVE' ? (
            <FeedbackBanner
              tone="warning"
              title={`Academic Enrollment ${resolvedEnrollment.status}`}
              message={`This student's enrollment status for ${
                resolvedEnrollment.academicSessionName ?? 'the selected session'
              } is ${resolvedEnrollment.status}.`}
              style={{ marginBottom: spacing.md }}
            />
          ) : null}

          {timetableQuery.isLoading && activeChildId !== null ? (
            <LoadingStateView message="Loading weekly class timetable..." />
          ) : timetableQuery.isError ? (
            <FeedbackBanner
              tone="danger"
              title="Unable to load timetable"
              message={
                timetableQuery.error instanceof Error
                  ? timetableQuery.error.message
                  : 'Could not load the class timetable. Please check your connection and try again.'
              }
              onRetry={() => void timetableQuery.refetch()}
              style={{ marginBottom: spacing.md }}
            />
          ) : !timetable ? (
            <EmptyState
              icon={
                unavailableKind === 'NOT_ENROLLED' ? (
                  <GraduationCap
                    size={iconSizes.xl}
                    color={colors.textMuted}
                  />
                ) : unavailableKind === 'NOT_PUBLISHED' ? (
                  <Clock size={iconSizes.xl} color={colors.warning} />
                ) : (
                  <Calendar size={iconSizes.xl} color={colors.primary} />
                )
              }
              title={
                unavailableKind === 'NOT_PUBLISHED'
                  ? 'Timetable Not Published Yet'
                  : unavailableKind === 'NOT_ENROLLED'
                  ? 'No Class Enrollment for Session'
                  : 'No Class Timetable Available Yet'
              }
              description={
                unavailableKind === 'NOT_PUBLISHED'
                  ? `${
                      unavailableReason ||
                      "The timetable for your child's class and section is currently in draft or under revision."
                    } It will appear here automatically once published by the school.`
                  : unavailableKind === 'NOT_ENROLLED'
                  ? unavailableReason ||
                    'This student does not have a class enrollment recorded for the selected academic session.'
                  : unavailableReason ||
                    "No published timetable has been configured for your child's class and section in this academic session yet."
              }
              actionLabel="Refresh Timetable"
              onActionPress={() => void handleRefresh()}
            />
          ) : (
            <>
              <TimetableAcademicContextCard
                timetable={timetable}
                config={timetableConfig}
                fallbackSessionName={
                  resolvedEnrollment?.academicSessionName ??
                  activeChildMeta?.academicSessionName
                }
                fallbackClassName={
                  resolvedEnrollment?.className ?? activeChildMeta?.className
                }
                fallbackSectionName={resolvedSectionName}
              />

              <WeekdaySelectorStrip
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                timetable={timetable}
                config={timetableConfig}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                showViewModeToggle={!isTabletOrWide}
              />

              {isTabletOrWide ? (
                <View style={[styles.tabletColumns, { gap: spacing.md }]}>
                  <View style={{ flex: 1.35 }}>
                    <DailyScheduleTimelineSection
                      selectedDay={selectedDay}
                      timetable={timetable}
                      config={timetableConfig}
                      onSelectSlot={setSelectedSlot}
                      onJumpToDay={setSelectedDay}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <WeeklySubjectSummarySection
                      timetable={timetable}
                      selectedDay={selectedDay}
                      onSelectDay={setSelectedDay}
                    />
                  </View>
                </View>
              ) : viewMode === 'WEEKLY_SUMMARY' ? (
                <WeeklySubjectSummarySection
                  timetable={timetable}
                  selectedDay={selectedDay}
                  onSelectDay={(day) => {
                    setSelectedDay(day);
                    setViewMode('DAILY');
                  }}
                />
              ) : (
                <DailyScheduleTimelineSection
                  selectedDay={selectedDay}
                  timetable={timetable}
                  config={timetableConfig}
                  onSelectSlot={setSelectedSlot}
                  onJumpToDay={setSelectedDay}
                />
              )}

              <TimetableSlotDetailModal
                visible={selectedSlot !== null}
                slot={selectedSlot}
                academicSessionName={
                  timetable.academicSessionName ??
                  resolvedEnrollment?.academicSessionName ??
                  activeChildMeta?.academicSessionName
                }
                onClose={() => setSelectedSlot(null)}
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
  tabletColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});


