import React from 'react';
import { Bell } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ParentUpdatesScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="School Updates"
          subtitle="Announcements, circulars & notifications"
        />
      }
    >
      <EmptyState
        icon={<Bell size={iconSizes.xl} color={colors.primary} />}
        title="Announcements & Alerts"
        description="School announcements, circulars, and in-app notifications will appear here."
      />
    </ScreenContainer>
  );
}

