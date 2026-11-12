import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
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

  const tiles: FeatureTileItem[] = [
    {
      key: 'timetable',
      title: 'Teaching Schedule',
      description: 'Daily & weekly assigned class periods',
      Icon: Calendar,
      tone: 'primary',
      onPress: () => navigateTo('/(teacher)/timetable'),
    },
    {
      key: 'attendance',
      title: 'Class Attendance',
      description: 'Daily roll call & section attendance',
      Icon: ClipboardCheck,
      tone: 'success',
      onPress: () => navigateTo('/(teacher)/classes'),
    },
    {
      key: 'homework',
      title: 'Homework & Grading',
      description: 'Assign work & review student submissions',
      Icon: FileText,
      tone: 'info',
      onPress: () => navigateTo('/(teacher)/homework'),
    },
    {
      key: 'classes',
      title: 'Assigned Classes',
      description: 'Section student rosters & academic details',
      Icon: Users,
      tone: 'primary',
      onPress: () =>
        navigateTo('/(teacher)/classes', { params: { section: 'roster' } }),
    },
    {
      key: 'exams',
      title: 'Examinations & Marks',
      description: 'Subject mark entry & exam schedules',
      Icon: GraduationCap,
      tone: 'warning',
      onPress: () =>
        navigateTo('/(teacher)/homework', { params: { section: 'exams' } }),
    },
    {
      key: 'workspaces',
      title: 'Workspaces & Alerts',
      description: 'Switch workspace or manage notifications',
      Icon: Building2,
      tone: 'info',
      onPress: () => navigateTo('/workspace-select'),
    },
  ];

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

