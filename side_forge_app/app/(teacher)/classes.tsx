import React from 'react';
import { ClipboardCheck } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function TeacherClassesScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Classes & Attendance"
          subtitle="Assigned class rosters and daily student attendance"
        />
      }
    >
      <EmptyState
        icon={<ClipboardCheck size={iconSizes.xl} color={colors.primary} />}
        title="Classes & Attendance"
        description="Assigned classes, section student rosters, and daily attendance marking will appear here."
      />
    </ScreenContainer>
  );
}

