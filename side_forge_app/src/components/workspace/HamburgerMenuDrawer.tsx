import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LogOut,
  Palette,
  Settings,
  Ticket,
  User,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { formatRoleCodeLabel, type MobileWorkspace } from '@/types/auth';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface HamburgerMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function HamburgerMenuDrawer({
  visible,
  onClose,
}: HamburgerMenuDrawerProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes, preference } =
    useAppTheme();
  const { navigateTo, resetToWorkspaceHome, resetToLogin } =
    useSafeNavigation();

  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const workspaces = useAuthWorkspaceStore((s) => s.workspaces);
  const pendingInvitationsCount = useAuthWorkspaceStore(
    (s) => s.pendingInvitationsCount
  );
  const selectWorkspace = useAuthWorkspaceStore((s) => s.selectWorkspace);
  const logout = useAuthWorkspaceStore((s) => s.logout);

  const [switchingKey, setSwitchingKey] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const themeLabel =
    preference === 'system'
      ? 'System Default'
      : preference === 'dark'
      ? 'Dark Mode'
      : 'Light Mode';

  const handleOpenRoute = (href: string) => {
    onClose();
    navigateTo(href);
  };

  const handleSelectWorkspace = async (workspace: MobileWorkspace) => {
    if (switchingKey) return;
    if (activeWorkspace?.key === workspace.key) {
      onClose();
      return;
    }

    const authorized = workspaces.find((w) => w.key === workspace.key);
    if (!authorized) {
      return;
    }

    setSwitchingKey(authorized.key);
    try {
      await selectWorkspace(authorized, queryClient);
      onClose();
      resetToWorkspaceHome(authorized.experience);
    } finally {
      setSwitchingKey(null);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout(queryClient);
      onClose();
      resetToLogin();
    } finally {
      setLoggingOut(false);
    }
  };

  const otherWorkspaces = workspaces.filter(
    (w) => w.key !== activeWorkspace?.key
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlayRow}>
        <View
          style={[
            styles.drawerSheet,
            {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View
            style={[
              styles.drawerHeader,
              {
                paddingHorizontal: spacing.md,
                paddingBottom: spacing.sm,
                borderBottomColor: colors.separator,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                Side Forge
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.bold,
                  marginTop: 2,
                }}
              >
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                  'Account Menu'}
              </Text>
              {user?.email ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  }}
                >
                  {user.email}
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              hitSlop={10}
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <X size={iconSizes.md} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              gap: spacing.lg,
            }}
          >
            {/* 1. WORKSPACE SECTION */}
            <View>
              <Text
                style={[
                  styles.sectionTitle,
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

              {activeWorkspace ? (
                <View
                  style={[
                    styles.workspaceCard,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.rowCenter}>
                    <Building2 size={iconSizes.sm} color={colors.primary} />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
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
                    Workspace: {activeWorkspace.experienceLabel}
                  </Text>
                  <View
                    style={[
                      styles.badgesWrap,
                      { marginTop: spacing.xs, gap: 6 },
                    ]}
                  >
                    {activeWorkspace.roles.map((role) => (
                      <StatusBadge
                        key={role}
                        label={formatRoleCodeLabel(role)}
                        tone="primary"
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              {otherWorkspaces.length > 0 ? (
                <View style={{ marginTop: spacing.xs }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      marginBottom: 6,
                    }}
                  >
                    Switch School or Role ({otherWorkspaces.length} available)
                  </Text>
                  <View style={{ gap: 6 }}>
                    {otherWorkspaces.map((ws) => (
                      <Pressable
                        key={ws.key}
                        accessibilityRole="button"
                        disabled={Boolean(switchingKey)}
                        onPress={() => handleSelectWorkspace(ws)}
                        style={({ pressed }) => [
                          styles.switchItem,
                          {
                            backgroundColor: pressed
                              ? colors.surfaceInteractivePressed
                              : colors.background,
                            borderColor: colors.border,
                            borderRadius: radius.md,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs + 2,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: colors.textPrimary,
                              fontSize: typography.fontSizes.sm,
                              fontWeight: typography.fontWeights.semibold,
                            }}
                          >
                            {ws.organizationName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: colors.textSecondary,
                              fontSize: typography.fontSizes.xs,
                              marginTop: 2,
                            }}
                          >
                            {ws.experienceLabel} •{' '}
                            {ws.roles.map(formatRoleCodeLabel).join(', ')}
                          </Text>
                        </View>
                        <ArrowLeftRight
                          size={iconSizes.sm}
                          color={colors.primaryText}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => handleOpenRoute('/workspace-select')}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceInteractivePressed
                      : 'transparent',
                    borderRadius: radius.md,
                    marginTop: spacing.xs,
                    paddingVertical: spacing.xs + 2,
                    paddingHorizontal: spacing.xs,
                  },
                ]}
              >
                <ArrowLeftRight size={iconSizes.sm} color={colors.primaryText} />
                <Text
                  style={{
                    color: colors.primaryText,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                    marginLeft: spacing.sm,
                    flex: 1,
                  }}
                >
                  All Workspaces
                </Text>
                <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleOpenRoute('/invitations')}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceInteractivePressed
                      : 'transparent',
                    borderRadius: radius.md,
                    marginTop: 2,
                    paddingVertical: spacing.xs + 2,
                    paddingHorizontal: spacing.xs,
                  },
                ]}
              >
                <Ticket size={iconSizes.sm} color={colors.primaryText} />
                <Text
                  style={{
                    color: colors.primaryText,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.medium,
                    marginLeft: spacing.sm,
                    flex: 1,
                  }}
                >
                  Invitations
                </Text>
                {pendingInvitationsCount > 0 ? (
                  <StatusBadge
                    label={`${pendingInvitationsCount} Pending`}
                    tone="warning"
                    style={{ marginRight: spacing.xs }}
                  />
                ) : null}
                <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
              </Pressable>
            </View>
            {/* 2. SETTINGS SECTION */}
            <View>
              <Text
                style={[
                  styles.sectionTitle,
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
              <View
                style={[
                  styles.menuGroup,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <DrawerMenuItem
                  icon={<Settings size={iconSizes.sm} color={colors.primaryText} />}
                  title="Settings Overview"
                  subtitle="Appearance, profile & security"
                  onPress={() => handleOpenRoute('/settings')}
                  showDivider
                />
                <DrawerMenuItem
                  icon={<Palette size={iconSizes.sm} color={colors.primaryText} />}
                  title="Theme Appearance"
                  subtitle={themeLabel}
                  onPress={() => handleOpenRoute('/settings/appearance')}
                  showDivider
                />
                <DrawerMenuItem
                  icon={<User size={iconSizes.sm} color={colors.primaryText} />}
                  title="Personal Profile"
                  subtitle="Name & mobile number"
                  onPress={() => handleOpenRoute('/settings/profile')}
                  showDivider
                />
                <DrawerMenuItem
                  icon={<KeyRound size={iconSizes.sm} color={colors.primaryText} />}
                  title="Change Password"
                  subtitle="Update your account password"
                  onPress={() => handleOpenRoute('/settings/password')}
                  showDivider
                />
                <DrawerMenuItem
                  icon={<Bell size={iconSizes.sm} color={colors.primaryText} />}
                  title="Notification Preferences"
                  subtitle="Alerts & delivery channels"
                  onPress={() => handleOpenRoute('/settings/notifications')}
                />
              </View>
            </View>

            {/* 3. ACCOUNT SECTION */}
            <View>
              <Text
                style={[
                  styles.sectionTitle,
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
              <View
                style={[
                  styles.menuGroup,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    backgroundColor: colors.background,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View style={[styles.rowCenter, { marginBottom: spacing.sm }]}>
                  <CheckCircle2 size={iconSizes.sm} color={colors.success} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginLeft: spacing.xs,
                      flex: 1,
                    }}
                  >
                    Signed in as {user?.email ?? 'authenticated user'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={loggingOut}
                  onPress={handleLogout}
                  style={({ pressed }) => [
                    styles.logoutBtn,
                    {
                      backgroundColor: pressed
                        ? colors.dangerPressed
                        : colors.dangerSoft,
                      borderColor: colors.dangerBorder,
                      borderRadius: radius.md,
                      paddingVertical: spacing.xs + 2,
                      paddingHorizontal: spacing.sm,
                    },
                  ]}
                >
                  <LogOut size={iconSizes.sm} color={colors.dangerText} />
                  <Text
                    style={{
                      color: colors.dangerText,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: spacing.xs,
                    }}
                  >
                    {loggingOut ? 'Signing Out...' : 'Sign Out'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss navigation menu"
          style={[styles.backdrop, { backgroundColor: colors.overlayScrim }]}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

function DrawerMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  showDivider = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerMenuItem,
        {
          backgroundColor: pressed
            ? colors.surfaceInteractivePressed
            : 'transparent',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.drawerMenuIcon}>{icon}</View>
      <View style={{ flex: 1, marginLeft: spacing.xs }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayRow: { flex: 1, flexDirection: 'row' },
  drawerSheet: {
    width: '84%',
    maxWidth: 340,
    height: '100%',
    borderRightWidth: 1,
  },
  backdrop: { flex: 1 },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.6 },
  workspaceCard: { borderWidth: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  switchItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  menuGroup: { borderWidth: 1, overflow: 'hidden' },
  drawerMenuItem: { flexDirection: 'row', alignItems: 'center' },
  drawerMenuIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

