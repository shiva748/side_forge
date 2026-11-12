import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { AppProviders } from '@/providers/AppProviders';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { extractInvitationTokenFromInput } from '@/services/pushNotifications';
import { getWorkspaceHomeHref } from '@/utils/navigationGuard';

function RootNavigationCoordinator() {
  const router = useRouter();
  const segments = useSegments();
  const { colors, typography, spacing, isHydrated } = useAppTheme();

  const status = useAuthWorkspaceStore((s) => s.status);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const needsWorkspaceSelection = useAuthWorkspaceStore(
    (s) => s.needsWorkspaceSelection
  );
  const hasOnlyUnsupportedRoles = useAuthWorkspaceStore(
    (s) => s.hasOnlyUnsupportedRoles
  );
  const pendingInvitationToken = useAuthWorkspaceStore(
    (s) => s.pendingInvitationToken
  );
  const setPendingInvitationToken = useAuthWorkspaceStore(
    (s) => s.setPendingInvitationToken
  );

  // Handle incoming deep links (`sideforge://invitations?token=...`)
  // Unauthenticated deep links preserve the token and redirect to Login first.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('invitation') || url.includes('token=')) {
        const token = extractInvitationTokenFromInput(url);
        if (token) {
          void setPendingInvitationToken(token);
          const currentStatus = useAuthWorkspaceStore.getState().status;
          if (currentStatus === 'AUTHENTICATED') {
            router.replace({ pathname: '/invitations', params: { token } });
          } else if (currentStatus === 'UNAUTHENTICATED') {
            router.replace('/(auth)/login');
          }
        }
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, [router, setPendingInvitationToken]);

  // Enforce Auth & Workspace routing boundaries
  useEffect(() => {
    if (!isHydrated || status === 'BOOTSTRAPPING') return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === '(auth)';
    const inInvitationScreen = firstSegment === 'invitations';
    const inWorkspaceSelect = firstSegment === 'workspace-select';
    const inSettings = firstSegment === 'settings';

    if (status === 'UNAUTHENTICATED') {
      // Unauthenticated users may ONLY access /(auth)/* screens.
      // Invitation acceptance (/invitations) is strictly authenticated-only.
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
    // If an invitation deep link was preserved prior to login, continue to /invitations first.
    if (pendingInvitationToken) {
      if (!inInvitationScreen) {
        router.replace({
          pathname: '/invitations',
          params: { token: pendingInvitationToken },
        });
      }
      return;
    }

    if (
      needsWorkspaceSelection ||
      hasOnlyUnsupportedRoles ||
      !activeWorkspace
    ) {
      if (!inWorkspaceSelect && !inInvitationScreen && !inSettings) {
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
    pendingInvitationToken,
    segments,
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

