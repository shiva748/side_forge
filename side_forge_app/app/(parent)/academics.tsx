import React from 'react';
import { BookOpen } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ParentAcademicsScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Academics"
          subtitle="Attendance, timetable, homework & examination results"
        />
      }
    >
      <EmptyState
        icon={<BookOpen size={iconSizes.xl} color={colors.primary} />}
        title="Child Academics"
        description="Child attendance history, weekly section timetable, homework submissions, and published report cards will appear here."
      />
    </ScreenContainer>
  );
}

