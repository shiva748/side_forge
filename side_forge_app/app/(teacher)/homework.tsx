import React from 'react';
import { FileText, GraduationCap } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function TeacherHomeworkScreen() {
  const { colors, iconSizes } = useAppTheme();
  const params = useLocalSearchParams<{ section?: string }>();
  const isExamsView = params.section === 'exams';

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title={isExamsView ? 'Examinations & Marks' : 'Homework & Grading'}
          subtitle={
            isExamsView
              ? 'Subject mark entry and examination schedules'
              : 'Create assignments and evaluate student submissions'
          }
        />
      }
    >
      <EmptyState
        icon={
          isExamsView ? (
            <GraduationCap size={iconSizes.xl} color={colors.primary} />
          ) : (
            <FileText size={iconSizes.xl} color={colors.primary} />
          )
        }
        title={isExamsView ? 'Examinations & Mark Entry' : 'Homework & Evaluation'}
        description={
          isExamsView
            ? 'Assigned examination schedules and subject-wise student mark entry will appear here.'
            : 'Homework assignments, file attachments, student submission tracking, and grading will appear here.'
        }
      />
    </ScreenContainer>
  );
}


