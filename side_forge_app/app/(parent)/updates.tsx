import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, FileText, Settings } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { notificationApi } from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  type AnnouncementScopeFilter,
  ParentAnnouncementDetailModal,
  ParentAnnouncementsFilterBar,
  ParentAnnouncementsListSection,
  resolveAnnouncementChildContext,
} from '@/components/parent/ParentAnnouncementComponents';
import {
  type NotificationCategoryFilter,
  type NotificationReadFilter,
  ParentNotificationFilterBar,
  ParentNotificationsListSection,
  type ResolvedNotificationDestination,
} from '@/components/parent/ParentNotificationComponents';
import type { NotificationItem } from '@/types/notification';
import type {
  AnnouncementResponse,
  ParentDashboardResponse,
} from '@/types/parentPortal';
import {
  FeedbackBanner,
  LoadingStateView,
  ScreenContainer,
} from '@/components/ui';

type UpdatesPrimaryTab = 'ANNOUNCEMENTS' | 'NOTIFICATIONS';

const PAGE_SIZE = 20;

export default function ParentUpdatesScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { navigateTo } = useSafeNavigation();
  const params = useLocalSearchParams<{
    tab?: string;
    announcementId?: string;
  }>();

  const isWideTablet = windowWidth >= 880;

  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  const [activeTab, setActiveTab] = useState<UpdatesPrimaryTab>(() =>
    params.tab === 'notifications' ? 'NOTIFICATIONS' : 'ANNOUNCEMENTS'
  );
  const [activeScopeFilter, setActiveScopeFilter] =
    useState<AnnouncementScopeFilter>('ALL');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementResponse | null>(null);

  const [readFilter, setReadFilter] = useState<NotificationReadFilter>('ALL');
  const [categoryFilter, setCategoryFilter] =
    useState<NotificationCategoryFilter>('ALL');
  const [extraPagesItems, setExtraPagesItems] = useState<NotificationItem[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  useEffect(() => {
    if (params.tab === 'notifications') {
      setActiveTab('NOTIFICATIONS');
    } else if (params.tab === 'announcements') {
      setActiveTab('ANNOUNCEMENTS');
    }
  }, [params.tab]);

  useEffect(() => {
    setSelectedAnnouncement(null);
    setExtraPagesItems([]);
    setCurrentPage(0);
  }, [organizationId]);

  useEffect(() => {
    setExtraPagesItems([]);
    setCurrentPage(0);
  }, [readFilter, categoryFilter]);

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

  const announcementsQuery = useQuery({
    queryKey: queryKeys.parentPortal.announcements(organizationId, false),
    queryFn: () => parentPortalApi.getParentAnnouncements(organizationId),
    enabled: organizationId > 0,
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notifications.orgUnread(organizationId, 'PARENT'),
    queryFn: () => notificationApi.getOrganizationUnreadCount(organizationId),
    enabled: organizationId > 0,
    initialData:
      cachedDashboard &&
      typeof cachedDashboard.unreadNotificationCount === 'number'
        ? {
            organizationId,
            unreadCount: cachedDashboard.unreadNotificationCount,
          }
        : undefined,
  });

  const backendCategoryParam =
    categoryFilter === 'ALL' ? null : categoryFilter;
  const backendUnreadOnlyParam = readFilter === 'UNREAD' ? true : null;

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.orgList(
      organizationId,
      'PARENT',
      backendCategoryParam,
      backendUnreadOnlyParam,
      0
    ),
    queryFn: () =>
      notificationApi.getOrganizationNotifications(organizationId, {
        category: backendCategoryParam,
        unreadOnly: backendUnreadOnlyParam,
        page: 0,
        size: PAGE_SIZE,
      }),
    enabled: organizationId > 0,
  });

  const childrenList = childrenQuery.data ?? [];
  const allAnnouncements = announcementsQuery.data ?? [];
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;

  useEffect(() => {
    const rawId = params.announcementId ? Number(params.announcementId) : 0;
    if (!rawId || Number.isNaN(rawId) || organizationId <= 0) return;
    const found = allAnnouncements.find((a) => a.id === rawId);
    if (found) {
      setSelectedAnnouncement(found);
      return;
    }
    parentPortalApi
      .getParentAnnouncementById(organizationId, rawId)
      .then((item) => {
        if (item) setSelectedAnnouncement(item);
      })
      .catch(() => {});
  }, [params.announcementId, allAnnouncements, organizationId]);

  const filteredAnnouncements = useMemo(() => {
    const q = announcementSearch.trim().toLowerCase();
    return allAnnouncements.filter((ann) => {
      const ctx = resolveAnnouncementChildContext(ann, childrenList);
      if (activeScopeFilter === 'IMPORTANT' && !ann.important) return false;
      if (activeScopeFilter === 'SCHOOL_WIDE' && !ctx.isSchoolWide) {
        return false;
      }
      if (activeScopeFilter.startsWith('CHILD_')) {
        const targetChildId = Number(activeScopeFilter.replace('CHILD_', ''));
        if (!ctx.matchedChildIds.includes(targetChildId)) return false;
      }
      if (q.length > 0) {
        const hay = `${ann.title} ${ann.description} ${ctx.scopeBadgeLabel} ${ctx.appliesToLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allAnnouncements, childrenList, activeScopeFilter, announcementSearch]);

  const combinedNotifications = useMemo(() => {
    const firstPage = notificationsQuery.data?.content ?? [];
    const seen = new Set<number>();
    const merged: NotificationItem[] = [];
    for (const item of [...firstPage, ...extraPagesItems]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
    if (readFilter === 'READ') {
      return merged.filter((n) => n.read);
    }
    if (readFilter === 'UNREAD') {
      return merged.filter((n) => !n.read);
    }
    return merged;
  }, [notificationsQuery.data, extraPagesItems, readFilter]);

  const totalPages = notificationsQuery.data?.totalPages ?? 0;
  const hasMorePages = currentPage + 1 < totalPages;

  const invalidateNotificationCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.orgUnread(organizationId, 'PARENT'),
      }),
      queryClient.invalidateQueries({
        queryKey: ['org', organizationId, 'PARENT', 'notifications'],
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.parentPortal.dashboard(organizationId),
      }),
    ]);
  }, [organizationId, queryClient]);

  const markSingleReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      setMarkingReadId(notificationId);
      return notificationApi.markOrganizationNotificationRead(
        organizationId,
        notificationId
      );
    },
    onSuccess: async (_, notificationId) => {
      setExtraPagesItems((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      );
      await invalidateNotificationCaches();
    },
    onSettled: () => {
      setMarkingReadId(null);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      notificationApi.markAllOrganizationNotificationsRead(organizationId),
    onSuccess: async () => {
      setExtraPagesItems((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
          readAt: item.readAt ?? new Date().toISOString(),
        }))
      );
      await invalidateNotificationCaches();
    },
  });

  const handleLoadMoreNotifications = useCallback(async () => {
    if (loadingMore || !hasMorePages || organizationId <= 0) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const pageRes = await notificationApi.getOrganizationNotifications(
        organizationId,
        {
          category: backendCategoryParam,
          unreadOnly: backendUnreadOnlyParam,
          page: nextPage,
          size: PAGE_SIZE,
        }
      );
      setExtraPagesItems((prev) => [...prev, ...(pageRes.content ?? [])]);
      setCurrentPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMorePages,
    organizationId,
    currentPage,
    backendCategoryParam,
    backendUnreadOnlyParam,
  ]);

  const handlePressNotification = useCallback(
    async (
      item: NotificationItem,
      destination: ResolvedNotificationDestination
    ) => {
      if (!item.read) {
        void markSingleReadMutation.mutateAsync(item.id).catch(() => {});
      }

      if (destination.matchedChildId) {
        setSelectedChildId(destination.matchedChildId);
      }

      if (
        destination.kind === 'OPEN_ANNOUNCEMENT' &&
        destination.announcementId
      ) {
        const existing = allAnnouncements.find(
          (a) => a.id === destination.announcementId
        );
        if (existing) {
          setSelectedAnnouncement(existing);
        } else {
          const fetched = await parentPortalApi
            .getParentAnnouncementById(
              organizationId,
              destination.announcementId
            )
            .catch(() => null);
          if (fetched) {
            setSelectedAnnouncement(fetched);
          } else {
            setActiveTab('ANNOUNCEMENTS');
          }
        }
        return;
      }

      if (destination.kind === 'SWITCH_TO_ANNOUNCEMENTS') {
        setActiveTab('ANNOUNCEMENTS');
        return;
      }

      if (destination.kind === 'NAVIGATE' && destination.href) {
        navigateTo(
          destination.href,
          destination.params ? { params: destination.params } : undefined
        );
      }
    },
    [
      markSingleReadMutation,
      setSelectedChildId,
      allAnnouncements,
      organizationId,
      navigateTo,
    ]
  );

  const handleRefresh = useCallback(async () => {
    if (organizationId <= 0) return;
    setExtraPagesItems([]);
    setCurrentPage(0);
    await Promise.all([
      childrenQuery.refetch(),
      announcementsQuery.refetch(),
      unreadCountQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
  }, [
    organizationId,
    childrenQuery,
    announcementsQuery,
    unreadCountQuery,
    notificationsQuery,
  ]);

  const isRefreshing =
    announcementsQuery.isRefetching ||
    notificationsQuery.isRefetching ||
    unreadCountQuery.isRefetching;

  const headerPrefsAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open notification preferences"
      hitSlop={8}
      onPress={() => navigateTo('/settings/notifications')}
      style={({ pressed }) => [
        styles.prefsBtn,
        {
          backgroundColor: pressed
            ? colors.surfaceInteractivePressed
            : colors.surfaceMuted,
          borderColor: colors.border,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs + 4,
          paddingVertical: 5,
        },
      ]}
    >
      <Settings size={iconSizes.xs} color={colors.textSecondary} />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.semibold,
          marginLeft: 4,
        }}
      >
        Alerts
      </Text>
    </Pressable>
  );

  const renderAnnouncementsPane = () => (
    <View>
      <ParentAnnouncementsFilterBar
        announcements={allAnnouncements}
        childrenList={childrenList}
        activeScopeFilter={activeScopeFilter}
        onSelectScopeFilter={setActiveScopeFilter}
        searchQuery={announcementSearch}
        onChangeSearchQuery={setAnnouncementSearch}
        onResetFilters={() => {
          setActiveScopeFilter('ALL');
          setAnnouncementSearch('');
        }}
      />

      {announcementsQuery.isLoading ? (
        <LoadingStateView message="Loading school announcements..." />
      ) : announcementsQuery.isError ? (
        <FeedbackBanner
          tone="danger"
          title="Unable to load announcements"
          message={
            announcementsQuery.error instanceof Error
              ? announcementsQuery.error.message
              : 'Could not retrieve school announcements.'
          }
          onRetry={() => void announcementsQuery.refetch()}
        />
      ) : (
        <ParentAnnouncementsListSection
          items={filteredAnnouncements}
          totalOriginalCount={allAnnouncements.length}
          childrenList={childrenList}
          activeScopeFilter={activeScopeFilter}
          hasSearchQuery={announcementSearch.trim().length > 0}
          onSelectAnnouncement={setSelectedAnnouncement}
          onResetFilters={() => {
            setActiveScopeFilter('ALL');
            setAnnouncementSearch('');
          }}
        />
      )}
    </View>
  );

  const renderNotificationsPane = () => (
    <View>
      <ParentNotificationFilterBar
        readFilter={readFilter}
        onSelectReadFilter={setReadFilter}
        categoryFilter={categoryFilter}
        onSelectCategoryFilter={setCategoryFilter}
        unreadCount={unreadCount}
        markingAllRead={markAllReadMutation.isPending}
        onMarkAllRead={() => void markAllReadMutation.mutateAsync()}
      />

      {notificationsQuery.isLoading ? (
        <LoadingStateView message="Loading notification inbox..." />
      ) : notificationsQuery.isError ? (
        <FeedbackBanner
          tone="danger"
          title="Unable to load notifications"
          message={
            notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : 'Could not retrieve your notification inbox.'
          }
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : (
        <ParentNotificationsListSection
          items={combinedNotifications}
          childrenList={childrenList}
          readFilter={readFilter}
          categoryFilter={categoryFilter}
          markingReadId={markingReadId}
          hasMorePages={hasMorePages}
          loadingMore={loadingMore}
          onMarkRead={(id) => void markSingleReadMutation.mutateAsync(id)}
          onPressNotification={(item, dest) =>
            void handlePressNotification(item, dest)
          }
          onLoadMore={() => void handleLoadMoreNotifications()}
          onResetFilters={() => {
            setReadFilter('ALL');
            setCategoryFilter('ALL');
          }}
        />
      )}
    </View>
  );

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={() => void handleRefresh()}
      header={
        <AppShellHeader
          title="Announcements & Alerts"
          subtitle={
            activeWorkspace?.organizationName ??
            'School notices, circulars & notification inbox'
          }
          rightAction={headerPrefsAction}
        />
      }
    >
      {!isWideTablet ? (
        <View
          style={[
            styles.segmentedBar,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: 4,
              marginBottom: spacing.md,
              gap: 4,
            },
          ]}
        >
          {(
            [
              {
                key: 'ANNOUNCEMENTS' as const,
                label: 'Announcements',
                count: allAnnouncements.length,
                Icon: FileText,
                highlightBadge: false,
              },
              {
                key: 'NOTIFICATIONS' as const,
                label: 'Notifications',
                count: unreadCount,
                Icon: Bell,
                highlightBadge: unreadCount > 0,
              },
            ]
          ).map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [
                  styles.segmentTab,
                  {
                    backgroundColor: isSelected
                      ? colors.surface
                      : 'transparent',
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderRadius: radius.sm,
                    paddingVertical: spacing.xs + 2,
                    paddingHorizontal: spacing.xs,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <tab.Icon
                  size={iconSizes.xs}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isSelected
                      ? typography.fontWeights.bold
                      : typography.fontWeights.medium,
                    marginLeft: 5,
                  }}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 ? (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: tab.highlightBadge
                          ? colors.warningSoft
                          : isSelected
                          ? colors.primarySoft
                          : colors.backgroundSubtle,
                        borderColor: tab.highlightBadge
                          ? colors.warningBorder
                          : 'transparent',
                        borderRadius: radius.full,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        marginLeft: 6,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: tab.highlightBadge
                          ? colors.warningText
                          : isSelected
                          ? colors.primaryText
                          : colors.textSecondary,
                        fontSize: 10,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isWideTablet ? (
        <View style={[styles.tabletColumns, { gap: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.xs,
              }}
            >
              School Announcements ({allAnnouncements.length})
            </Text>
            {renderAnnouncementsPane()}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.xs,
              }}
            >
              Notification Inbox ({unreadCount} Unread)
            </Text>
            {renderNotificationsPane()}
          </View>
        </View>
      ) : activeTab === 'ANNOUNCEMENTS' ? (
        renderAnnouncementsPane()
      ) : (
        renderNotificationsPane()
      )}

      <ParentAnnouncementDetailModal
        visible={selectedAnnouncement !== null}
        organizationId={organizationId}
        organizationName={activeWorkspace?.organizationName}
        announcement={selectedAnnouncement}
        childrenList={childrenList}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  prefsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBadge: {
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabletColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});







