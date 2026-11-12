import React from 'react';
import { CreditCard } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function ParentFeesScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Fees & Statements"
          subtitle="Fee demands, concessions, balances & receipts"
        />
      }
    >
      <EmptyState
        icon={<CreditCard size={iconSizes.xl} color={colors.primary} />}
        title="Fees & Statements"
        description="Consolidated family fee overviews, child-specific fee demands, and downloadable payment receipts will appear here."
      />
    </ScreenContainer>
  );
}

