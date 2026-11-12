import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { authApi } from '@/api/authApi';
import {
  AppButton,
  AppInput,
  type AppInputHandle,
  FeedbackBanner,
  ScreenContainer,
  ScreenHeader,
  SurfaceCard,
} from '@/components/ui';

export default function ChangePasswordSettingsScreen() {
  const { colors, spacing, iconSizes } = useAppTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);

  const newPasswordRef = useRef<AppInputHandle>(null);
  const confirmPasswordRef = useRef<AppInputHandle>(null);

  const handleSubmit = async () => {
    setFeedback(null);
    if (!currentPassword) {
      setFeedback({
        tone: 'danger',
        message: 'Please enter your current password.',
      });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setFeedback({
        tone: 'danger',
        message: 'New password must be between 8 and 72 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({
        tone: 'danger',
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({
        tone: 'success',
        message: 'Your account password has been updated.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message:
          err instanceof Error ? err.message : 'Unable to change password.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      keyboardAware
      header={
        <ScreenHeader
          title="Change Password"
          subtitle="Update your Side Forge account password"
          showBack
        />
      }
    >
      {feedback ? (
        <FeedbackBanner
          tone={feedback.tone}
          message={feedback.message}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      <SurfaceCard>
        <View style={{ gap: spacing.md }}>
          <AppInput
            label="Current Password"
            placeholder="Enter current password"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            returnKeyType="next"
            onSubmitEditing={() => newPasswordRef.current?.focus()}
            leftIcon={<Lock size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppInput
            ref={newPasswordRef}
            label="New Password"
            placeholder="Minimum 8 characters"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            value={newPassword}
            onChangeText={setNewPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            helperText="Use 8 to 72 characters."
            leftIcon={<Lock size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppInput
            ref={confirmPasswordRef}
            label="Confirm New Password"
            placeholder="Re-enter new password"
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            leftIcon={<Lock size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppButton
            label="Update Password"
            loading={saving}
            fullWidth
            onPress={handleSubmit}
          />
        </View>
      </SurfaceCard>
    </ScreenContainer>
  );
}
