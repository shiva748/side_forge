import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';

export default function SettingsStackLayout() {
  const { colors } = useAppTheme();
  const status = useAuthWorkspaceStore((s) => s.status);

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="password" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
