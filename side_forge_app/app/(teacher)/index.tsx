import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
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

export default function TeacherOverviewScreen() {
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

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Teacher Workspace"
          subtitle={activeWorkspace?.organizationName}
        />
      }
    >
      <View style={[styles.welcomeSection, { marginBottom: spacing.lg }]}>
        <View style={[styles.badgeRow, { marginBottom: spacing.xs }]}>
          <StatusBadge label="Faculty" tone="primary" />
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Welcome, {user?.firstName ?? 'Teacher'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginTop: 4,
          }}
        >
          Access your teaching schedule, class attendance, and student assignments at{' '}
          {activeWorkspace?.organizationName ?? 'your school'}.
        </Text>
      </View>

      {activeWorkspace?.organizationStatus &&
      activeWorkspace.organizationStatus !== 'ACTIVE' ? (
        <View style={{ marginBottom: spacing.md }}>
          <FeedbackBanner
            tone="warning"
            title={`School ${activeWorkspace.organizationStatus}`}
            message={
              activeWorkspace.statusReason ??
              'Normal teaching operations are currently restricted for this organization.'
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
          Teaching Modules
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

