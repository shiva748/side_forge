import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  LogOut,
  RefreshCw,
  Shield,
  Ticket,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { invitationApi } from '@/api/invitationApi';
import {
  formatRoleCodeLabel,
  type MobileUserCategory,
  type MobileWorkspaceOption,
} from '@/types/auth';
import type { PendingInvitationItem } from '@/types/invitation';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  EmptyState,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

function getCategoryMeta(category: MobileUserCategory) {
  switch (category) {
    case 'PARENT':
      return {
        label: 'Parent Portal',
        description: 'Children, attendance, homework, exams & fee statements',
        Icon: GraduationCap,
      };
    case 'TEACHER':
      return {
        label: 'Teacher Workspace',
        description: 'Teaching schedule, assigned classes, attendance & homework',
        Icon: BookOpen,
      };
    case 'SCHOOL_ADMIN':
      return {
        label: 'School Administration',
        description: 'Students & staff directory, operations & finance',
        Icon: Shield,
      };
  }
}

export default function WorkspaceSelectScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { navigateTo, resetToWorkspaceHome, resetToLogin } =
    useSafeNavigation();

  const status = useAuthWorkspaceStore((s) => s.status);
  const workspaces = useAuthWorkspaceStore((s) => s.workspaces);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectWorkspace = useAuthWorkspaceStore((s) => s.selectWorkspace);
  const refreshUserAndMemberships = useAuthWorkspaceStore(
    (s) => s.refreshUserAndMemberships
  );
  const logout = useAuthWorkspaceStore((s) => s.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitationItem[]>(
    []
  );

  const loadData = async () => {
    setRefreshing(true);
    try {
      await refreshUserAndMemberships();
      const invites = await invitationApi
        .getMyPendingInvitations()
        .catch(() => []);
      setPendingInvites(invites.filter((i) => i.status === 'PENDING'));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status !== 'AUTHENTICATED') return;
    invitationApi
      .getMyPendingInvitations()
      .then((list) =>
        setPendingInvites(list.filter((i) => i.status === 'PENDING'))
      )
      .catch(() => {});
  }, [status]);

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  const handleSelectWorkspace = async (workspace: MobileWorkspaceOption) => {
    setSelectingKey(workspace.key);
    try {
      await selectWorkspace(workspace, queryClient);
      resetToWorkspaceHome(workspace.experience);
    } finally {
      setSelectingKey(null);
    }
  };

  const handleLogout = async () => {
    await logout(queryClient);
    resetToLogin();
  };

  const groupedByOrg = workspaces.reduce<Record<number, MobileWorkspaceOption[]>>(
    (acc, ws) => {
      const list = acc[ws.organizationId] ?? [];
      list.push(ws);
      acc[ws.organizationId] = list;
      return acc;
    },
    {}
  );

  const orgIds = Object.keys(groupedByOrg).map(Number);
  const hasActiveWorkspace = Boolean(activeWorkspace);

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={loadData}
      header={
        <ScreenHeader
          title={hasActiveWorkspace ? 'Switch Workspace' : 'Select Workspace'}
          subtitle={
            hasActiveWorkspace
              ? 'Switch between your school memberships'
              : 'Choose your school and role'
          }
          showBack={hasActiveWorkspace}
        />
      }
    >
      {pendingInvites.length > 0 ? (
        <SurfaceCard
          style={{
            backgroundColor: colors.primarySoft,
            borderColor: colors.primarySoftBorder,
            marginBottom: spacing.md,
          }}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {pendingInvites.length} Pending School Invitation
                {pendingInvites.length > 1 ? 's' : ''}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginTop: 2,
                }}
              >
                Review and accept or decline your school invitations in your
                invitation inbox.
              </Text>
            </View>
            <AppButton
              label="Open Inbox"
              size="sm"
              onPress={() => navigateTo('/invitations')}
            />
          </View>
        </SurfaceCard>
      ) : null}

      {orgIds.length === 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          <EmptyState
            icon={<Building2 size={iconSizes.xl} color={colors.primary} />}
            title="No Active School Workspaces"
            description="Your account does not have an active Parent, Teacher, or School Administration membership yet. Check your Invitation Inbox to review any pending school invitations."
            actionLabel="Open Invitation Inbox"
            onActionPress={() => navigateTo('/invitations')}
          />
        </View>
      ) : (
        orgIds.map((orgId) => {
          const orgWorkspaces = groupedByOrg[orgId] ?? [];
          const first = orgWorkspaces[0];
          if (!first) return null;

          return (
            <View key={orgId} style={{ marginBottom: spacing.lg }}>
              <View style={[styles.orgHeader, { marginBottom: spacing.xs }]}>
                <View style={styles.rowCenter}>
                  <Building2 size={iconSizes.sm} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.base,
                      fontWeight: typography.fontWeights.bold,
                      marginLeft: spacing.xs,
                    }}
                  >
                    {first.organizationName}
                  </Text>
                </View>
                <StatusBadge
                  label={first.organizationStatus}
                  tone={
                    first.organizationStatus === 'ACTIVE'
                      ? 'success'
                      : 'warning'
                  }
                />
              </View>
              <View style={{ gap: spacing.sm }}>
                {orgWorkspaces.map((ws) => {
                  const meta = getCategoryMeta(ws.category);
                  const IconComp = meta.Icon;
                  const isCurrent = activeWorkspace?.key === ws.key;

                  return (
                    <SurfaceCard
                      key={ws.key}
                      onPress={() => handleSelectWorkspace(ws)}
                      style={
                        isCurrent
                          ? { borderColor: colors.primary, borderWidth: 1.5 }
                          : undefined
                      }
                    >
                      <View style={styles.rowBetween}>
                        <View
                          style={[
                            styles.iconBox,
                            {
                              backgroundColor: colors.primarySoft,
                              borderRadius: radius.md,
                            },
                          ]}
                        >
                          <IconComp
                            size={iconSizes.md}
                            color={colors.primaryText}
                          />
                        </View>

                        <View
                          style={{
                            flex: 1,
                            marginHorizontal: spacing.sm,
                          }}
                        >
                          <View style={[styles.rowCenter, { gap: spacing.xs }]}>
                            <Text
                              style={{
                                color: colors.textPrimary,
                                fontSize: typography.fontSizes.base,
                                fontWeight: typography.fontWeights.semibold,
                              }}
                            >
                              {meta.label}
                            </Text>
                            {isCurrent ? (
                              <CheckCircle2
                                size={iconSizes.xs}
                                color={colors.primary}
                              />
                            ) : null}
                          </View>

                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: typography.fontSizes.xs,
                              marginTop: 2,
                            }}
                          >
                            {meta.description}
                          </Text>

                          <View
                            style={[
                              styles.roleBadgesRow,
                              { marginTop: spacing.xs, gap: 6 },
                            ]}
                          >
                            {ws.roles.map((r) => (
                              <StatusBadge
                                key={r}
                                label={formatRoleCodeLabel(r)}
                                tone="neutral"
                              />
                            ))}
                          </View>
                        </View>

                        <AppButton
                          label={
                            isCurrent
                              ? 'Active'
                              : hasActiveWorkspace
                              ? 'Switch'
                              : 'Select'
                          }
                          variant={
                            isCurrent || !hasActiveWorkspace
                              ? 'primary'
                              : 'secondary'
                          }
                          size="sm"
                          loading={selectingKey === ws.key}
                          onPress={() => handleSelectWorkspace(ws)}
                        />
                      </View>
                    </SurfaceCard>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        <AppButton
          label={
            pendingInvites.length > 0
              ? `Invitation Inbox (${pendingInvites.length} Pending)`
              : 'Invitation Inbox'
          }
          variant="secondary"
          fullWidth
          leftIcon={<Ticket size={iconSizes.sm} color={colors.secondaryText} />}
          onPress={() => navigateTo('/invitations')}
        />
        <AppButton
          label="Refresh Memberships"
          variant="outline"
          fullWidth
          loading={refreshing}
          leftIcon={<RefreshCw size={iconSizes.sm} color={colors.textPrimary} />}
          onPress={loadData}
        />
        <AppButton
          label="Sign Out"
          variant="ghost"
          fullWidth
          leftIcon={<LogOut size={iconSizes.sm} color={colors.danger} />}
          onPress={handleLogout}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  roleBadgesRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
