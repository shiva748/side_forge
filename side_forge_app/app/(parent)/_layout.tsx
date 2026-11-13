import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Home,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { notificationApi } from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import type { ParentDashboardResponse } from '@/types/parentPortal';

export default function ParentTabsLayout() {
  const queryClient = useQueryClient();
  const { colors, typography, iconSizes } = useAppTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthWorkspaceStore((s) => s.status);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);

  const organizationId = activeWorkspace?.organizationId ?? 0;
  const cachedDashboard = queryClient.getQueryData<ParentDashboardResponse>(
    queryKeys.parentPortal.dashboard(organizationId)
  );

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.orgUnread(organizationId, 'PARENT'),
    queryFn: () => notificationApi.getOrganizationUnreadCount(organizationId),
    enabled:
      status === 'AUTHENTICATED' &&
      activeWorkspace?.category === 'PARENT' &&
      organizationId > 0,
    initialData:
      cachedDashboard &&
      typeof cachedDashboard.unreadNotificationCount === 'number'
        ? {
            organizationId,
            unreadCount: cachedDashboard.unreadNotificationCount,
          }
        : undefined,
  });

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!activeWorkspace || activeWorkspace.category !== 'PARENT') {
    return <Redirect href="/workspace-select" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 58 + Math.max(insets.bottom, 6),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <Home size={iconSizes.md} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => (
            <CalendarCheck size={iconSizes.md} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: 'Academics',
          tabBarIcon: ({ color }) => (
            <BookOpen size={iconSizes.md} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color }) => (
            <CreditCard size={iconSizes.md} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color }) => <Bell size={iconSizes.md} color={color} />,
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? '99+'
                : unreadCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.warning,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: typography.fontWeights.bold,
            minWidth: 16,
            height: 16,
            lineHeight: 14,
          },
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          href: null,
          title: 'Homework',
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          href: null,
          title: 'Exams',
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          href: null,
          title: 'Timetable',
        }}
      />
    </Tabs>
  );
}

