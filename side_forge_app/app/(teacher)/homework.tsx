import React from 'react';
import { FileText } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function TeacherHomeworkScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Homework & Grading"
          subtitle="Create assignments and evaluate student submissions"
        />
      }
    >
      <EmptyState
        icon={<FileText size={iconSizes.xl} color={colors.primary} />}
        title="Homework & Evaluation"
        description="Homework assignments, file attachments, student submission tracking, and grading will appear here."
      />
    </ScreenContainer>
  );
}

