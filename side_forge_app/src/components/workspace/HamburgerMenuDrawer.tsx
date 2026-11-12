import React, { useMemo, useState } from 'react';
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
  ChevronRight,
  LogOut,
  Settings,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { formatRoleCodeLabel } from '@/types/auth';
import {
  getRoleNavigationItems,
  isRoleNavigationItemActive,
  type RoleNavigationItemConfig,
} from '@/constants/roleNavigation';
import {
  normalizeRoutePath,
  useSafeNavigation,
} from '@/utils/navigationGuard';
import { UserAvatar } from '@/components/ui/UserAvatar';

export interface HamburgerMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

function resolvePrimaryRoleLabel(
  experience?: string,
  roles?: string[]
): string {
  if (experience === 'PARENT') return 'Parent';
  if (experience === 'TEACHER') return 'Teacher';
  if (roles && roles.length > 0 && roles[0]) {
    return formatRoleCodeLabel(roles[0]);
  }
  if (experience === 'SCHOOL_ADMIN') return 'School Administrator';
  return 'Member';
}

export function HamburgerMenuDrawer({
  visible,
  onClose,
}: HamburgerMenuDrawerProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes, touchTargets } =
    useAppTheme();
  const { pathname, currentSection, navigateTo, resetToLogin } =
    useSafeNavigation();

  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const profilePhotoVersion = useAuthWorkspaceStore(
    (s) => s.profilePhotoVersion
  );
  const logout = useAuthWorkspaceStore((s) => s.logout);

  const [loggingOut, setLoggingOut] = useState(false);

  const fullName = useMemo(() => {
    const joined = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return joined || 'User Account';
  }, [user?.firstName, user?.lastName]);

  const roleLabel = useMemo(
    () =>
      resolvePrimaryRoleLabel(
        activeWorkspace?.experience,
        activeWorkspace?.roles
      ),
    [activeWorkspace?.experience, activeWorkspace?.roles]
  );

  const roleNavItems = useMemo(
    () => getRoleNavigationItems(activeWorkspace),
    [activeWorkspace]
  );

  const normalizedPath = normalizeRoutePath(pathname || '/');
  const isProfileActive =
    normalizedPath === '/profile' || normalizedPath === '/settings/profile';
  const isWorkspaceSelectActive = normalizedPath === '/workspace-select';
  const isSettingsActive =
    normalizedPath === '/settings' ||
    (normalizedPath.startsWith('/settings/') && !isProfileActive);

  const handleOpenProfile = () => {
    onClose();
    navigateTo('/profile');
  };

  const handleOpenWorkspaceSwitcher = () => {
    onClose();
    navigateTo('/workspace-select');
  };

  const handleOpenRoleItem = (item: RoleNavigationItemConfig) => {
    onClose();
    navigateTo(item.href, item.params ? { params: item.params } : undefined);
  };

  const handleOpenSettings = () => {
    onClose();
    navigateTo('/settings');
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
              paddingTop: Math.max(insets.top, spacing.sm),
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {/* A. Top Section: Clickable User Profile Header + Dismiss Action */}
          <View
            style={[
              styles.topBarRow,
              {
                paddingHorizontal: spacing.md,
                paddingBottom: spacing.sm,
                borderBottomColor: colors.separator,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open personal profile for ${fullName}`}
              onPress={handleOpenProfile}
              style={({ pressed }) => [
                styles.profilePressable,
                {
                  backgroundColor: isProfileActive
                    ? colors.primarySoft
                    : pressed
                    ? colors.surfaceInteractivePressed
                    : 'transparent',
                  borderColor: isProfileActive
                    ? colors.primarySoftBorder
                    : 'transparent',
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.xs,
                },
              ]}
            >
              <UserAvatar
                firstName={user?.firstName}
                lastName={user?.lastName}
                profilePhotoUrl={user?.profilePhotoUrl}
                profilePhotoFileId={user?.profilePhotoFileId}
                photoVersion={profilePhotoVersion}
                size={44}
                highlighted={isProfileActive}
              />

              <View style={[styles.profileTextBlock, { marginLeft: spacing.sm }]}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.base,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {fullName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.primaryText,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                    marginTop: 1,
                  }}
                >
                  {roleLabel}
                </Text>
                {activeWorkspace?.organizationName ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 1,
                    }}
                  >
                    {activeWorkspace.organizationName}
                  </Text>
                ) : null}
              </View>

              <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close navigation drawer"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed
                    ? colors.surfaceInteractivePressed
                    : colors.surfaceMuted,
                  borderRadius: radius.sm,
                  marginLeft: spacing.xs,
                },
              ]}
            >
              <X size={iconSizes.sm} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* B. Workspace Switching Action */}
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.separator,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch School or Role"
              onPress={handleOpenWorkspaceSwitcher}
              style={({ pressed }) => [
                styles.switchWorkspaceBtn,
                {
                  minHeight: touchTargets.buttonHeightSm + 4,
                  backgroundColor: isWorkspaceSelectActive
                    ? colors.primarySoft
                    : pressed
                    ? colors.surfaceInteractivePressed
                    : colors.surfaceMuted,
                  borderColor: isWorkspaceSelectActive
                    ? colors.primarySoftBorder
                    : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <ArrowLeftRight
                size={iconSizes.sm}
                color={
                  isWorkspaceSelectActive
                    ? colors.primaryText
                    : colors.textPrimary
                }
              />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: isWorkspaceSelectActive
                    ? colors.primaryText
                    : colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: spacing.xs + 2,
                }}
              >
                Switch School / Role
              </Text>
              <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* C. Scrollable Role-Specific Navigation + Settings */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.md,
            }}
          >
            {roleNavItems.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                      marginBottom: spacing.xxs + 2,
                      paddingHorizontal: spacing.xs,
                    },
                  ]}
                >
                  {activeWorkspace?.experience === 'PARENT'
                    ? 'Parent Portal'
                    : activeWorkspace?.experience === 'TEACHER'
                    ? 'Teacher Workspace'
                    : 'Administration'}
                </Text>

                <View style={{ gap: 2 }}>
                  {roleNavItems.map((item) => {
                    const active = isRoleNavigationItemActive(
                      item,
                      pathname,
                      currentSection
                    );
                    const IconComp = item.Icon;
                    return (
                      <DrawerNavRow
                        key={item.key}
                        label={item.drawerLabel ?? item.title}
                        icon={
                          <IconComp
                            size={iconSizes.md}
                            color={
                              active ? colors.primaryText : colors.textSecondary
                            }
                          />
                        }
                        active={active}
                        onPress={() => handleOpenRoleItem(item)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View
              style={{
                height: 1,
                backgroundColor: colors.separator,
                marginVertical: spacing.xs + 2,
              }}
            />

            {/* D. Single Compact Settings Entry */}
            <DrawerNavRow
              label="Settings"
              icon={
                <Settings
                  size={iconSizes.md}
                  color={
                    isSettingsActive ? colors.primaryText : colors.textSecondary
                  }
                />
              }
              active={isSettingsActive}
              showChevron
              onPress={handleOpenSettings}
            />
          </ScrollView>

          {/* Footer: Sign Out */}
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingTop: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: colors.separator,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
              disabled={loggingOut}
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                {
                  minHeight: touchTargets.buttonHeightSm + 4,
                  backgroundColor: pressed
                    ? colors.dangerSoft
                    : colors.backgroundSubtle,
                  borderColor: colors.dangerBorder,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs + 2,
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

function DrawerNavRow({
  icon,
  label,
  active = false,
  showChevron = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  showChevron?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes, touchTargets } =
    useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        {
          minHeight: touchTargets.minHeight,
          backgroundColor: active
            ? colors.primarySoft
            : pressed
            ? colors.surfaceInteractivePressed
            : 'transparent',
          borderColor: active ? colors.primarySoftBorder : 'transparent',
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs + 2,
        },
      ]}
    >
      <View style={styles.navIconWrap}>{icon}</View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: active ? colors.primaryText : colors.textPrimary,
          fontSize: typography.fontSizes.sm,
          fontWeight: active
            ? typography.fontWeights.bold
            : typography.fontWeights.medium,
          marginLeft: spacing.sm,
        }}
      >
        {label}
      </Text>
      {active ? (
        <View
          style={[
            styles.activeDot,
            { backgroundColor: colors.primary, marginLeft: spacing.xs },
          ]}
        />
      ) : showChevron ? (
        <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayRow: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerSheet: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    borderRightWidth: 1,
  },
  backdrop: {
    flex: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  profilePressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileTextBlock: {
    flex: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  navIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
