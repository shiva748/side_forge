import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Mail, Phone, User } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
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

export default function PersonalProfileSettingsScreen() {
  const { colors, spacing, iconSizes } = useAppTheme();
  const user = useAuthWorkspaceStore((s) => s.user);
  const refreshUserAndMemberships = useAuthWorkspaceStore(
    (s) => s.refreshUserAndMemberships
  );

  const initialPhone = (user?.phoneNumber ?? '')
    .replace(/^\+91/, '')
    .replace(/\D/g, '')
    .slice(-10);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);

  const lastNameRef = useRef<AppInputHandle>(null);
  const phoneRef = useRef<AppInputHandle>(null);

  const handleSave = async () => {
    setFeedback(null);
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const cleanedPhone = phoneNumber.replace(/\D/g, '').slice(-10);

    if (!trimmedFirst) {
      setFeedback({
        tone: 'danger',
        message: 'First name is required.',
      });
      return;
    }

    if (cleanedPhone && !/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setFeedback({
        tone: 'danger',
        message: 'Enter a valid 10-digit Indian mobile number (starting with 6–9).',
      });
      return;
    }

    setSaving(true);
    try {
      await authApi.updateProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast || null,
        phoneNumber: cleanedPhone || null,
      });
      await refreshUserAndMemberships();
      setFeedback({
        tone: 'success',
        message: 'Your personal profile has been updated.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message:
          err instanceof Error ? err.message : 'Unable to update profile.',
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
          title="Personal Profile"
          subtitle="Manage your contact information"
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
            label="Email Address"
            value={user?.email ?? ''}
            editable={false}
            leftIcon={<Mail size={iconSizes.sm} color={colors.textMuted} />}
            helperText="Email address is linked to your account identity."
          />

          <AppInput
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            leftIcon={<User size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppInput
            ref={lastNameRef}
            label="Last Name"
            placeholder="Enter your last name (optional)"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            leftIcon={<User size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppInput
            ref={phoneRef}
            label="Mobile Number (10 digits)"
            placeholder="9876543210"
            value={phoneNumber}
            onChangeText={(val) =>
              setPhoneNumber(val.replace(/\D/g, '').slice(0, 10))
            }
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            leftIcon={<Phone size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppButton
            label="Save Changes"
            loading={saving}
            fullWidth
            onPress={handleSave}
          />
        </View>
      </SurfaceCard>
    </ScreenContainer>
  );
}
