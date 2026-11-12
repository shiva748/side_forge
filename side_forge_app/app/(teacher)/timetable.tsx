import React from 'react';
import { Calendar } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function TeacherTimetableScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Teaching Schedule"
          subtitle="Daily and weekly assigned class periods"
        />
      }
    >
      <EmptyState
        icon={<Calendar size={iconSizes.xl} color={colors.primary} />}
        title="Teaching Schedule"
        description="Your section-aware daily and weekly teaching schedule will be displayed here."
      />
    </ScreenContainer>
  );
}

