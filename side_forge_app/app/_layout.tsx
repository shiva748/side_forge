import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppProviders } from '@/providers/AppProviders';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
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

