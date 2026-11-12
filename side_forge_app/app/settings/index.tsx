import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Bell,
  Building2,
  KeyRound,
  LogOut,
  Palette,
  Ticket,
  User,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { formatRoleCodeLabel } from '@/types/auth';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  ListItemRow,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export default function SettingsOverviewScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, typography, iconSizes, preference } = useAppTheme();
  const { navigateTo, resetToLogin } = useSafeNavigation();

  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const workspaces = useAuthWorkspaceStore((s) => s.workspaces);
  const logout = useAuthWorkspaceStore((s) => s.logout);

  const [loggingOut, setLoggingOut] = useState(false);

  const themeLabel =
    preference === 'system'
      ? 'System Default'
      : preference === 'dark'
      ? 'Dark Mode'
      : 'Light Mode';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout(queryClient);
      resetToLogin();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title="Settings"
          subtitle="Appearance, personal profile, security & workspace"
          showBack
        />
      }
    >
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            styles.sectionHeading,
            {
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginBottom: spacing.xs,
            },
          ]}
        >
          Settings
        </Text>
        <SurfaceCard padded={false}>
          <ListItemRow
            title="Theme Appearance"
            subtitle={`Current: ${themeLabel}`}
            leftIcon={<Palette size={iconSizes.md} color={colors.primaryText} />}
            showChevron
            showDivider
            onPress={() => navigateTo('/settings/appearance')}
          />
          <ListItemRow
            title="Personal Profile"
            subtitle={
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              'Update your name & mobile number'
            }
            leftIcon={<User size={iconSizes.md} color={colors.primaryText} />}
            showChevron
            showDivider
            onPress={() => navigateTo('/settings/profile')}
          />
          <ListItemRow
            title="Change Password"
            subtitle="Update your account password"
            leftIcon={
              <KeyRound size={iconSizes.md} color={colors.primaryText} />
            }
            showChevron
            showDivider
            onPress={() => navigateTo('/settings/password')}
          />
          <ListItemRow
            title="Notification Preferences"
            subtitle="Manage alert categories & delivery channels"
            leftIcon={<Bell size={iconSizes.md} color={colors.primaryText} />}
            showChevron
            onPress={() => navigateTo('/settings/notifications')}
          />
        </SurfaceCard>
      </View>
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            styles.sectionHeading,
            {
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginBottom: spacing.xs,
            },
          ]}
        >
          Workspace
        </Text>
        <SurfaceCard>
          {activeWorkspace ? (
            <View style={{ marginBottom: spacing.md }}>
              <View style={styles.rowCenter}>
                <Building2 size={iconSizes.md} color={colors.primary} />
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.base,
                    fontWeight: typography.fontWeights.semibold,
                    marginLeft: spacing.xs,
                    flex: 1,
                  }}
                >
                  {activeWorkspace.organizationName}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 4,
                }}
              >
                Active Workspace: {activeWorkspace.experienceLabel}
              </Text>
              <View
                style={[styles.badgesRow, { marginTop: spacing.xs, gap: 6 }]}
              >
                {activeWorkspace.roles.map((r) => (
                  <StatusBadge
                    key={r}
                    label={formatRoleCodeLabel(r)}
                    tone="primary"
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.xs }}>
            <AppButton
              label={
                workspaces.length > 1
                  ? `Switch School or Role (${workspaces.length} Available)`
                  : 'Manage Workspaces'
              }
              variant="secondary"
              size="sm"
              leftIcon={
                <ArrowLeftRight
                  size={iconSizes.sm}
                  color={colors.secondaryText}
                />
              }
              onPress={() => navigateTo('/workspace-select')}
            />
            <AppButton
              label="School Invitations"
              variant="outline"
              size="sm"
              leftIcon={
                <Ticket size={iconSizes.sm} color={colors.textPrimary} />
              }
              onPress={() => navigateTo('/invitations')}
            />
          </View>
        </SurfaceCard>
      </View>

      <View>
        <Text
          style={[
            styles.sectionHeading,
            {
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginBottom: spacing.xs,
            },
          ]}
        >
          Account
        </Text>
        <SurfaceCard>
          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                'Authenticated Account'}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                marginTop: 2,
              }}
            >
              {user?.email}
            </Text>
            {user?.phoneNumber ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                Mobile: {user.phoneNumber}
              </Text>
            ) : null}
          </View>

          <AppButton
            label="Sign Out"
            variant="danger"
            loading={loggingOut}
            leftIcon={<LogOut size={iconSizes.sm} color={colors.textOnPrimary} />}
            onPress={handleLogout}
          />
        </SurfaceCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { textTransform: 'uppercase', letterSpacing: 0.6 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
