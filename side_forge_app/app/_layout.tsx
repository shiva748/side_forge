import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { AppProviders } from '@/providers/AppProviders';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import {
  shouldProcessNotificationTap,
  syncDeviceInstallationWithBackend,
} from '@/services/pushNotifications';
import { realtimeNotificationClient } from '@/services/realtimeNotificationClient';
import { queryKeys } from '@/api/queryKeys';
import { getWorkspaceHomeHref } from '@/utils/navigationGuard';

function RootNavigationCoordinator() {
  const router = useRouter();
  const segments = useSegments();
  const queryClient = useQueryClient();
  const { colors, typography, spacing, isHydrated } = useAppTheme();

  const status = useAuthWorkspaceStore((s) => s.status);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const needsWorkspaceSelection = useAuthWorkspaceStore(
    (s) => s.needsWorkspaceSelection
  );
  const hasOnlyUnsupportedRoles = useAuthWorkspaceStore(
    (s) => s.hasOnlyUnsupportedRoles
  );

  // Enforce Auth & Workspace routing boundaries
  useEffect(() => {
    if (!isHydrated || status === 'BOOTSTRAPPING') return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === '(auth)';
    const inInvitationScreen = firstSegment === 'invitations';
    const inWorkspaceSelect = firstSegment === 'workspace-select';
    const inSettings = firstSegment === 'settings';
    const inProfile = firstSegment === 'profile';

    if (status === 'UNAUTHENTICATED') {
      if (!inAuthGroup) {
        try {
          if (router.canDismiss()) {
            router.dismissAll();
          }
        } catch {
          // Ignore if no stack to dismiss
        }
        router.replace('/(auth)/login');
      }
      return;
    }

    // AUTHENTICATED:
    if (
      needsWorkspaceSelection ||
      hasOnlyUnsupportedRoles ||
      !activeWorkspace
    ) {
      if (
        !inWorkspaceSelect &&
        !inInvitationScreen &&
        !inSettings &&
        !inProfile
      ) {
        router.replace('/workspace-select');
      }
      return;
    }

    const targetGroup =
      activeWorkspace.experience === 'PARENT'
        ? '(parent)'
        : activeWorkspace.experience === 'TEACHER'
        ? '(teacher)'
        : '(admin)';

    if (
      inAuthGroup ||
      !firstSegment ||
      (firstSegment !== targetGroup &&
        !inWorkspaceSelect &&
        !inSettings &&
        !inProfile &&
        !inInvitationScreen)
    ) {
      router.replace(getWorkspaceHomeHref(activeWorkspace.experience));
    }
  }, [
    isHydrated,
    status,
    activeWorkspace,
    needsWorkspaceSelection,
    hasOnlyUnsupportedRoles,
    segments,
    router,
  ]);

  // Manage authenticated WebSocket presence & native push token registration
  useEffect(() => {
    if (!isHydrated || status !== 'AUTHENTICATED') {
      realtimeNotificationClient.stop(false);
      return;
    }

    const orgId = activeWorkspace?.organizationId ?? null;
    const exp = activeWorkspace?.experience ?? 'PARENT';

    void syncDeviceInstallationWithBackend({
      activeOrganizationId: orgId,
      promptPermission: true,
    });

    void realtimeNotificationClient.start({
      queryClient,
      organizationId: orgId,
      experience: exp,
    });

    let pushTokenSub: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      pushTokenSub = Notifications.addPushTokenListener(() => {
        void syncDeviceInstallationWithBackend({
          activeOrganizationId: orgId,
          promptPermission: false,
        });
      });
    }

    return () => {
      pushTokenSub?.remove();
    };
  }, [
    isHydrated,
    status,
    activeWorkspace?.organizationId,
    activeWorkspace?.experience,
    queryClient,
  ]);

  // Handle taps on system notifications (foreground, background, or cold start)
  useEffect(() => {
    if (Platform.OS === 'web' || status !== 'AUTHENTICATED') return;

    const routeFromNotificationResponse = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      const identifier = response.notification.request.identifier;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const notifId = Number(data?.notificationId ?? data?.id ?? 0);

      if (!shouldProcessNotificationTap(notifId, identifier)) {
        return;
      }

      const orgId = activeWorkspace?.organizationId ?? 0;
      const exp = activeWorkspace?.experience ?? 'PARENT';
      if (orgId > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.orgUnread(orgId, exp),
        });
        void queryClient.invalidateQueries({
          queryKey: ['org', orgId, exp, 'notifications'],
        });
      }

      const category = String(data?.category ?? '').toUpperCase();
      if (category === 'INVITATION') {
        router.push('/invitations');
        return;
      }
      if (activeWorkspace?.experience === 'PARENT') {
        const announcementId = Number(
          data?.resourceType === 'ANNOUNCEMENT' ? data?.resourceId : 0
        );
        router.navigate({
          pathname: '/(parent)/updates',
          params:
            announcementId > 0
              ? {
                  tab: 'announcements',
                  announcementId: String(announcementId),
                }
              : { tab: 'notifications' },
        });
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then((initialResponse) => {
        if (initialResponse) {
          routeFromNotificationResponse(initialResponse);
        }
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(
      routeFromNotificationResponse
    );
    return () => {
      subscription.remove();
    };
  }, [
    status,
    activeWorkspace?.organizationId,
    activeWorkspace?.experience,
    queryClient,
    router,
  ]);

  if (!isHydrated || status === 'BOOTSTRAPPING') {
    return (
      <View
        style={[
          styles.bootScreen,
          { backgroundColor: colors.background, padding: spacing.xl },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginTop: spacing.md,
          }}
        >
          Preparing your Side Forge workspace...
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen
        name="workspace-select"
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="invitations"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="profile"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigationCoordinator />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

