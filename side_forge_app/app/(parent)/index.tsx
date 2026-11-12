import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  Users,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { queryKeys } from '@/api/queryKeys';
import { getRoleNavigationItems } from '@/constants/roleNavigation';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  ChildSwitcherBanner,
  type ChildBannerOption,
} from '@/components/workspace/ChildSwitcherBanner';
import {
  AcademicOverviewSection,
  AnnouncementsSection,
  AttendanceSummarySection,
  FeeOverviewSection,
  HomeworkOverviewSection,
  TodaysScheduleSection,
} from '@/components/parent/ParentDashboardSections';
import {
  EmptyState,
  FeatureTileGrid,
  type FeatureTileItem,
  FeedbackBanner,
  LoadingStateView,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ParentDashboardScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();

  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  // 1. Organization-level Parent Dashboard query
  const dashboardQuery = useQuery({
    queryKey: queryKeys.parentPortal.dashboard(organizationId),
    queryFn: () => parentPortalApi.getParentDashboard(organizationId),
    enabled: organizationId > 0,
  });

  const dashboardData = dashboardQuery.data;
  const childrenCards = dashboardData?.children ?? [];

  // Resolve the active child ID deterministically within this organization
  const activeChildId = useMemo(() => {
    if (childrenCards.length === 0) return null;
    const match = childrenCards.find(
      (c) => c.child.studentId === selectedChildId
    );
    return match ? match.child.studentId : childrenCards[0].child.studentId;
  }, [childrenCards, selectedChildId]);

  useEffect(() => {
    if (activeChildId && activeChildId !== selectedChildId) {
      setSelectedChildId(activeChildId);
    }
  }, [activeChildId, selectedChildId, setSelectedChildId]);

  const initialChildCard = useMemo(
    () =>
      childrenCards.find((c) => c.child.studentId === activeChildId) ?? null,
    [childrenCards, activeChildId]
  );

  // 2. Child-specific Dashboard query (isolated per organizationId + activeChildId)
  const childDashboardQuery = useQuery({
    queryKey: queryKeys.parentPortal.childDashboard(
      organizationId,
      activeChildId ?? 0,
      dashboardData?.academicSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildDashboard(
        organizationId,
        activeChildId!,
        dashboardData?.academicSessionId
      ),
    enabled: organizationId > 0 && activeChildId !== null,
    initialData: initialChildCard ?? undefined,
  });

  // 3. Child enrollment details query (resolves sectionName for the selected child)
  const childDetailsQuery = useQuery({
    queryKey: queryKeys.parentPortal.childDetails(
      organizationId,
      activeChildId ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildDetails(organizationId, activeChildId!),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  // 4. Child timetable query (isolated per organizationId + activeChildId)
  const childTimetableQuery = useQuery({
    queryKey: queryKeys.parentPortal.childTimetable(
      organizationId,
      activeChildId ?? 0,
      dashboardData?.academicSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildTimetable(
        organizationId,
        activeChildId!,
        dashboardData?.academicSessionId
      ),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const activeChildCard = childDashboardQuery.data ?? initialChildCard;
  const resolvedSectionName =
    childDetailsQuery.data?.currentEnrollment?.sectionName ??
    childTimetableQuery.data?.timetable?.sectionName ??
    null;

  const childBannerOptions: ChildBannerOption[] = useMemo(() => {
    return childrenCards.map(({ child }) => {
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
        academicSessionName: child.academicSessionName,
        profilePhotoUrl: child.profilePhotoUrl,
        relationshipType: child.relationshipType,
      };
    });
  }, [childrenCards, activeChildId, resolvedSectionName]);

  const handleSelectChild = useCallback(
    (newChildId: number) => {
      if (newChildId === activeChildId) return;
      setSelectedChildId(newChildId);
    },
    [activeChildId, setSelectedChildId]
  );

  const handleRefresh = useCallback(async () => {
    if (organizationId <= 0) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.parentPortal.all(organizationId),
    });
  }, [organizationId, queryClient]);

  const isRefreshing =
    dashboardQuery.isRefetching ||
    childDashboardQuery.isRefetching ||
    childTimetableQuery.isRefetching;

  const unreadCount = dashboardData?.unreadNotificationCount ?? 0;

  const tiles = useMemo<FeatureTileItem[]>(() => {
    const items = getRoleNavigationItems(activeWorkspace, {
      homeGridOnly: true,
    });
    return items.map((item) => ({
      key: item.key,
      title: item.title,
      description: item.description,
      Icon: item.Icon,
      tone: item.tone,
      badge: item.badge,
      onPress: () =>
        navigateTo(item.href, item.params ? { params: item.params } : undefined),
    }));
  }, [activeWorkspace, navigateTo]);
  const headerNotificationButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : 'Open announcements and notifications'
      }
      hitSlop={8}
      onPress={() => navigateTo('/(parent)/updates')}
      style={({ pressed }) => [
        styles.notifPill,
        {
          backgroundColor:
            unreadCount > 0
              ? colors.warningSoft
              : pressed
              ? colors.surfaceInteractivePressed
              : colors.surfaceMuted,
          borderColor:
            unreadCount > 0 ? colors.warningBorder : colors.border,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs + 2,
          paddingVertical: 5,
        },
      ]}
    >
      <Bell
        size={iconSizes.sm}
        color={unreadCount > 0 ? colors.warningText : colors.textSecondary}
      />
      {unreadCount > 0 ? (
        <Text
          style={{
            color: colors.warningText,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.bold,
            marginLeft: 4,
          }}
        >
          {unreadCount}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      header={
        <AppShellHeader
          title="Parent Dashboard"
          subtitle={activeWorkspace?.organizationName}
          rightAction={headerNotificationButton}
        />
      }
    >
      {/* A. Welcome Section */}
      <View style={[styles.welcomeSection, { marginBottom: spacing.md }]}>
        <View style={[styles.welcomeTopRow, { marginBottom: spacing.xxs }]}>
          <View style={[styles.badgeRow, { gap: 6 }]}>
            <StatusBadge label="Parent Portal" tone="primary" />
            {dashboardData?.academicSessionName ? (
              <StatusBadge
                label={dashboardData.academicSessionName}
                tone="neutral"
              />
            ) : null}
          </View>
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
            marginTop: 2,
          }}
        >
          {getGreeting()}, {user?.firstName ?? 'Parent'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginTop: 2,
          }}
        >
          {activeWorkspace?.organizationName
            ? `Academic overview & daily updates from ${activeWorkspace.organizationName}`
            : 'Academic overview & daily student updates'}
        </Text>
      </View>

      {activeWorkspace?.organizationStatus &&
      activeWorkspace.organizationStatus !== 'ACTIVE' ? (
        <View style={{ marginBottom: spacing.md }}>
          <FeedbackBanner
            tone="warning"
            title={`School ${activeWorkspace.organizationStatus}`}
            message={
              activeWorkspace.statusReason ??
              'This school organization currently has restricted operational access.'
            }
          />
        </View>
      ) : null}

      {dashboardQuery.isLoading ? (
        <LoadingStateView message="Loading your family dashboard..." />
      ) : (
        <>
          {dashboardQuery.isError ? (
            <FeedbackBanner
              tone="warning"
              title="Guardian Profile Setup Pending"
              message={
                dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : 'Could not load parent dashboard information.'
              }
              onRetry={() => void dashboardQuery.refetch()}
              style={{ marginBottom: spacing.md }}
            />
          ) : childrenCards.length === 0 ? (
            <EmptyState
              icon={<Users size={iconSizes.xl} color={colors.primary} />}
              title="No Linked Children Found"
              description="No student profiles are currently linked to your guardian account in this school. Please contact your school administration office if your child's profile needs to be linked."
              actionLabel="Open Attendance Calendar"
              onActionPress={() =>
                navigateTo('/(parent)/academics', {
                  params: { section: 'attendance' },
                })
              }
              style={{ marginBottom: spacing.md }}
            />
          ) : (
            <ChildSwitcherBanner
              childrenList={childBannerOptions}
              selectedChildId={activeChildId}
              onSelectChild={handleSelectChild}
            />
          )}

          {/* Child-Scoped Sections (C, D, E, F, G) */}
          {activeChildCard ? (
            <>
              <AcademicOverviewSection
                card={activeChildCard}
                sectionName={resolvedSectionName}
                onOpenExams={() =>
                  navigateTo('/(parent)/academics', {
                    params: { section: 'exams' },
                  })
                }
              />

              <AttendanceSummarySection
                card={activeChildCard}
                onOpenAttendance={() => navigateTo('/(parent)/attendance')}
              />

              <TodaysScheduleSection
                timetable={childTimetableQuery.data?.timetable ?? null}
                unavailableReason={
                  childTimetableQuery.data?.unavailableReason ?? null
                }
                loading={childTimetableQuery.isLoading}
                onOpenTimetable={() =>
                  navigateTo('/(parent)/academics', {
                    params: { section: 'timetable' },
                  })
                }
              />

              <HomeworkOverviewSection
                card={activeChildCard}
                onOpenHomework={() =>
                  navigateTo('/(parent)/academics', {
                    params: { section: 'homework' },
                  })
                }
              />

              <FeeOverviewSection
                card={activeChildCard}
                onOpenFees={() => navigateTo('/(parent)/fees')}
              />
            </>
          ) : null}

          {/* H. School Announcements & Notifications */}
          <AnnouncementsSection
            announcements={dashboardData?.recentAnnouncements ?? []}
            notifications={dashboardData?.recentNotifications ?? []}
            unreadCount={unreadCount}
            onOpenUpdates={() => navigateTo('/(parent)/updates')}
          />
        </>
      )}

      {/* I. Tile-Based Quick Navigation */}
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
          Parent Portal Sections
        </Text>
        <FeatureTileGrid tiles={tiles} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    width: '100%',
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  notifPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
