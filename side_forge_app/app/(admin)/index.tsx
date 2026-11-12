import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { formatRoleCodeLabel } from '@/types/auth';
import { getRoleNavigationItems } from '@/constants/roleNavigation';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  FeatureTileGrid,
  type FeatureTileItem,
  FeedbackBanner,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui';

export default function SchoolAdminOverviewScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const { navigateTo } = useSafeNavigation();
  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);

  const tiles = useMemo<FeatureTileItem[]>(() => {
    const items = getRoleNavigationItems(activeWorkspace, {
      homeGridOnly: true,
    });
    return items.map((item) => ({
      key: item.key,
      title: item.title,
      description: item.description,
      Icon: item.Icon,
      tone: item.tone,
      badge: item.badge,
      onPress: () =>
        navigateTo(item.href, item.params ? { params: item.params } : undefined),
    }));
  }, [activeWorkspace, navigateTo]);

  const primaryRoleLabel = activeWorkspace?.roles?.[0]
    ? formatRoleCodeLabel(activeWorkspace.roles[0])
    : 'School Administration';

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="School Administration"
          subtitle={activeWorkspace?.organizationName}
        />
      }
    >
      <View style={[styles.welcomeSection, { marginBottom: spacing.lg }]}>
        <View style={[styles.badgeRow, { marginBottom: spacing.xs }]}>
          <StatusBadge label={primaryRoleLabel} tone="primary" />
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Welcome, {user?.firstName ?? 'Administrator'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginTop: 4,
          }}
        >
          Select a module below to manage {activeWorkspace?.organizationName ?? 'your school'}.
        </Text>
      </View>

      {activeWorkspace?.organizationStatus &&
      activeWorkspace.organizationStatus !== 'ACTIVE' ? (
        <View style={{ marginBottom: spacing.md }}>
          <FeedbackBanner
            tone="warning"
            title={`Organization ${activeWorkspace.organizationStatus}`}
            message={
              activeWorkspace.statusReason ??
              'This school organization currently has restricted operational access.'
            }
          />
        </View>
      ) : null}

      <View style={{ marginBottom: spacing.xs }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.semibold,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: spacing.sm,
          }}
        >
          Administration Modules
        </Text>
        <FeatureTileGrid tiles={tiles} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

