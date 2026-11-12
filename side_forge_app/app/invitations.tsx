import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Ticket,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { invitationApi } from '@/api/invitationApi';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { extractInvitationTokenFromInput } from '@/services/pushNotifications';
import {
  formatRoleCodeLabel,
  mapRoleCodeToMobileExperience,
} from '@/types/auth';
import type {
  InvitationResponse,
  InvitationVerificationResponse,
} from '@/types/invitation';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  AppInput,
  FeedbackBanner,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export default function InvitationsScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ token?: string }>();
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { goBackOrFallback, resetToWorkspaceHome, resetToLogin } =
    useSafeNavigation();

  const status = useAuthWorkspaceStore((s) => s.status);
  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const pendingInvitationToken = useAuthWorkspaceStore(
    (s) => s.pendingInvitationToken
  );
  const setPendingInvitationToken = useAuthWorkspaceStore(
    (s) => s.setPendingInvitationToken
  );
  const logout = useAuthWorkspaceStore((s) => s.logout);
  const completeInvitationAcceptance = useAuthWorkspaceStore(
    (s) => s.completeInvitationAcceptance
  );

  const initialToken = params.token ?? pendingInvitationToken ?? '';
  const [rawTokenInput, setRawTokenInput] = useState(initialToken);
  const [pendingList, setPendingList] = useState<InvitationResponse[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [verifiedData, setVerifiedData] =
    useState<InvitationVerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [declinedMsg, setDeclinedMsg] = useState<string | null>(null);

  // If an unauthenticated user reaches this route (e.g., via deep link),
  // preserve the token without verifying or accepting it and redirect to Login.
  useEffect(() => {
    if (status !== 'AUTHENTICATED' && params.token) {
      const extracted = extractInvitationTokenFromInput(params.token);
      if (extracted) {
        void setPendingInvitationToken(extracted);
      }
    }
  }, [status, params.token, setPendingInvitationToken]);

  const handleVerify = async (inputOverride?: string) => {
    if (status !== 'AUTHENTICATED') return;
    const candidate = extractInvitationTokenFromInput(
      inputOverride ?? rawTokenInput
    );
    setErrorMsg(null);
    setDeclinedMsg(null);

    if (!candidate) {
      setErrorMsg('Please enter or paste a valid invitation link or token.');
      return;
    }

    setVerifying(true);
    try {
      const data = await invitationApi.verifyToken(candidate);
      setVerifiedData(data);
      setRawTokenInput(candidate);
      // Clear the pending redirect token once verified on screen so the user
      // can freely navigate back if they choose not to accept immediately.
      void setPendingInvitationToken(null);
    } catch (err) {
      setVerifiedData(null);
      void setPendingInvitationToken(null);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Invalid, expired, or revoked invitation token.'
      );
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (status !== 'AUTHENTICATED') return;

    invitationApi
      .getMyPendingInvitations()
      .then((list) => setPendingList(list.filter((i) => i.status === 'PENDING')))
      .catch(() => {});

    const autoVerifyCandidate = params.token || pendingInvitationToken;
    if (autoVerifyCandidate && autoVerifyCandidate.trim().length > 0) {
      void handleVerify(autoVerifyCandidate);
    }
  }, [status, params.token]);

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  const recipientEmail =
    verifiedData?.email ?? verifiedData?.recipientEmail ?? '';
  const isRecipientMatch =
    Boolean(user?.email) &&
    Boolean(recipientEmail) &&
    user!.email.trim().toLowerCase() === recipientEmail.trim().toLowerCase();

  const handleSwitchAccountForInvitation = async () => {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    setErrorMsg(null);
    const tokenToKeep = extractInvitationTokenFromInput(rawTokenInput);
    try {
      await logout(queryClient);
      if (tokenToKeep) {
        await setPendingInvitationToken(tokenToKeep);
      }
      resetToLogin();
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleAccept = async () => {
    if (!verifiedData || submitting) return;
    setErrorMsg(null);

    if (!isRecipientMatch) {
      setErrorMsg(
        `This invitation was issued for ${recipientEmail}. You are currently signed in as ${user?.email}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await invitationApi.acceptInvitation({
        token: rawTokenInput.trim(),
        email: recipientEmail,
      });
      queryClient.clear();
      await completeInvitationAcceptance({
        accessToken: response.accessToken,
        organizationId: response.organizationId,
        roleCode: response.roleCode,
      });
      const targetExperience =
        mapRoleCodeToMobileExperience(response.roleCode) ??
        activeWorkspace?.experience ??
        'SCHOOL_ADMIN';
      resetToWorkspaceHome(targetExperience);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to accept invitation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!verifiedData || submitting || !isRecipientMatch) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await invitationApi.rejectInvitation({
        token: rawTokenInput.trim(),
        email: recipientEmail,
      });
      await setPendingInvitationToken(null);
      setVerifiedData(null);
      setRawTokenInput('');
      setDeclinedMsg('You have declined the school invitation.');
      const updated = await invitationApi
        .getMyPendingInvitations()
        .catch(() => []);
      setPendingList(updated.filter((i) => i.status === 'PENDING'));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to decline invitation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    void setPendingInvitationToken(null);
    goBackOrFallback(activeWorkspace ? '/' : '/workspace-select');
  };

  return (
    <ScreenContainer
      keyboardAware
      header={
        <ScreenHeader
          title="School Invitations"
          subtitle={
            user?.email
              ? `Signed in as ${user.email}`
              : 'Verify & accept school membership invitations'
          }
          showBack
          onBackPress={handleBack}
        />
      }
    >
      {errorMsg ? (
        <FeedbackBanner
          tone="danger"
          title="Invitation error"
          message={errorMsg}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {declinedMsg ? (
        <FeedbackBanner
          tone="info"
          title="Invitation declined"
          message={declinedMsg}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {pendingList.length > 0 ? (
        <SurfaceCard style={{ marginBottom: spacing.md }}>
          <View style={[styles.row, { marginBottom: spacing.xs }]}>
            <Clock size={iconSizes.sm} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
                marginLeft: spacing.xs,
              }}
            >
              Pending Invitations for {user?.email}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginBottom: spacing.sm,
            }}
          >
            Enter the invitation token from your email or message below to
            verify and activate your membership.
          </Text>
          <View style={{ gap: spacing.xs }}>
            {pendingList.map((inv) => (
              <View
                key={inv.id}
                style={[
                  styles.pendingItem,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  },
                ]}
              >
                <View
                  style={[
                    styles.row,
                    { justifyContent: 'space-between', marginBottom: 4 },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      flex: 1,
                    }}
                  >
                    {inv.organizationName ??
                      `Organization #${inv.organizationId}`}
                  </Text>
                  <StatusBadge label={inv.status} tone="primary" />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  Role: {formatRoleCodeLabel(inv.roleCode)}
                </Text>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={{ marginBottom: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <AppInput
            label="Invitation Link or Token"
            placeholder="Paste invitation URL or token..."
            autoCapitalize="none"
            autoCorrect={false}
            value={rawTokenInput}
            onChangeText={setRawTokenInput}
            returnKeyType="go"
            onSubmitEditing={() => {
              void handleVerify();
            }}
            leftIcon={<Ticket size={iconSizes.sm} color={colors.textMuted} />}
            helperText="Paste the invitation link or token issued to your account email."
          />
          <AppButton
            label={verifiedData ? 'Re-verify Token' : 'Verify Invitation'}
            variant={verifiedData ? 'secondary' : 'primary'}
            loading={verifying}
            fullWidth
            onPress={() => {
              void handleVerify();
            }}
          />
        </View>
      </SurfaceCard>
      {verifiedData ? (
        <SurfaceCard>
          <View
            style={[
              styles.row,
              { justifyContent: 'space-between', marginBottom: spacing.xs },
            ]}
          >
            <View style={[styles.row, { flex: 1, marginRight: spacing.xs }]}>
              <Building2 size={iconSizes.md} color={colors.primary} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                  marginLeft: spacing.xs,
                  flex: 1,
                }}
              >
                {verifiedData.organizationName}
              </Text>
            </View>
            <StatusBadge
              label={verifiedData.status}
              tone={verifiedData.valid ? 'success' : 'warning'}
            />
          </View>

          <View
            style={[
              styles.metaBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                marginBottom: spacing.md,
                gap: 4,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              Role: {formatRoleCodeLabel(verifiedData.roleCode)}
            </Text>
            <View style={[styles.row, { marginTop: 2 }]}>
              <Mail size={iconSizes.xs} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  marginLeft: 6,
                }}
              >
                Invited Account: {recipientEmail}
              </Text>
            </View>
          </View>

          {!verifiedData.valid || verifiedData.status !== 'PENDING' ? (
            <FeedbackBanner
              tone="warning"
              title={`Invitation ${verifiedData.status}`}
              message="This invitation is no longer pending and cannot be accepted. Please contact your school administrator if you need a new invitation."
            />
          ) : !isRecipientMatch ? (
            <View style={{ gap: spacing.sm }}>
              <FeedbackBanner
                tone="danger"
                title="Account mismatch"
                message={`This invitation was issued for ${recipientEmail}, but you are signed in as ${user?.email}. You can only accept invitations issued to your authenticated email address.`}
              />
              <AppButton
                label={`Sign Out & Sign In as ${recipientEmail}`}
                variant="secondary"
                loading={switchingAccount}
                fullWidth
                leftIcon={
                  <LogOut size={iconSizes.sm} color={colors.secondaryText} />
                }
                onPress={handleSwitchAccountForInvitation}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <FeedbackBanner
                tone="success"
                title="Eligible to accept"
                message={`Confirm below to link your account (${user?.email}) to ${verifiedData.organizationName} as ${formatRoleCodeLabel(
                  verifiedData.roleCode
                )}.`}
              />
              <AppButton
                label="Confirm & Accept Invitation"
                size="lg"
                fullWidth
                loading={submitting}
                leftIcon={
                  <CheckCircle2
                    size={iconSizes.sm}
                    color={colors.textOnPrimary}
                  />
                }
                onPress={handleAccept}
              />
              <AppButton
                label="Decline Invitation"
                variant="outline"
                fullWidth
                disabled={submitting}
                onPress={handleDecline}
              />
            </View>
          )}
        </SurfaceCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  metaBox: { borderWidth: 1 },
  pendingItem: { borderWidth: 1 },
});
