import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import {
  Building2,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import {
  authApi,
  type PickedProfilePhotoAsset,
  validatePickedProfilePhoto,
} from '@/api/authApi';
import { formatRoleCodeLabel } from '@/types/auth';
import {
  AppButton,
  AppInput,
  type AppInputHandle,
  FeedbackBanner,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
  UserAvatar,
} from '@/components/ui';

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
  return 'Authenticated Member';
}

function formatPhotoSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function PersonalProfileScreen() {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const status = useAuthWorkspaceStore((s) => s.status);
  const user = useAuthWorkspaceStore((s) => s.user);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const profilePhotoVersion = useAuthWorkspaceStore(
    (s) => s.profilePhotoVersion
  );
  const bumpProfilePhotoVersion = useAuthWorkspaceStore(
    (s) => s.bumpProfilePhotoVersion
  );
  const refreshUserAndMemberships = useAuthWorkspaceStore(
    (s) => s.refreshUserAndMemberships
  );

  const normalizePhoneForInput = (raw?: string | null) =>
    (raw ?? '')
      .replace(/^\+91/, '')
      .replace(/\D/g, '')
      .slice(-10);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(
    normalizePhoneForInput(user?.phoneNumber)
  );
  const [firstNameError, setFirstNameError] = useState<string | undefined>(
    undefined
  );
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [savingProfile, setSavingProfile] = useState(false);

  const [selectedPhoto, setSelectedPhoto] =
    useState<PickedProfilePhotoAsset | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmingRemovePhoto, setConfirmingRemovePhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger' | 'info';
    title?: string;
    message: string;
  } | null>(null);

  const lastNameRef = useRef<AppInputHandle>(null);
  const phoneRef = useRef<AppInputHandle>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhoneNumber(normalizePhoneForInput(user.phoneNumber));
  }, [user?.id, user?.firstName, user?.lastName, user?.phoneNumber]);

  useEffect(() => {
    return () => {
      if (
        Platform.OS === 'web' &&
        selectedPhoto?.uri &&
        selectedPhoto.uri.startsWith('blob:') &&
        typeof URL !== 'undefined'
      ) {
        URL.revokeObjectURL(selectedPhoto.uri);
      }
    };
  }, [selectedPhoto?.uri]);

  const fullName = useMemo(() => {
    const joined = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return joined || 'User Account';
  }, [user?.firstName, user?.lastName]);

  const activeRoleLabel = useMemo(
    () =>
      resolvePrimaryRoleLabel(
        activeWorkspace?.experience,
        activeWorkspace?.roles
      ),
    [activeWorkspace?.experience, activeWorkspace?.roles]
  );

  const hasExistingPhoto = Boolean(
    user?.profilePhotoFileId != null || user?.profilePhotoUrl
  );

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  const clearSelectedPhoto = () => {
    if (
      Platform.OS === 'web' &&
      selectedPhoto?.uri &&
      selectedPhoto.uri.startsWith('blob:') &&
      typeof URL !== 'undefined'
    ) {
      URL.revokeObjectURL(selectedPhoto.uri);
    }
    setSelectedPhoto(null);
  };

  const handlePickPhoto = () => {
    setFeedback(null);
    setConfirmingRemovePhoto(false);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/gif';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const previewUri =
          typeof URL !== 'undefined' ? URL.createObjectURL(file) : '';
        const picked: PickedProfilePhotoAsset = {
          uri: previewUri,
          name: file.name || 'profile-photo.jpg',
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          webFile: file,
        };
        const validationErr = validatePickedProfilePhoto(picked);
        if (validationErr) {
          if (previewUri && typeof URL !== 'undefined') {
            URL.revokeObjectURL(previewUri);
          }
          setFeedback({
            tone: 'danger',
            title: 'Invalid Image File',
            message: validationErr,
          });
          return;
        }
        clearSelectedPhoto();
        setSelectedPhoto(picked);
      };
      input.click();
      return;
    }

    // Native gallery selection: attempt dynamic require of expo-image-picker if installed
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker = require('expo-image-picker');
      if (ImagePicker?.launchImageLibraryAsync) {
        void (async () => {
          const perm =
            await ImagePicker.requestMediaLibraryPermissionsAsync?.();
          if (perm && perm.granted === false) {
            setFeedback({
              tone: 'danger',
              title: 'Permission Required',
              message:
                'Photo library permission is required to select a profile picture.',
            });
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });
          if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const picked: PickedProfilePhotoAsset = {
              uri: asset.uri,
              name: asset.fileName || 'profile-photo.jpg',
              mimeType: asset.mimeType || 'image/jpeg',
              sizeBytes: asset.fileSize ?? null,
            };
            const validationErr = validatePickedProfilePhoto(picked);
            if (validationErr) {
              setFeedback({
                tone: 'danger',
                title: 'Invalid Image',
                message: validationErr,
              });
              return;
            }
            setSelectedPhoto(picked);
          }
        })();
        return;
      }
    } catch {
      // Native module not installed in current bundle
    }

    setFeedback({
      tone: 'info',
      title: 'Device Gallery Picker',
      message:
        'Native gallery selection requires expo-image-picker in the native build. You can upload or replace your photo from the Web portal or after installing expo-image-picker.',
    });
  };

  const handleUploadSelectedPhoto = async () => {
    if (!selectedPhoto || uploadingPhoto) return;
    setFeedback(null);
    setUploadingPhoto(true);
    try {
      await authApi.uploadProfilePhoto(selectedPhoto, hasExistingPhoto);
      await refreshUserAndMemberships();
      bumpProfilePhotoVersion();
      clearSelectedPhoto();
      setFeedback({
        tone: 'success',
        title: 'Profile Photo Saved',
        message: 'Your profile photograph has been updated.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        title: 'Photo Upload Failed',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to upload profile photograph.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (removingPhoto) return;
    setFeedback(null);
    setRemovingPhoto(true);
    try {
      await authApi.deleteProfilePhoto();
      await refreshUserAndMemberships();
      bumpProfilePhotoVersion();
      clearSelectedPhoto();
      setConfirmingRemovePhoto(false);
      setFeedback({
        tone: 'success',
        title: 'Profile Photo Removed',
        message: 'Your profile photograph has been removed.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        title: 'Unable to Remove Photo',
        message:
          err instanceof Error
            ? err.message
            : 'Could not remove your profile photograph.',
      });
    } finally {
      setRemovingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (savingProfile || uploadingPhoto || removingPhoto) return;
    setFeedback(null);
    setFirstNameError(undefined);
    setPhoneError(undefined);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const cleanedPhone = phoneNumber.replace(/\D/g, '').slice(-10);

    let hasValidationError = false;
    if (!trimmedFirst) {
      setFirstNameError('First name is required.');
      hasValidationError = true;
    } else if (trimmedFirst.length > 80) {
      setFirstNameError('First name cannot exceed 80 characters.');
      hasValidationError = true;
    }

    if (cleanedPhone && !/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setPhoneError(
        'Enter a valid 10-digit Indian mobile number (starting with 6–9).'
      );
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setSavingProfile(true);
    try {
      await authApi.updateProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast || null,
        phoneNumber: cleanedPhone || null,
      });
      await refreshUserAndMemberships();
      setFeedback({
        tone: 'success',
        title: 'Profile Updated',
        message:
          'Your personal profile details have been saved and updated across the app.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        title: 'Update Failed',
        message:
          err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <ScreenContainer
      keyboardAware
      header={
        <ScreenHeader
          title="Personal Profile"
          subtitle="Manage your identity, photo & contact details"
          showBack
        />
      }
    >
      {feedback ? (
        <FeedbackBanner
          tone={feedback.tone}
          title={feedback.title}
          message={feedback.message}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {/* A. Profile Header & Photo Management Card */}
      <SurfaceCard style={{ marginBottom: spacing.md }}>
        <View style={styles.headerProfileRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={handlePickPhoto}
            style={styles.avatarContainer}
          >
            <UserAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              profilePhotoUrl={user?.profilePhotoUrl}
              profilePhotoFileId={user?.profilePhotoFileId}
              photoVersion={profilePhotoVersion}
              previewUri={selectedPhoto?.uri}
              size={80}
              highlighted={Boolean(selectedPhoto)}
            />
            <View
              style={[
                styles.cameraBadge,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.surface,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Camera size={14} color={colors.textOnPrimary} />
            </View>
          </Pressable>

          <View style={[styles.headerIdentityCol, { marginLeft: spacing.md }]}>
            <Text
              numberOfLines={2}
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {fullName}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {user?.email}
            </Text>

            <View
              style={[
                styles.roleOrgRow,
                { marginTop: spacing.xs + 2, gap: 6 },
              ]}
            >
              <StatusBadge label={activeRoleLabel} tone="primary" />
              {activeWorkspace?.organizationName ? (
                <View
                  style={[
                    styles.orgBadge,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.xs + 2,
                      paddingVertical: 3,
                    },
                  ]}
                >
                  <Building2 size={11} color={colors.textSecondary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.medium,
                      marginLeft: 4,
                      maxWidth: 160,
                    }}
                  >
                    {activeWorkspace.organizationName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Photo Selection / Preview / Upload / Remove Controls */}
        <View
          style={[
            styles.photoActionsStrip,
            {
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopColor: colors.separator,
            },
          ]}
        >
          {selectedPhoto ? (
            <View
              style={[
                styles.selectedPreviewBox,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primarySoftBorder,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.previewInfoRow}>
                <CheckCircle2 size={iconSizes.sm} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    Selected: {selectedPhoto.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                    {formatPhotoSize(selectedPhoto.sizeBytes) || selectedPhoto.mimeType} · Ready to save
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Discard selected photo"
                  hitSlop={8}
                  disabled={uploadingPhoto}
                  onPress={clearSelectedPhoto}
                >
                  <X size={iconSizes.sm} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={[styles.photoButtonsRow, { marginTop: spacing.sm, gap: spacing.xs }]}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label={hasExistingPhoto ? 'Replace & Save Photo' : 'Upload Photo'}
                    variant="primary"
                    size="sm"
                    fullWidth
                    loading={uploadingPhoto}
                    disabled={savingProfile}
                    leftIcon={<Upload size={iconSizes.xs} color={colors.textOnPrimary} />}
                    onPress={() => void handleUploadSelectedPhoto()}
                  />
                </View>
                <AppButton
                  label="Choose Another"
                  variant="secondary"
                  size="sm"
                  disabled={uploadingPhoto}
                  onPress={handlePickPhoto}
                />
              </View>
            </View>
          ) : confirmingRemovePhoto ? (
            <View
              style={[
                styles.selectedPreviewBox,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.dangerBorder,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.dangerText,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  marginBottom: spacing.xs,
                }}
              >
                Remove your current profile photograph and revert to your initials avatar?
              </Text>
              <View style={[styles.photoButtonsRow, { gap: spacing.xs }]}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Confirm Remove"
                    variant="danger"
                    size="sm"
                    fullWidth
                    loading={removingPhoto}
                    onPress={() => void handleRemovePhoto()}
                  />
                </View>
                <AppButton
                  label="Cancel"
                  variant="outline"
                  size="sm"
                  disabled={removingPhoto}
                  onPress={() => setConfirmingRemovePhoto(false)}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.photoButtonsRow, { gap: spacing.xs }]}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={hasExistingPhoto ? 'Change Profile Photo' : 'Upload Profile Photo'}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<Camera size={iconSizes.xs} color={colors.secondaryText} />}
                  onPress={handlePickPhoto}
                />
              </View>
              {hasExistingPhoto ? (
                <AppButton
                  label="Remove"
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={iconSizes.xs} color={colors.dangerText} />}
                  onPress={() => setConfirmingRemovePhoto(true)}
                />
              ) : null}
            </View>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: spacing.xs }}>
            Supported formats: JPG, PNG, WEBP, or GIF (maximum 5 MB).
          </Text>
        </View>
      </SurfaceCard>

      {/* B. Editable Personal Details Section */}
      <SurfaceCard>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.sm,
          }}
        >
          Personal Information
        </Text>

        <View style={{ gap: spacing.md }}>
          <AppInput
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={(val) => {
              setFirstName(val);
              if (firstNameError) setFirstNameError(undefined);
            }}
            errorText={firstNameError}
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
            onChangeText={(val) => {
              setPhoneNumber(val.replace(/\D/g, '').slice(0, 10));
              if (phoneError) setPhoneError(undefined);
            }}
            errorText={phoneError}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={() => void handleSaveProfile()}
            leftIcon={<Phone size={iconSizes.sm} color={colors.textMuted} />}
          />

          <AppInput
            label="Email Address"
            value={user?.email ?? ''}
            editable={false}
            leftIcon={<Mail size={iconSizes.sm} color={colors.textMuted} />}
            helperText="Email address is linked to your account identity and cannot be changed here."
          />

          <AppButton
            label="Save Profile"
            loading={savingProfile}
            disabled={uploadingPhoto || removingPhoto}
            fullWidth
            onPress={() => void handleSaveProfile()}
          />
        </View>
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIdentityCol: {
    flex: 1,
  },
  roleOrgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  photoActionsStrip: {
    borderTopWidth: 1,
  },
  selectedPreviewBox: {
    borderWidth: 1,
  },
  previewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

