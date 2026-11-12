import React from 'react';
import { CreditCard } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import { EmptyState, ScreenContainer } from '@/components/ui';

export default function AdminFinanceScreen() {
  const { colors, iconSizes } = useAppTheme();

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Fees & Finance"
          subtitle="Fee collections, pending dues & receipts"
        />
      }
    >
      <EmptyState
        icon={<CreditCard size={iconSizes.xl} color={colors.primary} />}
        title="Fees & Finance Overview"
        description="Session fee collection summaries, outstanding student balances, and recent payment receipts will appear here."
      />
    </ScreenContainer>
  );
}

