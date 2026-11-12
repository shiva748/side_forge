import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Activity,
  Award,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Users,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { formatRoleCodeLabel } from '@/types/auth';
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

  const tiles: FeatureTileItem[] = [
    {
      key: 'directory',
      title: 'Students & Staff',
      description: 'Student profiles, guardian records & staff directory',
      Icon: Users,
      tone: 'primary',
      onPress: () => navigateTo('/(admin)/directory'),
    },
    {
      key: 'operations',
      title: 'Daily Operations',
      description: 'School operations & daily activity overview',
      Icon: Activity,
      tone: 'info',
      onPress: () => navigateTo('/(admin)/operations'),
    },
    {
      key: 'attendance',
      title: 'Attendance',
      description: 'Student and staff attendance tracking',
      Icon: ClipboardCheck,
      tone: 'success',
      onPress: () =>
        navigateTo('/(admin)/operations', {
          params: { section: 'attendance' },
        }),
    },
    {
      key: 'timetable',
      title: 'Timetable',
      description: 'Class & section schedules and period slots',
      Icon: Calendar,
      tone: 'primary',
      onPress: () =>
        navigateTo('/(admin)/operations', {
          params: { section: 'timetable' },
        }),
    },
    {
      key: 'examinations',
      title: 'Examinations',
      description: 'Exam schedules, subject marks & report cards',
      Icon: Award,
      tone: 'warning',
      onPress: () =>
        navigateTo('/(admin)/operations', {
          params: { section: 'examinations' },
        }),
    },
    {
      key: 'finance',
      title: 'Fees & Finance',
      description: 'Fee collections, outstanding dues & receipts',
      Icon: CreditCard,
      tone: 'success',
      onPress: () => navigateTo('/(admin)/finance'),
    },
    {
      key: 'communication',
      title: 'Communication',
      description: 'School announcements, notices & alerts',
      Icon: Bell,
      tone: 'info',
      onPress: () =>
        navigateTo('/(admin)/operations', {
          params: { section: 'communication' },
        }),
    },
    {
      key: 'workspaces',
      title: 'Workspaces',
      description: 'Switch school or role & review invitations',
      Icon: Building2,
      tone: 'primary',
      onPress: () => navigateTo('/workspace-select'),
    },
  ];

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

