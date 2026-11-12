import React from 'react';
import { Activity } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function AdminOperationsScreen() {
  const { colors, iconSizes } = useAppTheme();
  const params = useLocalSearchParams<{ section?: string }>();

  const sectionLabel =
    params.section === 'attendance'
      ? 'Attendance Overview'
      : params.section === 'timetable'
      ? 'Class & Section Timetables'
      : params.section === 'examinations'
      ? 'Examinations & Report Cards'
      : params.section === 'communication'
      ? 'School Announcements & Notices'
      : 'Daily School Operations';

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Operations"
          subtitle="Attendance, timetables, exams & announcements"
        />
      }
    >
      <EmptyState
        icon={<Activity size={iconSizes.xl} color={colors.primary} />}
        title={sectionLabel}
        description="Daily student and staff attendance summaries, section timetables, examination schedules, and school announcements will appear here."
      />
    </ScreenContainer>
  );
}

