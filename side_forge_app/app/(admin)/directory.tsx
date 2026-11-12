import React from 'react';
import { Users } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function AdminDirectoryScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Students & Staff"
          subtitle="Students, guardians, teachers & staff directory"
        />
      }
    >
      <EmptyState
        icon={<Users size={iconSizes.xl} color={colors.primary} />}
        title="Students & Staff Directory"
        description="Search and browse enrolled students, guardian contacts, teachers, and school staff profiles from this section."
      />
    </ScreenContainer>
  );
}

