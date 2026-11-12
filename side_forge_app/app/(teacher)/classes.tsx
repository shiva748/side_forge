import React from 'react';
import { ClipboardCheck, Users } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function TeacherClassesScreen() {
  const { colors, iconSizes } = useAppTheme();
  const params = useLocalSearchParams<{ section?: string }>();
  const isRosterView = params.section === 'roster';

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title={isRosterView ? 'Assigned Classes & Students' : 'Class Attendance'}
          subtitle={
            isRosterView
              ? 'Section student rosters and academic details'
              : 'Daily roll call and section student attendance'
          }
        />
      }
    >
      <EmptyState
        icon={
          isRosterView ? (
            <Users size={iconSizes.xl} color={colors.primary} />
          ) : (
            <ClipboardCheck size={iconSizes.xl} color={colors.primary} />
          )
        }
        title={isRosterView ? 'Assigned Classes & Student Rosters' : 'Class Attendance'}
        description={
          isRosterView
            ? 'Your assigned classes, sections, and enrolled student rosters will appear here.'
            : 'Daily section attendance marking and attendance registers will appear here.'
        }
      />
    </ScreenContainer>
  );
}


