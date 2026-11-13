import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { invitationApi } from '@/api/invitationApi';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import {
  formatRoleCodeLabel,
  mapRoleCodeToMobileExperience,
} from '@/types/auth';
import type {
  InvitationResponse,
  InvitationStatus,
  InvitationTargetType,
} from '@/types/invitation';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  BottomSheetModal,
  EmptyState,
  FeedbackBanner,
  LoadingStateView,
  ScreenContainer,
  ScreenHeader,
  SegmentedSelector,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

type InboxSection = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

function formatTargetTypeLabel(targetType: InvitationTargetType): string {
  switch (targetType) {
    case 'GUARDIAN':
      return 'Parent / Guardian';
    case 'TEACHER':
      return 'Teacher';
    case 'STAFF':
      return 'School Staff';
    case 'SCHOOL_ADMIN':
      return 'School Administration';
    case 'STUDENT':
      return 'Student';
    default:
      return 'Organization Member';
  }
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getStatusBadgeTone(status: InvitationStatus) {
  switch (status) {
    case 'PENDING':
      return 'warning' as const;
    case 'ACCEPTED':
      return 'success' as const;
    case 'REJECTED':
      return 'danger' as const;
    case 'EXPIRED':
    case 'REVOKED':
    default:
      return 'neutral' as const;
  }
}

export default function InvitationsInboxScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { goBackOrFallback, resetToWorkspaceHome } = useSafeNavigation();

  const status = useAuthWorkspaceStore((s) => s.status);
  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const workspaces = useAuthWorkspaceStore((s) => s.workspaces);
  const selectWorkspace = useAuthWorkspaceStore((s) => s.selectWorkspace);
  const completeInvitationAcceptance = useAuthWorkspaceStore(
    (s) => s.completeInvitationAcceptance
  );
  const refreshPendingInvitations = useAuthWorkspaceStore(
    (s) => s.refreshPendingInvitations
  );

  const [section, setSection] = useState<InboxSection>('PENDING');
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'info' | 'danger';
    title: string;
    message: string;
    acceptedOrgId?: number;
    acceptedRoleCode?: string;
    acceptedOrgName?: string;
  } | null>(null);

  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationResponse | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    'accept' | 'reject' | null
  >(null);

  const loadInvitations = useCallback(
    async (isPullToRefresh = false) => {
      if (status !== 'AUTHENTICATED') return;
      if (isPullToRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);
      try {
        const list = await invitationApi.getMyInvitations();
        // Exclude platform-only invitations on mobile while keeping all school roles
        const schoolInvitations = list.filter(
          (inv) => !inv.roleCode.toUpperCase().startsWith('PLATFORM_')
        );
        setInvitations(schoolInvitations);
        await refreshPendingInvitations();
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Unable to load your invitations.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, refreshPendingInvitations]
  );

  useEffect(() => {
    if (status === 'AUTHENTICATED') {
      void loadInvitations(false);
    }
  }, [status, loadInvitations]);

  const counts = useMemo(() => {
    return {
      PENDING: invitations.filter((i) => i.status === 'PENDING').length,
      ACCEPTED: invitations.filter((i) => i.status === 'ACCEPTED').length,
      REJECTED: invitations.filter((i) => i.status === 'REJECTED').length,
      EXPIRED: invitations.filter(
        (i) => i.status === 'EXPIRED' || i.status === 'REVOKED'
      ).length,
    };
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    if (section === 'EXPIRED') {
      return invitations.filter(
        (i) => i.status === 'EXPIRED' || i.status === 'REVOKED'
      );
    }
    return invitations.filter((i) => i.status === section);
  }, [invitations, section]);

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  const handleOpenDetails = (inv: InvitationResponse) => {
    setConfirmingReject(false);
    setSelectedInvitation(inv);
  };

  const handleCloseDetails = () => {
    if (processingAction) return;
    setConfirmingReject(false);
    setSelectedInvitation(null);
  };

  const handleAcceptInvitation = async () => {
    if (!selectedInvitation || processingAction) return;
    setProcessingAction('accept');
    setFeedback(null);
    setErrorMsg(null);
    try {
      const accepted = await invitationApi.acceptMyInvitation(
        selectedInvitation.id
      );
      await completeInvitationAcceptance({
        accessToken: accepted.accessToken,
        organizationId: accepted.organizationId,
        roleCode: accepted.roleCode,
        switchImmediately: false,
      });
      setSelectedInvitation(null);
      setConfirmingReject(false);
      await loadInvitations(true);
      setFeedback({
        tone: 'success',
        title: 'Invitation Accepted',
        message: `Your ${formatRoleCodeLabel(
          accepted.roleCode
        )} membership at ${
          selectedInvitation.organizationName
        } is now active and available in your Workspace Switcher.`,
        acceptedOrgId: accepted.organizationId,
        acceptedRoleCode: accepted.roleCode,
        acceptedOrgName: selectedInvitation.organizationName,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to accept this invitation.'
      );
      setSelectedInvitation(null);
      await loadInvitations(true);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectInvitation = async () => {
    if (!selectedInvitation || processingAction) return;
    setProcessingAction('reject');
    setFeedback(null);
    setErrorMsg(null);
    try {
      await invitationApi.rejectMyInvitation(selectedInvitation.id);
      const orgName = selectedInvitation.organizationName;
      setSelectedInvitation(null);
      setConfirmingReject(false);
      await loadInvitations(true);
      setFeedback({
        tone: 'info',
        title: 'Invitation Declined',
        message: `You have declined the invitation from ${orgName}.`,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to decline this invitation.'
      );
      setSelectedInvitation(null);
      await loadInvitations(true);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSwitchToAcceptedWorkspace = async () => {
    if (!feedback?.acceptedOrgId || !feedback.acceptedRoleCode) return;
    const targetExp = mapRoleCodeToMobileExperience(feedback.acceptedRoleCode);
    const freshWorkspaces = useAuthWorkspaceStore.getState().workspaces;
    const match = freshWorkspaces.find(
      (w) =>
        w.organizationId === feedback.acceptedOrgId &&
        (!targetExp || w.experience === targetExp)
    );
    if (match) {
      await selectWorkspace(match, queryClient);
      resetToWorkspaceHome(match.experience);
    }
  };

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => loadInvitations(true)}
      header={
        <ScreenHeader
          title="Invitations"
          subtitle="Review & manage your school invitations"
          showBack
          onBackPress={() =>
            goBackOrFallback(activeWorkspace ? '/' : '/workspace-select')
          }
        />
      }
    >
      {errorMsg ? (
        <FeedbackBanner
          tone="danger"
          title="Invitation Error"
          message={errorMsg}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {feedback ? (
        <SurfaceCard
          style={{
            backgroundColor:
              feedback.tone === 'success'
                ? colors.successSoft
                : colors.infoSoft,
            borderColor:
              feedback.tone === 'success'
                ? colors.successBorder
                : colors.infoBorder,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color:
                feedback.tone === 'success'
                  ? colors.successText
                  : colors.infoText,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {feedback.title}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 4,
              lineHeight: typography.lineHeights.xs,
            }}
          >
            {feedback.message}
          </Text>
          {feedback.acceptedOrgId ? (
            <View style={{ marginTop: spacing.sm }}>
              <AppButton
                label={`Switch to ${feedback.acceptedOrgName ?? 'New Workspace'}`}
                size="sm"
                variant="primary"
                onPress={handleSwitchToAcceptedWorkspace}
              />
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}

      <SegmentedSelector<InboxSection>
        options={[
          {
            label:
              counts.PENDING > 0 ? `Pending (${counts.PENDING})` : 'Pending',
            value: 'PENDING',
          },
          {
            label:
              counts.ACCEPTED > 0
                ? `Accepted (${counts.ACCEPTED})`
                : 'Accepted',
            value: 'ACCEPTED',
          },
          {
            label:
              counts.REJECTED > 0
                ? `Rejected (${counts.REJECTED})`
                : 'Rejected',
            value: 'REJECTED',
          },
          {
            label:
              counts.EXPIRED > 0 ? `Expired (${counts.EXPIRED})` : 'Expired',
            value: 'EXPIRED',
          },
        ]}
        value={section}
        onChange={setSection}
        style={{ marginBottom: spacing.md }}
      />

      {loading ? (
        <LoadingStateView message="Loading your school invitations..." />
      ) : filteredInvitations.length === 0 ? (
        <EmptyState
          icon={<Inbox size={iconSizes.xl} color={colors.primary} />}
          title={
            section === 'PENDING'
              ? 'No Pending Invitations'
              : `No ${section.charAt(0) + section.slice(1).toLowerCase()} Invitations`
          }
          description={
            section === 'PENDING'
              ? 'When a school administrator invites your account, the invitation will appear right here for you to review and accept.'
              : `You do not have any ${section.toLowerCase()} invitations in your inbox.`
          }
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filteredInvitations.map((inv) => (
            <SurfaceCard
              key={inv.id}
              onPress={() => handleOpenDetails(inv)}
              style={
                inv.status === 'PENDING'
                  ? { borderColor: colors.primarySoftBorder, borderWidth: 1.5 }
                  : undefined
              }
            >
              <View style={[styles.rowBetween, { marginBottom: spacing.xs }]}>
                <View
                  style={[
                    styles.rowCenter,
                    { flex: 1, marginRight: spacing.xs },
                  ]}
                >
                  <Building2 size={iconSizes.md} color={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.base,
                      fontWeight: typography.fontWeights.bold,
                      marginLeft: spacing.xs,
                      flex: 1,
                    }}
                  >
                    {inv.organizationName || 'School Organization'}
                  </Text>
                </View>
                <StatusBadge
                  label={inv.status}
                  tone={getStatusBadgeTone(inv.status)}
                />
              </View>

              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                }}
              >
                Offered Role: {formatRoleCodeLabel(inv.roleCode)} (
                {formatTargetTypeLabel(inv.targetType)})
              </Text>

              {inv.invitedByName ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 4,
                  }}
                >
                  Invited by {inv.invitedByName}
                </Text>
              ) : null}

              <View
                style={[
                  styles.rowBetween,
                  {
                    marginTop: spacing.sm,
                    paddingTop: spacing.xs,
                    borderTopWidth: 1,
                    borderTopColor: colors.separator,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  Received {formatDateShort(inv.createdAt)}
                </Text>
                <Text
                  style={{
                    color:
                      inv.status === 'PENDING'
                        ? colors.primaryText
                        : colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {inv.status === 'PENDING'
                    ? 'Review & Respond →'
                    : 'View Details →'}
                </Text>
              </View>
            </SurfaceCard>
          ))}
        </View>
      )}
      <BottomSheetModal
        visible={Boolean(selectedInvitation)}
        title={selectedInvitation?.organizationName ?? 'Invitation Details'}
        subtitle="Review school & role details"
        onClose={handleCloseDetails}
      >
        {selectedInvitation ? (
          <View style={{ gap: spacing.md }}>
            <View
              style={[
                styles.metaGrid,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  gap: spacing.xs,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  Status
                </Text>
                <StatusBadge
                  label={selectedInvitation.status}
                  tone={getStatusBadgeTone(selectedInvitation.status)}
                />
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  Inviting School
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {selectedInvitation.organizationName}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  Offered Role
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {formatRoleCodeLabel(selectedInvitation.roleCode)}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  Membership Type
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.medium,
                  }}
                >
                  {formatTargetTypeLabel(selectedInvitation.targetType)}
                </Text>
              </View>

              {selectedInvitation.invitedByName ? (
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                    Invited By
                  </Text>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                    }}
                  >
                    {selectedInvitation.invitedByName}
                  </Text>
                </View>
              ) : null}

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  Invitation Date
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.fontSizes.xs }}>
                  {formatDateShort(selectedInvitation.createdAt)}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSizes.xs }}>
                  {selectedInvitation.status === 'ACCEPTED'
                    ? 'Accepted On'
                    : selectedInvitation.status === 'REJECTED'
                    ? 'Declined On'
                    : 'Expires On'}
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.fontSizes.xs }}>
                  {selectedInvitation.status === 'ACCEPTED'
                    ? formatDateShort(selectedInvitation.acceptedAt)
                    : selectedInvitation.status === 'REJECTED'
                    ? formatDateShort(selectedInvitation.revokedAt)
                    : formatDateShort(selectedInvitation.expiresAt)}
                </Text>
              </View>
            </View>

            {selectedInvitation.status === 'PENDING' ? (
              <>
                <View style={styles.rowCenter}>
                  <ShieldCheck size={iconSizes.sm} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginLeft: spacing.xs,
                      flex: 1,
                      lineHeight: typography.lineHeights.xs,
                    }}
                  >
                    Accepting links your account to{' '}
                    {selectedInvitation.organizationName} as{' '}
                    {formatRoleCodeLabel(selectedInvitation.roleCode)} and adds
                    it to your Workspace Switcher without affecting your
                    existing memberships.
                  </Text>
                </View>

                {confirmingReject ? (
                  <View style={{ gap: spacing.xs }}>
                    <FeedbackBanner
                      tone="warning"
                      title="Confirm Rejection"
                      message={`Are you sure you want to reject the ${formatRoleCodeLabel(
                        selectedInvitation.roleCode
                      )} invitation from ${
                        selectedInvitation.organizationName
                      }?`}
                    />
                    <AppButton
                      label="Confirm Reject Invitation"
                      variant="danger"
                      fullWidth
                      loading={processingAction === 'reject'}
                      leftIcon={
                        <XCircle
                          size={iconSizes.sm}
                          color={colors.textOnPrimary}
                        />
                      }
                      onPress={handleRejectInvitation}
                    />
                    <AppButton
                      label="Cancel"
                      variant="outline"
                      fullWidth
                      disabled={Boolean(processingAction)}
                      onPress={() => setConfirmingReject(false)}
                    />
                  </View>
                ) : (
                  <View style={{ gap: spacing.xs }}>
                    <AppButton
                      label="Accept Invitation"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={processingAction === 'accept'}
                      disabled={Boolean(processingAction)}
                      leftIcon={
                        <CheckCircle2
                          size={iconSizes.sm}
                          color={colors.textOnPrimary}
                        />
                      }
                      onPress={handleAcceptInvitation}
                    />
                    <AppButton
                      label="Reject Invitation"
                      variant="outline"
                      fullWidth
                      disabled={Boolean(processingAction)}
                      leftIcon={
                        <XCircle size={iconSizes.sm} color={colors.danger} />
                      }
                      onPress={() => setConfirmingReject(true)}
                    />
                  </View>
                )}
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaGrid: {
    borderWidth: 1,
  },
});
