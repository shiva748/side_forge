import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  ChildSwitcherBanner,
  type LinkedChildSummary,
} from '@/components/workspace/ChildSwitcherBanner';
import {
  FeatureTileGrid,
  type FeatureTileItem,
  FeedbackBanner,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui';

export default function ParentOverviewScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const { navigateTo } = useSafeNavigation();
  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const [linkedChildren] = useState<LinkedChildSummary[]>([]);

  const tiles: FeatureTileItem[] = [
    {
      key: 'attendance',
      title: 'Attendance',
      description: 'Daily attendance status & monthly summary',
      Icon: CalendarCheck,
      tone: 'success',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'attendance' },
        }),
    },
    {
      key: 'timetable',
      title: 'Timetable',
      description: 'Weekly class & section period schedule',
      Icon: Calendar,
      tone: 'primary',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'timetable' },
        }),
    },
    {
      key: 'homework',
      title: 'Homework',
      description: 'Assigned tasks, file uploads & feedback',
      Icon: FileSpreadsheet,
      tone: 'info',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'homework' },
        }),
    },
    {
      key: 'exams',
      title: 'Exams & Report Cards',
      description: 'Exam schedules, results & report cards',
      Icon: GraduationCap,
      tone: 'warning',
      onPress: () =>
        navigateTo('/(parent)/academics', {
          params: { section: 'exams' },
        }),
    },
    {
      key: 'fees',
      title: 'Fees & Receipts',
      description: 'Fee demands, balances & payment history',
      Icon: CreditCard,
      tone: 'success',
      onPress: () => navigateTo('/(parent)/fees'),
    },
    {
      key: 'updates',
      title: 'School Updates',
      description: 'Announcements, circulars & notifications',
      Icon: Bell,
      tone: 'primary',
      onPress: () => navigateTo('/(parent)/updates'),
    },
  ];

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Parent Portal"
          subtitle={activeWorkspace?.organizationName}
        />
      }
    >
      <View style={[styles.welcomeSection, { marginBottom: spacing.lg }]}>
        <View style={[styles.badgeRow, { marginBottom: spacing.xs }]}>
          <StatusBadge label="Parent Portal" tone="primary" />
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
          }}
        >
          Hello, {user?.firstName ?? 'Parent'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginTop: 4,
          }}
        >
          Stay updated on academics, attendance, fees, and announcements from{' '}
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
              'This school organization currently has restricted operational access.'
            }
          />
        </View>
      ) : null}

      <ChildSwitcherBanner
        childrenList={linkedChildren}
        selectedChildId={selectedChildId}
        onSelectChild={setSelectedChildId}
      />

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
          Family & Student Modules
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

